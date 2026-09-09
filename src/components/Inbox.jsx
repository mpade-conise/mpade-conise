// src/components/Inbox.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { motion, AnimatePresence } from "framer-motion";

import {
  MessageCircle,
  UserPlus,
  Heart,
  Search,
  ArrowLeft,
  Bell,
  Loader2,
  Radio,
  Sparkles,
  X,
  CheckCheck,
  MessageSquare,
  Flame,
  Check,
  Play,
  RefreshCw,
  Plus,
  Send,
  Users,
  AtSign,
  Share2,
  Bookmark,
  Gift,
  Crown,
  ShieldAlert,
  Megaphone,
  Video,
  ChevronRight,
  MoreHorizontal,
  UserCheck,
  UserX,
  Clock3,
  Inbox as InboxIcon,
  Zap,
  CircleDot,
  Eye,
  ExternalLink,
  CircleAlert,
  SlidersHorizontal,
} from "lucide-react";

import { supabase } from "../supabaseClient";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

/*
 * ============================================================
 * INBOX
 * ============================================================
 *
 * Inbox is an overview / notification center.
 *
 * Actual conversations remain on:
 *
 *     /messaging?userId=<USER_ID>
 *
 * Inbox only displays:
 * - sender
 * - avatar
 * - message preview
 * - timestamp
 * - unread state
 *
 * IMPORTANT:
 * - Read state is persisted directly to Supabase.
 * - Mark-all-read verifies the database update.
 * - Realtime listeners are protected against duplicate channels.
 * - The entire page has a real scroll container and visible
 *   scrollbar.
 * ============================================================
 */

