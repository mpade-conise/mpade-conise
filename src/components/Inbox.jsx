import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
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
  Clock3,
  Inbox as InboxIcon,
  Zap,
  CircleDot,
} from "lucide-react";

import { supabase } from "../supabaseClient";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

/*
 * ============================================================
 * INBOX
 * ============================================================
 *
 * IMPORTANT ARCHITECTURE
 * ------------------------------------------------------------
 * Inbox is an overview/notification center.
 *
 * The actual conversation UI remains on:
 *
 *     /messaging?userId=<USER_ID>
 *
 * Inbox therefore only displays:
 * - sender
 * - avatar
 * - last message preview
 * - timestamp
 * - unread count
 *
 * Existing Supabase fetching/realtime architecture is preserved.
 * ============================================================
 */

const Inbox = () => {
  const navigate = useNavigate();

  // =========================================================
  // DATA STATES
  // =========================================================

  const [liveStreams, setLiveStreams] = useState([]);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [liveInvites, setLiveInvites] = useState([]);
  const [myFollows, setMyFollows] = useState(new Set());
  const [suggestedUsers, setSuggestedUsers] = useState([]);

  // =========================================================
  // CONTROL STATES
  // =========================================================

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // =========================================================
  // FILTER / SEARCH
  // =========================================================

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [showNewChatModal, setShowNewChatModal] =
    useState(false);

  const [newChatSearch, setNewChatSearch] =
    useState("");

  const [acceptingInviteId, setAcceptingInviteId] =
    useState(null);

  const [markingAllRead, setMarkingAllRead] =
    useState(false);

  const [showMoreMenu, setShowMoreMenu] =
    useState(false);

  // =========================================================
  // DRAWERS
  // =========================================================

  const [isFollowerPanelOpen, setIsFollowerPanelOpen] =
    useState(false);

  const [isLikesPanelOpen, setIsLikesPanelOpen] =
    useState(false);

  const [isCommentsPanelOpen, setIsCommentsPanelOpen] =
    useState(false);

  const [isActivityPanelOpen, setIsActivityPanelOpen] =
    useState(false);

  // =========================================================
  // REFS
  // =========================================================

  const channelRef = useRef(null);

  const mountedRef = useRef(false);

  const fetchInProgressRef = useRef(false);

  // =========================================================
  // HELPERS
  // =========================================================

  const isFollowerType = useCallback((type) => {
    return (
      type === "follow" ||
      type === "user_follow"
    );
  }, []);

  const isLikeType = useCallback((type) => {
    return (
      type === "like" ||
      type === "video_likes" ||
      type === "video_like"
    );
  }, []);

  const isCommentType = useCallback((type) => {
    return (
      type === "comment" ||
      type === "video_comments" ||
      type === "video_comment"
    );
  }, []);

  const isUnreadMessage = useCallback((message) => {
    if (!message) {
      return false;
    }

    if (
      typeof message.unread === "boolean"
    ) {
      return message.unread === true;
    }

    if (
      typeof message.unread === "string"
    ) {
      return message.unread.toLowerCase() === "true";
    }

    return (
      message.status === "unread" ||
      message.status === "delivered"
    );
  }, []);

  // =========================================================
  // FETCH PROFILES
  // =========================================================

  const fetchProfilesBatch = useCallback(
    async (userIds) => {
      if (
        !userIds ||
        userIds.length === 0
      ) {
        return new Map();
      }

      const uniqueIds = [
        ...new Set(
          userIds.filter(Boolean)
        ),
      ];

      if (
        uniqueIds.length === 0
      ) {
        return new Map();
      }

      try {
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(
            "id, username, avatar_url, full_name, is_verified, online"
          )
          .in("id", uniqueIds);

        if (error) {
          console.warn(
            "Profiles batch fetch error:",
            error.message
          );

          return new Map();
        }

        return new Map(
          (data || []).map(
            (profile) => [
              profile.id,
              profile,
            ]
          )
        );
      } catch (error) {
        console.warn(
          "Fallback profiles fetch error:",
          error
        );

        return new Map();
      }
    },
    []
  );

  // =========================================================
  // FETCH VIDEOS
  // =========================================================

  const fetchVideosBatch = useCallback(
    async (videoIds) => {
      if (
        !videoIds ||
        videoIds.length === 0
      ) {
        return new Map();
      }

      const uniqueIds = [
        ...new Set(
          videoIds.filter(Boolean)
        ),
      ];

      if (
        uniqueIds.length === 0
      ) {
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
            "Videos batch fetch error:",
            error.message
          );

          return new Map();
        }

        return new Map(
          (data || []).map(
            (video) => [
              video.id,
              video,
            ]
          )
        );
      } catch (error) {
        console.warn(
          "Fallback videos fetch error:",
          error
        );

        return new Map();
      }
    },
    []
  );

  // =========================================================
  // FETCH MAIN DATA
  // =========================================================

  const fetchData = useCallback(
    async (
      uid,
      isManual = false
    ) => {
      if (
        !uid ||
        !mountedRef.current
      ) {
        return;
      }

      if (
        fetchInProgressRef.current
      ) {
        return;
      }

      fetchInProgressRef.current =
        true;

      if (isManual) {
        setIsRefreshing(true);
      }

      try {
        // -----------------------------------------------------
        // LIVE STREAMS
        // -----------------------------------------------------

        const streamsPromise =
          supabase
            .from("live_streams")
            .select(
              "*, profiles:host_id(avatar_url, username)"
            )
            .eq(
              "status",
              "live"
            );

        // -----------------------------------------------------
        // ACTIVITIES
        // -----------------------------------------------------

        const activitiesPromise =
          supabase
            .from("activities")
            .select(`
              *,
              actor:profiles!actor_id(
                id,
                avatar_url,
                username,
                full_name,
                is_verified
              ),
              videos:video_id(
                id,
                thumbnail_url,
                video_url,
                caption
              )
            `)
            .eq(
              "user_id",
              uid
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(100);

        // -----------------------------------------------------
        // MESSAGES
        // -----------------------------------------------------

        const messagesPromise =
          supabase
            .from("messages")
            .select("*")
            .or(
              `receiver_id.eq.${uid},sender_id.eq.${uid}`
            )
            .order(
              "updated_at",
              {
                ascending:
                  false,
              }
            )
            .limit(300);

        // -----------------------------------------------------
        // FOLLOWS
        // -----------------------------------------------------

        const followsPromise =
          supabase
            .from("follows")
            .select(
              "following_id"
            )
            .eq(
              "follower_id",
              uid
            );

        // -----------------------------------------------------
        // LIVE INVITES
        // -----------------------------------------------------

        const invitesPromise =
          supabase
            .from(
              "live_guest_requests"
            )
            .select("*")
            .eq(
              "user_id",
              uid
            )
            .eq(
              "status",
              "invited"
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        // -----------------------------------------------------
        // SUGGESTED USERS
        // -----------------------------------------------------

        const suggestedUsersPromise =
          supabase
            .from("profiles")
            .select(
              "id, username, avatar_url, full_name, is_verified"
            )
            .neq(
              "id",
              uid
            )
            .limit(25);

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
          suggestedUsersPromise,
        ]);

        if (
          !mountedRef.current
        ) {
          return;
        }

        // =====================================================
        // LIVE STREAMS
        // =====================================================

        if (
          !streamsRes.error
        ) {
          setLiveStreams(
            streamsRes.data ||
              []
          );
        } else {
          console.error(
            "Live streams error:",
            streamsRes.error.message
          );
        }

        // =====================================================
        // FOLLOWS
        // =====================================================

        if (
          !followsRes.error
        ) {
          setMyFollows(
            new Set(
              (
                followsRes.data ||
                []
              ).map(
                (follow) =>
                  follow.following_id
              )
            )
          );
        } else {
          console.error(
            "Follows error:",
            followsRes.error.message
          );
        }

        // =====================================================
        // SUGGESTED USERS
        // =====================================================

        if (
          !suggestedRes.error
        ) {
          setSuggestedUsers(
            suggestedRes.data ||
              []
          );
        } else {
          console.error(
            "Suggested users error:",
            suggestedRes.error.message
          );
        }

        // =====================================================
        // ACTIVITIES
        // =====================================================

        let processedActivities =
          activitiesRes.data ||
          [];

        if (
          activitiesRes.error ||
          !activitiesRes.data
        ) {
          console.warn(
            "Activity relation query failed. Using fallback."
          );

          const {
            data: rawActivities,
            error: rawActivitiesError,
          } = await supabase
            .from("activities")
            .select("*")
            .eq(
              "user_id",
              uid
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(100);

          if (
            rawActivitiesError
          ) {
            console.error(
              "Raw activities error:",
              rawActivitiesError.message
            );

            processedActivities =
              [];
          } else if (
            rawActivities &&
            rawActivities.length >
              0
          ) {
            const actorIds = [
              ...new Set(
                rawActivities
                  .map(
                    (activity) =>
                      activity.actor_id
                  )
                  .filter(Boolean)
              ),
            ];

            const videoIds = [
              ...new Set(
                rawActivities
                  .map(
                    (activity) =>
                      activity.video_id
                  )
                  .filter(Boolean)
              ),
            ];

            const [
              profilesMap,
              videosMap,
            ] =
              await Promise.all([
                fetchProfilesBatch(
                  actorIds
                ),
                fetchVideosBatch(
                  videoIds
                ),
              ]);

            processedActivities =
              rawActivities.map(
                (activity) => ({
                  ...activity,
                  actor:
                    profilesMap.get(
                      activity.actor_id
                    ) || null,
                  videos:
                    videosMap.get(
                      activity.video_id
                    ) || null,
                })
              );
          }
        } else {
          const missingActorIds =
            processedActivities
              .filter(
                (activity) =>
                  activity.actor_id &&
                  !activity.actor
              )
              .map(
                (activity) =>
                  activity.actor_id
              );

          const missingVideoIds =
            processedActivities
              .filter(
                (activity) =>
                  activity.video_id &&
                  !activity.videos
              )
              .map(
                (activity) =>
                  activity.video_id
              );

          if (
            missingActorIds.length >
              0 ||
            missingVideoIds.length >
              0
          ) {
            const [
              profilesMap,
              videosMap,
            ] =
              await Promise.all([
                fetchProfilesBatch(
                  missingActorIds
                ),
                fetchVideosBatch(
                  missingVideoIds
                ),
              ]);

            processedActivities =
              processedActivities.map(
                (activity) => ({
                  ...activity,

                  actor:
                    activity.actor ||
                    profilesMap.get(
                      activity.actor_id
                    ) ||
                    null,

                  videos:
                    activity.videos ||
                    videosMap.get(
                      activity.video_id
                    ) ||
                    null,
                })
              );
          }
        }

        if (
          mountedRef.current
        ) {
          setActivities(
            processedActivities
          );
        }

        // =====================================================
        // LIVE INVITES
        // =====================================================

        if (
          !invitesRes.error &&
          invitesRes.data &&
          invitesRes.data.length >
            0
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

          if (
            streamIds.length >
            0
          ) {
            const {
              data: activeStreamsData,
              error: activeStreamsError,
            } = await supabase
              .from(
                "live_streams"
              )
              .select(`
                *,
                host:profiles!host_id(
                  id,
                  username,
                  avatar_url
                )
              `)
              .in(
                "id",
                streamIds
              )
              .eq(
                "status",
                "live"
              );

            if (
              activeStreamsError
            ) {
              console.error(
                "Active invite streams error:",
                activeStreamsError.message
              );

              setLiveInvites(
                []
              );
            } else {
              const streamsMap =
                new Map(
                  (
                    activeStreamsData ||
                    []
                  ).map(
                    (stream) => [
                      stream.id,
                      stream,
                    ]
                  )
                );

              const validInvites =
                invitesRes.data
                  .filter(
                    (invite) =>
                      streamsMap.has(
                        invite.stream_id
                      )
                  )
                  .map(
                    (invite) => ({
                      ...invite,
                      stream:
                        streamsMap.get(
                          invite.stream_id
                        ),
                    })
                  );

              if (
                mountedRef.current
              ) {
                setLiveInvites(
                  validInvites
                );
              }
            }
          } else {
            setLiveInvites(
              []
            );
          }
        } else {
          setLiveInvites(
            []
          );
        }

        // =====================================================
        // MESSAGES
        // =====================================================

        let rawMsgs = [];

        if (
          messagesRes.error ||
          !messagesRes.data
        ) {
          console.warn(
            "Messages query failed. Using fallback."
          );

          const {
            data: plainMsgs,
            error: plainMsgsError,
          } = await supabase
            .from("messages")
            .select("*")
            .or(
              `receiver_id.eq.${uid},sender_id.eq.${uid}`
            );

          if (
            plainMsgsError
          ) {
            console.error(
              "Fallback messages error:",
              plainMsgsError.message
            );
          } else {
            rawMsgs =
              plainMsgs ||
              [];
          }
        } else {
          rawMsgs =
            messagesRes.data ||
            [];
        }

        // =====================================================
        // PROCESS MESSAGE THREADS
        // =====================================================

        if (
          rawMsgs.length >
          0
        ) {
          rawMsgs.sort(
            (a, b) => {
              const timeA =
                new Date(
                  a.updated_at ||
                    a.created_at ||
                    0
                ).getTime();

              const timeB =
                new Date(
                  b.updated_at ||
                    b.created_at ||
                    0
                ).getTime();

              return (
                timeB -
                timeA
              );
            }
          );

          const peerUserIds =
            [
              ...new Set(
                rawMsgs
                  .map(
                    (message) =>
                      message.sender_id ===
                      uid
                        ? message.receiver_id
                        : message.sender_id
                  )
                  .filter(Boolean)
              ),
            ];

          const profilesMap =
            await fetchProfilesBatch(
              peerUserIds
            );

          const unreadCountPerPeer =
            {};

          rawMsgs.forEach(
            (message) => {
              const isForMe =
                message.receiver_id ===
                uid;

              if (
                isForMe &&
                isUnreadMessage(
                  message
                ) &&
                message.sender_id
              ) {
                const peerId =
                  message.sender_id;

                unreadCountPerPeer[
                  peerId
                ] =
                  (
                    unreadCountPerPeer[
                      peerId
                    ] || 0
                  ) + 1;
              }
            }
          );

          const uniqueThreads =
            [];

          const seenPeerIds =
            new Set();

          rawMsgs.forEach(
            (message) => {
              const isFromMe =
                message.sender_id ===
                uid;

              const peerId =
                isFromMe
                  ? message.receiver_id
                  : message.sender_id;

              if (
                !peerId ||
                seenPeerIds.has(
                  peerId
                )
              ) {
                return;
              }

              seenPeerIds.add(
                peerId
              );

              const profile =
                profilesMap.get(
                  peerId
                );

              const fallbackUsername =
                !isFromMe &&
                message.user_name
                  ? message.user_name
                  : `user_${peerId.substring(
                      0,
                      5
                    )}`;

              const displayProfile =
                {
                  id: peerId,

                  username:
                    profile?.username ||
                    fallbackUsername,

                  full_name:
                    profile?.full_name ||
                    "",

                  avatar_url:
                    profile?.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${peerId}`,

                  is_verified:
                    profile?.is_verified ||
                    false,

                  online:
                    profile?.online ??
                    message.online ??
                    false,
                };

              uniqueThreads.push(
                {
                  ...message,

                  displayProfile,

                  unreadCount:
                    unreadCountPerPeer[
                      peerId
                    ] || 0,

                  isFromMe,

                  last_msg:
                    message.last_msg ||
                    message.content ||
                    "",

                  updated_at:
                    message.updated_at ||
                    message.created_at,
                }
              );
            }
          );

          if (
            mountedRef.current
          ) {
            setMessages(
              uniqueThreads
            );
          }
        } else {
          setMessages(
            []
          );
        }

        if (
          mountedRef.current
        ) {
          setLastFetchedAt(
            new Date()
          );
        }
      } catch (error) {
        console.error(
          "Inbox Fetch Error:",
          error
        );
      } finally {
        fetchInProgressRef.current =
          false;

        if (
          mountedRef.current
        ) {
          setLoading(false);
          setIsRefreshing(
            false
          );
        }
      }
    },
    [
      fetchProfilesBatch,
      fetchVideosBatch,
      isUnreadMessage,
    ]
  );

  // =========================================================
  // MESSAGE PREVIEW
  // =========================================================

  const getMessagePreviewText =
    useCallback((message) => {
      if (
        message.type ===
          "voice" ||
        message.media_type ===
          "voice" ||
        message.audio_url ||
        message.metadata?.type ===
          "voice"
      ) {
        return "🎙️ Voice message";
      }

      if (
        message.type ===
          "image" ||
        message.media_type ===
          "image" ||
        (
          message.media_url &&
          !message.last_msg
        )
      ) {
        return "📷 Photo";
      }

      if (
        message.type ===
          "video" ||
        message.media_type ===
          "video"
      ) {
        return "🎬 Video attachment";
      }

      if (
        message.type ===
          "file" ||
        message.media_type ===
          "file"
      ) {
        return "📁 Document attached";
      }

      if (
        message.type ===
          "call" ||
        (
          message.call_duration &&
          message.call_duration > 0
        ) ||
        message.metadata?.call_type
      ) {
        return message.metadata
          ?.call_type ===
          "video"
          ? "📹 Video Call"
          : "📞 Voice Call";
      }

      if (
        message.last_msg
      ) {
        return message.last_msg;
      }

      if (
        message.content
      ) {
        return message.content;
      }

      return "Sent a message";
    }, []);

  // =========================================================
  // FOLLOW BACK
  // =========================================================

  const handleFollowBack =
    async (
      targetId,
      event
    ) => {
      if (event) {
        event.stopPropagation();
      }

      if (
        !currentUserId ||
        !targetId ||
        currentUserId ===
          targetId
      ) {
        return;
      }

      const wasFollowing =
        myFollows.has(
          targetId
        );

      setMyFollows(
        (previous) => {
          const updated =
            new Set(previous);

          updated.add(
            targetId
          );

          return updated;
        }
      );

      try {
        const {
          error,
        } = await supabase
          .from("follows")
          .upsert(
            {
              follower_id:
                currentUserId,

              following_id:
                targetId,
            },
            {
              onConflict:
                "follower_id,following_id",
            }
          );

        if (error) {
          throw error;
        }
      } catch (error) {
        console.error(
          "Follow operation failed:",
          error
        );

        if (!wasFollowing) {
          setMyFollows(
            (previous) => {
              const updated =
                new Set(
                  previous
                );

              updated.delete(
                targetId
              );

              return updated;
            }
          );
        }
      }
    };

  // =========================================================
  // MARK ALL AS READ
  // =========================================================
  //
  // IMPORTANT:
  // Do not only modify React state.
  // The database is the source of truth.
  // =========================================================

  const handleMarkAllRead =
    async () => {
      if (
        !currentUserId ||
        markingAllRead
      ) {
        return;
      }

      setMarkingAllRead(
        true
      );

      try {
        const [
          activityResult,
          messageResult,
        ] = await Promise.all([
          supabase
            .from("activities")
            .update({
              is_read: true,
            })
            .eq(
              "user_id",
              currentUserId
            )
            .eq(
              "is_read",
              false
            ),

          supabase
            .from("messages")
            .update({
              unread: false,
              status: "read",
            })
            .eq(
              "receiver_id",
              currentUserId
            )
            .eq(
              "unread",
              true
            ),
        ]);

        if (
          activityResult.error
        ) {
          console.error(
            "Mark activities read error:",
            activityResult.error
          );
        }

        if (
          messageResult.error
        ) {
          console.error(
            "Mark messages read error:",
            messageResult.error
          );
        }

        /*
         * Update local state only after the database operation
         * has been attempted.
         */
        setActivities(
          (previous) =>
            previous.map(
              (activity) => ({
                ...activity,
                is_read: true,
              })
            )
        );

        setMessages(
          (previous) =>
            previous.map(
              (message) => ({
                ...message,
                unreadCount: 0,
                unread: false,
                status: "read",
              })
            )
        );

        /*
         * Re-fetch from Supabase so a refresh/realtime cycle
         * cannot leave the UI displaying stale counts.
         */
        await fetchData(
          currentUserId,
          false
        );
      } catch (error) {
        console.error(
          "Mark all read failed:",
          error
        );
      } finally {
        if (
          mountedRef.current
        ) {
          setMarkingAllRead(
            false
          );
        }
      }
    };

  // =========================================================
  // MARK CATEGORY AS READ
  // =========================================================

  const markCategoryAsRead =
    async (
      typeGroup
    ) => {
      if (
        !currentUserId
      ) {
        return;
      }

      const shouldMark =
        (activity) => {
          if (
            typeGroup ===
            "all"
          ) {
            return true;
          }

          if (
            typeGroup ===
            "followers"
          ) {
            return isFollowerType(
              activity.type
            );
          }

          if (
            typeGroup ===
            "likes"
          ) {
            return isLikeType(
              activity.type
            );
          }

          if (
            typeGroup ===
            "comments"
          ) {
            return isCommentType(
              activity.type
            );
          }

          if (
            typeGroup ===
            "activity"
          ) {
            return (
              !isFollowerType(
                activity.type
              ) &&
              !isLikeType(
                activity.type
              ) &&
              !isCommentType(
                activity.type
              )
            );
          }

          return false;
        };

      setActivities(
        (previous) =>
          previous.map(
            (activity) =>
              shouldMark(
                activity
              )
                ? {
                    ...activity,
                    is_read:
                      true,
                  }
                : activity
          )
      );

      try {
        let query =
          supabase
            .from("activities")
            .update({
              is_read: true,
            })
            .eq(
              "user_id",
              currentUserId
            )
            .eq(
              "is_read",
              false
            );

        if (
          typeGroup ===
          "followers"
        ) {
          query =
            query.in(
              "type",
              [
                "follow",
                "user_follow",
              ]
            );
        } else if (
          typeGroup ===
          "likes"
        ) {
          query =
            query.in(
              "type",
              [
                "like",
                "video_likes",
                "video_like",
              ]
            );
        } else if (
          typeGroup ===
          "comments"
        ) {
          query =
            query.in(
              "type",
              [
                "comment",
                "video_comments",
                "video_comment",
              ]
            );
        }

        const {
          error,
        } = await query;

        if (error) {
          console.error(
            "Mark category read error:",
            error
          );
        }
      } catch (error) {
        console.error(
          "Mark category read failed:",
          error
        );
      }
    };

  // =========================================================
  // ACTIVITY CLICK
  // =========================================================

  const handleActivityItemClick =
    async (
      item,
      event
    ) => {
      if (event) {
        event.stopPropagation();
      }

      if (
        !item?.id
      ) {
        return;
      }

      if (
        !item.is_read
      ) {
        setActivities(
          (previous) =>
            previous.map(
              (activity) =>
                activity.id ===
                item.id
                  ? {
                      ...activity,
                      is_read:
                        true,
                    }
                  : activity
            )
        );

        const {
          error,
        } = await supabase
          .from("activities")
          .update({
            is_read: true,
          })
          .eq(
            "id",
            item.id
          );

        if (error) {
          console.error(
            "Mark activity read error:",
            error
          );
        }
      }

      const targetVideoId =
        item.video_id ||
        item.videos?.id ||
        item.video?.id ||
        item.data?.video_id;

      if (
        targetVideoId
      ) {
        const isComment =
          isCommentType(
            item.type
          );

        navigate(
          `/?videoId=${targetVideoId}`,
          {
            state: {
              scrollToId:
                targetVideoId,

              openComments:
                isComment,
            },
          }
        );

        return;
      }

      const targetActorId =
        item.actor_id ||
        item.actor?.id ||
        item.data?.actor_id;

      if (
        targetActorId
      ) {
        navigate(
          `/profile/${targetActorId}`
        );
      }
    };

  // =========================================================
  // ACTOR PROFILE
  // =========================================================

  const handleActorProfileClick =
    async (
      actorId,
      itemId,
      event
    ) => {
      if (event) {
        event.stopPropagation();
      }

      if (
        !actorId
      ) {
        return;
      }

      if (
        itemId
      ) {
        setActivities(
          (previous) =>
            previous.map(
              (activity) =>
                activity.id ===
                itemId
                  ? {
                      ...activity,
                      is_read:
                        true,
                    }
                  : activity
            )
        );

        const {
          error,
        } = await supabase
          .from("activities")
          .update({
            is_read: true,
          })
          .eq(
            "id",
            itemId
          );

        if (error) {
          console.error(
            "Actor profile mark read error:",
            error
          );
        }
      }

      navigate(
        `/profile/${actorId}`
      );
    };

  // =========================================================
  // VIDEO THUMBNAIL
  // =========================================================

  const handleVideoThumbnailClick =
    async (
      videoId,
      itemId,
      isComment,
      event
    ) => {
      if (event) {
        event.stopPropagation();
      }

      if (
        !videoId
      ) {
        return;
      }

      if (
        itemId
      ) {
        setActivities(
          (previous) =>
            previous.map(
              (activity) =>
                activity.id ===
                itemId
                  ? {
                      ...activity,
                      is_read:
                        true,
                    }
                  : activity
            )
        );

        const {
          error,
        } = await supabase
          .from("activities")
          .update({
            is_read: true,
          })
          .eq(
            "id",
            itemId
          );

        if (error) {
          console.error(
            "Video activity read error:",
            error
          );
        }
      }

      navigate(
        `/?videoId=${videoId}`,
        {
          state: {
            scrollToId:
              videoId,

            openComments:
              isComment,
          },
        }
      );
    };

  // =========================================================
  // OPEN MESSAGE THREAD
  // =========================================================

  const handleOpenThread =
    async (
      peerId
    ) => {
      if (
        !peerId ||
        !currentUserId
      ) {
        return;
      }

      /*
       * Immediately update the Inbox UI.
       */
      setMessages(
        (previous) =>
          previous.map(
            (message) =>
              message
                .displayProfile
                ?.id ===
              peerId
                ? {
                    ...message,
                    unreadCount: 0,
                    unread: false,
                    status: "read",
                  }
                : message
          )
      );

      /*
       * Persist read state in Supabase.
       */
      try {
        const {
          error,
        } = await supabase
          .from("messages")
          .update({
            unread: false,
            status: "read",
          })
          .eq(
            "sender_id",
            peerId
          )
          .eq(
            "receiver_id",
            currentUserId
          )
          .eq(
            "unread",
            true
          );

        if (error) {
          console.error(
            "Failed to mark messages as read:",
            error
          );
        }
      } catch (error) {
        console.error(
          "Message read operation failed:",
          error
        );
      }

      /*
       * Full messaging remains on the dedicated Messages page.
       */
      navigate(
        `/messaging?userId=${peerId}`
      );
    };

  // =========================================================
  // ACCEPT LIVE INVITE
  // =========================================================

  const handleAcceptLiveInvite =
    async (
      invite
    ) => {
      if (
        !invite?.id
      ) {
        return;
      }

      setAcceptingInviteId(
        invite.id
      );

      try {
        const {
          data: streamData,
          error: streamError,
        } = await supabase
          .from("live_streams")
          .select(
            "status"
          )
          .eq(
            "id",
            invite.stream_id
          )
          .single();

        if (
          streamError
        ) {
          console.error(
            "Stream check error:",
            streamError
          );

          alert(
            "Unable to check the live room right now."
          );

          return;
        }

        if (
          !streamData ||
          streamData.status !==
            "live"
        ) {
          alert(
            "This live stream session has ended or is no longer live."
          );

          setLiveInvites(
            (previous) =>
              previous.filter(
                (item) =>
                  item.id !==
                  invite.id
              )
          );

          return;
        }

        const {
          count,
          error:
            countError,
        } = await supabase
          .from(
            "live_guest_requests"
          )
          .select(
            "id",
            {
              count:
                "exact",
              head: true,
            }
          )
          .eq(
            "stream_id",
            invite.stream_id
          )
          .eq(
            "status",
            "approved"
          );

        const MAX_GUEST_SLOTS =
          7;

        if (
          countError
        ) {
          console.error(
            "Guest slot check error:",
            countError
          );
        }

        if (
          !countError &&
          count >=
            MAX_GUEST_SLOTS
        ) {
          alert(
            "Sorry, all co-host slots in this live room are currently taken!"
          );

          await supabase
            .from(
              "live_guest_requests"
            )
            .update({
              status:
                "full",
            })
            .eq(
              "id",
              invite.id
            );

          setLiveInvites(
            (previous) =>
              previous.filter(
                (item) =>
                  item.id !==
                  invite.id
              )
          );

          return;
        }

        const {
          error:
            updateError,
        } = await supabase
          .from(
            "live_guest_requests"
          )
          .update({
            status:
              "approved",
          })
          .eq(
            "id",
            invite.id
          );

        if (
          updateError
        ) {
          console.error(
            "Accept invite update error:",
            updateError
          );

          alert(
            "Unable to join panel at this moment. Please try again."
          );

          return;
        }

        setLiveInvites(
          (previous) =>
            previous.filter(
              (item) =>
                item.id !==
                invite.id
            )
        );

        navigate(
          `/live/watch/${invite.stream_id}/join-guest`
        );
      } catch (error) {
        console.error(
          "Accept invite error:",
          error
        );

        alert(
          "Something went wrong while accepting the invitation."
        );
      } finally {
        setAcceptingInviteId(
          null
        );
      }
    };

  // =========================================================
  // DECLINE LIVE INVITE
  // =========================================================

  const handleDeclineLiveInvite =
    async (
      invite
    ) => {
      if (
        !invite?.id
      ) {
        return;
      }

      try {
        const {
          error,
        } = await supabase
          .from(
            "live_guest_requests"
          )
          .update({
            status:
              "rejected",
          })
          .eq(
            "id",
            invite.id
          );

        if (error) {
          console.error(
            "Decline invite error:",
            error
          );

          alert(
            "Unable to decline the invitation."
          );

          return;
        }

        setLiveInvites(
          (previous) =>
            previous.filter(
              (item) =>
                item.id !==
                invite.id
            )
        );
      } catch (error) {
        console.error(
          "Decline invite failed:",
          error
        );
      }
    };

  // =========================================================
  // INITIALIZE INBOX
  // =========================================================

  useEffect(() => {
    mountedRef.current =
      true;

    let localChannel =
      null;

    const initInbox =
      async () => {
        try {
          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          if (
            !user ||
            !mountedRef.current
          ) {
            setLoading(
              false
            );

            return;
          }

          setCurrentUserId(
            user.id
          );

          await fetchData(
            user.id
          );

          if (
            !mountedRef.current
          ) {
            return;
          }

          // ---------------------------------------------------
          // REMOVE OLD CHANNEL
          // ---------------------------------------------------

          if (
            channelRef.current
          ) {
            await supabase.removeChannel(
              channelRef.current
            );

            channelRef.current =
              null;
          }

          // ---------------------------------------------------
          // REALTIME
          // ---------------------------------------------------

          const channelName =
            `inbox-realtime-${user.id}`;

          localChannel =
            supabase
              .channel(
                channelName
              )

              // -----------------------------------------------
              // ACTIVITIES INSERT
              // -----------------------------------------------

              .on(
                "postgres_changes",
                {
                  event:
                    "INSERT",
                  schema:
                    "public",
                  table:
                    "activities",
                  filter:
                    `user_id=eq.${user.id}`,
                },
                async (
                  payload
                ) => {
                  if (
                    !mountedRef.current ||
                    !payload.new
                  ) {
                    return;
                  }

                  const actorId =
                    payload.new
                      .actor_id;

                  let profileData =
                    null;

                  if (
                    actorId
                  ) {
                    const {
                      data,
                    } =
                      await supabase
                        .from(
                          "profiles"
                        )
                        .select(
                          "id, avatar_url, username, full_name, is_verified"
                        )
                        .eq(
                          "id",
                          actorId
                        )
                        .maybeSingle();

                    profileData =
                      data ||
                      null;
                  }

                  const newActivity =
                    {
                      ...payload.new,
                      actor:
                        profileData,
                    };

                  setActivities(
                    (previous) => {
                      const exists =
                        previous.some(
                          (
                            activity
                          ) =>
                            activity.id ===
                            newActivity.id
                        );

                      if (
                        exists
                      ) {
                        return previous;
                      }

                      return [
                        newActivity,
                        ...previous,
                      ];
                    }
                  );
                }
              )

              // -----------------------------------------------
              // ACTIVITIES UPDATE
              // -----------------------------------------------

              .on(
                "postgres_changes",
                {
                  event:
                    "UPDATE",
                  schema:
                    "public",
                  table:
                    "activities",
                  filter:
                    `user_id=eq.${user.id}`,
                },
                (
                  payload
                ) => {
                  if (
                    !mountedRef.current ||
                    !payload.new
                  ) {
                    return;
                  }

                  setActivities(
                    (previous) =>
                      previous.map(
                        (
                          activity
                        ) =>
                          activity.id ===
                          payload.new.id
                            ? {
                                ...activity,
                                ...payload.new,
                              }
                            : activity
                      )
                  );
                }
              )

              // -----------------------------------------------
              // LIVE INVITES
              // -----------------------------------------------

              .on(
                "postgres_changes",
                {
                  event:
                    "*",
                  schema:
                    "public",
                  table:
                    "live_guest_requests",
                  filter:
                    `user_id=eq.${user.id}`,
                },
                () => {
                  if (
                    mountedRef.current
                  ) {
                    fetchData(
                      user.id
                    );
                  }
                }
              )

              // -----------------------------------------------
              // MESSAGES
              // -----------------------------------------------

              .on(
                "postgres_changes",
                {
                  event:
                    "*",
                  schema:
                    "public",
                  table:
                    "messages",
                },
                (
                  payload
                ) => {
                  if (
                    !mountedRef.current
                  ) {
                    return;
                  }

                  const newRow =
                    payload.new;

                  const oldRow =
                    payload.old;

                  const belongsToUser =
                    newRow?.sender_id ===
                      user.id ||
                    newRow?.receiver_id ===
                      user.id ||
                    oldRow?.sender_id ===
                      user.id ||
                    oldRow?.receiver_id ===
                      user.id;

                  if (
                    belongsToUser
                  ) {
                    fetchData(
                      user.id
                    );
                  }
                }
              )

              // -----------------------------------------------
              // LIVE STREAMS
              // -----------------------------------------------

              .on(
                "postgres_changes",
                {
                  event:
                    "*",
                  schema:
                    "public",
                  table:
                    "live_streams",
                },
                () => {
                  if (
                    mountedRef.current
                  ) {
                    fetchData(
                      user.id
                    );
                  }
                }
              )

              .subscribe(
                (
                  status
                ) => {
                  console.log(
                    "Inbox realtime status:",
                    status
                  );
                }
              );

          channelRef.current =
            localChannel;
        } catch (error) {
          console.error(
            "Inbox initialization error:",
            error
          );

          if (
            mountedRef.current
          ) {
            setLoading(
              false
            );
          }
        }
      };

    initInbox();

    return () => {
      mountedRef.current =
        false;

      if (
        localChannel
      ) {
        supabase.removeChannel(
          localChannel
        );

        localChannel =
          null;
      }

      if (
        channelRef.current
      ) {
        supabase.removeChannel(
          channelRef.current
        );

        channelRef.current =
          null;
      }
    };
  }, [fetchData]);

  // =========================================================
  // UNREAD COUNTS
  // =========================================================

  const unreadFollowers =
    useMemo(
      () =>
        activities.filter(
          (activity) =>
            isFollowerType(
              activity.type
            ) &&
            !activity.is_read
        ),
      [
        activities,
        isFollowerType,
      ]
    );

  const unreadLikes =
    useMemo(
      () =>
        activities.filter(
          (activity) =>
            isLikeType(
              activity.type
            ) &&
            !activity.is_read
        ),
      [
        activities,
        isLikeType,
      ]
    );

  const unreadComments =
    useMemo(
      () =>
        activities.filter(
          (activity) =>
            isCommentType(
              activity.type
            ) &&
            !activity.is_read
        ),
      [
        activities,
        isCommentType,
      ]
    );

  const unreadOtherActivity =
    useMemo(
      () =>
        activities.filter(
          (activity) =>
            !isFollowerType(
              activity.type
            ) &&
            !isLikeType(
              activity.type
            ) &&
            !isCommentType(
              activity.type
            ) &&
            !activity.is_read
        ),
      [
        activities,
        isFollowerType,
        isLikeType,
        isCommentType,
      ]
    );

  const unreadMessagesTotal =
    useMemo(
      () =>
        messages.reduce(
          (
            total,
            message
          ) =>
            total +
            (
              Number(
                message.unreadCount
              ) || 0
            ),
          0
        ),
      [messages]
    );

  const totalUnreadCount =
    unreadFollowers.length +
    unreadLikes.length +
    unreadComments.length +
    unreadOtherActivity.length +
    unreadMessagesTotal +
    liveInvites.length;

  // =========================================================
  // FILTER ACTIVITIES
  // =========================================================

  const filteredActivities =
    useMemo(
      () =>
        activities
          .filter(
            (item) => {
              if (
                activeFilter ===
                "followers"
              ) {
                return isFollowerType(
                  item.type
                );
              }

              if (
                activeFilter ===
                "likes"
              ) {
                return isLikeType(
                  item.type
                );
              }

              if (
                activeFilter ===
                "comments"
              ) {
                return isCommentType(
                  item.type
                );
              }

              if (
                activeFilter ===
                "messages"
              ) {
                return false;
              }

              if (
                activeFilter ===
                "live"
              ) {
                return false;
              }

              return true;
            }
          )
          .filter(
            (item) => {
              if (
                !searchQuery.trim()
              ) {
                return true;
              }

              const query =
                searchQuery
                  .toLowerCase();

              return (
                item.actor?.username
                  ?.toLowerCase()
                  .includes(
                    query
                  ) ||
                item.actor?.full_name
                  ?.toLowerCase()
                  .includes(
                    query
                  ) ||
                item.videos?.caption
                  ?.toLowerCase()
                  .includes(
                    query
                  )
              );
            }
          ),
      [
        activities,
        activeFilter,
        searchQuery,
        isFollowerType,
        isLikeType,
        isCommentType,
      ]
    );

  // =========================================================
  // FILTER MESSAGES
  // =========================================================

  const filteredMessages =
    useMemo(
      () =>
        messages.filter(
          (message) => {
            if (
              !searchQuery.trim()
            ) {
              return true;
            }

            const query =
              searchQuery
                .toLowerCase();

            return (
              message.displayProfile
                ?.username
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              message.displayProfile
                ?.full_name
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              message.user_name
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              message.last_msg
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              message.content
                ?.toLowerCase()
                .includes(
                  query
                )
            );
          }
        ),
      [
        messages,
        searchQuery,
      ]
    );

  // =========================================================
  // FILTER SUGGESTED USERS
  // =========================================================

  const filteredSuggestedUsers =
    useMemo(
      () =>
        suggestedUsers.filter(
          (user) => {
            if (
              !newChatSearch.trim()
            ) {
              return true;
            }

            const query =
              newChatSearch
                .toLowerCase();

            return (
              user.username
                ?.toLowerCase()
                .includes(
                  query
                ) ||
              user.full_name
                ?.toLowerCase()
                .includes(
                  query
                )
            );
          }
        ),
      [
        suggestedUsers,
        newChatSearch,
      ]
    );

  // =========================================================
  // ACTIVITY ICON
  // =========================================================

  const getActivityIcon =
    (type) => {
      if (
        isCommentType(
          type
        )
      ) {
        return (
          <MessageCircle
            size={13}
            className="text-cyan-400 fill-cyan-400"
          />
        );
      }

      if (
        isLikeType(
          type
        )
      ) {
        return (
          <Heart
            size={13}
            className="text-pink-500 fill-pink-500"
          />
        );
      }

      if (
        isFollowerType(
          type
        )
      ) {
        return (
          <UserPlus
            size={13}
            className="text-blue-400"
          />
        );
      }

      if (
        type ===
        "mention"
      ) {
        return (
          <AtSign
            size={13}
            className="text-purple-400"
          />
        );
      }

      if (
        type ===
          "share" ||
        type ===
          "repost"
      ) {
        return (
          <Share2
            size={13}
            className="text-emerald-400"
          />
        );
      }

      if (
        type ===
        "save"
      ) {
        return (
          <Bookmark
            size={13}
            className="text-yellow-400"
          />
        );
      }

      if (
        type ===
        "gift"
      ) {
        return (
          <Gift
            size={13}
            className="text-pink-400"
          />
        );
      }

      if (
        type ===
        "live"
      ) {
        return (
          <Radio
            size={13}
            className="text-rose-400"
          />
        );
      }

      return (
        <Bell
          size={13}
          className="text-yellow-400"
        />
      );
    };

  // =========================================================
  // ACTIVITY TEXT
  // =========================================================

  const getActivityText =
    (item) => {
      if (
        isFollowerType(
          item.type
        )
      ) {
        return "started following you";
      }

      if (
        isLikeType(
          item.type
        )
      ) {
        return "liked your video";
      }

      if (
        isCommentType(
          item.type
        )
      ) {
        return "commented on your video";
      }

      switch (
        item.type
      ) {
        case "mention":
          return "mentioned you";

        case "share":
          return "shared your content";

        case "repost":
          return "reposted your content";

        case "save":
          return "saved your video";

        case "gift":
          return "sent you a gift";

        case "live":
          return "started a live stream";

        default:
          return "interacted with your profile";
      }
    };

  // =========================================================
  // CATEGORY CARD
  // =========================================================

  const CategoryCard = ({
    icon,
    title,
    subtitle,
    count,
    accent,
    onClick,
  }) => (
    <motion.button
      whileTap={{
        scale: 0.97,
      }}
      onClick={
        onClick
      }
      className={`relative overflow-hidden text-left p-4 rounded-2xl bg-gradient-to-br ${accent} border border-white/10 hover:border-white/20 transition-all group`}
    >
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/[0.03] blur-2xl" />

      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
          {icon}
        </div>

        {count > 0 ? (
          <span className="min-w-6 h-6 px-1.5 rounded-full bg-white text-black text-[10px] font-black flex items-center justify-center shadow-lg">
            {count > 99
              ? "99+"
              : count}
          </span>
        ) : (
          <span className="text-[9px] uppercase font-black text-zinc-600">
            Clear
          </span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-black text-white">
          {title}
        </p>

        <p className="text-[10px] text-zinc-500 mt-1">
          {subtitle}
        </p>
      </div>
    </motion.button>
  );

  // =========================================================
  // ACTIVITY DRAWER
  // =========================================================

  const ActivityDrawer =
    ({
      isOpen,
      onClose,
      title,
      data,
      categoryKey,
    }) => (
      <AnimatePresence>
        {isOpen && (
          <>
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
              onClick={
                onClose
              }
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110]"
            />

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
                damping: 25,
                stiffness: 200,
              }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-[#09090e] border-l border-cyan-500/20 z-[111] flex flex-col shadow-2xl"
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/70 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <button
                    onClick={
                      onClose
                    }
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ArrowLeft
                      size={21}
                      className="text-cyan-400"
                    />
                  </button>

                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
                      {title}
                    </h2>

                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider mt-0.5">
                      {data.length}{" "}
                      items
                    </p>
                  </div>
                </div>

                {data.some(
                  (item) =>
                    !item.is_read
                ) && (
                  <button
                    onClick={() =>
                      markCategoryAsRead(
                        categoryKey
                      )
                    }
                    className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <CheckCheck
                      size={13}
                    />
                    Mark Read
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto inbox-scrollbar p-3 space-y-2">
                {data.length ===
                0 ? (
                  <EmptyState
                    icon={
                      <Bell
                        size={30}
                      />
                    }
                    title="Nothing here yet"
                    description="New activity will appear here."
                  />
                ) : (
                  data.map(
                    (item) => {
                      const isUnread =
                        !item.is_read;

                      const actorId =
                        item.actor_id ||
                        item.actor?.id;

                      const isFollowingBack =
                        myFollows.has(
                          actorId
                        );

                      const isComment =
                        isCommentType(
                          item.type
                        );

                      return (
                        <motion.div
                          layout
                          key={
                            item.id
                          }
                          onClick={(
                            event
                          ) => {
                            handleActivityItemClick(
                              item,
                              event
                            );

                            onClose();
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer border ${
                            isUnread
                              ? "bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_18px_rgba(6,182,212,0.12)]"
                              : "bg-white/[0.025] border-white/5 hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="relative shrink-0"
                              onClick={(
                                event
                              ) =>
                                handleActorProfileClick(
                                  actorId,
                                  item.id,
                                  event
                                )
                              }
                            >
                              {item.actor
                                ?.avatar_url ? (
                                <img
                                  src={
                                    item.actor
                                      .avatar_url
                                  }
                                  crossOrigin="anonymous"
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-12 rounded-full object-cover border border-cyan-400/40 p-0.5"
                                  alt=""
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-cyan-400 uppercase font-black text-xs">
                                  {item.actor?.username?.substring(
                                    0,
                                    2
                                  ) ||
                                    "??"}
                                </div>
                              )}

                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/20">
                                {getActivityIcon(
                                  item.type
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-black text-white truncate">
                                  @
                                  {item.actor
                                    ?.username ||
                                    "user"}
                                </p>

                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)] shrink-0" />
                                )}
                              </div>

                              <p className="text-[12px] text-zinc-400 truncate mt-0.5">
                                {getActivityText(
                                  item
                                )}
                              </p>

                              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mt-1">
                                {item.created_at
                                  ? formatDistanceToNow(
                                      new Date(
                                        item.created_at
                                      ),
                                      {
                                        addSuffix:
                                          true,
                                      }
                                    )
                                  : ""}
                              </p>
                            </div>
                          </div>

                          {isFollowerType(
                            item.type
                          ) ? (
                            <button
                              onClick={(
                                event
                              ) =>
                                handleFollowBack(
                                  actorId,
                                  event
                                )
                              }
                              disabled={
                                isFollowingBack
                              }
                              className={`text-[10px] font-black px-3 py-1.5 rounded-xl shrink-0 ${
                                isFollowingBack
                                  ? "bg-zinc-800 text-zinc-500 border border-white/10"
                                  : "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/20"
                              }`}
                            >
                              {isFollowingBack
                                ? "Friends"
                                : "Follow Back"}
                            </button>
                          ) : (
                            (
                              item.video_id ||
                              item.videos
                                ?.id
                            ) && (
                              <div
                                onClick={(
                                  event
                                ) =>
                                  handleVideoThumbnailClick(
                                    item.video_id ||
                                      item.videos
                                        ?.id,
                                    item.id,
                                    isComment,
                                    event
                                  )
                                }
                                className="w-11 h-14 rounded-xl overflow-hidden border border-cyan-500/30 shrink-0 bg-zinc-900"
                              >
                                {item.videos
                                  ?.thumbnail_url ? (
                                  <img
                                    src={
                                      item
                                        .videos
                                        .thumbnail_url
                                    }
                                    crossOrigin="anonymous"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Play
                                      size={
                                        14
                                      }
                                      className="text-cyan-400"
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </motion.div>
                      );
                    }
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );

  // =========================================================
  // EMPTY STATE
  // =========================================================

  const EmptyState = ({
    icon,
    title,
    description,
    action,
  }) => (
    <div className="py-12 px-5 flex flex-col items-center justify-center text-center rounded-3xl bg-white/[0.02] border border-white/5">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-600 mb-3">
        {icon}
      </div>

      <p className="text-sm font-black text-white">
        {title}
      </p>

      <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
        {description}
      </p>

      {action}
    </div>
  );

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl" />

            <Loader2
              className="relative animate-spin text-cyan-400"
              size={42}
            />
          </div>

          <p className="mt-4 text-[10px] uppercase font-black tracking-[3px] text-zinc-500">
            Loading Inbox
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="inbox-page min-h-screen bg-[#050507] text-white font-sans selection:bg-cyan-500/30">

      {/* =====================================================
          SCROLLBAR
      ===================================================== */}

      <style>{`
        .inbox-scrollbar::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .inbox-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.025);
          border-radius: 999px;
        }

        .inbox-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(6,182,212,0.65),
            rgba(236,72,153,0.65)
          );
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .inbox-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(6,182,212,0.9),
            rgba(236,72,153,0.9)
          );
        }

        .inbox-scrollbar {
          scrollbar-width: thin;
          scrollbar-color:
            rgba(6,182,212,0.65)
            rgba(255,255,255,0.025);
        }

        .inbox-hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .inbox-hide-scrollbar {
          scrollbar-width: none;
        }
      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050507]/85 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() =>
                  navigate(-1)
                }
                className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all shrink-0"
                title="Go back"
              >
                <ArrowLeft
                  size={18}
                />
              </button>

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <InboxIcon
                  size={19}
                  className="text-cyan-400"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight">
                    Inbox
                  </h1>

                  {totalUnreadCount >
                    0 && (
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[9px] font-black uppercase shadow-lg shadow-pink-500/20">
                      {totalUnreadCount >
                      99
                        ? "99+"
                        : totalUnreadCount}{" "}
                      New
                    </span>
                  )}
                </div>

                <p className="text-[9px] sm:text-[10px] text-zinc-600 font-bold uppercase tracking-[1.5px] truncate">
                  Activity • Updates • Messages
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">

              <button
                onClick={() =>
                  setShowSearch(
                    (value) =>
                      !value
                  )
                }
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                  showSearch
                    ? "bg-pink-500 text-white border-pink-400"
                    : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                }`}
                title="Search"
              >
                <Search
                  size={16}
                />
              </button>

              <button
                onClick={() =>
                  fetchData(
                    currentUserId,
                    true
                  )
                }
                disabled={
                  isRefreshing
                }
                className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/10 transition-all"
                title="Refresh"
              >
                <RefreshCw
                  size={16}
                  className={
                    isRefreshing
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>

              <button
                onClick={() =>
                  setShowNewChatModal(
                    true
                  )
                }
                className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-500/20 text-cyan-300 hover:border-cyan-400/40 transition-all"
              >
                <Plus
                  size={15}
                />

                <span className="text-[10px] font-black uppercase tracking-wider">
                  New
                </span>
              </button>

              <div className="relative">
                <button
                  onClick={() =>
                    setShowMoreMenu(
                      (value) =>
                        !value
                    )
                  }
                  className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-400 flex items-center justify-center hover:text-white transition-all"
                >
                  <MoreHorizontal
                    size={17}
                  />
                </button>

                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: -5,
                        scale: 0.96,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        y: -5,
                        scale: 0.96,
                      }}
                      className="absolute right-0 top-11 w-52 rounded-2xl bg-[#101017] border border-white/10 shadow-2xl p-1.5 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          handleMarkAllRead();
                          setShowMoreMenu(
                            false
                          );
                        }}
                        disabled={
                          totalUnreadCount ===
                          0
                        }
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 disabled:opacity-40 text-left"
                      >
                        <CheckCheck
                          size={15}
                          className="text-cyan-400"
                        />

                        <span className="text-[11px] font-bold">
                          Mark all as read
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setShowNewChatModal(
                            true
                          );
                          setShowMoreMenu(
                            false
                          );
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left"
                      >
                        <MessageSquare
                          size={15}
                          className="text-purple-400"
                        />

                        <span className="text-[11px] font-bold">
                          New conversation
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* SEARCH */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{
                  height: 0,
                  opacity: 0,
                }}
                animate={{
                  height: "auto",
                  opacity: 1,
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <div className="relative">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />

                    <input
                      value={
                        searchQuery
                      }
                      onChange={(
                        event
                      ) =>
                        setSearchQuery(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Search people, activities or messages..."
                      autoFocus
                      className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/10 pl-9 pr-9 text-xs text-white placeholder-zinc-600 outline-none focus:border-cyan-500/50"
                    />

                    {searchQuery && (
                      <button
                        onClick={() =>
                          setSearchQuery(
                            ""
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        <X
                          size={14}
                        />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 pb-28">

        {/* ===================================================
            TOP STATUS
        =================================================== */}

        <section className="mb-5">
          <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-white/[0.035] to-white/[0.015] p-5 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CircleDot
                    size={12}
                    className={
                      totalUnreadCount >
                      0
                        ? "text-pink-400"
                        : "text-emerald-400"
                    }
                  />

                  <span className="text-[9px] uppercase tracking-[2px] font-black text-zinc-500">
                    Inbox overview
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
                  {totalUnreadCount >
                  0
                    ? `${totalUnreadCount} things need your attention`
                    : "You're all caught up"}
                </h2>

                <p className="text-xs text-zinc-500 mt-1">
                  {lastFetchedAt
                    ? `Updated ${formatDistanceToNow(
                        lastFetchedAt,
                        {
                          addSuffix:
                            true,
                        }
                      )}`
                    : "Waiting for updates"}
                </p>
              </div>

              {totalUnreadCount >
                0 && (
                <button
                  onClick={
                    handleMarkAllRead
                  }
                  disabled={
                    markingAllRead
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {markingAllRead ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCheck
                      size={14}
                    />
                  )}

                  {markingAllRead
                    ? "Updating..."
                    : "Mark all read"}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================
            FILTER BAR
        =================================================== */}

        <section className="mb-5">
          <div className="flex gap-2 overflow-x-auto inbox-hide-scrollbar pb-1">
            {[
              {
                key: "all",
                label: "All",
                icon: (
                  <Bell
                    size={13}
                  />
                ),
                count:
                  totalUnreadCount,
              },
              {
                key: "messages",
                label: "Messages",
                icon: (
                  <MessageSquare
                    size={13}
                  />
                ),
                count:
                  unreadMessagesTotal,
              },
              {
                key: "followers",
                label: "Followers",
                icon: (
                  <UserPlus
                    size={13}
                  />
                ),
                count:
                  unreadFollowers.length,
              },
              {
                key: "likes",
                label: "Likes",
                icon: (
                  <Heart
                    size={13}
                  />
                ),
                count:
                  unreadLikes.length,
              },
              {
                key: "comments",
                label: "Comments",
                icon: (
                  <MessageCircle
                    size={13}
                  />
                ),
                count:
                  unreadComments.length,
              },
              {
                key: "live",
                label: "Live",
                icon: (
                  <Radio
                    size={13}
                  />
                ),
                count:
                  liveInvites.length,
              },
            ].map(
              (filter) => (
                <button
                  key={
                    filter.key
                  }
                  onClick={() => {
                    setActiveFilter(
                      filter.key
                    );

                    if (
                      [
                        "followers",
                        "likes",
                        "comments",
                      ].includes(
                        filter.key
                      )
                    ) {
                      if (
                        filter.count >
                        0
                      ) {
                        markCategoryAsRead(
                          filter.key
                        );
                      }
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border shrink-0 text-[10px] font-black uppercase tracking-wider transition-all ${
                    activeFilter ===
                    filter.key
                      ? "bg-white text-black border-white"
                      : "bg-white/[0.035] text-zinc-500 border-white/10 hover:text-white hover:bg-white/[0.07]"
                  }`}
                >
                  {filter.icon}

                  {filter.label}

                  {filter.count >
                    0 && (
                    <span
                      className={`min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[8px] ${
                        activeFilter ===
                        filter.key
                          ? "bg-black text-white"
                          : "bg-pink-500 text-white"
                      }`}
                    >
                      {filter.count >
                      99
                        ? "99+"
                        : filter.count}
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </section>

        {/* ===================================================
            CATEGORY DASHBOARD
        =================================================== */}

        {activeFilter ===
          "all" && (
          <section className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">

              <CategoryCard
                title="Messages"
                subtitle="Direct chat previews"
                count={
                  unreadMessagesTotal
                }
                icon={
                  <MessageSquare
                    size={18}
                    className="text-purple-400"
                  />
                }
                accent="from-purple-950/50 via-[#111018] to-black"
                onClick={() =>
                  setActiveFilter(
                    "messages"
                  )
                }
              />

              <CategoryCard
                title="Followers"
                subtitle="New connections"
                count={
                  unreadFollowers.length
                }
                icon={
                  <UserPlus
                    size={18}
                    className="text-blue-400"
                  />
                }
                accent="from-blue-950/50 via-[#111018] to-black"
                onClick={() => {
                  setActiveFilter(
                    "followers"
                  );

                  if (
                    unreadFollowers.length >
                    0
                  ) {
                    markCategoryAsRead(
                      "followers"
                    );
                  }
                }}
              />

              <CategoryCard
                title="Likes"
                subtitle="Video reactions"
                count={
                  unreadLikes.length
                }
                icon={
                  <Heart
                    size={18}
                    className="text-pink-500 fill-pink-500"
                  />
                }
                accent="from-pink-950/50 via-[#111018] to-black"
                onClick={() => {
                  setActiveFilter(
                    "likes"
                  );

                  if (
                    unreadLikes.length >
                    0
                  ) {
                    markCategoryAsRead(
                      "likes"
                    );
                  }
                }}
              />

              <CategoryCard
                title="Comments"
                subtitle="Video conversations"
                count={
                  unreadComments.length
                }
                icon={
                  <MessageCircle
                    size={18}
                    className="text-cyan-400"
                  />
                }
                accent="from-cyan-950/50 via-[#111018] to-black"
                onClick={() => {
                  setActiveFilter(
                    "comments"
                  );

                  if (
                    unreadComments.length >
                    0
                  ) {
                    markCategoryAsRead(
                      "comments"
                    );
                  }
                }}
              />
            </div>
          </section>
        )}

        {/* ===================================================
            LIVE STREAMS
        =================================================== */}

        {(
          activeFilter ===
            "all" ||
          activeFilter ===
            "live"
        ) &&
          liveStreams.length >
            0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.9)]" />

                    <h3 className="text-xs font-black uppercase tracking-[1.5px]">
                      Live now
                    </h3>
                  </div>

                  <p className="text-[10px] text-zinc-600 mt-1">
                    Creators currently broadcasting
                  </p>
                </div>

                <span className="text-[9px] font-black text-rose-400 uppercase">
                  {liveStreams.length}{" "}
                  live
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto inbox-hide-scrollbar pb-2">
                {liveStreams.map(
                  (live) => (
                    <motion.button
                      whileTap={{
                        scale: 0.95,
                      }}
                      key={
                        live.id
                      }
                      onClick={() =>
                        navigate(
                          `/live/watch/${live.id}`
                        )
                      }
                      className="flex flex-col items-center min-w-[74px] group"
                    >
                      <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-rose-500 shadow-[0_0_14px_rgba(236,72,153,0.4)]">
                        <img
                          src={
                            live
                              .profiles
                              ?.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${live.id}`
                          }
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-full object-cover bg-zinc-900"
                          alt=""
                        />

                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[7px] font-black uppercase">
                          Live
                        </span>
                      </div>

                      <span className="mt-2 text-[10px] font-bold text-zinc-400 group-hover:text-white truncate max-w-[70px]">
                        @
                        {live
                          .profiles
                          ?.username ||
                          "creator"}
                      </span>
                    </motion.button>
                  )
                )}
              </div>
            </section>
          )}

        {/* ===================================================
            LIVE INVITES
        =================================================== */}

        {(
          activeFilter ===
            "all" ||
          activeFilter ===
            "live"
        ) &&
          liveInvites.length >
            0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />

                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Co-host invitations
                  </h3>
                </div>

                <span className="text-[9px] font-black text-cyan-400">
                  {liveInvites.length}{" "}
                  pending
                </span>
              </div>

              <div className="space-y-3">
                {liveInvites.map(
                  (invite) => {
                    const hostProfile =
                      invite.stream
                        ?.host;

                    const isVideo =
                      invite.mode ===
                        "video" ||
                      !invite.mode;

                    return (
                      <motion.div
                        layout
                        key={
                          invite.id
                        }
                        className="rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-[#0d0d13] to-pink-950/20 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={
                                hostProfile
                                  ?.avatar_url ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${invite.id}`
                              }
                              className="w-12 h-12 rounded-full object-cover border border-cyan-400/40"
                              alt=""
                            />

                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border-2 border-[#0d0d13] flex items-center justify-center">
                              <Radio
                                size={
                                  9
                                }
                                className="text-white"
                              />
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black truncate">
                                @
                                {hostProfile
                                  ?.username ||
                                  "Host"}
                              </p>

                              <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                Live
                              </span>
                            </div>

                            <p className="text-[11px] text-zinc-500 mt-1">
                              Invited you to join as{" "}
                              {isVideo
                                ? "video"
                                : "audio"}{" "}
                              co-host
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <button
                            type="button"
                            disabled={
                              acceptingInviteId ===
                              invite.id
                            }
                            onClick={() =>
                              handleAcceptLiveInvite(
                                invite
                              )
                            }
                            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-black text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {acceptingInviteId ===
                            invite.id ? (
                              <Loader2
                                size={
                                  14
                                }
                                className="animate-spin"
                              />
                            ) : (
                              <Sparkles
                                size={
                                  14
                                }
                              />
                            )}

                            {acceptingInviteId ===
                            invite.id
                              ? "Checking..."
                              : "Accept & Join"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeclineLiveInvite(
                                invite
                              )
                            }
                            className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase hover:text-white"
                          >
                            Decline
                          </button>
                        </div>
                      </motion.div>
                    );
                  }
                )}
              </div>
            </section>
          )}

        {/* ===================================================
            ACTIVITY
        =================================================== */}

        {activeFilter !==
          "messages" &&
          activeFilter !==
            "live" && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame
                      size={14}
                      className="text-pink-500"
                    />

                    <h3 className="text-xs font-black uppercase tracking-[1.5px]">
                      {activeFilter ===
                      "all"
                        ? "Recent activity"
                        : `${activeFilter} activity`}
                    </h3>
                  </div>

                  <p className="text-[10px] text-zinc-600 mt-1">
                    Social interactions and updates
                  </p>
                </div>

                {filteredActivities.some(
                  (activity) =>
                    !activity.is_read
                ) && (
                  <button
                    onClick={() =>
                      markCategoryAsRead(
                        activeFilter ===
                          "all"
                          ? "all"
                          : activeFilter
                      )
                    }
                    className="text-[9px] font-black uppercase tracking-wider text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Check
                      size={12}
                    />
                    Mark read
                  </button>
                )}
              </div>

              {filteredActivities.length ===
              0 ? (
                <EmptyState
                  icon={
                    <Bell
                      size={28}
                    />
                  }
                  title="No activity"
                  description="Likes, comments, followers and other interactions will appear here."
                />
              ) : (
                <div className="space-y-2">
                  {filteredActivities.map(
                    (item) => {
                      const isUnread =
                        !item.is_read;

                      const actorId =
                        item.actor_id ||
                        item.actor?.id;

                      const isFollowingBack =
                        myFollows.has(
                          actorId
                        );

                      const isComment =
                        isCommentType(
                          item.type
                        );

                      return (
                        <motion.div
                          layout
                          key={
                            item.id
                          }
                          onClick={(
                            event
                          ) =>
                            handleActivityItemClick(
                              item,
                              event
                            )
                          }
                          className={`group flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                            isUnread
                              ? "bg-gradient-to-r from-cyan-950/25 via-white/[0.025] to-pink-950/10 border-cyan-500/25"
                              : "bg-white/[0.025] border-white/5 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div
                            className="relative shrink-0"
                            onClick={(
                              event
                            ) =>
                              handleActorProfileClick(
                                actorId,
                                item.id,
                                event
                              )
                            }
                          >
                            {item.actor
                              ?.avatar_url ? (
                              <img
                                src={
                                  item.actor
                                    .avatar_url
                                }
                                crossOrigin="anonymous"
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-full object-cover border border-white/10 group-hover:border-cyan-400/40"
                                alt=""
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-cyan-400 text-[10px] font-black">
                                {item.actor?.username?.substring(
                                  0,
                                  2
                                ) ||
                                  "??"}
                              </div>
                            )}

                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/10 flex items-center justify-center">
                              {getActivityIcon(
                                item.type
                              )}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[12px] font-black text-white truncate">
                                @
                                {item.actor
                                  ?.username ||
                                  "user"}
                              </p>

                              {isUnread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0 shadow-[0_0_7px_rgba(236,72,153,1)]" />
                              )}
                            </div>

                            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                              {getActivityText(
                                item
                              )}
                            </p>

                            <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-wider mt-1">
                              {item.created_at
                                ? formatDistanceToNow(
                                    new Date(
                                      item.created_at
                                    ),
                                    {
                                      addSuffix:
                                        true,
                                    }
                                  )
                                : ""}
                            </p>
                          </div>

                          {isFollowerType(
                            item.type
                          ) ? (
                            <button
                              onClick={(
                                event
                              ) =>
                                handleFollowBack(
                                  actorId,
                                  event
                                )
                              }
                              disabled={
                                isFollowingBack
                              }
                              className={`px-3 py-1.5 rounded-xl text-[9px] font-black shrink-0 ${
                                isFollowingBack
                                  ? "bg-white/5 text-zinc-600 border border-white/5"
                                  : "bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                              }`}
                            >
                              {isFollowingBack
                                ? "Friends"
                                : "Follow Back"}
                            </button>
                          ) : (
                            (
                              item.video_id ||
                              item.videos
                                ?.id
                            ) && (
                              <button
                                onClick={(
                                  event
                                ) =>
                                  handleVideoThumbnailClick(
                                    item.video_id ||
                                      item.videos
                                        ?.id,
                                    item.id,
                                    isComment,
                                    event
                                  )
                                }
                                className="w-10 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-zinc-900"
                              >
                                {item.videos
                                  ?.thumbnail_url ? (
                                  <img
                                    src={
                                      item
                                        .videos
                                        .thumbnail_url
                                    }
                                    crossOrigin="anonymous"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Play
                                      size={
                                        13
                                      }
                                      className="text-cyan-400"
                                    />
                                  </div>
                                )}
                              </button>
                            )
                          )}
                        </motion.div>
                      );
                    }
                  )}
                </div>
              )}
            </section>
          )}

        {/* ===================================================
            MESSAGE PREVIEWS
        =================================================== */}

        {(
          activeFilter ===
            "all" ||
          activeFilter ===
            "messages"
        ) && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare
                    size={14}
                    className="text-purple-400"
                  />

                  <h3 className="text-xs font-black uppercase tracking-[1.5px]">
                    Messages
                  </h3>
                </div>

                <p className="text-[10px] text-zinc-600 mt-1">
                  Conversation previews
                </p>
              </div>

              <button
                onClick={() =>
                  setShowNewChatModal(
                    true
                  )
                }
                className="flex items-center gap-1 text-[9px] uppercase font-black tracking-wider text-cyan-400"
              >
                <Plus
                  size={12}
                />
                New
              </button>
            </div>

            {filteredMessages.length ===
            0 ? (
              <EmptyState
                icon={
                  <MessageSquare
                    size={28}
                  />
                }
                title="No conversations yet"
                description="Start a conversation and your latest messages will appear here."
                action={
                  <button
                    onClick={() =>
                      setShowNewChatModal(
                        true
                      )
                    }
                    className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-black text-[9px] font-black uppercase tracking-wider"
                  >
                    Start conversation
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {filteredMessages.map(
                  (message) => {
                    const hasUnread =
                      (
                        Number(
                          message.unreadCount
                        ) || 0
                      ) > 0;

                    const previewText =
                      getMessagePreviewText(
                        message
                      );

                    const peerId =
                      message
                        .displayProfile
                        ?.id;

                    return (
                      <motion.button
                        layout
                        whileTap={{
                          scale: 0.99,
                        }}
                        key={
                          message.id ||
                          peerId
                        }
                        onClick={() =>
                          handleOpenThread(
                            peerId
                          )
                        }
                        className={`w-full text-left flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                          hasUnread
                            ? "bg-gradient-to-r from-purple-950/30 via-white/[0.025] to-cyan-950/10 border-purple-500/25 shadow-[0_0_18px_rgba(168,85,247,0.08)]"
                            : "bg-white/[0.025] border-white/5 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={
                              message
                                .displayProfile
                                ?.avatar_url ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${peerId}`
                            }
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-full object-cover border border-white/10"
                            alt=""
                          />

                          {message
                            .displayProfile
                            ?.online && (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#08080b] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                          )}

                          {hasUnread && (
                            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-pink-500 text-white text-[8px] font-black flex items-center justify-center border-2 border-[#08080b]">
                              {message.unreadCount >
                              99
                                ? "99+"
                                : message.unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p
                                className={`text-[13px] truncate ${
                                  hasUnread
                                    ? "font-black text-white"
                                    : "font-bold text-zinc-300"
                                }`}
                              >
                                @
                                {message
                                  .displayProfile
                                  ?.username ||
                                  "user"}
                              </p>

                              {message
                                .displayProfile
                                ?.is_verified && (
                                <span className="text-cyan-400 text-[10px] shrink-0">
                                  ✓
                                </span>
                              )}
                            </div>

                            <span className="text-[9px] text-zinc-600 font-bold shrink-0">
                              {message.updated_at ||
                              message.created_at
                                ? formatDistanceToNow(
                                    new Date(
                                      message.updated_at ||
                                        message.created_at
                                    ),
                                    {
                                      addSuffix:
                                        false,
                                    }
                                  )
                                : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <p
                              className={`text-[11px] truncate flex-1 ${
                                hasUnread
                                  ? "text-purple-200 font-bold"
                                  : "text-zinc-500"
                              }`}
                            >
                              {message.isFromMe && (
                                <span className="text-zinc-600 mr-1">
                                  You:
                                </span>
                              )}

                              {
                                previewText
                              }
                            </p>

                            <ChevronRight
                              size={14}
                              className="text-zinc-700 shrink-0"
                            />
                          </div>
                        </div>
                      </motion.button>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}

        {/* ===================================================
            SUGGESTED PEOPLE
        =================================================== */}

        {activeFilter ===
          "all" &&
          suggestedUsers.length >
            0 && (
            <section className="mt-7">
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Users
                      size={14}
                      className="text-emerald-400"
                    />

                    <h3 className="text-xs font-black uppercase tracking-[1.5px]">
                      People you may know
                    </h3>
                  </div>

                  <p className="text-[10px] text-zinc-600 mt-1">
                    Start a new conversation
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowNewChatModal(
                      true
                    )
                  }
                  className="text-[9px] font-black uppercase text-cyan-400"
                >
                  See all
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto inbox-hide-scrollbar">
                {suggestedUsers
                  .slice(
                    0,
                    8
                  )
                  .map(
                    (user) => (
                      <button
                        key={
                          user.id
                        }
                        onClick={() =>
                          navigate(
                            `/messaging?userId=${user.id}`
                          )
                        }
                        className="min-w-[150px] p-3 rounded-2xl bg-white/[0.025] border border-white/5 hover:border-cyan-500/20 transition-all text-left"
                      >
                        <img
                          src={
                            user.avatar_url ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
                          }
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-white/10"
                          alt=""
                        />

                        <div className="mt-2">
                          <div className="flex items-center gap-1">
                            <p className="text-[11px] font-black text-white truncate">
                              @
                              {user.username ||
                                "user"}
                            </p>

                            {user.is_verified && (
                              <span className="text-cyan-400 text-[9px]">
                                ✓
                              </span>
                            )}
                          </div>

                          {user.full_name && (
                            <p className="text-[9px] text-zinc-600 truncate mt-0.5">
                              {
                                user.full_name
                              }
                            </p>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-1 text-[8px] uppercase font-black text-cyan-400">
                          <MessageSquare
                            size={
                              10
                            }
                          />
                          Message
                        </div>
                      </button>
                    )
                  )}
              </div>
            </section>
          )}
      </main>

      {/* =====================================================
          NEW CHAT MODAL
      ===================================================== */}

      <AnimatePresence>
        {showNewChatModal && (
          <>
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
              onClick={() =>
                setShowNewChatModal(
                  false
                )
              }
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120]"
            />

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 20,
              }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[94%] max-w-md max-h-[85vh] bg-[#0c0c12] border border-cyan-500/20 rounded-3xl z-[121] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <MessageSquare
                      size={16}
                      className="text-purple-400"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-black">
                      New conversation
                    </h3>

                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider">
                      Choose someone to message
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    setShowNewChatModal(
                      false
                    )
                  }
                  className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white"
                >
                  <X
                    size={16}
                  />
                </button>
              </div>

              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input
                    value={
                      newChatSearch
                    }
                    onChange={(
                      event
                    ) =>
                      setNewChatSearch(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Search username or name..."
                    autoFocus
                    className="w-full h-10 rounded-xl bg-white/[0.04] border border-white/10 pl-9 pr-4 text-xs outline-none focus:border-cyan-500/40"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto inbox-scrollbar p-3 space-y-1.5">
                <p className="text-[9px] uppercase font-black tracking-[2px] text-zinc-600 px-2 py-1">
                  {newChatSearch
                    ? "Search results"
                    : "Suggested people"}
                </p>

                {filteredSuggestedUsers.length ===
                0 ? (
                  <EmptyState
                    icon={
                      <Users
                        size={26}
                      />
                    }
                    title="No people found"
                    description="Try another username or name."
                  />
                ) : (
                  filteredSuggestedUsers.map(
                    (user) => {
                      const isFollowed =
                        myFollows.has(
                          user.id
                        );

                      return (
                        <button
                          key={
                            user.id
                          }
                          onClick={() => {
                            setShowNewChatModal(
                              false
                            );

                            setNewChatSearch(
                              ""
                            );

                            navigate(
                              `/messaging?userId=${user.id}`
                            );
                          }}
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-cyan-500/15 transition-all text-left"
                        >
                          <img
                            src={
                              user.avatar_url ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
                            }
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                            alt=""
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black text-white truncate">
                                @
                                {user.username ||
                                  "user"}
                              </p>

                              {user.is_verified && (
                                <span className="text-cyan-400 text-[9px]">
                                  ✓
                                </span>
                              )}
                            </div>

                            {user.full_name && (
                              <p className="text-[10px] text-zinc-500 truncate">
                                {
                                  user.full_name
                                }
                              </p>
                            )}
                          </div>

                          {isFollowed && (
                            <span className="text-[8px] font-black uppercase px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              Friend
                            </span>
                          )}

                          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <Send
                              size={
                                13
                              }
                            />
                          </div>
                        </button>
                      );
                    }
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* =====================================================
          ACTIVITY DRAWERS
      ===================================================== */}

      <ActivityDrawer
        isOpen={
          isFollowerPanelOpen
        }
        onClose={() =>
          setIsFollowerPanelOpen(
            false
          )
        }
        title="Followers"
        categoryKey="followers"
        data={activities.filter(
          (activity) =>
            isFollowerType(
              activity.type
            )
        )}
      />

      <ActivityDrawer
        isOpen={
          isLikesPanelOpen
        }
        onClose={() =>
          setIsLikesPanelOpen(
            false
          )
        }
        title="Likes"
        categoryKey="likes"
        data={activities.filter(
          (activity) =>
            isLikeType(
              activity.type
            )
        )}
      />

      <ActivityDrawer
        isOpen={
          isCommentsPanelOpen
        }
        onClose={() =>
          setIsCommentsPanelOpen(
            false
          )
        }
        title="Comments"
        categoryKey="comments"
        data={activities.filter(
          (activity) =>
            isCommentType(
              activity.type
            )
        )}
      />

      <ActivityDrawer
        isOpen={
          isActivityPanelOpen
        }
        onClose={() =>
          setIsActivityPanelOpen(
            false
          )
        }
        title="Activity"
        categoryKey="activity"
        data={activities.filter(
          (activity) =>
            !isFollowerType(
              activity.type
            ) &&
            !isLikeType(
              activity.type
            ) &&
            !isCommentType(
              activity.type
            )
        )}
      />
    </div>
  );
};

export default Inbox;
