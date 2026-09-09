import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Settings,
  UserPlus,
  UserCheck,
  UserMinus,
  MessageSquare,
  Share2,
  Grid,
  Heart,
  Lock,
  Check,
  Bookmark,
  Play,
  BarChart3,
  Radio,
  X,
  Edit3,
  ExternalLink,
  ArrowLeft,
  MoreVertical,
  Copy,
  VolumeX,
  Ban,
  Flag,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Repeat2,
  ListVideo,
  Pin,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  QrCode,
  SlidersHorizontal,
  ArrowDownAZ,
  Clock3,
  Flame,
  UserRound,
  Image as ImageIcon,
  AlertCircle,
  Send,
  Trash2
} from 'lucide-react';

import { supabase } from '../supabaseClient';

const PAGE_SIZE = 18;
const FOLLOW_PAGE_SIZE = 25;

const DEFAULT_STATS = {
  following: 0,
  followers: 0,
  likes: 0,
  views: 0,
  videos: 0,
  profileViews: 0
};

const Profile = () => {
  const navigate = useNavigate();
  const { id: paramUserId } = useParams();

  const [activeTab, setActiveTab] = useState('videos');

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);

  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [isFollowingTarget, setIsFollowingTarget] = useState(false);
  const [followRequestPending, setFollowRequestPending] = useState(false);

  const [displayVideos, setDisplayVideos] = useState([]);

  const [profileLoading, setProfileLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentLoadingMore, setContentLoadingMore] = useState(false);

  const [profileError, setProfileError] = useState('');
  const [contentError, setContentError] = useState('');

  const [contentPage, setContentPage] = useState(0);
  const [hasMoreContent, setHasMoreContent] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('followers');

  const [followList, setFollowList] = useState([]);
  const [followSearch, setFollowSearch] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [followLoadingMore, setFollowLoadingMore] = useState(false);
  const [followPage, setFollowPage] = useState(0);
  const [hasMoreFollowUsers, setHasMoreFollowUsers] = useState(true);

  const [myFollowingIds, setMyFollowingIds] = useState(new Set());

  const [stats, setStats] = useState(DEFAULT_STATS);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [removeLoadingId, setRemoveLoadingId] = useState(null);

  const [contentSort, setContentSort] = useState('latest');
  const [contentFilter, setContentFilter] = useState('all');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerLiked, setViewerLiked] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);

  const [lastTap, setLastTap] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const contentSentinelRef = useRef(null);
  const scrollStartYRef = useRef(0);

  /*
   * ------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------
   */

  const formatCount = useCallback((num) => {
    const value = Number(num) || 0;

    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }

    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }

    return value;
  }, []);

  const getAvatar = useCallback((item, fallback = 'user') => {
    return (
      item?.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${item?.id || fallback}`
    );
  }, []);

  const getCover = useCallback((item) => {
    return (
      item?.cover_url ||
      item?.banner_url ||
      null
    );
  }, []);

  const getDisplayName = useCallback((item) => {
    return (
      item?.display_name ||
      item?.full_name ||
      item?.name ||
      item?.username ||
      'User'
    );
  }, []);

  const getProfilePath = useCallback(() => {
    if (!profile?.username) {
      return `/profile/${targetUserId}`;
    }

    return `/profile/${profile.username}`;
  }, [profile, targetUserId]);

  const getAbsoluteProfileUrl = useCallback(() => {
    return `${window.location.origin}${getProfilePath()}`;
  }, [getProfilePath]);

  /*
   * ------------------------------------------------------------
   * Profile loading
   * ------------------------------------------------------------
   */

  const fetchProfileData = useCallback(async () => {
    try {
      setProfileLoading(true);
      setProfileError('');

      const {
        data: { session }
      } = await supabase.auth.getSession();

      const authUser = session?.user || null;

      setUser(authUser);

      const effectiveId = paramUserId || authUser?.id;

      if (!effectiveId) {
        setProfileError('No profile selected.');
        return;
      }

      setTargetUserId(effectiveId);

      const isOwner = Boolean(
        authUser?.id && effectiveId === authUser.id
      );

      setIsOwnProfile(isOwner);

      /*
       * Profile
       */
      const {
        data: profileData,
        error: profileErrorData
      } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', effectiveId)
        .maybeSingle();

      if (profileErrorData) {
        throw profileErrorData;
      }

      if (!profileData) {
        setProfile(null);
        setProfileError('Profile not found.');
        return;
      }

      /*
       * Block check
       */
      if (authUser && !isOwner) {
        const { data: blockData } = await supabase
          .from('blocks')
          .select('id')
          .eq('blocker_id', authUser.id)
          .eq('blocked_id', effectiveId)
          .maybeSingle();

        setIsBlocked(Boolean(blockData));
      } else {
        setIsBlocked(false);
      }

      /*
       * Follow relationship
       */
      let followingIds = [];

      if (authUser) {
        const { data: myFollows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', authUser.id);

        followingIds =
          myFollows?.map((item) => item.following_id) || [];

        setMyFollowingIds(new Set(followingIds));

        setIsFollowingTarget(
          followingIds.includes(effectiveId)
        );

        if (!isOwner) {
          const { data: requestData } = await supabase
            .from('follow_requests')
            .select('id, status')
            .eq('requester_id', authUser.id)
            .eq('target_id', effectiveId)
            .eq('status', 'pending')
            .maybeSingle();

          setFollowRequestPending(Boolean(requestData));
        }
      }

      /*
       * Stats
       */
      const [
        followingResult,
        followersResult,
        videosResult,
        profileViewsResult
      ] = await Promise.all([
        supabase
          .from('follows')
          .select('*', {
            count: 'exact',
            head: true
          })
          .eq('follower_id', effectiveId),

        supabase
          .from('follows')
          .select('*', {
            count: 'exact',
            head: true
          })
          .eq('following_id', effectiveId),

        supabase
          .from('videos')
          .select(
            'id, likes_count, views_count',
            {
              count: 'exact'
            }
          )
          .eq('user_id', effectiveId),

        supabase
          .from('profile_views')
          .select('*', {
            count: 'exact',
            head: true
          })
          .eq('profile_id', effectiveId)
      ]);

      const videoRows = videosResult.data || [];

      const totalLikes = videoRows.reduce(
        (sum, video) =>
          sum + (Number(video.likes_count) || 0),
        0
      );

      const totalViews = videoRows.reduce(
        (sum, video) =>
          sum + (Number(video.views_count) || 0),
        0
      );

      setStats({
        following: followingResult.count || 0,
        followers: followersResult.count || 0,
        likes: totalLikes,
        views: totalViews,
        videos: videosResult.count || 0,
        profileViews: profileViewsResult.count || 0
      });

      /*
       * Record profile view
       */
      if (authUser && authUser.id !== effectiveId) {
        await supabase
          .from('profile_views')
          .upsert(
            {
              profile_id: effectiveId,
              viewer_id: authUser.id,
              viewed_at: new Date().toISOString()
            },
            {
              onConflict: 'profile_id,viewer_id'
            }
          );
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Profile Data Error:', error);
      setProfileError(
        error?.message || 'Unable to load this profile.'
      );
    } finally {
      setProfileLoading(false);
    }
  }, [paramUserId]);

  /*
   * ------------------------------------------------------------
   * Content query
   * ------------------------------------------------------------
   */

  const buildVideoQuery = useCallback(
    (query, tab) => {
      let result = query.eq('user_id', targetUserId);

      if (tab === 'private') {
        result = result.eq('is_private', true);
      }

      if (contentFilter === 'public') {
        result = result.eq('is_private', false);
      }

      if (contentFilter === 'private') {
        result = result.eq('is_private', true);
      }

      if (contentSort === 'popular') {
        result = result.order('views_count', {
          ascending: false,
          nullsFirst: false
        });
      } else if (contentSort === 'likes') {
        result = result.order('likes_count', {
          ascending: false,
          nullsFirst: false
        });
      } else {
        result = result.order('created_at', {
          ascending: false,
          nullsFirst: false
        });
      }

      return result;
    },
    [
      targetUserId,
      contentFilter,
      contentSort
    ]
  );

  const fetchTabData = useCallback(
    async ({
      reset = true,
      requestedPage = 0
    } = {}) => {
      if (!targetUserId) return;

      if (reset) {
        setContentLoading(true);
        setContentError('');
      } else {
        setContentLoadingMore(true);
      }

      try {
        const from = requestedPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let videosData = [];

        /*
         * ------------------------------------------------------
         * Own private content
         * ------------------------------------------------------
         */

        if (
          activeTab === 'private' &&
          !isOwnProfile
        ) {
          setDisplayVideos([]);
          setHasMoreContent(false);
          return;
        }

        /*
         * ------------------------------------------------------
         * Standard videos
         * ------------------------------------------------------
         */

        if (
          activeTab === 'videos' ||
          activeTab === 'private'
        ) {
          let query = supabase
            .from('videos')
            .select('*');

          query = buildVideoQuery(
            query,
            activeTab
          );

          const {
            data,
            error
          } = await query.range(from, to);

          if (error) throw error;

          videosData = data || [];
        }

        /*
         * ------------------------------------------------------
         * Liked
         * ------------------------------------------------------
         */

        else if (activeTab === 'liked') {
          const {
            data: likedRefs,
            error: likedError
          } = await supabase
            .from('video_likes')
            .select('video_id')
            .eq('user_id', targetUserId)
            .range(from, to);

          if (likedError) throw likedError;

          const ids =
            likedRefs?.map(
              (item) => item.video_id
            ) || [];

          if (ids.length > 0) {
            const {
              data,
              error
            } = await supabase
              .from('videos')
              .select('*')
              .in('id', ids);

            if (error) throw error;

            videosData = data || [];
          }
        }

        /*
         * ------------------------------------------------------
         * Saved
         * ------------------------------------------------------
         */

        else if (activeTab === 'saved') {
          const {
            data: savedRefs,
            error: savedError
          } = await supabase
            .from('favorites')
            .select('video_id')
            .eq('user_id', targetUserId)
            .range(from, to);

          if (savedError) throw savedError;

          const ids =
            savedRefs?.map(
              (item) => item.video_id
            ) || [];

          if (ids.length > 0) {
            const {
              data,
              error
            } = await supabase
              .from('videos')
              .select('*')
              .in('id', ids);

            if (error) throw error;

            videosData = data || [];
          }
        }

        /*
         * ------------------------------------------------------
         * Reposts
         * ------------------------------------------------------
         */

        else if (activeTab === 'reposts') {
          const {
            data: repostRows,
            error: repostError
          } = await supabase
            .from('reposts')
            .select('video_id, created_at')
            .eq('user_id', targetUserId)
            .order('created_at', {
              ascending: false
            })
            .range(from, to);

          if (repostError) throw repostError;

          const ids =
            repostRows?.map(
              (item) => item.video_id
            ) || [];

          if (ids.length > 0) {
            const {
              data,
              error
            } = await supabase
              .from('videos')
              .select('*')
              .in('id', ids);

            if (error) throw error;

            videosData = data || [];
          }
        }

        /*
         * ------------------------------------------------------
         * Playlists
         * ------------------------------------------------------
         */

        else if (activeTab === 'playlists') {
          /*
           * Playlists are handled separately below.
           * The profile grid remains available for normal
           * content tabs.
           */
          videosData = [];
        }

        setDisplayVideos((previous) => {
          if (reset) {
            return videosData;
          }

          const existingIds = new Set(
            previous.map((item) => item.id)
          );

          const additions =
            videosData.filter(
              (item) => !existingIds.has(item.id)
            );

          return [...previous, ...additions];
        });

        setContentPage(requestedPage);
        setHasMoreContent(
          videosData.length === PAGE_SIZE
        );
      } catch (error) {
        console.error(
          'Tab Fetch Error:',
          error
        );

        setContentError(
          error?.message ||
            'Unable to load content.'
        );
      } finally {
        setContentLoading(false);
        setContentLoadingMore(false);
      }
    },
    [
      targetUserId,
      activeTab,
      isOwnProfile,
      buildVideoQuery
    ]
  );

  /*
   * ------------------------------------------------------------
   * Follow list
   * ------------------------------------------------------------
   */

  const fetchFollowList = useCallback(
    async ({
      reset = true,
      requestedPage = 0
    } = {}) => {
      if (!targetUserId) return;

      if (reset) {
        setFollowLoading(true);
      } else {
        setFollowLoadingMore(true);
      }

      try {
        const from =
          requestedPage * FOLLOW_PAGE_SIZE;

        const to =
          from + FOLLOW_PAGE_SIZE - 1;

        const column =
          modalType === 'followers'
            ? 'follower_id'
            : 'following_id';

        const filterColumn =
          modalType === 'followers'
            ? 'following_id'
            : 'follower_id';

        const {
          data: followData,
          error: followError
        } = await supabase
          .from('follows')
          .select(column)
          .eq(filterColumn, targetUserId)
          .range(from, to);

        if (followError) {
          throw followError;
        }

        const userIds =
          followData?.map(
            (item) => item[column]
          ) || [];

        if (userIds.length === 0) {
          if (reset) setFollowList([]);
          setHasMoreFollowUsers(false);
          return;
        }

        let profileQuery = supabase
          .from('profiles')
          .select(
            `
              id,
              username,
              display_name,
              avatar_url,
              bio,
              is_verified,
              is_online
            `
          )
          .in('id', userIds);

        if (followSearch.trim()) {
          profileQuery = profileQuery.ilike(
            'username',
            `%${followSearch.trim()}%`
          );
        }

        const {
          data: profiles,
          error: profileError
        } = await profileQuery;

        if (profileError) {
          throw profileError;
        }

        const orderedProfiles =
          userIds
            .map((id) =>
              profiles?.find(
                (item) => item.id === id
              )
            )
            .filter(Boolean);

        setFollowList((previous) => {
          if (reset) {
            return orderedProfiles;
          }

          const existing =
            new Set(
              previous.map(
                (item) => item.id
              )
            );

          return [
            ...previous,
            ...orderedProfiles.filter(
              (item) =>
                !existing.has(item.id)
            )
          ];
        });

        setFollowPage(requestedPage);

        setHasMoreFollowUsers(
          userIds.length === FOLLOW_PAGE_SIZE
        );
      } catch (error) {
        console.error(
          'Follow list error:',
          error
        );
      } finally {
        setFollowLoading(false);
        setFollowLoadingMore(false);
      }
    },
    [
      targetUserId,
      modalType,
      followSearch
    ]
  );

  const openFollowList = async (type) => {
    setModalType(type);
    setFollowSearch('');
    setFollowPage(0);
    setHasMoreFollowUsers(true);
    setFollowList([]);
    setIsModalOpen(true);

    await fetchFollowList({
      reset: true,
      requestedPage: 0
    });
  };

  /*
   * ------------------------------------------------------------
   * Follow / unfollow
   * ------------------------------------------------------------
   */

  const handleToggleFollow = async () => {
    if (
      !user?.id ||
      !targetUserId ||
      isOwnProfile ||
      actionLoading ||
      isBlocked
    ) {
      return;
    }

    setActionLoading(true);

    try {
      /*
       * Private account
       */
      if (
        profile?.is_private &&
        !isFollowingTarget
      ) {
        if (followRequestPending) {
          const {
            error
          } = await supabase
            .from('follow_requests')
            .delete()
            .eq('requester_id', user.id)
            .eq('target_id', targetUserId);

          if (error) throw error;

          setFollowRequestPending(false);
        } else {
          const {
            error
          } = await supabase
            .from('follow_requests')
            .insert({
              requester_id: user.id,
              target_id: targetUserId,
              status: 'pending'
            });

          if (error) throw error;

          setFollowRequestPending(true);
        }

        return;
      }

      /*
       * Unfollow
       */
      if (isFollowingTarget) {
        const {
          error
        } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setIsFollowingTarget(false);

        setStats((previous) => ({
          ...previous,
          following:
            Math.max(
              0,
              previous.following - 1
            ),
          followers:
            Math.max(
              0,
              previous.followers - 1
            )
        }));

        return;
      }

      /*
       * Follow
       */
      const {
        error
      } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId
        });

      if (error) throw error;

      setIsFollowingTarget(true);

      setStats((previous) => ({
        ...previous,
        following:
          previous.following + 1,
        followers:
          previous.followers + 1
      }));

      await supabase
        .from('activities')
        .insert({
          user_id: targetUserId,
          actor_id: user.id,
          type: 'follow',
          is_read: false
        });
    } catch (error) {
      console.error(
        'Follow action failed:',
        error
      );
    } finally {
      setActionLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * Follow back
   * ------------------------------------------------------------
   */

  const handleFollowBack = async (targetId) => {
    if (
      !user?.id ||
      !targetId ||
      actionLoading
    ) {
      return;
    }

    setMyFollowingIds((previous) => {
      const next = new Set(previous);
      next.add(targetId);
      return next;
    });

    try {
      const {
        error
      } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: targetId
        });

      if (error) throw error;

      if (isOwnProfile) {
        setStats((previous) => ({
          ...previous,
          following:
            previous.following + 1
        }));
      }

      await supabase
        .from('activities')
        .insert({
          user_id: targetId,
          actor_id: user.id,
          type: 'follow',
          is_read: false
        });
    } catch (error) {
      console.error(
        'Follow Back Failed:',
        error
      );

      setMyFollowingIds((previous) => {
        const next = new Set(previous);
        next.delete(targetId);
        return next;
      });
    }
  };

  /*
   * ------------------------------------------------------------
   * Remove follower
   * ------------------------------------------------------------
   */

  const handleRemoveFollower = async (
    followerId
  ) => {
    if (
      !user?.id ||
      !isOwnProfile ||
      !followerId
    ) {
      return;
    }

    setRemoveLoadingId(followerId);

    try {
      const {
        error
      } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', user.id);

      if (error) throw error;

      setFollowList((previous) =>
        previous.filter(
          (item) =>
            item.id !== followerId
        )
      );

      setStats((previous) => ({
        ...previous,
        followers:
          Math.max(
            0,
            previous.followers - 1
          )
      }));
    } catch (error) {
      console.error(
        'Remove follower failed:',
        error
      );
    } finally {
      setRemoveLoadingId(null);
    }
  };

  /*
   * ------------------------------------------------------------
   * Block
   * ------------------------------------------------------------
   */

  const handleBlock = async () => {
    if (
      !user?.id ||
      !targetUserId ||
      isOwnProfile
    ) {
      return;
    }

    try {
      const {
        error
      } = await supabase
        .from('blocks')
        .upsert({
          blocker_id: user.id,
          blocked_id: targetUserId
        });

      if (error) throw error;

      setIsBlocked(true);
      setProfileMenuOpen(false);

      setIsFollowingTarget(false);
    } catch (error) {
      console.error(
        'Block failed:',
        error
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * Mute
   * ------------------------------------------------------------
   */

  const handleMute = async () => {
    if (
      !user?.id ||
      !targetUserId ||
      isOwnProfile
    ) {
      return;
    }

    try {
      if (isMuted) {
        const {
          error
        } = await supabase
          .from('mutes')
          .delete()
          .eq('user_id', user.id)
          .eq('muted_user_id', targetUserId);

        if (error) throw error;

        setIsMuted(false);
      } else {
        const {
          error
        } = await supabase
          .from('mutes')
          .upsert({
            user_id: user.id,
            muted_user_id: targetUserId
          });

        if (error) throw error;

        setIsMuted(true);
      }

      setProfileMenuOpen(false);
    } catch (error) {
      console.error(
        'Mute failed:',
        error
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * Report
   * ------------------------------------------------------------
   */

  const handleReport = async () => {
    if (
      !user?.id ||
      !targetUserId ||
      isOwnProfile
    ) {
      return;
    }

    try {
      const {
        error
      } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: targetUserId,
          type: 'profile',
          status: 'pending'
        });

      if (error) throw error;

      setProfileMenuOpen(false);
    } catch (error) {
      console.error(
        'Report failed:',
        error
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * Content
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!targetUserId) return;

    fetchTabData({
      reset: true,
      requestedPage: 0
    });
  }, [
    targetUserId,
    activeTab,
    contentSort,
    contentFilter,
    isOwnProfile
  ]);

  /*
   * ------------------------------------------------------------
   * Infinite scroll
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!contentSentinelRef.current) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const first = entries[0];

          if (
            first.isIntersecting &&
            hasMoreContent &&
            !contentLoading &&
            !contentLoadingMore
          ) {
            fetchTabData({
              reset: false,
              requestedPage:
                contentPage + 1
            });
          }
        },
        {
          rootMargin: '500px'
        }
      );

    observer.observe(
      contentSentinelRef.current
    );

    return () => observer.disconnect();
  }, [
    contentPage,
    hasMoreContent,
    contentLoading,
    contentLoadingMore,
    fetchTabData
  ]);

  /*
   * ------------------------------------------------------------
   * Follow list search
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!isModalOpen) return;

    const timer = setTimeout(() => {
      fetchFollowList({
        reset: true,
        requestedPage: 0
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [
    followSearch
  ]);

  /*
   * ------------------------------------------------------------
   * Tabs
   * ------------------------------------------------------------
   */

  const tabs = useMemo(() => {
    const base = [
      {
        id: 'videos',
        label: 'Videos',
        icon: <Grid size={20} />
      },
      {
        id: 'reposts',
        label: 'Reposts',
        icon: <Repeat2 size={20} />
      },
      {
        id: 'playlists',
        label: 'Playlists',
        icon: <ListVideo size={20} />
      },
      {
        id: 'liked',
        label: 'Liked',
        icon: <Heart size={20} />
      }
    ];

    if (isOwnProfile) {
      base.push({
        id: 'private',
        label: 'Private',
        icon: <Lock size={20} />
      });

      base.push({
        id: 'saved',
        label: 'Saved',
        icon: <Bookmark size={20} />
      });
    }

    return base;
  }, [isOwnProfile]);

  /*
   * ------------------------------------------------------------
   * Video viewer
   * ------------------------------------------------------------
   */

  const openViewer = (
    index
  ) => {
    setViewerIndex(index);
    setViewerOpen(true);
    setViewerLiked(false);
  };

  const closeViewer = () => {
    setViewerOpen(false);
  };

  const goNextVideo = () => {
    if (
      viewerIndex <
      displayVideos.length - 1
    ) {
      setViewerIndex(
        (previous) =>
          previous + 1
      );
      setViewerLiked(false);
    }
  };

  const goPreviousVideo = () => {
    if (viewerIndex > 0) {
      setViewerIndex(
        (previous) =>
          previous - 1
      );
      setViewerLiked(false);
    }
  };

  const handleViewerLike = async () => {
    const video =
      displayVideos[viewerIndex];

    if (
      !video ||
      !user?.id
    ) {
      return;
    }

    try {
      if (viewerLiked) {
        await supabase
          .from('video_likes')
          .delete()
          .eq('video_id', video.id)
          .eq('user_id', user.id);

        setViewerLiked(false);

        setDisplayVideos((previous) =>
          previous.map((item) =>
            item.id === video.id
              ? {
                  ...item,
                  likes_count:
                    Math.max(
                      0,
                      (item.likes_count ||
                        0) - 1
                    )
                }
              : item
          )
        );
      } else {
        await supabase
          .from('video_likes')
          .upsert({
            video_id: video.id,
            user_id: user.id
          });

        setViewerLiked(true);

        setDisplayVideos((previous) =>
          previous.map((item) =>
            item.id === video.id
              ? {
                  ...item,
                  likes_count:
                    (item.likes_count ||
                      0) + 1
                }
              : item
          )
        );
      }
    } catch (error) {
      console.error(
        'Like error:',
        error
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * Double tap like
   * ------------------------------------------------------------
   */

  const handleVideoTap = (
    index
  ) => {
    const now = Date.now();

    if (
      now - lastTap <
      300
    ) {
      setViewerIndex(index);
      setViewerOpen(true);
      setViewerLiked(true);
      handleViewerLike();
    } else {
      openViewer(index);
    }

    setLastTap(now);
  };

  /*
   * ------------------------------------------------------------
   * Thumbnail / video hover
   * ------------------------------------------------------------
   */

  const handleMouseEnter = async (
    event
  ) => {
    try {
      const playPromise =
        event.currentTarget.play();

      if (
        playPromise !==
        undefined
      ) {
        await playPromise;
      }
    } catch {
      // Browser autoplay restrictions
    }
  };

  const handleMouseLeave = (
    event
  ) => {
    try {
      event.currentTarget.pause();
      event.currentTarget.currentTime = 0;
    } catch {
      // Ignore media cleanup errors
    }
  };

  /*
   * ------------------------------------------------------------
   * Pull to refresh
   * ------------------------------------------------------------
   */

  const handleTouchStart = (
    event
  ) => {
    scrollStartYRef.current =
      event.touches[0].clientY;
  };

  const handleTouchEnd = async (
    event
  ) => {
    const endY =
      event.changedTouches[0].clientY;

    const distance =
      endY -
      scrollStartYRef.current;

    const container =
      event.currentTarget;

    if (
      container.scrollTop <= 0 &&
      distance > 100 &&
      !refreshing
    ) {
      setRefreshing(true);

      try {
        await fetchProfileData();

        await fetchTabData({
          reset: true,
          requestedPage: 0
        });
      } finally {
        setRefreshing(false);
      }
    }
  };

  /*
   * ------------------------------------------------------------
   * Copy profile link
   * ------------------------------------------------------------
   */

  const copyProfileLink =
    async () => {
      try {
        await navigator.clipboard.writeText(
          getAbsoluteProfileUrl()
        );

        setProfileMenuOpen(false);
      } catch (error) {
        console.error(
          'Copy profile link failed:',
          error
        );
      }
    };

  /*
   * ------------------------------------------------------------
   * Native share
   * ------------------------------------------------------------
   */

  const shareProfile = async () => {
    const url =
      getAbsoluteProfileUrl();

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title: `@${profile?.username || 'profile'}`,
          text:
            profile?.bio ||
            `View @${profile?.username || 'profile'} on Con-Universe`,
          url
        });
      } else {
        await navigator.clipboard.writeText(
          url
        );
      }
    } catch (error) {
      if (
        error?.name !==
        'AbortError'
      ) {
        console.error(
          'Share failed:',
          error
        );
      }
    }
  };

  /*
   * ------------------------------------------------------------
   * Keyboard viewer controls
   * ------------------------------------------------------------
   */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (!viewerOpen) return;

      if (
        event.key ===
        'Escape'
      ) {
        closeViewer();
      }

      if (
        event.key ===
        'ArrowRight'
      ) {
        goNextVideo();
      }

      if (
        event.key ===
        'ArrowLeft'
      ) {
        goPreviousVideo();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
  }, [
    viewerOpen,
    viewerIndex,
    displayVideos.length
  ]);

  /*
   * ------------------------------------------------------------
   * Loading
   * ------------------------------------------------------------
   */

  if (
    profileLoading &&
    !profile
  ) {
    return (
      <div className="h-screen bg-[#050508] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute w-[300px] h-[300px] bg-cyan-500/20 rounded-full blur-[120px]" />

        <div className="text-cyan-400 font-black italic tracking-widest animate-pulse mb-4 uppercase drop-shadow-[0_0_12px_#00f3ff]">
          Initializing Neon Universe...
        </div>

        <div className="w-48 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00f3ff]" />
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * Profile not found / error
   * ------------------------------------------------------------
   */

  if (
    profileError &&
    !profile
  ) {
    return (
      <div className="min-h-screen bg-[#06060c] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-5">
            <AlertCircle size={36} />
          </div>

          <h1 className="text-xl font-black uppercase tracking-widest text-red-400">
            Profile unavailable
          </h1>

          <p className="text-sm text-zinc-500 mt-3">
            {profileError}
          </p>

          <button
            onClick={fetchProfileData}
            className="mt-6 px-6 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-black uppercase text-xs flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * Private blocked profile
   * ------------------------------------------------------------
   */

  const isPrivateLocked =
    Boolean(
      !isOwnProfile &&
      profile?.is_private &&
      !isFollowingTarget
    );

  const currentVideo =
    displayVideos[viewerIndex];

  return (
    <div
      className="h-screen bg-[#06060c] text-white font-sans flex flex-col overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient neon background */}

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[130px] rounded-full" />

        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-500/10 blur-[130px] rounded-full" />
      </div>

      {/* Pull refresh */}

      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{
              y: -40,
              opacity: 0
            }}
            animate={{
              y: 0,
              opacity: 1
            }}
            exit={{
              y: -40,
              opacity: 0
            }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-[100] text-cyan-400"
          >
            <Loader2
              size={22}
              className="animate-spin"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}

      <nav className="flex items-center justify-between px-6 py-4 bg-[#0a0a14]/90 backdrop-blur-xl border-b border-cyan-500/30 z-50 shrink-0 shadow-[0_0_20px_rgba(0,243,255,0.15)]">
        {!isOwnProfile ? (
          <button
            onClick={() =>
              navigate(-1)
            }
            className="p-2 bg-[#0d0d1a] border border-cyan-500/40 hover:border-cyan-400 rounded-full text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.3)] active:translate-y-[2px] transition-all"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <Link
            to="/find-friends"
            className="p-2 bg-[#0d0d1a] border border-cyan-500/40 hover:border-cyan-400 rounded-full text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.3)] active:translate-y-[2px] transition-all"
          >
            <UserPlus size={22} />
          </Link>
        )}

        <h2 className="text-sm font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
          {profile?.username ||
            'Username'}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={shareProfile}
            className="p-2 bg-[#0d0d1a] border border-pink-500/40 hover:border-pink-400 rounded-full text-pink-500 shadow-[0_0_10px_rgba(255,0,80,0.3)]"
            title="Share profile"
          >
            <Share2 size={20} />
          </button>

          <button
            onClick={() =>
              setProfileMenuOpen(
                (previous) =>
                  !previous
              )
            }
            className="p-2 bg-[#0d0d1a] border border-cyan-500/40 hover:border-cyan-400 rounded-full text-cyan-400"
            title="Profile menu"
          >
            <MoreVertical
              size={20}
            />
          </button>

          {isOwnProfile && (
            <Link
              to="/settings"
              className="p-2 bg-[#0d0d1a] border border-cyan-500/40 hover:border-cyan-400 rounded-full text-cyan-400"
            >
              <Settings
                size={20}
              />
            </Link>
          )}
        </div>

        {/* Profile menu */}

        <AnimatePresence>
          {profileMenuOpen && (
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: -5
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: -5
              }}
              className="absolute right-4 top-16 w-64 bg-[#0b0b15] border border-cyan-500/30 rounded-2xl shadow-[0_0_35px_rgba(0,243,255,0.15)] overflow-hidden"
            >
              <button
                onClick={copyProfileLink}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cyan-500/10 text-sm"
              >
                <Copy
                  size={17}
                />
                Copy Profile Link
              </button>

              <button
                onClick={() =>
                  setQrOpen(true)
                }
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cyan-500/10 text-sm"
              >
                <QrCode
                  size={17}
                />
                Profile QR Code
              </button>

              {!isOwnProfile && (
                <>
                  <button
                    onClick={handleMute}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cyan-500/10 text-sm"
                  >
                    <VolumeX
                      size={17}
                    />
                    {isMuted
                      ? 'Unmute User'
                      : 'Mute User'}
                  </button>

                  <button
                    onClick={handleBlock}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 text-red-400 text-sm"
                  >
                    <Ban
                      size={17}
                    />
                    Block User
                  </button>

                  <button
                    onClick={handleReport}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 text-red-400 text-sm"
                  >
                    <Flag
                      size={17}
                    />
                    Report Profile
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main scroll area */}

      <div className="flex-1 overflow-y-auto pb-28 custom-scrollbar relative z-10">

        {/* Cover */}

        <section className="relative">
          <div className="h-40 sm:h-52 w-full overflow-hidden bg-[#0b0b15] border-b border-cyan-500/20">
            {getCover(profile) ? (
              <img
                src={getCover(profile)}
                alt="Profile cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute w-56 h-56 bg-cyan-400 rounded-full blur-[100px] -top-20 left-10" />
                  <div className="absolute w-56 h-56 bg-pink-500 rounded-full blur-[100px] top-10 right-0" />
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}

          <div className="absolute left-1/2 -translate-x-1/2 -bottom-14">
            <motion.div
              initial={{
                scale: 0.8,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 shadow-[0_0_30px_rgba(0,243,255,0.6)]"
            >
              <div className="w-full h-full rounded-full bg-[#090912] p-1 relative">
                <img
                  src={getAvatar(
                    profile,
                    targetUserId
                  )}
                  className="w-full h-full rounded-full object-cover"
                  alt="Profile"
                />

                {profile?.is_online && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-black shadow-[0_0_10px_#22c55e]" />
                )}
              </div>
            </motion.div>

            {profile?.is_verified && (
              <div className="absolute bottom-0 right-0 bg-cyan-400 p-1.5 rounded-full border-2 border-black shadow-[0_0_10px_#00f3ff]">
                <Check
                  size={13}
                  className="text-black"
                  strokeWidth={4}
                />
              </div>
            )}
          </div>
        </section>

        {/* Profile information */}

        <section className="flex flex-col items-center pt-20 pb-5 px-4">

          {/* Online state */}

          <div className="flex items-center gap-2 mb-2">
            {profile?.is_online ? (
              <>
                <Wifi
                  size={13}
                  className="text-green-400"
                />
                <span className="text-[10px] uppercase tracking-widest text-green-400 font-bold">
                  Online
                </span>
              </>
            ) : (
              <>
                <WifiOff
                  size={13}
                  className="text-zinc-600"
                />
                <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                  Offline
                </span>
              </>
            )}
          </div>

          {/* Display name */}

          <h1 className="text-xl font-black text-white tracking-wide">
            {getDisplayName(profile)}
          </h1>

          {/* Username */}

          <p className="text-sm text-cyan-400 font-bold mt-1">
            @{profile?.username ||
              'user'}

            {profile?.is_verified && (
              <span className="ml-1 text-cyan-400">
                ✓
              </span>
            )}
          </p>

          {/* Stats */}

          <div className="flex flex-wrap justify-center gap-5 sm:gap-8 my-5">

            <button
              onClick={() =>
                openFollowList(
                  'following'
                )
              }
              className="flex flex-col items-center active:scale-95 transition-transform"
            >
              <span className="font-black text-lg text-cyan-400">
                {formatCount(
                  stats.following
                )}
              </span>

              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                Following
              </span>
            </button>

            <button
              onClick={() =>
                openFollowList(
                  'followers'
                )
              }
              className="flex flex-col items-center active:scale-95 transition-transform"
            >
              <span className="font-black text-lg text-pink-500">
                {formatCount(
                  stats.followers
                )}
              </span>

              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                Followers
              </span>
            </button>

            <div className="flex flex-col items-center">
              <span className="font-black text-lg text-purple-400">
                {formatCount(
                  stats.likes
                )}
              </span>

              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                Likes
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="font-black text-lg text-cyan-300">
                {formatCount(
                  stats.views
                )}
              </span>

              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                Views
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="font-black text-lg text-fuchsia-400">
                {formatCount(
                  stats.videos
                )}
              </span>

              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">
                Videos
              </span>
            </div>
          </div>

          {/* Mutual followers */}

          {!isOwnProfile &&
            profile?.mutual_followers_count >
              0 && (
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-4">
                <UserRound
                  size={14}
                  className="text-cyan-400"
                />
                {formatCount(
                  profile.mutual_followers_count
                )}{' '}
                mutual followers
              </div>
            )}

          {/* Actions */}

          {isOwnProfile ? (
            <>
              <div className="flex gap-3 w-full max-w-xl mb-3">
                <Link
                  to="/edit-profile"
                  className="flex-1 py-2.5 bg-gradient-to-b from-[#101424] to-[#0a0d18] rounded-xl font-black text-[12px] uppercase tracking-wider text-cyan-400 border border-cyan-500/50 flex items-center justify-center gap-2"
                >
                  <Edit3
                    size={14}
                  />
                  Edit Profile
                </Link>

                <button
                  onClick={shareProfile}
                  className="flex-1 py-2.5 bg-gradient-to-b from-[#24101a] to-[#180a12] rounded-xl font-black text-[12px] uppercase tracking-wider text-pink-500 border border-pink-500/50 flex items-center justify-center gap-2"
                >
                  <ExternalLink
                    size={14}
                  />
                  Share Profile
                </button>
              </div>

              <div className="flex gap-3 w-full max-w-xl mb-5">
                <Link
                  to="/universe-tools"
                  className="flex-1 py-2.5 bg-gradient-to-b from-[#0a1e28] to-[#051118] rounded-xl font-black text-[11px] uppercase tracking-wider border border-cyan-400/60 flex items-center justify-center gap-2 text-cyan-300"
                >
                  <BarChart3
                    size={16}
                  />
                  CON-UNIVERSE TOOLS
                </Link>

                <Link
                  to="/live"
                  className="flex-1 py-2.5 bg-gradient-to-b from-[#2b0810] to-[#180308] rounded-xl font-black text-[11px] uppercase tracking-wider border border-red-500/60 flex items-center justify-center gap-2 text-red-400"
                >
                  <Radio
                    size={16}
                  />
                  LIVE UNIVERSE
                </Link>
              </div>
            </>
          ) : (
            <div className="flex gap-3 w-full max-w-xl mb-5">

              <button
                disabled={
                  actionLoading ||
                  isBlocked
                }
                onClick={
                  handleToggleFollow
                }
                className={`flex-1 py-2.5 rounded-xl font-black text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 ${
                  followRequestPending
                    ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40'
                    : isFollowingTarget
                    ? 'bg-zinc-800 text-zinc-300 border border-white/20'
                    : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white'
                }`}
              >
                {actionLoading ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : followRequestPending ? (
                  <>
                    <Clock3
                      size={16}
                    />
                    Requested
                  </>
                ) : isFollowingTarget ? (
                  <>
                    <UserCheck
                      size={16}
                    />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus
                      size={16}
                    />
                    Follow
                  </>
                )}
              </button>

              <button
                onClick={() =>
                  navigate(
                    `/messaging?userId=${targetUserId}`
                  )
                }
                className="flex-1 py-2.5 bg-[#0a1524] text-cyan-300 border border-cyan-500/50 rounded-xl font-black text-[12px] uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <MessageSquare
                  size={16}
                />
                Message
              </button>
            </div>
          )}

          {/* Bio */}

          <p className="text-xs text-center max-w-xl px-6 text-cyan-200/60 font-medium italic">
            {profile?.bio ||
              'No bio yet.'}
          </p>

          {/* Private account notice */}

          {!isOwnProfile &&
            profile?.is_private && (
              <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
                <Lock size={13} />
                Private Account
              </div>
            )}
        </section>

        {/* Content controls */}

        <div className="sticky top-0 bg-[#06060c]/95 backdrop-blur-md z-40 border-y border-cyan-500/20">

          {/* Tabs */}

          <div className="flex overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id
                  )
                }
                className={`min-w-[90px] flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-all ${
                  activeTab ===
                  tab.id
                    ? 'text-cyan-400'
                    : 'text-zinc-600'
                }`}
              >
                {tab.icon}

                <span className="text-[8px] uppercase tracking-widest font-bold">
                  {tab.label}
                </span>

                {activeTab ===
                  tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 w-12 h-[3px] bg-cyan-400 shadow-[0_0_15px_#00f3ff] rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Sort/filter */}

          {activeTab !==
            'playlists' && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setContentSort(
                      'latest'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black ${
                    contentSort ===
                    'latest'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-zinc-600'
                  }`}
                >
                  <Clock3
                    size={12}
                    className="inline mr-1"
                  />
                  Latest
                </button>

                <button
                  onClick={() =>
                    setContentSort(
                      'popular'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black ${
                    contentSort ===
                    'popular'
                      ? 'bg-pink-500/15 text-pink-300 border border-pink-500/30'
                      : 'text-zinc-600'
                  }`}
                >
                  <Flame
                    size={12}
                    className="inline mr-1"
                  />
                  Popular
                </button>

                <button
                  onClick={() =>
                    setContentSort(
                      'likes'
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black ${
                    contentSort ===
                    'likes'
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      : 'text-zinc-600'
                  }`}
                >
                  <Heart
                    size={12}
                    className="inline mr-1"
                  />
                  Likes
                </button>
              </div>

              <button
                onClick={() =>
                  setContentFilter(
                    (previous) =>
                      previous ===
                      'all'
                        ? 'public'
                        : previous ===
                          'public'
                        ? 'private'
                        : 'all'
                  )
                }
                className="p-2 text-cyan-400"
                title="Filter"
              >
                <SlidersHorizontal
                  size={16}
                />
              </button>
            </div>
          )}
        </div>

        {/* Private account lock */}

        {isPrivateLocked ? (
          <div className="py-24 flex flex-col items-center text-center px-8">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-5">
              <Lock
                size={34}
                className="text-zinc-500"
              />
            </div>

            <h3 className="font-black uppercase tracking-widest text-sm">
              This Account Is Private
            </h3>

            <p className="text-xs text-zinc-500 mt-2 max-w-xs">
              Follow this account to see
              their videos and content.
            </p>
          </div>
        ) : activeTab ===
          'playlists' ? (
          <div className="py-20 flex flex-col items-center text-cyan-400/50">
            <ListVideo
              size={50}
              strokeWidth={1}
            />

            <p className="text-[10px] uppercase tracking-[3px] mt-3">
              Playlists
            </p>

            <p className="text-xs text-zinc-600 mt-2">
              Playlist content can be managed
              from the creator tools.
            </p>
          </div>
        ) : (
          <>
            {/* Content error */}

            {contentError && (
              <div className="p-5 flex items-center justify-center gap-3 text-red-400 text-xs">
                <AlertCircle
                  size={17}
                />
                {contentError}

                <button
                  onClick={() =>
                    fetchTabData({
                      reset: true,
                      requestedPage: 0
                    })
                  }
                  className="underline"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Grid */}

            <div className="grid grid-cols-3 gap-[2px] bg-cyan-500/10 p-[1px]">

              {contentLoading &&
              displayVideos.length ===
                0 ? (
                Array.from({
                  length: 9
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="aspect-[3/4] bg-[#0c0c16] animate-pulse border border-cyan-500/10"
                    />
                  )
                )
              ) : displayVideos.length >
                0 ? (
                displayVideos.map(
                  (
                    video,
                    index
                  ) => (
                    <motion.div
                      key={video.id}
                      initial={{
                        opacity: 0
                      }}
                      animate={{
                        opacity: 1
                      }}
                      onClick={() =>
                        handleVideoTap(
                          index
                        )
                      }
                      className="relative aspect-[3/4] bg-[#0c0c16] overflow-hidden group cursor-pointer active:scale-95 transition-transform border border-cyan-500/20 hover:border-cyan-400/60"
                    >
                      {/* Thumbnail */}

                      {video.thumbnail_url ? (
                        <img
                          src={
                            video.thumbnail_url
                          }
                          alt={
                            video.caption ||
                            'Video'
                          }
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={
                            video.video_url
                          }
                          poster={
                            video.thumbnail_url ||
                            undefined
                          }
                          className="absolute inset-0 w-full h-full object-cover"
                          muted
                          playsInline
                          loop
                          preload="metadata"
                          onMouseEnter={
                            handleMouseEnter
                          }
                          onMouseLeave={
                            handleMouseLeave
                          }
                        />
                      )}

                      {/* Overlay */}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10 pointer-events-none" />

                      {/* Pinned */}

                      {video.is_pinned && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 border border-cyan-400/30 text-cyan-300">
                          <Pin
                            size={10}
                          />
                          <span className="text-[8px] font-black uppercase">
                            Pinned
                          </span>
                        </div>
                      )}

                      {/* Repost */}

                      {activeTab ===
                        'reposts' && (
                        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-pink-400">
                          <Repeat2
                            size={12}
                          />
                        </div>
                      )}

                      {/* Stats */}

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">

                        <div className="flex items-center gap-1">
                          <Play
                            size={10}
                            className="fill-cyan-400 text-cyan-400"
                          />

                          <span className="text-[11px] font-black text-cyan-200">
                            {formatCount(
                              video.views_count
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-pink-300">
                          <Heart
                            size={10}
                            className="fill-pink-400"
                          />

                          <span className="text-[10px] font-bold">
                            {formatCount(
                              video.likes_count
                            )}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                )
              ) : (
                <div className="col-span-3 py-24 flex flex-col items-center opacity-40 text-cyan-400">
                  <Grid
                    size={48}
                    strokeWidth={1}
                  />

                  <p className="text-[10px] font-bold uppercase tracking-[3px] mt-2">
                    Empty Neon Universe
                  </p>
                </div>
              )}
            </div>

            {/* Infinite scroll sentinel */}

            <div
              ref={
                contentSentinelRef
              }
              className="h-20 flex items-center justify-center"
            >
              {contentLoadingMore && (
                <Loader2
                  size={20}
                  className="text-cyan-400 animate-spin"
                />
              )}

              {!hasMoreContent &&
                displayVideos.length >
                  0 && (
                  <span className="text-[9px] uppercase tracking-widest text-zinc-700">
                    End of content
                  </span>
                )}
            </div>
          </>
        )}
      </div>

      {/* Followers / Following modal */}

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{
              y: '100%'
            }}
            animate={{
              y: 0
            }}
            exit={{
              y: '100%'
            }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200
            }}
            className="fixed inset-0 z-[70] bg-[#070712] flex flex-col border-t border-cyan-500/40"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20">

              <h3 className="font-black uppercase tracking-widest text-sm text-cyan-400">
                {modalType}
              </h3>

              <button
                onClick={() =>
                  setIsModalOpen(
                    false
                  )
                }
                className="p-2 bg-[#0d0d1a] border border-cyan-500/40 text-cyan-400 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search */}

            <div className="p-4 border-b border-white/5">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                />

                <input
                  value={
                    followSearch
                  }
                  onChange={(event) =>
                    setFollowSearch(
                      event.target.value
                    )
                  }
                  placeholder={`Search ${modalType}...`}
                  className="w-full bg-[#0d0d1a] border border-cyan-500/20 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-400/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">

              {followLoading ? (
                Array.from({
                  length: 5
                }).map(
                  (_, index) => (
                    <div
                      key={index}
                      className="h-16 rounded-2xl bg-[#0d0d1a] animate-pulse"
                    />
                  )
                )
              ) : followList.length >
                0 ? (
                followList.map(
                  (item) => {
                    const isMeFollowing =
                      myFollowingIds.has(
                        item.id
                      );

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-[#0d0d1a]/80 rounded-2xl border border-cyan-500/20"
                      >
                        <div className="flex items-center gap-3 min-w-0">

                          <div className="relative shrink-0">
                            <img
                              src={getAvatar(
                                item
                              )}
                              className="w-11 h-11 rounded-full border border-cyan-400/50"
                              alt=""
                            />

                            {item.is_online && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border border-black" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-sm font-bold truncate">
                                {getDisplayName(
                                  item
                                )}
                              </p>

                              {item.is_verified && (
                                <Check
                                  size={12}
                                  className="text-cyan-400 shrink-0"
                                />
                              )}
                            </div>

                            <p className="text-[10px] text-zinc-500 truncate">
                              @{item.username}
                            </p>

                            {item.mutual_followers_count >
                              0 && (
                              <p className="text-[9px] text-cyan-500/60">
                                {item.mutual_followers_count}{' '}
                                mutual
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">

                          {modalType ===
                            'followers' &&
                            isOwnProfile && (
                              <button
                                disabled={
                                  removeLoadingId ===
                                  item.id
                                }
                                onClick={() =>
                                  handleRemoveFollower(
                                    item.id
                                  )
                                }
                                className="p-2 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"
                                title="Remove follower"
                              >
                                {removeLoadingId ===
                                item.id ? (
                                  <Loader2
                                    size={
                                      14
                                    }
                                    className="animate-spin"
                                  />
                                ) : (
                                  <UserMinus
                                    size={
                                      14
                                    }
                                  />
                                )}
                              </button>
                            )}

                          {item.id !==
                            user?.id &&
                            !isMeFollowing ? (
                            <button
                              onClick={() =>
                                handleFollowBack(
                                  item.id
                                )
                              }
                              className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase"
                            >
                              Follow Back
                            </button>
                          ) : (
                            <span className="text-cyan-400/60 text-[9px] font-black uppercase">
                              Following
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="text-center py-20 text-cyan-500/40">
                  <UserRound
                    size={40}
                    className="mx-auto mb-3"
                  />

                  <p className="text-xs uppercase tracking-widest">
                    No users found
                  </p>
                </div>
              )}

              {followLoadingMore && (
                <div className="flex justify-center py-5">
                  <Loader2
                    size={20}
                    className="animate-spin text-cyan-400"
                  />
                </div>
              )}

              {hasMoreFollowUsers &&
                followList.length >
                  0 && (
                  <button
                    onClick={() =>
                      fetchFollowList({
                        reset: false,
                        requestedPage:
                          followPage +
                          1
                      })
                    }
                    className="w-full py-3 rounded-xl border border-cyan-500/20 text-cyan-400 text-[10px] uppercase font-black"
                  >
                    Load More
                  </button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR modal */}

      <AnimatePresence>
        {qrOpen && (
          <motion.div
            initial={{
              opacity: 0
            }}
            animate={{
              opacity: 1
            }}
            exit={{
              opacity: 0
            }}
            className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() =>
              setQrOpen(false)
            }
          >
            <motion.div
              initial={{
                scale: 0.9
              }}
              animate={{
                scale: 1
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
              className="w-full max-w-sm bg-[#0b0b15] border border-cyan-500/30 rounded-3xl p-6 text-center"
            >
              <button
                onClick={() =>
                  setQrOpen(false)
                }
                className="absolute"
              >
                <X size={20} />
              </button>

              <QrCode
                size={35}
                className="mx-auto text-cyan-400 mb-4"
              />

              <h3 className="font-black uppercase tracking-widest text-sm">
                Profile QR
              </h3>

              <div className="mt-6 bg-white rounded-2xl p-6">
                <div className="aspect-square flex items-center justify-center text-black">
                  <div className="text-center">
                    <QrCode
                      size={170}
                      strokeWidth={1}
                    />

                    <p className="text-xs font-bold mt-3 break-all">
                      {profile?.username
                        ? `@${profile.username}`
                        : targetUserId}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={
                  copyProfileLink
                }
                className="w-full mt-5 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-black uppercase text-xs flex items-center justify-center gap-2"
              >
                <Copy size={15} />
                Copy Profile Link
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen video viewer */}

      <AnimatePresence>
        {viewerOpen &&
          currentVideo && (
            <motion.div
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            >

              {/* Close */}

              <button
                onClick={
                  closeViewer
                }
                className="absolute top-5 right-5 z-20 p-3 rounded-full bg-black/60 border border-white/10 text-white"
              >
                <X size={22} />
              </button>

              {/* Previous */}

              {viewerIndex >
                0 && (
                <button
                  onClick={
                    goPreviousVideo
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 text-white border border-white/10"
                >
                  <ChevronLeft
                    size={28}
                  />
                </button>
              )}

              {/* Next */}

              {viewerIndex <
                displayVideos.length -
                  1 && (
                <button
                  onClick={
                    goNextVideo
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 text-white border border-white/10"
                >
                  <ChevronRight
                    size={28}
                  />
                </button>
              )}

              {/* Video */}

              <video
                key={
                  currentVideo.id
                }
                src={
                  currentVideo.video_url
                }
                poster={
                  currentVideo.thumbnail_url ||
                  undefined
                }
                autoPlay
                controls
                playsInline
                loop
                onLoadStart={() =>
                  setViewerLoading(
                    true
                  )
                }
                onCanPlay={() =>
                  setViewerLoading(
                    false
                  )
                }
                onDoubleClick={
                  handleViewerLike
                }
                className="max-h-full max-w-full object-contain"
              />

              {viewerLoading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Loader2
                    size={35}
                    className="text-cyan-400 animate-spin"
                  />
                </div>
              )}

              {/* Video information */}

              <div className="absolute left-5 bottom-6 max-w-[70%]">

                <button
                  onClick={() =>
                    navigate(
                      `/profile/${targetUserId}`
                    )
                  }
                  className="flex items-center gap-2 mb-3"
                >
                  <img
                    src={getAvatar(
                      profile
                    )}
                    className="w-9 h-9 rounded-full border border-cyan-400"
                    alt=""
                  />

                  <span className="font-black text-sm">
                    @{profile?.username}
                  </span>

                  {profile?.is_verified && (
                    <Check
                      size={13}
                      className="text-cyan-400"
                    />
                  )}
                </button>

                {currentVideo.caption && (
                  <p className="text-sm text-white/80 line-clamp-3">
                    {
                      currentVideo.caption
                    }
                  </p>
                )}

                <div className="flex gap-4 mt-3 text-xs text-zinc-300">
                  <span>
                    {formatCount(
                      currentVideo.views_count
                    )}{' '}
                    views
                  </span>

                  <span>
                    {formatCount(
                      currentVideo.likes_count
                    )}{' '}
                    likes
                  </span>
                </div>
              </div>

              {/* Like */}

              <button
                onClick={
                  handleViewerLike
                }
                className={`absolute right-5 bottom-28 w-12 h-12 rounded-full flex items-center justify-center border ${
                  viewerLiked
                    ? 'bg-pink-500/20 border-pink-400 text-pink-400'
                    : 'bg-black/60 border-white/10 text-white'
                }`}
              >
                <Heart
                  size={23}
                  className={
                    viewerLiked
                      ? 'fill-pink-400'
                      : ''
                  }
                />
              </button>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Footer neon line */}

      <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-pink-500 to-cyan-500 bottom-0 absolute shadow-[0_0_20px_#00f3ff] z-[120]" />
    </div>
  );
};

export default Profile;