const Inbox = () => {
  const navigate = useNavigate();

  // ============================================================
  // DATA
  // ============================================================

  const [liveStreams, setLiveStreams] = useState([]);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [liveInvites, setLiveInvites] = useState([]);
  const [myFollows, setMyFollows] = useState(new Set());
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  // ============================================================
  // USER / LOADING
  // ============================================================

  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  // ============================================================
  // FILTER / SEARCH
  // ============================================================

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // ============================================================
  // ACTION STATES
  // ============================================================

  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingCategory, setMarkingCategory] = useState(null);
  const [markingActivityId, setMarkingActivityId] = useState(null);
  const [acceptingInviteId, setAcceptingInviteId] = useState(null);
  const [followingId, setFollowingId] = useState(null);

  // ============================================================
  // MODALS / DRAWERS
  // ============================================================

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  const [isFollowerPanelOpen, setIsFollowerPanelOpen] =
    useState(false);

  const [isLikesPanelOpen, setIsLikesPanelOpen] =
    useState(false);

  const [isCommentsPanelOpen, setIsCommentsPanelOpen] =
    useState(false);

  const [isActivityPanelOpen, setIsActivityPanelOpen] =
    useState(false);

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // ============================================================
  // ERROR / NOTICE
  // ============================================================

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ============================================================
  // REFS
  // ============================================================

  const channelRef = useRef(null);
  const mountedRef = useRef(false);
  const fetchInProgressRef = useRef(false);
  const refreshTimerRef = useRef(null);

  // ============================================================
  // TYPE HELPERS
  // ============================================================

  const isFollowerType = useCallback((type) => {
    return (
      type === "follow" ||
      type === "user_follow" ||
      type === "new_follower"
    );
  }, []);

  const isLikeType = useCallback((type) => {
    return (
      type === "like" ||
      type === "video_likes" ||
      type === "video_like" ||
      type === "video_liked"
    );
  }, []);

  const isCommentType = useCallback((type) => {
    return (
      type === "comment" ||
      type === "video_comments" ||
      type === "video_comment" ||
      type === "video_commented"
    );
  }, []);

  const isUnreadMessage = useCallback((message) => {
    if (!message) return false;

    if (typeof message.unread === "boolean") {
      return message.unread;
    }

    if (typeof message.unread === "string") {
      return message.unread.toLowerCase() === "true";
    }

    return (
      message.status === "unread" ||
      message.status === "delivered"
    );
  }, []);

  const isUnreadActivity = useCallback((activity) => {
    if (!activity) return false;

    if (typeof activity.read === "boolean") {
      return !activity.read;
    }

    if (typeof activity.read === "string") {
      return activity.read.toLowerCase() !== "true";
    }

    return false;
  }, []);

  // ============================================================
  // FORMATTERS
  // ============================================================

  const getDisplayName = useCallback((profile, fallback = "User") => {
    if (!profile) return fallback;

    return (
      profile.display_name ||
      profile.full_name ||
      profile.username ||
      fallback
    );
  }, []);

  const getUsername = useCallback((profile) => {
    if (!profile) return "";

    return profile.username
      ? `@${profile.username}`
      : "";
  }, []);

  const getTime = useCallback((date) => {
    if (!date) return "";

    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
      });
    } catch {
      return "";
    }
  }, []);

  const getActivityIcon = useCallback(
    (type) => {
      if (isFollowerType(type)) {
        return UserPlus;
      }

      if (isLikeType(type)) {
        return Heart;
      }

      if (isCommentType(type)) {
        return MessageCircle;
      }

      if (type === "share" || type === "video_share") {
        return Share2;
      }

      if (type === "save" || type === "video_save") {
        return Bookmark;
      }

      if (
        type === "repost" ||
        type === "video_repost"
      ) {
        return RefreshCw;
      }

      if (
        type === "mention" ||
        type === "tag"
      ) {
        return AtSign;
      }

      if (
        type === "gift" ||
        type === "video_gift"
      ) {
        return Gift;
      }

      return Bell;
    },
    [isFollowerType, isLikeType, isCommentType]
  );

  const getActivityText = useCallback(
    (activity) => {
      const type = activity?.type || "";

      const actor =
        getDisplayName(
          activity?.actor,
          "Someone"
        );

      if (isFollowerType(type)) {
        return `${actor} started following you`;
      }

      if (isLikeType(type)) {
        return `${actor} liked your video`;
      }

      if (isCommentType(type)) {
        return `${actor} commented on your video`;
      }

      if (
        type === "share" ||
        type === "video_share"
      ) {
        return `${actor} shared your video`;
      }

      if (
        type === "save" ||
        type === "video_save"
      ) {
        return `${actor} saved your video`;
      }

      if (
        type === "repost" ||
        type === "video_repost"
      ) {
        return `${actor} reposted your video`;
      }

      if (
        type === "mention" ||
        type === "tag"
      ) {
        return `${actor} mentioned you`;
      }

      if (
        type === "gift" ||
        type === "video_gift"
      ) {
        return `${actor} sent you a gift`;
      }

      return activity?.message ||
        activity?.text ||
        `${actor} interacted with you`;
    },
    [
      getDisplayName,
      isFollowerType,
      isLikeType,
      isCommentType,
    ]
  );

  // ============================================================
  // PROFILE FETCH
  // ============================================================

  const fetchProfilesBatch = useCallback(
    async (userIds) => {
      const uniqueIds = [
        ...new Set(
          (userIds || []).filter(Boolean)
        ),
      ];

      if (!uniqueIds.length) {
        return new Map();
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(
            "id, username, display_name, full_name, avatar_url, is_verified, verified_status, online, is_online, creator_level, creator_xp"
          )
          .in("id", uniqueIds);

        if (error) {
          console.warn(
            "Profiles fetch:",
            error.message
          );

          return new Map();
        }

        return new Map(
          (data || []).map((profile) => [
            profile.id,
            profile,
          ])
        );
      } catch (error) {
        console.warn(
          "Profiles fetch exception:",
          error
        );

        return new Map();
      }
    },
    []
  );

  // ============================================================
  // VIDEO FETCH
  // ============================================================

  const fetchVideosBatch = useCallback(
    async (videoIds) => {
      const uniqueIds = [
        ...new Set(
          (videoIds || []).filter(Boolean)
        ),
      ];

      if (!uniqueIds.length) {
        return new Map();
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from("videos")
          .select(
            "id, thumbnail_url, video_url, caption"
          )
          .in("id", uniqueIds);

        if (error) {
          console.warn(
            "Videos fetch:",
            error.message
          );

          return new Map();
        }

        return new Map(
          (data || []).map((video) => [
            video.id,
            video,
          ])
        );
      } catch {
        return new Map();
      }
    },
    []
  );

  // ============================================================
  // FETCH INBOX
  // ============================================================

  const fetchData = useCallback(
    async (
      uid,
      manual = false
    ) => {
      if (!uid || !mountedRef.current) {
        return;
      }

      if (fetchInProgressRef.current) {
        return;
      }

      fetchInProgressRef.current = true;

      if (manual) {
        setIsRefreshing(true);
      }

      try {
        setErrorMessage("");

        // ------------------------------------------------------
        // LIVE STREAMS
        // ------------------------------------------------------

        const streamsPromise =
          supabase
            .from("live_streams")
            .select(
              "*, profiles:host_id(id, username, display_name, avatar_url, is_verified)"
            )
            .eq("status", "live")
            .order("created_at", {
              ascending: false,
            });

        // ------------------------------------------------------
        // ACTIVITIES
        // ------------------------------------------------------

        const activitiesPromise =
          supabase
            .from("activities")
            .select(`
              *,
              actor:profiles!actor_id(
                id,
                username,
                display_name,
                full_name,
                avatar_url,
                is_verified,
                verified_status
              ),
              videos:video_id(
                id,
                thumbnail_url,
                video_url,
                caption
              )
            `)
            .eq("user_id", uid)
            .order("created_at", {
              ascending: false,
            })
            .limit(100);

        // ------------------------------------------------------
        // MESSAGES
        // ------------------------------------------------------

        const messagesPromise =
          supabase
            .from("messages")
            .select("*")
            .or(
              `receiver_id.eq.${uid},sender_id.eq.${uid}`
            )
            .order("updated_at", {
              ascending: false,
            })
            .limit(300);

        // ------------------------------------------------------
        // FOLLOWS
        // ------------------------------------------------------

        const followsPromise =
          supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", uid);

        // ------------------------------------------------------
        // INVITES
        // ------------------------------------------------------

        const invitesPromise =
          supabase
            .from("live_guest_requests")
            .select("*")
            .eq("user_id", uid)
            .eq("status", "invited")
            .order("created_at", {
              ascending: false,
            });

        // ------------------------------------------------------
        // SUGGESTIONS
        // ------------------------------------------------------

        const suggestedPromise =
          supabase
            .from("profiles")
            .select(
              "id, username, display_name, full_name, avatar_url, is_verified, verified_status"
            )
            .neq("id", uid)
            .limit(30);

        const [
          streamsRes,
          activitiesRes,
          messagesRes,
          followsRes,
          invitesRes,
          suggestedRes,
        ] = await Promise.all([
          streamsPromise,
          activitiesPromise,
          messagesPromise,
          followsPromise,
          invitesPromise,
          suggestedPromise,
        ]);

        if (!mountedRef.current) {
          return;
        }

        // ------------------------------------------------------
        // STREAMS
        // ------------------------------------------------------

        if (!streamsRes.error) {
          setLiveStreams(
            streamsRes.data || []
          );
        } else {
          console.warn(
            "Live streams:",
            streamsRes.error.message
          );
        }

        // ------------------------------------------------------
        // FOLLOWS
        // ------------------------------------------------------

        if (!followsRes.error) {
          setMyFollows(
            new Set(
              (followsRes.data || []).map(
                (item) =>
                  item.following_id
              )
            )
          );
        }

        // ------------------------------------------------------
        // SUGGESTIONS
        // ------------------------------------------------------

        if (!suggestedRes.error) {
          setSuggestedUsers(
            suggestedRes.data || []
          );
        }

        // ------------------------------------------------------
        // ACTIVITIES
        // ------------------------------------------------------

        let processedActivities =
          activitiesRes.data || [];

        if (
          activitiesRes.error ||
          !activitiesRes.data
        ) {
          const {
            data,
            error,
          } = await supabase
            .from("activities")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", {
              ascending: false,
            })
            .limit(100);

          if (!error && data) {
            const actorIds = data
              .map(
                (item) =>
                  item.actor_id
              )
              .filter(Boolean);

            const videoIds = data
              .map(
                (item) =>
                  item.video_id
              )
              .filter(Boolean);

            const [
              profiles,
              videos,
            ] = await Promise.all([
              fetchProfilesBatch(
                actorIds
              ),
              fetchVideosBatch(
                videoIds
              ),
            ]);

            processedActivities =
              data.map((item) => ({
                ...item,
                actor:
                  profiles.get(
                    item.actor_id
                  ) || null,
                videos:
                  videos.get(
                    item.video_id
                  ) || null,
              }));
          }
        }

        setActivities(
          processedActivities
        );

        // ------------------------------------------------------
        // MESSAGES
        // ------------------------------------------------------

        let rawMessages =
          messagesRes.data || [];

        if (
          messagesRes.error ||
          !messagesRes.data
        ) {
          const {
            data,
            error,
          } = await supabase
            .from("messages")
            .select("*")
            .or(
              `receiver_id.eq.${uid},sender_id.eq.${uid}`
            )
            .order("updated_at", {
              ascending: false,
            })
            .limit(300);

          if (!error) {
            rawMessages = data || [];
          }
        }

        // ------------------------------------------------------
        // MESSAGE PROFILE DATA
        // ------------------------------------------------------

        const messageUserIds = [
          ...new Set(
            rawMessages
              .map((message) =>
                message.sender_id === uid
                  ? message.receiver_id
                  : message.sender_id
              )
              .filter(Boolean)
          ),
        ];

        const messageProfiles =
          await fetchProfilesBatch(
            messageUserIds
          );

        // ------------------------------------------------------
        // BUILD ONE PREVIEW PER CONVERSATION
        // ------------------------------------------------------

        const conversationMap =
          new Map();

        [...rawMessages]
          .sort((a, b) => {
            const aDate = new Date(
              a.updated_at ||
                a.created_at ||
                0
            ).getTime();

            const bDate = new Date(
              b.updated_at ||
                b.created_at ||
                0
            ).getTime();

            return bDate - aDate;
          })
          .forEach((message) => {
            const otherUserId =
              message.sender_id === uid
                ? message.receiver_id
                : message.sender_id;

            if (!otherUserId) return;

            if (
              !conversationMap.has(
                otherUserId
              )
            ) {
              conversationMap.set(
                otherUserId,
                {
                  ...message,
                  other_user_id:
                    otherUserId,
                  profile:
                    messageProfiles.get(
                      otherUserId
                    ) || null,
                }
              );
            }
          });

        setMessages(
          Array.from(
            conversationMap.values()
          )
        );

        // ------------------------------------------------------
        // LIVE INVITES
        // ------------------------------------------------------

        if (
          !invitesRes.error &&
          invitesRes.data?.length
        ) {
          const streamIds = [
            ...new Set(
              invitesRes.data
                .map(
                  (invite) =>
                    invite.stream_id
                )
                .filter(Boolean)
            ),
          ];

          if (streamIds.length) {
            const {
              data,
              error,
            } = await supabase
              .from("live_streams")
              .select(
                "*, host:profiles!host_id(id, username, display_name, avatar_url, is_verified)"
              )
              .in(
                "id",
                streamIds
              )
              .eq(
                "status",
                "live"
              );

            if (!error) {
              const streamMap =
                new Map(
                  (data || []).map(
                    (stream) => [
                      stream.id,
                      stream,
                    ]
                  )
                );

              setLiveInvites(
                invitesRes.data
                  .filter((invite) =>
                    streamMap.has(
                      invite.stream_id
                    )
                  )
                  .map((invite) => ({
                    ...invite,
                    stream:
                      streamMap.get(
                        invite.stream_id
                      ),
                  }))
              );
            } else {
              setLiveInvites([]);
            }
          } else {
            setLiveInvites([]);
          }
        } else {
          setLiveInvites([]);
        }

        setLastFetchedAt(
          new Date()
        );
      } catch (error) {
        console.error(
          "Inbox fetch error:",
          error
        );

        if (mountedRef.current) {
          setErrorMessage(
            "Unable to refresh your inbox. Please try again."
          );
        }
      } finally {
        fetchInProgressRef.current =
          false;

        if (mountedRef.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [
      fetchProfilesBatch,
      fetchVideosBatch,
    ]
  );

  // ============================================================
  // AUTH + INITIAL LOAD
  // ============================================================

  useEffect(() => {
    mountedRef.current = true;

    let authSubscription;

    const initialize = async () => {
      const {
        data,
        error,
      } =
        await supabase.auth.getUser();

      if (error) {
        console.error(
          "Inbox auth:",
          error
        );

        if (mountedRef.current) {
          setLoading(false);
        }

        return;
      }

      const uid =
        data?.user?.id;

      if (!uid) {
        if (mountedRef.current) {
          setLoading(false);
        }

        return;
      }

      if (mountedRef.current) {
        setCurrentUserId(uid);
      }

      await fetchData(uid);

      if (!mountedRef.current) {
        return;
      }

      // ========================================================
      // REALTIME
      // ========================================================

      if (channelRef.current) {
        await supabase.removeChannel(
          channelRef.current
        );

        channelRef.current = null;
      }

      const channel =
        supabase.channel(
          `inbox-${uid}-${Date.now()}`
        );

      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            const newRecord =
              payload?.new;

            const oldRecord =
              payload?.old;

            const belongsToUser =
              newRecord?.receiver_id ===
                uid ||
              newRecord?.sender_id ===
                uid ||
              oldRecord?.receiver_id ===
                uid ||
              oldRecord?.sender_id ===
                uid;

            if (!belongsToUser) {
              return;
            }

            if (refreshTimerRef.current) {
              clearTimeout(
                refreshTimerRef.current
              );
            }

            refreshTimerRef.current =
              setTimeout(() => {
                if (
                  mountedRef.current
                ) {
                  fetchData(uid);
                }
              }, 250);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "activities",
            filter: `user_id=eq.${uid}`,
          },
          () => {
            if (refreshTimerRef.current) {
              clearTimeout(
                refreshTimerRef.current
              );
            }

            refreshTimerRef.current =
              setTimeout(() => {
                if (
                  mountedRef.current
                ) {
                  fetchData(uid);
                }
              }, 250);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_guest_requests",
          },
          () => {
            if (refreshTimerRef.current) {
              clearTimeout(
                refreshTimerRef.current
              );
            }

            refreshTimerRef.current =
              setTimeout(() => {
                if (
                  mountedRef.current
                ) {
                  fetchData(uid);
                }
              }, 300);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "live_streams",
          },
          () => {
            if (refreshTimerRef.current) {
              clearTimeout(
                refreshTimerRef.current
              );
            }

            refreshTimerRef.current =
              setTimeout(() => {
                if (
                  mountedRef.current
                ) {
                  fetchData(uid);
                }
              }, 300);
          }
        );

      await channel.subscribe();

      if (mountedRef.current) {
        channelRef.current =
          channel;
      }
    };

    initialize();

    const {
      data: authData,
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          session
        ) => {
          const uid =
            session?.user?.id ||
            null;

          if (!mountedRef.current) {
            return;
          }

          setCurrentUserId(uid);

          if (uid) {
            await fetchData(uid);
          }
        }
      );

    authSubscription =
      authData?.subscription;

    return () => {
      mountedRef.current =
        false;

      if (refreshTimerRef.current) {
        clearTimeout(
          refreshTimerRef.current
        );
      }

      if (channelRef.current) {
        supabase.removeChannel(
          channelRef.current
        );

        channelRef.current = null;
      }

      authSubscription?.unsubscribe();
    };
  }, [fetchData]);

  // ============================================================
  // COUNTS
  // ============================================================

  const unreadFollowers =
    useMemo(
      () =>
        activities.filter(
          (activity) =>
            isUnreadActivity(
              activity
            ) &&
            isFollowerType(
              activity.type
            )
        ).length,
      [
        activities,
        isUnreadActivity,
        isFollowerType,
      ]
    );

  const unreadLikes =
    useMemo(
      () =>
        activities.filter(
          (activity) =>
            isUnreadActivity(
              activity
            ) &&
            isLikeType(
              activity.type
            )
        ).length,
      [
        activities,
        isUnreadActivity,
        isLikeType,
      ]
    );

  const unreadComments =
    useMemo(
      () =>
        activities.filter(
          (activity) =>
            isUnreadActivity(
              activity
            ) &&
            isCommentType(
              activity.type
            )
        ).length,
      [
        activities,
        isUnreadActivity,
        isCommentType,
      ]
    );

  const unreadMessages =
    useMemo(
      () =>
        messages.filter(
          (message) =>
            message.receiver_id ===
              currentUserId &&
            isUnreadMessage(
              message
            )
        ).length,
      [
        messages,
        currentUserId,
        isUnreadMessage,
      ]
    );

  const unreadActivityTotal =
    unreadFollowers +
    unreadLikes +
    unreadComments;

  const totalUnread =
    unreadActivityTotal +
    unreadMessages;

  // ============================================================
  // SEARCH
  // ============================================================

  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  const filteredActivities =
    useMemo(() => {
      let result =
        [...activities];

      if (
        activeFilter ===
        "followers"
      ) {
        result =
          result.filter(
            (activity) =>
              isFollowerType(
                activity.type
              )
          );
      }

      if (
        activeFilter ===
        "likes"
      ) {
        result =
          result.filter(
            (activity) =>
              isLikeType(
                activity.type
              )
          );
      }

      if (
        activeFilter ===
        "comments"
      ) {
        result =
          result.filter(
            (activity) =>
              isCommentType(
                activity.type
              )
          );
      }

      if (
        activeFilter ===
        "messages"
      ) {
        return [];
      }

      if (normalizedSearch) {
        result =
          result.filter(
            (activity) => {
              const text =
                [
                  getActivityText(
                    activity
                  ),
                  activity?.actor
                    ?.username,
                  activity?.actor
                    ?.full_name,
                  activity?.message,
                  activity?.text,
                  activity?.videos
                    ?.caption,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

              return text.includes(
                normalizedSearch
              );
            }
          );
      }

      return result;
    }, [
      activities,
      activeFilter,
      normalizedSearch,
      getActivityText,
      isFollowerType,
      isLikeType,
      isCommentType,
    ]);

  const filteredMessages =
    useMemo(() => {
      if (
        activeFilter !==
          "all" &&
        activeFilter !==
          "messages"
      ) {
        return [];
      }

      if (!normalizedSearch) {
        return messages;
      }

      return messages.filter(
        (message) => {
          const text =
            [
              getDisplayName(
                message.profile
              ),
              message.profile
                ?.username,
              message.content,
              message.message,
              message.text,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return text.includes(
            normalizedSearch
          );
        }
      );
    }, [
      messages,
      activeFilter,
      normalizedSearch,
      getDisplayName,
    ]);

  // ============================================================
  // DATABASE READ HELPERS
  // ============================================================

  const updateMessagesReadInDatabase =
    useCallback(
      async (
        uid,
        messageIds = null
      ) => {
        if (!uid) {
          return {
            success: false,
            count: 0,
            error:
              "No authenticated user.",
          };
        }

        let query =
          supabase
            .from("messages")
            .update({
              unread: false,
              status: "read",
            })
            .eq(
              "receiver_id",
              uid
            )
            .eq(
              "unread",
              true
            );

        if (
          Array.isArray(
            messageIds
          ) &&
          messageIds.length
        ) {
          query =
            query.in(
              "id",
              messageIds
            );
        }

        const {
          data,
          error,
        } = await query.select(
          "id, unread, status"
        );

        if (error) {
          return {
            success: false,
            count: 0,
            error,
          };
        }

        return {
          success: true,
          count:
            data?.length || 0,
          data:
            data || [],
        };
      },
      []
    );

  const updateActivitiesReadInDatabase =
    useCallback(
      async (
        uid,
        activityIds = null
      ) => {
        if (!uid) {
          return {
            success: false,
            count: 0,
            error:
              "No authenticated user.",
          };
        }

        let query =
          supabase
            .from("activities")
            .update({
              read: true,
            })
            .eq(
              "user_id",
              uid
            )
            .eq(
              "read",
              false
            );

        if (
          Array.isArray(
            activityIds
          ) &&
          activityIds.length
        ) {
          query =
            query.in(
              "id",
              activityIds
            );
        }

        const {
          data,
          error,
        } = await query.select(
          "id, read"
        );

        if (error) {
          return {
            success: false,
            count: 0,
            error,
          };
        }

        return {
          success: true,
          count:
            data?.length || 0,
          data:
            data || [],
        };
      },
      []
    );

  // ============================================================
  // MARK ALL READ
  // ============================================================

  const handleMarkAllRead =
    useCallback(
      async () => {
        if (
          !currentUserId ||
          markingAllRead
        ) {
          return;
        }

        setMarkingAllRead(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
          /*
           * IMPORTANT:
           *
           * Database is updated FIRST.
           *
           * We do NOT immediately pretend the operation succeeded.
           * We wait for Supabase and inspect its response.
           */

          const [
            messageResult,
            activityResult,
          ] = await Promise.all([
            updateMessagesReadInDatabase(
              currentUserId
            ),
            updateActivitiesReadInDatabase(
              currentUserId
            ),
          ]);

          if (
            !messageResult.success
          ) {
            console.error(
              "Mark messages read failed:",
              messageResult.error
            );

            throw new Error(
              messageResult.error?.message ||
                "Messages could not be marked as read."
            );
          }

          if (
            !activityResult.success
          ) {
            console.error(
              "Mark activities read failed:",
              activityResult.error
            );

            throw new Error(
              activityResult.error?.message ||
                "Activities could not be marked as read."
            );
          }

          /*
           * Only after the database accepted the update do we
           * update local state.
           */

          setMessages(
            (previous) =>
              previous.map(
                (message) => {
                  if (
                    message.receiver_id ===
                    currentUserId
                  ) {
                    return {
                      ...message,
                      unread: false,
                      status: "read",
                    };
                  }

                  return message;
                }
              )
          );

          setActivities(
            (previous) =>
              previous.map(
                (activity) => ({
                  ...activity,
                  read: true,
                })
              )
          );

          /*
           * Refetch AFTER the UPDATE.
           *
           * This is important because the old implementation could
           * visually change the UI and then immediately fetch the
           * same unread rows again.
           */

          await fetchData(
            currentUserId
          );

          setSuccessMessage(
            "Everything is marked as read."
          );

          setTimeout(() => {
            if (mountedRef.current) {
              setSuccessMessage("");
            }
          }, 2500);
        } catch (error) {
          console.error(
            "Mark all read error:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Mark all as read failed. Check your Supabase update policy."
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setMarkingAllRead(false);
          }
        }
      },
      [
        currentUserId,
        markingAllRead,
        updateMessagesReadInDatabase,
        updateActivitiesReadInDatabase,
        fetchData,
      ]
    );

  // ============================================================
  // MARK MESSAGE READ
  // ============================================================

  const handleMarkMessageRead =
    useCallback(
      async (message) => {
        if (
          !currentUserId ||
          !message?.id ||
          message.receiver_id !==
            currentUserId
        ) {
          return;
        }

        const result =
          await updateMessagesReadInDatabase(
            currentUserId,
            [message.id]
          );

        if (!result.success) {
          setErrorMessage(
            result.error?.message ||
              "Unable to mark message as read."
          );

          return;
        }

        setMessages(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                message.id
                  ? {
                      ...item,
                      unread: false,
                      status: "read",
                    }
                  : item
            )
        );
      },
      [
        currentUserId,
        updateMessagesReadInDatabase,
      ]
    );

  // ============================================================
  // MARK ACTIVITY READ
  // ============================================================

  const handleMarkActivityRead =
    useCallback(
      async (activity) => {
        if (
          !currentUserId ||
          !activity?.id
        ) {
          return;
        }

        setMarkingActivityId(
          activity.id
        );

        try {
          const result =
            await updateActivitiesReadInDatabase(
              currentUserId,
              [activity.id]
            );

          if (!result.success) {
            throw result.error;
          }

          setActivities(
            (previous) =>
              previous.map(
                (item) =>
                  item.id ===
                  activity.id
                    ? {
                        ...item,
                        read: true,
                      }
                    : item
              )
          );
        } catch (error) {
          console.error(
            "Mark activity read:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Unable to mark activity as read."
          );
        } finally {
          setMarkingActivityId(
            null
          );
        }
      },
      [
        currentUserId,
        updateActivitiesReadInDatabase,
      ]
    );

  // ============================================================
  // MARK CATEGORY READ
  // ============================================================

  const handleMarkCategoryRead =
    useCallback(
      async (category) => {
        if (
          !currentUserId ||
          markingCategory
        ) {
          return;
        }

        setMarkingCategory(
          category
        );

        try {
          let activityIds = null;

          if (
            category ===
            "followers"
          ) {
            activityIds =
              activities
                .filter(
                  (item) =>
                    isFollowerType(
                      item.type
                    ) &&
                    isUnreadActivity(
                      item
                    )
                )
                .map(
                  (item) =>
                    item.id
                );
          }

          if (
            category === "likes"
          ) {
            activityIds =
              activities
                .filter(
                  (item) =>
                    isLikeType(
                      item.type
                    ) &&
                    isUnreadActivity(
                      item
                    )
                )
                .map(
                  (item) =>
                    item.id
                );
          }

          if (
            category === "comments"
          ) {
            activityIds =
              activities
                .filter(
                  (item) =>
                    isCommentType(
                      item.type
                    ) &&
                    isUnreadActivity(
                      item
                    )
                )
                .map(
                  (item) =>
                    item.id
                );
          }

          if (
            category ===
            "messages"
          ) {
            const messageIds =
              messages
                .filter(
                  (item) =>
                    item.receiver_id ===
                      currentUserId &&
                    isUnreadMessage(
                      item
                    )
                )
                .map(
                  (item) =>
                    item.id
                );

            const result =
              await updateMessagesReadInDatabase(
                currentUserId,
                messageIds
              );

            if (
              !result.success
            ) {
              throw result.error;
            }

            setMessages(
              (previous) =>
                previous.map(
                  (item) =>
                    messageIds.includes(
                      item.id
                    )
                      ? {
                          ...item,
                          unread:
                            false,
                          status:
                            "read",
                        }
                      : item
                )
            );

            return;
          }

          if (
            !activityIds?.length
          ) {
            return;
          }

          const result =
            await updateActivitiesReadInDatabase(
              currentUserId,
              activityIds
            );

          if (!result.success) {
            throw result.error;
          }

          setActivities(
            (previous) =>
              previous.map(
                (item) =>
                  activityIds.includes(
                    item.id
                  )
                    ? {
                        ...item,
                        read: true,
                      }
                    : item
              )
          );
        } catch (error) {
          console.error(
            "Mark category read:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Unable to update read status."
          );
        } finally {
          setMarkingCategory(
            null
          );
        }
      },
      [
        currentUserId,
        markingCategory,
        activities,
        messages,
        isFollowerType,
        isLikeType,
        isCommentType,
        isUnreadActivity,
        isUnreadMessage,
        updateMessagesReadInDatabase,
        updateActivitiesReadInDatabase,
      ]
    );

  // ============================================================
  // FOLLOW BACK
  // ============================================================

  const handleFollowBack =
    useCallback(
      async (userId) => {
        if (
          !currentUserId ||
          !userId ||
          followingId
        ) {
          return;
        }

        setFollowingId(userId);

        try {
          const {
            error,
          } = await supabase
            .from("follows")
            .insert({
              follower_id:
                currentUserId,
              following_id:
                userId,
            });

          if (error) {
            if (
              error.code ===
              "23505"
            ) {
              setMyFollows(
                (previous) =>
                  new Set([
                    ...previous,
                    userId,
                  ])
              );

              return;
            }

            throw error;
          }

          setMyFollows(
            (previous) =>
              new Set([
                ...previous,
                userId,
              ])
          );

          setSuggestedUsers(
            (previous) =>
              previous.filter(
                (user) =>
                  user.id !==
                  userId
              )
          );
        } catch (error) {
          console.error(
            "Follow back:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Unable to follow this user."
          );
        } finally {
          setFollowingId(null);
        }
      },
      [currentUserId, followingId]
    );

  // ============================================================
  // LIVE INVITE ACTIONS
  // ============================================================

  const handleInviteAction =
    useCallback(
      async (
        invite,
        status
      ) => {
        if (
          !invite?.id ||
          acceptingInviteId
        ) {
          return;
        }

        setAcceptingInviteId(
          invite.id
        );

        try {
          const {
            error,
          } = await supabase
            .from(
              "live_guest_requests"
            )
            .update({
              status,
            })
            .eq(
              "id",
              invite.id
            );

          if (error) {
            throw error;
          }

          setLiveInvites(
            (previous) =>
              previous.filter(
                (item) =>
                  item.id !==
                  invite.id
              )
          );

          if (
            status ===
            "approved"
          ) {
            if (
              invite.stream?.id
            ) {
              navigate(
                `/live/${invite.stream.id}`
              );
            }
          }
        } catch (error) {
          console.error(
            "Live invite:",
            error
          );

          setErrorMessage(
            error?.message ||
              "Unable to update the live invite."
          );
        } finally {
          setAcceptingInviteId(
            null
          );
        }
      },
      [
        acceptingInviteId,
        navigate,
      ]
    );

  // ============================================================
  // NAVIGATION
  // ============================================================

  const openMessages =
    useCallback(
      (userId) => {
        if (!userId) return;

        navigate(
          `/messaging?userId=${encodeURIComponent(
            userId
          )}`
        );
      },
      [navigate]
    );

  const openLive =
    useCallback(
      (streamId) => {
        if (!streamId) return;

        navigate(
          `/live/${streamId}`
        );
      },
      [navigate]
    );

  const openProfile =
    useCallback(
      (userId) => {
        if (!userId) return;

        navigate(
          `/profile/${userId}`
        );
      },
      [navigate]
    );

  const openVideo =
    useCallback(
      (videoId) => {
        if (!videoId) return;

        navigate(
          `/video/${videoId}`
        );
      },
      [navigate]
    );

  // ============================================================
  // FILTERS
  // ============================================================

  const filters = [
    {
      id: "all",
      label: "All",
      icon: InboxIcon,
      count: totalUnread,
    },
    {
      id: "likes",
      label: "Likes",
      icon: Heart,
      count: unreadLikes,
    },
    {
      id: "comments",
      label: "Comments",
      icon: MessageCircle,
      count: unreadComments,
    },
    {
      id: "messages",
      label: "Messages",
      icon: MessageSquare,
      count: unreadMessages,
    },
    {
      id: "followers",
      label: "Followers",
      icon: UserPlus,
      count: unreadFollowers,
    },
  ];

  // ============================================================
  // NEW CHAT RESULTS
  // ============================================================

  const filteredSuggestedUsers =
    useMemo(() => {
      const query =
        newChatSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return suggestedUsers;
      }

      return suggestedUsers.filter(
        (user) => {
          const text =
            [
              user.username,
              user.display_name,
              user.full_name,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          return text.includes(
            query
          );
        }
      );
    }, [
      suggestedUsers,
      newChatSearch,
    ]);

  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh =
    useCallback(
      async () => {
        if (!currentUserId) return;

        await fetchData(
          currentUserId,
          true
        );
      },
      [currentUserId, fetchData]
    );

  // ============================================================
  // UI COMPONENTS
  // ============================================================

  const Avatar = ({
    profile,
    size = "md",
    online = false,
  }) => {
    const sizes = {
      xs: "h-8 w-8",
      sm: "h-10 w-10",
      md: "h-12 w-12",
      lg: "h-14 w-14",
      xl: "h-16 w-16",
    };

    return (
      <div
        className={`relative shrink-0 ${sizes[size]}`}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/30 to-cyan-500/30 text-sm font-bold text-white ring-1 ring-white/10">
            {(
              profile?.username ||
              profile?.full_name ||
              "U"
            )
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        {online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#08080c] bg-emerald-400" />
        )}
      </div>
    );
  };

  const VerifiedBadge = ({
    profile,
  }) => {
    if (
      !profile?.is_verified &&
      profile?.verified_status !==
        "verified"
    ) {
      return null;
    }

    return (
      <span className="inline-flex items-center justify-center rounded-full bg-cyan-400/15 p-0.5 text-cyan-300">
        <Check className="h-3 w-3" />
      </span>
    );
  };

  const StatCard = ({
    icon: Icon,
    label,
    count,
    accent,
    onClick,
  }) => {
    return (
      <motion.button
        whileHover={{
          y: -2,
        }}
        whileTap={{
          scale: 0.98,
        }}
        onClick={onClick}
        className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left backdrop-blur-xl transition hover:border-white/20 ${accent}`}
      >
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.025] blur-2xl transition group-hover:bg-white/[0.06]" />

        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">
              {label}
            </p>

            <p className="mt-1 text-2xl font-black text-white">
              {count}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-2.5">
            <Icon className="h-5 w-5 text-white/75" />
          </div>
        </div>
      </motion.button>
    );
  };

  const SectionHeader = ({
    icon: Icon,
    title,
    count,
    action,
    actionLabel,
  }) => {
    return (
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <Icon className="h-4 w-4 text-white/70" />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-white">
              {title}
            </h2>

            {count !== undefined && (
              <p className="text-[11px] text-white/35">
                {count} unread
              </p>
            )}
          </div>
        </div>

        {action && (
          <button
            onClick={action}
            className="shrink-0 text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            {actionLabel || "View all"}
          </button>
        )}
      </div>
    );
  };

  const ActivityRow = ({
    activity,
  }) => {
    const Icon =
      getActivityIcon(
        activity?.type
      );

    const unread =
      isUnreadActivity(
        activity
      );

    const actor =
      activity?.actor;

    return (
      <motion.div
        layout
        initial={{
          opacity: 0,
          y: 8,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className={`group relative rounded-2xl border p-3 transition ${
          unread
            ? "border-fuchsia-400/20 bg-fuchsia-400/[0.045]"
            : "border-white/[0.07] bg-white/[0.025]"
        }`}
      >
        <div className="flex gap-3">
          <button
            onClick={() =>
              openProfile(
                actor?.id
              )
            }
            className="shrink-0"
            aria-label="Open profile"
          >
            <Avatar
              profile={actor}
              size="md"
              online={
                actor?.online ||
                actor?.is_online
              }
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() =>
                  openProfile(
                    actor?.id
                  )
                }
                className="min-w-0 text-left"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-white">
                    {getDisplayName(
                      actor,
                      "Someone"
                    )}
                  </span>

                  <VerifiedBadge
                    profile={actor}
                  />
                </div>

                {getUsername(actor) && (
                  <span className="block truncate text-[11px] text-white/35">
                    {getUsername(
                      actor
                    )}
                  </span>
                )}
              </button>

              <span className="shrink-0 text-[10px] text-white/30">
                {getTime(
                  activity?.created_at
                )}
              </span>
            </div>

            <div className="mt-2 flex items-start gap-2">
              <div className="rounded-lg border border-white/10 bg-black/20 p-1.5">
                <Icon className="h-3.5 w-3.5 text-fuchsia-300" />
              </div>

              <p className="min-w-0 flex-1 text-sm leading-5 text-white/70">
                {getActivityText(
                  activity
                )}
              </p>
            </div>

            {activity?.videos && (
              <button
                onClick={() =>
                  openVideo(
                    activity
                      .videos.id
                  )
                }
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2 text-left transition hover:bg-white/[0.04]"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/5">
                  {activity.videos
                    .thumbnail_url ? (
                    <img
                      src={
                        activity
                          .videos
                          .thumbnail_url
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play className="h-4 w-4 text-white/50" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white/60">
                    {activity
                      .videos
                      .caption ||
                      "Your video"}
                  </p>

                  <span className="text-[10px] text-white/30">
                    Open video
                  </span>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
              </button>
            )}

            <div className="mt-3 flex items-center gap-2">
              {isFollowerType(
                activity?.type
              ) &&
                actor?.id &&
                !myFollows.has(
                  actor.id
                ) && (
                  <button
                    onClick={() =>
                      handleFollowBack(
                        actor.id
                      )
                    }
                    disabled={
                      followingId ===
                      actor.id
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 transition hover:bg-cyan-400/15 disabled:opacity-50"
                  >
                    {followingId ===
                    actor.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <UserPlus className="h-3 w-3" />
                    )}
                    Follow back
                  </button>
                )}

              {unread && (
                <button
                  onClick={() =>
                    handleMarkActivityRead(
                      activity
                    )
                  }
                  disabled={
                    markingActivityId ===
                    activity.id
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-white/60 transition hover:bg-white/[0.08] disabled:opacity-50"
                >
                  {markingActivityId ===
                  activity.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  Mark read
                </button>
              )}

              {unread && (
                <span className="ml-auto h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_12px_rgba(232,121,249,0.9)]" />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const MessagePreview = ({
    message,
  }) => {
    const unread =
      message.receiver_id ===
        currentUserId &&
      isUnreadMessage(
        message
      );

    const profile =
      message.profile;

    const preview =
      message.content ||
      message.message ||
      message.text ||
      "New message";

    return (
      <motion.button
        layout
        whileTap={{
          scale: 0.99,
        }}
        onClick={async () => {
          if (unread) {
            await handleMarkMessageRead(
              message
            );
          }

          openMessages(
            message.other_user_id
          );
        }}
        className={`w-full rounded-2xl border p-3 text-left transition ${
          unread
            ? "border-cyan-400/20 bg-cyan-400/[0.045] hover:bg-cyan-400/[0.07]"
            : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.045]"
        }`}
      >
        <div className="flex gap-3">
          <Avatar
            profile={profile}
            size="md"
            online={
              profile?.online ||
              profile?.is_online
            }
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-bold text-white">
                    {getDisplayName(
                      profile
                    )}
                  </h3>

                  <VerifiedBadge
                    profile={
                      profile
                    }
                  />
                </div>

                {getUsername(
                  profile
                ) && (
                  <p className="truncate text-[11px] text-white/35">
                    {getUsername(
                      profile
                    )}
                  </p>
                )}
              </div>

              <span className="shrink-0 text-[10px] text-white/30">
                {getTime(
                  message.updated_at ||
                    message.created_at
                )}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <p
                className={`min-w-0 flex-1 truncate text-sm ${
                  unread
                    ? "font-semibold text-white/85"
                    : "text-white/50"
                }`}
              >
                {preview}
              </p>

              {unread && (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
              )}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-white/25">
                Open conversation
              </span>

              <ChevronRight className="h-4 w-4 text-white/25" />
            </div>
          </div>
        </div>
      </motion.button>
    );
  };

  const LiveCard = ({
    stream,
  }) => {
    const host =
      stream?.profiles ||
      stream?.host;

    return (
      <motion.button
        whileHover={{
          y: -2,
        }}
        whileTap={{
          scale: 0.98,
        }}
        onClick={() =>
          openLive(stream?.id)
        }
        className="group relative w-48 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] text-left"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-black">
          {stream?.thumbnail_url ? (
            <img
              src={
                stream.thumbnail_url
              }
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-500/20 via-black to-cyan-500/20">
              <Radio className="h-8 w-8 text-white/30" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-red-500/90 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Live
          </div>

          <div className="absolute bottom-3 left-3 right-3">
            <p className="truncate text-sm font-bold text-white">
              {stream?.title ||
                "Live stream"}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Avatar
                profile={host}
                size="xs"
              />

              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold text-white/80">
                  {getDisplayName(
                    host
                  )}
                </p>

                <p className="flex items-center gap-1 text-[9px] text-white/40">
                  <Eye className="h-2.5 w-2.5" />
                  {stream?.viewer_count ||
                    0}{" "}
                  watching
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.button>
    );
  };

  const InviteCard = ({
    invite,
  }) => {
    const stream =
      invite?.stream;

    const host =
      stream?.host ||
      stream?.profiles;

    const busy =
      acceptingInviteId ===
      invite?.id;

    return (
      <div className="rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.035] p-3">
        <div className="flex gap-3">
          <Avatar
            profile={host}
            size="md"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {getDisplayName(
                    host
                  )}
                </p>

                <p className="text-[11px] text-white/40">
                  invited you to join
                  a live stream
                </p>
              </div>

              <Radio className="h-4 w-4 shrink-0 text-fuchsia-300" />
            </div>

            <p className="mt-2 truncate text-xs font-semibold text-white/65">
              {stream?.title ||
                "Live stream"}
            </p>

            <div className="mt-3 flex gap-2">
              <button
                disabled={busy}
                onClick={() =>
                  handleInviteAction(
                    invite,
                    "approved"
                  )
                }
                className="flex-1 rounded-xl bg-fuchsia-500 px-3 py-2 text-xs font-black text-white transition hover:bg-fuchsia-400 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  "Join"
                )}
              </button>

              <button
                disabled={busy}
                onClick={() =>
                  handleInviteAction(
                    invite,
                    "declined"
                  )
                }
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/60 transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SuggestedUserCard = ({
    user,
  }) => {
    const alreadyFollowing =
      myFollows.has(user.id);

    return (
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
        <button
          onClick={() =>
            openProfile(user.id)
          }
        >
          <Avatar
            profile={user}
            size="sm"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-bold text-white">
              {getDisplayName(
                user
              )}
            </p>

            <VerifiedBadge
              profile={user}
            />
          </div>

          <p className="truncate text-[11px] text-white/35">
            {getUsername(user)}
          </p>
        </div>

        <button
          disabled={
            alreadyFollowing ||
            followingId ===
              user.id
          }
          onClick={() =>
            handleFollowBack(
              user.id
            )
          }
          className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-black transition ${
            alreadyFollowing
              ? "border border-white/10 bg-white/[0.04] text-white/35"
              : "bg-white text-black hover:bg-white/90"
          } disabled:opacity-60`}
        >
          {followingId ===
          user.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : alreadyFollowing ? (
            "Following"
          ) : (
            "Follow"
          )}
        </button>
      </div>
    );
  };

  // ============================================================
  // DRAWER
  // ============================================================

  const ActivityDrawer = ({
    open,
    title,
    icon: Icon,
    activities: drawerActivities,
    onClose,
  }) => {
    if (!open) {
      return null;
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{
              x: "100%",
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: "100%",
            }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
            className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#09090e]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                  <Icon className="h-5 w-5 text-fuchsia-300" />
                </div>

                <div>
                  <h3 className="font-bold text-white">
                    {title}
                  </h3>

                  <p className="text-xs text-white/35">
                    {drawerActivities.length}{" "}
                    activities
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/60 hover:bg-white/[0.08]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="inbox-scroll-area flex-1 p-4">
              <div className="space-y-3">
                {drawerActivities.length ? (
                  drawerActivities.map(
                    (activity) => (
                      <ActivityRow
                        key={
                          activity.id
                        }
                        activity={
                          activity
                        }
                      />
                    )
                  )
                ) : (
                  <EmptyState
                    icon={Icon}
                    title="Nothing here"
                    text="There are no activities in this category yet."
                  />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // ============================================================
  // EMPTY STATE
  // ============================================================

  const EmptyState = ({
    icon: Icon = InboxIcon,
    title,
    text,
    action,
    actionLabel,
  }) => {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <Icon className="h-6 w-6 text-white/25" />
        </div>

        <h3 className="mt-4 text-sm font-bold text-white/80">
          {title}
        </h3>

        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-white/35">
          {text}
        </p>

        {action && (
          <button
            onClick={action}
            className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-black text-black transition hover:bg-white/90"
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  };

  // ============================================================
  // NEW CHAT MODAL
  // ============================================================

  const NewChatModal = () => {
    if (!showNewChatModal) {
      return null;
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          onClick={() =>
            setShowNewChatModal(false)
          }
        >
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.97,
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b11] shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="font-bold text-white">
                  New message
                </h3>

                <p className="mt-0.5 text-xs text-white/35">
                  Choose someone to message
                </p>
              </div>

              <button
                onClick={() =>
                  setShowNewChatModal(
                    false
                  )
                }
                className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/60 hover:bg-white/[0.08]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-white/10 p-4">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3">
                <Search className="h-4 w-4 text-white/30" />

                <input
                  value={
                    newChatSearch
                  }
                  onChange={(event) =>
                    setNewChatSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search people..."
                  autoFocus
                  className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/25"
                />
              </div>
            </div>

            <div className="inbox-scroll-area flex-1 p-4">
              <div className="space-y-2">
                {filteredSuggestedUsers.length ? (
                  filteredSuggestedUsers.map(
                    (user) => (
                      <button
                        key={user.id}
                        onClick={() =>
                          openMessages(
                            user.id
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:bg-white/[0.06]"
                      >
                        <Avatar
                          profile={
                            user
                          }
                          size="md"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-bold text-white">
                              {getDisplayName(
                                user
                              )}
                            </p>

                            <VerifiedBadge
                              profile={
                                user
                              }
                            />
                          </div>

                          <p className="truncate text-xs text-white/35">
                            {getUsername(
                              user
                            )}
                          </p>
                        </div>

                        <MessageCircle className="h-4 w-4 text-white/30" />
                      </button>
                    )
                  )
                ) : (
                  <EmptyState
                    icon={Search}
                    title="No people found"
                    text="Try another username or display name."
                  />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07070b] text-white">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <Loader2 className="h-6 w-6 animate-spin text-fuchsia-300" />
          </div>

          <p className="mt-4 text-sm font-semibold text-white/70">
            Loading inbox...
          </p>

          <p className="mt-1 text-xs text-white/30">
            Syncing notifications and messages
          </p>
        </div>

        <style>{`
          html,
          body,
          #root {
            min-height: 100%;
          }

          body {
            overflow: hidden;
          }
        `}</style>
      </div>
    );
  }

  // ============================================================
  // MAIN
  // ============================================================

  return (
    <div className="inbox-page min-h-screen bg-[#07070b] text-white">
      <style>{`
        html,
        body,
        #root {
          min-height: 100%;
        }

        .inbox-page {
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
        }

        .inbox-scroll-area {
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(217, 70, 239, 0.85) rgba(255, 255, 255, 0.045);
        }

        .inbox-scroll-area::-webkit-scrollbar {
          width: 9px;
          height: 9px;
        }

        .inbox-scroll-area::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.035);
          border-radius: 999px;
        }

        .inbox-scroll-area::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(217, 70, 239, 0.95),
            rgba(34, 211, 238, 0.8)
          );
          border-radius: 999px;
          border: 2px solid rgba(7, 7, 11, 0.8);
        }

        .inbox-scroll-area::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(232, 121, 249, 1),
            rgba(103, 232, 249, 1)
          );
        }

        .inbox-glow {
          position: fixed;
          pointer-events: none;
          border-radius: 9999px;
          filter: blur(90px);
          opacity: 0.12;
        }

        .inbox-no-select {
          user-select: none;
        }
      `}</style>

      {/* ======================================================
          BACKGROUND GLOW
          ====================================================== */}

      <div className="inbox-glow left-[-10%] top-[10%] h-72 w-72 bg-fuchsia-500" />
      <div className="inbox-glow right-[-10%] top-[40%] h-80 w-80 bg-cyan-500" />

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="relative z-30 flex h-[72px] shrink-0 items-center border-b border-white/10 bg-[#07070b]/90 px-4 backdrop-blur-2xl sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
          <button
            onClick={() =>
              navigate(-1)
            }
            className="rounded-xl border border-white/10 bg-white/[0.035] p-2 text-white/70 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">
                Inbox
              </h1>

              {totalUnread > 0 && (
                <span className="rounded-full bg-fuchsia-500 px-2 py-0.5 text-[10px] font-black text-white shadow-[0_0_15px_rgba(217,70,239,0.35)]">
                  {totalUnread > 99
                    ? "99+"
                    : totalUnread}
                </span>
              )}
            </div>

            <p className="hidden text-[10px] text-white/30 sm:block">
              Notifications, messages and live activity
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setShowSearch(
                  (value) =>
                    !value
                )
              }
              className={`rounded-xl border p-2 transition ${
                showSearch
                  ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/[0.035] text-white/60 hover:bg-white/[0.08]"
              }`}
              aria-label="Search inbox"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={() =>
                setShowNewChatModal(
                  true
                )
              }
              className="rounded-xl border border-white/10 bg-white/[0.035] p-2 text-white/60 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="New message"
            >
              <Plus className="h-5 w-5" />
            </button>

            <button
              onClick={
                handleRefresh
              }
              disabled={
                isRefreshing
              }
              className="rounded-xl border border-white/10 bg-white/[0.035] p-2 text-white/60 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
              aria-label="Refresh inbox"
            >
              <RefreshCw
                className={`h-5 w-5 ${
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
            </button>

            <div className="relative">
              <button
                onClick={() =>
                  setShowMoreMenu(
                    (value) =>
                      !value
                  )
                }
                className="rounded-xl border border-white/10 bg-white/[0.035] p-2 text-white/60 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="More inbox options"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>

              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -4,
                      scale: 0.97,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -4,
                      scale: 0.97,
                    }}
                    className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#101016] p-1.5 shadow-2xl"
                  >
                    <button
                      onClick={() => {
                        setShowMoreMenu(
                          false
                        );
                        handleMarkAllRead();
                      }}
                      disabled={
                        markingAllRead ||
                        totalUnread ===
                          0
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-white/70 transition hover:bg-white/[0.06] disabled:opacity-40"
                    >
                      {markingAllRead ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4 text-cyan-300" />
                      )}
                      Mark everything as read
                    </button>

                    <button
                      onClick={() => {
                        setShowMoreMenu(
                          false
                        );
                        setActiveFilter(
                          "all"
                        );
                        setSearchQuery(
                          ""
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-white/70 transition hover:bg-white/[0.06]"
                    >
                      <SlidersHorizontal className="h-4 w-4 text-white/40" />
                      Reset filters
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================
          SCROLLING CONTENT
          ====================================================== */}

      <main className="inbox-scroll-area h-[calc(100dvh-72px)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 pb-16 sm:px-6 lg:px-8">
          {/* ==================================================
              NOTICES
              ================================================== */}

          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                className="mb-4 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-3"
              >
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-red-200">
                    Inbox update failed
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-200/60">
                    {errorMessage}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setErrorMessage(
                      ""
                    )
                  }
                  className="text-red-200/50 hover:text-red-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3"
              >
                <CheckCheck className="h-5 w-5 text-emerald-300" />

                <p className="text-xs font-semibold text-emerald-200">
                  {successMessage}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==================================================
              SEARCH
              ================================================== */}

          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{
                  opacity: 0,
                  height: 0,
                }}
                animate={{
                  opacity: 1,
                  height: "auto",
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                }}
                className="overflow-hidden"
              >
                <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5 shrink-0 text-white/30" />

                    <input
                      value={
                        searchQuery
                      }
                      onChange={(
                        event
                      ) =>
                        setSearchQuery(
                          event.target
                            .value
                        )
                      }
                      placeholder="Search activities and messages..."
                      autoFocus
                      className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                    />

                    {searchQuery && (
                      <button
                        onClick={() =>
                          setSearchQuery(
                            ""
                          )
                        }
                        className="rounded-lg p-1 text-white/40 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ==================================================
              TOP ACTION AREA
              ================================================== */}

          <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-2">
                  <Sparkles className="h-5 w-5 text-fuchsia-300" />
                </div>

                <div>
                  <h2 className="text-sm font-black text-white">
                    Your activity
                  </h2>

                  <p className="text-xs text-white/35">
                    {totalUnread > 0
                      ? `${totalUnread} unread item${
                          totalUnread ===
                          1
                            ? ""
                            : "s"
                        }`
                      : "You're all caught up"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={
                handleMarkAllRead
              }
              disabled={
                markingAllRead ||
                totalUnread ===
                  0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {markingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              {markingAllRead
                ? "Saving..."
                : "Mark all as read"}
            </button>
          </div>

          {/* ==================================================
              BENTO STATS
              ================================================== */}

          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-300" />

                <h2 className="text-sm font-bold text-white">
                  Overview
                </h2>
              </div>

              {lastFetchedAt && (
                <span className="text-[10px] text-white/25">
                  Updated{" "}
                  {getTime(
                    lastFetchedAt
                  )}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard
                icon={InboxIcon}
                label="Unread"
                count={
                  totalUnread
                }
                accent="hover:border-fuchsia-400/20"
                onClick={() =>
                  setActiveFilter(
                    "all"
                  )
                }
              />

              <StatCard
                icon={Heart}
                label="Likes"
                count={
                  unreadLikes
                }
                accent="hover:border-pink-400/20"
                onClick={() =>
                  setActiveFilter(
                    "likes"
                  )
                }
              />

              <StatCard
                icon={MessageCircle}
                label="Comments"
                count={
                  unreadComments
                }
                accent="hover:border-cyan-400/20"
                onClick={() =>
                  setActiveFilter(
                    "comments"
                  )
                }
              />

              <StatCard
                icon={UserPlus}
                label="Followers"
                count={
                  unreadFollowers
                }
                accent="hover:border-emerald-400/20"
                onClick={() =>
                  setActiveFilter(
                    "followers"
                  )
                }
              />

              <StatCard
                icon={MessageSquare}
                label="Messages"
                count={
                  unreadMessages
                }
                accent="hover:border-violet-400/20"
                onClick={() =>
                  setActiveFilter(
                    "messages"
                  )
                }
              />
            </div>
          </section>

          {/* ==================================================
              FILTERS
              ================================================== */}

          <section className="mb-6">
            <div className="inbox-scroll-area overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {filters.map(
                  (filter) => {
                    const Icon =
                      filter.icon;

                    const active =
                      activeFilter ===
                      filter.id;

                    return (
                      <button
                        key={
                          filter.id
                        }
                        onClick={() =>
                          setActiveFilter(
                            filter.id
                          )
                        }
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                          active
                            ? "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200"
                            : "border-white/10 bg-white/[0.025] text-white/45 hover:bg-white/[0.06] hover:text-white/70"
                        }`}
                      >
                        <Icon className="h-4 w-4" />

                        {filter.label}

                        {filter.count >
                          0 && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                              active
                                ? "bg-fuchsia-400/20 text-fuchsia-200"
                                : "bg-white/10 text-white/50"
                            }`}
                          >
                            {filter.count >
                            99
                              ? "99+"
                              : filter.count}
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          {/* ==================================================
              LIVE AREA
              ================================================== */}

          {activeFilter ===
            "all" &&
            !normalizedSearch && (
              <>
                {liveInvites.length >
                  0 && (
                  <section className="mb-7">
                    <SectionHeader
                      icon={Radio}
                      title="Live invitations"
                      count={
                        liveInvites.length
                      }
                    />

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {liveInvites.map(
                        (invite) => (
                          <InviteCard
                            key={
                              invite.id
                            }
                            invite={
                              invite
                            }
                          />
                        )
                      )}
                    </div>
                  </section>
                )}

                {liveStreams.length >
                  0 && (
                  <section className="mb-7">
                    <SectionHeader
                      icon={Radio}
                      title="Live now"
                      action={() =>
                        navigate(
                          "/live"
                        )
                      }
                      actionLabel="See all"
                    />

                    <div className="inbox-scroll-area flex gap-3 overflow-x-auto pb-2">
                      {liveStreams.map(
                        (
                          stream
                        ) => (
                          <LiveCard
                            key={
                              stream.id
                            }
                            stream={
                              stream
                            }
                          />
                        )
                      )}
                    </div>
                  </section>
                )}
              </>
            )}

          {/* ==================================================
              MAIN CONTENT GRID
              ================================================== */}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            {/* =================================================
                ACTIVITIES
                ================================================= */}

            <section>
              <SectionHeader
                icon={Bell}
                title={
                  activeFilter ===
                  "messages"
                    ? "Messages"
                    : "Activity"
                }
                count={
                  activeFilter ===
                  "messages"
                    ? unreadMessages
                    : unreadActivityTotal
                }
                action={
                  activeFilter ===
                    "all" &&
                  activities.length >
                    0
                    ? () =>
                        setIsActivityPanelOpen(
                          true
                        )
                    : undefined
                }
                actionLabel="View all"
              />

              {activeFilter ===
                "messages" ? (
                <div className="space-y-3">
                  {filteredMessages.length ? (
                    filteredMessages.map(
                      (message) => (
                        <MessagePreview
                          key={
                            message.id
                          }
                          message={
                            message
                          }
                        />
                      )
                    )
                  ) : (
                    <EmptyState
                      icon={
                        MessageSquare
                      }
                      title="No messages"
                      text="You don't have any message previews matching this search."
                      action={() =>
                        setShowNewChatModal(
                          true
                        )
                      }
                      actionLabel="Start a message"
                    />
                  )}
                </div>
              ) : filteredActivities.length ? (
                <div className="space-y-3">
                  {filteredActivities.map(
                    (
                      activity
                    ) => (
                      <ActivityRow
                        key={
                          activity.id
                        }
                        activity={
                          activity
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={
                    activeFilter ===
                    "followers"
                      ? UserPlus
                      : activeFilter ===
                        "likes"
                      ? Heart
                      : activeFilter ===
                        "comments"
                      ? MessageCircle
                      : InboxIcon
                  }
                  title={
                    normalizedSearch
                      ? "No matching activity"
                      : activeFilter ===
                        "all"
                      ? "You're all caught up"
                      : `No ${activeFilter} yet`
                  }
                  text={
                    normalizedSearch
                      ? "Try another search term."
                      : "New activity will appear here when people interact with you."
                  }
                />
              )}
            </section>

            {/* =================================================
                SIDEBAR
                ================================================= */}

            <aside className="space-y-6">
              {/* =================================================
                  MESSAGE PREVIEWS
                  ================================================= */}

              {activeFilter ===
                "all" && (
                <section>
                  <SectionHeader
                    icon={
                      MessageSquare
                    }
                    title="Messages"
                    count={
                      unreadMessages
                    }
                    action={() =>
                      setActiveFilter(
                        "messages"
                      )
                    }
                    actionLabel="Open"
                  />

                  <div className="space-y-3">
                    {messages.length ? (
                      messages
                        .slice(0, 5)
                        .map(
                          (
                            message
                          ) => (
                            <MessagePreview
                              key={
                                message.id
                              }
                              message={
                                message
                              }
                            />
                          )
                        )
                    ) : (
                      <EmptyState
                        icon={
                          MessageSquare
                        }
                        title="No messages"
                        text="Message previews will appear here."
                        action={() =>
                          setShowNewChatModal(
                            true
                          )
                        }
                        actionLabel="New message"
                      />
                    )}
                  </div>
                </section>
              )}

              {/* =================================================
                  SUGGESTIONS
                  ================================================= */}

              {activeFilter ===
                "all" && (
                <section>
                  <SectionHeader
                    icon={
                      UserPlus
                    }
                    title="People you may know"
                  />

                  <div className="space-y-2">
                    {suggestedUsers
                      .filter(
                        (user) =>
                          !myFollows.has(
                            user.id
                          )
                      )
                      .slice(0, 5)
                      .map(
                        (user) => (
                          <SuggestedUserCard
                            key={
                              user.id
                            }
                            user={
                              user
                            }
                          />
                        )
                      )}

                    {!suggestedUsers.length && (
                      <EmptyState
                        icon={
                          Users
                        }
                        title="No suggestions"
                        text="New people to connect with will appear here."
                      />
                    )}
                  </div>
                </section>
              )}

              {/* =================================================
                  QUICK ACTIONS
                  ================================================= */}

              {activeFilter ===
                "all" && (
                <section>
                  <SectionHeader
                    icon={Zap}
                    title="Quick actions"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        setActiveFilter(
                          "messages"
                        )
                      }
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left transition hover:bg-white/[0.06]"
                    >
                      <MessageCircle className="h-5 w-5 text-cyan-300" />

                      <p className="mt-3 text-xs font-bold text-white">
                        Messages
                      </p>

                      <p className="mt-1 text-[10px] text-white/30">
                        View conversations
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        setShowNewChatModal(
                          true
                        )
                      }
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left transition hover:bg-white/[0.06]"
                    >
                      <Send className="h-5 w-5 text-fuchsia-300" />

                      <p className="mt-3 text-xs font-bold text-white">
                        New message
                      </p>

                      <p className="mt-1 text-[10px] text-white/30">
                        Start a conversation
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        setIsFollowerPanelOpen(
                          true
                        )
                      }
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left transition hover:bg-white/[0.06]"
                    >
                      <UserPlus className="h-5 w-5 text-emerald-300" />

                      <p className="mt-3 text-xs font-bold text-white">
                        Followers
                      </p>

                      <p className="mt-1 text-[10px] text-white/30">
                        Recent followers
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        setIsLikesPanelOpen(
                          true
                        )
                      }
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left transition hover:bg-white/[0.06]"
                    >
                      <Heart className="h-5 w-5 text-pink-300" />

                      <p className="mt-3 text-xs font-bold text-white">
                        Likes
                      </p>

                      <p className="mt-1 text-[10px] text-white/30">
                        Video reactions
                      </p>
                    </button>
                  </div>
                </section>
              )}
            </aside>
          </div>

          {/* ==================================================
              FOOTER
              ================================================== */}

          <div className="mt-10 flex flex-col items-center justify-center gap-2 border-t border-white/[0.06] pt-6 text-center">
            <div className="flex items-center gap-2 text-white/20">
              <CircleDot className="h-3 w-3" />

              <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                Inbox synced
              </span>

              <CircleDot className="h-3 w-3" />
            </div>

            <p className="text-[10px] text-white/15">
              Read status is synchronized with your account.
            </p>
          </div>
        </div>
      </main>

      {/* ======================================================
          DRAWERS
          ====================================================== */}

      <ActivityDrawer
        open={
          isFollowerPanelOpen
        }
        title="Followers"
        icon={UserPlus}
        activities={activities.filter(
          (activity) =>
            isFollowerType(
              activity.type
            )
        )}
        onClose={() =>
          setIsFollowerPanelOpen(
            false
          )
        }
      />

      <ActivityDrawer
        open={
          isLikesPanelOpen
        }
        title="Likes"
        icon={Heart}
        activities={activities.filter(
          (activity) =>
            isLikeType(
              activity.type
            )
        )}
        onClose={() =>
          setIsLikesPanelOpen(
            false
          )
        }
      />

      <ActivityDrawer
        open={
          isCommentsPanelOpen
        }
        title="Comments"
        icon={MessageCircle}
        activities={activities.filter(
          (activity) =>
            isCommentType(
              activity.type
            )
        )}
        onClose={() =>
          setIsCommentsPanelOpen(
            false
          )
        }
      />

      <ActivityDrawer
        open={
          isActivityPanelOpen
        }
        title="All activity"
        icon={Bell}
        activities={activities}
        onClose={() =>
          setIsActivityPanelOpen(
            false
          )
        }
      />

      {/* ======================================================
          NEW CHAT
          ====================================================== */}

      <NewChatModal />
    </div>
  );
};

export default Inbox;
