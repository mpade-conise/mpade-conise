import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
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
} from "lucide-react";

import { supabase } from "../supabaseClient";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

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
  // FETCH PROFILES
  // =========================================================

  const fetchProfilesBatch = useCallback(
    async (userIds) => {
      if (!userIds || userIds.length === 0) {
        return new Map();
      }

      const uniqueIds = [
        ...new Set(
          userIds.filter(Boolean)
        ),
      ];

      if (uniqueIds.length === 0) {
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
          (data || []).map((profile) => [
            profile.id,
            profile,
          ])
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
      if (!videoIds || videoIds.length === 0) {
        return new Map();
      }

      const uniqueIds = [
        ...new Set(
          videoIds.filter(Boolean)
        ),
      ];

      if (uniqueIds.length === 0) {
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
          (data || []).map((video) => [
            video.id,
            video,
          ])
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
    async (uid, isManual = false) => {
      if (!uid || !mountedRef.current) {
        return;
      }

      if (fetchInProgressRef.current) {
        return;
      }

      fetchInProgressRef.current = true;

      if (isManual) {
        setIsRefreshing(true);
      }

      try {
        // -----------------------------------------------------
        // LIVE STREAMS
        // -----------------------------------------------------

        const streamsPromise = supabase
          .from("live_streams")
          .select(
            "*, profiles:host_id(avatar_url, username)"
          )
          .eq("status", "live");

        // -----------------------------------------------------
        // ACTIVITIES
        // -----------------------------------------------------

        const activitiesPromise = supabase
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
          .eq("user_id", uid)
          .order("created_at", {
            ascending: false,
          })
          .limit(100);

        // -----------------------------------------------------
        // MESSAGES
        // -----------------------------------------------------

        const messagesPromise = supabase
          .from("messages")
          .select("*")
          .or(
            `receiver_id.eq.${uid},sender_id.eq.${uid}`
          )
          .order("updated_at", {
            ascending: false,
          })
          .limit(300);

        // -----------------------------------------------------
        // FOLLOWS
        // -----------------------------------------------------

        const followsPromise = supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", uid);

        // -----------------------------------------------------
        // LIVE INVITES
        // -----------------------------------------------------

        const invitesPromise = supabase
          .from("live_guest_requests")
          .select("*")
          .eq("user_id", uid)
          .eq("status", "invited")
          .order("created_at", {
            ascending: false,
          });

        // -----------------------------------------------------
        // SUGGESTED USERS
        // -----------------------------------------------------

        const suggestedUsersPromise = supabase
          .from("profiles")
          .select(
            "id, username, avatar_url, full_name, is_verified"
          )
          .neq("id", uid)
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

        if (!mountedRef.current) {
          return;
        }

        // =====================================================
        // LIVE STREAMS
        // =====================================================

        if (!streamsRes.error) {
          setLiveStreams(
            streamsRes.data || []
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

        if (!followsRes.error) {
          setMyFollows(
            new Set(
              (followsRes.data || []).map(
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

        if (!suggestedRes.error) {
          setSuggestedUsers(
            suggestedRes.data || []
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
          activitiesRes.data || [];

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
            .eq("user_id", uid)
            .order("created_at", {
              ascending: false,
            })
            .limit(100);

          if (
            rawActivitiesError
          ) {
            console.error(
              "Raw activities error:",
              rawActivitiesError.message
            );

            processedActivities = [];
          } else if (
            rawActivities &&
            rawActivities.length > 0
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
            ] = await Promise.all([
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
          // Fill missing actor information
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

          // Fill missing video information
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
            missingActorIds.length > 0 ||
            missingVideoIds.length > 0
          ) {
            const [
              profilesMap,
              videosMap,
            ] = await Promise.all([
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

        if (mountedRef.current) {
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
          invitesRes.data.length > 0
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

          if (streamIds.length > 0) {
            const {
              data: activeStreamsData,
              error: activeStreamsError,
            } = await supabase
              .from("live_streams")
              .select(`
                *,
                host:profiles!host_id(
                  id,
                  username,
                  avatar_url
                )
              `)
              .in("id", streamIds)
              .eq("status", "live");

            if (
              activeStreamsError
            ) {
              console.error(
                "Active invite streams error:",
                activeStreamsError.message
              );

              setLiveInvites([]);
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
            setLiveInvites([]);
          }
        } else {
          setLiveInvites([]);
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

          if (plainMsgsError) {
            console.error(
              "Fallback messages error:",
              plainMsgsError.message
            );
          } else {
            rawMsgs =
              plainMsgs || [];
          }
        } else {
          rawMsgs =
            messagesRes.data || [];
        }

        // =====================================================
        // PROCESS MESSAGE THREADS
        // =====================================================

        if (
          rawMsgs.length > 0
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
                timeB - timeA
              );
            }
          );

          const peerUserIds = [
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

          // ---------------------------------------------------
          // UNREAD COUNTS
          // ---------------------------------------------------

          const unreadCountPerPeer =
            {};

          rawMsgs.forEach(
            (message) => {
              const isForMe =
                message.receiver_id ===
                uid;

              /*
               * Primary source of truth:
               * unread === true
               *
               * We only fall back to status when unread
               * is not present.
               */

              let isUnread = false;

              if (
                typeof message.unread ===
                "boolean"
              ) {
                isUnread =
                  isForMe &&
                  message.unread ===
                    true;
              } else if (
                typeof message.unread ===
                "string"
              ) {
                isUnread =
                  isForMe &&
                  message.unread.toLowerCase() ===
                    "true";
              } else {
                isUnread =
                  isForMe &&
                  (
                    message.status ===
                      "unread" ||
                    message.status ===
                      "delivered"
                  );
              }

              if (
                isUnread &&
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

          // ---------------------------------------------------
          // GROUP INTO UNIQUE CONVERSATIONS
          // ---------------------------------------------------

          const uniqueThreads = [];

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

              const displayProfile = {
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

              uniqueThreads.push({
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
              });
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
          setMessages([]);
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
          setIsRefreshing(false);
        }
      }
    },
    [
      fetchProfilesBatch,
      fetchVideosBatch,
    ]
  );

  // =========================================================
  // MESSAGE PREVIEW
  // =========================================================

  const getMessagePreviewText = (
    message
  ) => {
    if (
      message.type === "voice" ||
      message.media_type === "voice" ||
      message.audio_url ||
      message.metadata?.type ===
        "voice"
    ) {
      return "🎙️ Voice message";
    }

    if (
      message.type === "image" ||
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
      message.type === "video" ||
      message.media_type ===
        "video"
    ) {
      return "🎬 Video attachment";
    }

    if (
      message.type === "file" ||
      message.media_type ===
        "file"
    ) {
      return "📁 Document attached";
    }

    if (
      message.type === "call" ||
      (
        message.call_duration &&
        message.call_duration > 0
      ) ||
      message.metadata?.call_type
    ) {
      return message.metadata
        ?.call_type === "video"
        ? "📹 Video Call"
        : "📞 Voice Call";
    }

    if (message.last_msg) {
      return message.last_msg;
    }

    if (message.content) {
      return message.content;
    }

    return "Sent a message";
  };

  // =========================================================
  // FOLLOW BACK
  // =========================================================

  const handleFollowBack = async (
    targetId,
    event
  ) => {
    if (event) {
      event.stopPropagation();
    }

    if (
      !currentUserId ||
      !targetId ||
      currentUserId === targetId
    ) {
      return;
    }

    const wasFollowing =
      myFollows.has(targetId);

    setMyFollows((previous) => {
      const updated =
        new Set(previous);

      updated.add(targetId);

      return updated;
    });

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
              new Set(previous);

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

  const handleMarkAllRead =
    async () => {
      if (!currentUserId) {
        return;
      }

      // Optimistic update
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
      } catch (error) {
        console.error(
          "Mark all read failed:",
          error
        );
      }
    };

  // =========================================================
  // MARK CATEGORY AS READ
  // =========================================================

  const markCategoryAsRead =
    async (typeGroup) => {
      if (!currentUserId) {
        return;
      }

      setActivities(
        (previous) =>
          previous.map(
            (activity) => {
              if (
                typeGroup ===
                "all"
              ) {
                return {
                  ...activity,
                  is_read: true,
                };
              }

              if (
                typeGroup ===
                  "followers" &&
                (
                  activity.type ===
                    "follow" ||
                  activity.type ===
                    "user_follow"
                )
              ) {
                return {
                  ...activity,
                  is_read: true,
                };
              }

              if (
                typeGroup ===
                  "likes" &&
                (
                  activity.type ===
                    "like" ||
                  activity.type ===
                    "video_likes" ||
                  activity.type ===
                    "video_like"
                )
              ) {
                return {
                  ...activity,
                  is_read: true,
                };
              }

              if (
                typeGroup ===
                  "comments" &&
                (
                  activity.type ===
                    "comment" ||
                  activity.type ===
                    "video_comments" ||
                  activity.type ===
                    "video_comment"
                )
              ) {
                return {
                  ...activity,
                  is_read: true,
                };
              }

              if (
                typeGroup ===
                  "activity" &&
                activity.type !==
                  "follow" &&
                activity.type !==
                  "user_follow"
              ) {
                return {
                  ...activity,
                  is_read: true,
                };
              }

              return activity;
            }
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
          query = query.in(
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
          query = query.in(
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
          query = query.in(
            "type",
            [
              "comment",
              "video_comments",
              "video_comment",
            ]
          );
        } else if (
          typeGroup ===
          "activity"
        ) {
          query = query.not(
            "type",
            "in",
            '("follow","user_follow")'
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

      if (!item?.id) {
        return;
      }

      if (!item.is_read) {
        setActivities(
          (previous) =>
            previous.map(
              (activity) =>
                activity.id ===
                item.id
                  ? {
                      ...activity,
                      is_read: true,
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

      if (targetVideoId) {
        const isComment =
          item.type ===
            "comment" ||
          item.type ===
            "video_comments" ||
          item.type ===
            "video_comment";

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

      if (targetActorId) {
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

      if (!actorId) {
        return;
      }

      if (itemId) {
        setActivities(
          (previous) =>
            previous.map(
              (activity) =>
                activity.id ===
                itemId
                  ? {
                      ...activity,
                      is_read: true,
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

      if (!videoId) {
        return;
      }

      if (itemId) {
        setActivities(
          (previous) =>
            previous.map(
              (activity) =>
                activity.id ===
                itemId
                  ? {
                      ...activity,
                      is_read: true,
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
    async (peerId) => {
      if (
        !peerId ||
        !currentUserId
      ) {
        return;
      }

      setMessages(
        (previous) =>
          previous.map(
            (message) =>
              message.displayProfile
                ?.id === peerId
                ? {
                    ...message,
                    unreadCount: 0,
                    unread: false,
                    status: "read",
                  }
                : message
          )
      );

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

      navigate(
        `/messaging?userId=${peerId}`
      );
    };

  // =========================================================
  // ACCEPT LIVE INVITE
  // =========================================================

  const handleAcceptLiveInvite =
    async (invite) => {
      if (!invite?.id) {
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
          .select("status")
          .eq(
            "id",
            invite.stream_id
          )
          .single();

        if (streamError) {
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
          error: countError,
        } = await supabase
          .from("live_guest_requests")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "stream_id",
            invite.stream_id
          )
          .eq(
            "status",
            "approved"
          );

        const MAX_GUEST_SLOTS = 7;

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
              status: "full",
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
          error: updateError,
        } = await supabase
          .from(
            "live_guest_requests"
          )
          .update({
            status: "approved",
          })
          .eq(
            "id",
            invite.id
          );

        if (updateError) {
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
    async (invite) => {
      if (!invite?.id) {
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
            status: "rejected",
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
    mountedRef.current = true;

    let localChannel = null;

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
            setLoading(false);
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
          // CREATE REALTIME CHANNEL
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
                  event: "INSERT",
                  schema: "public",
                  table: "activities",
                  filter: `user_id=eq.${user.id}`,
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
                    payload.new.actor_id;

                  let profileData =
                    null;

                  if (actorId) {
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

                      if (exists) {
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
                  event: "UPDATE",
                  schema: "public",
                  table: "activities",
                  filter: `user_id=eq.${user.id}`,
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
                  event: "*",
                  schema: "public",
                  table:
                    "live_guest_requests",
                  filter: `user_id=eq.${user.id}`,
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
                  event: "*",
                  schema: "public",
                  table: "messages",
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
                  event: "*",
                  schema: "public",
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
                (status) => {
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
            setLoading(false);
          }
        }
      };

    initInbox();

    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------

    return () => {
      mountedRef.current =
        false;

      if (
        localChannel
      ) {
        supabase.removeChannel(
          localChannel
        );

        localChannel = null;
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
    activities.filter(
      (activity) =>
        (
          activity.type ===
            "follow" ||
          activity.type ===
            "user_follow"
        ) &&
        !activity.is_read
    );

  const unreadLikes =
    activities.filter(
      (activity) =>
        (
          activity.type ===
            "like" ||
          activity.type ===
            "video_likes" ||
          activity.type ===
            "video_like"
        ) &&
        !activity.is_read
    );

  const unreadComments =
    activities.filter(
      (activity) =>
        (
          activity.type ===
            "comment" ||
          activity.type ===
            "video_comments" ||
          activity.type ===
            "video_comment"
        ) &&
        !activity.is_read
    );

  const unreadMessagesTotal =
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
    );

  const totalUnreadCount =
    unreadFollowers.length +
    unreadLikes.length +
    unreadComments.length +
    unreadMessagesTotal;

  // =========================================================
  // FILTER ACTIVITIES
  // =========================================================

  const filteredActivities =
    activities
      .filter((item) => {
        if (
          activeFilter ===
          "followers"
        ) {
          return (
            item.type ===
              "follow" ||
            item.type ===
              "user_follow"
          );
        }

        if (
          activeFilter ===
          "likes"
        ) {
          return (
            item.type ===
              "like" ||
            item.type ===
              "video_likes" ||
            item.type ===
              "video_like"
          );
        }

        if (
          activeFilter ===
          "comments"
        ) {
          return (
            item.type ===
              "comment" ||
            item.type ===
              "video_comments" ||
            item.type ===
              "video_comment"
          );
        }

        if (
          activeFilter ===
          "messages"
        ) {
          return false;
        }

        return true;
      })
      .filter((item) => {
        if (
          !searchQuery.trim()
        ) {
          return true;
        }

        const query =
          searchQuery.toLowerCase();

        return (
          item.actor?.username
            ?.toLowerCase()
            .includes(query) ||

          item.actor?.full_name
            ?.toLowerCase()
            .includes(query) ||

          item.videos?.caption
            ?.toLowerCase()
            .includes(query)
        );
      });

  // =========================================================
  // FILTER MESSAGES
  // =========================================================

  const filteredMessages =
    messages.filter(
      (message) => {
        if (
          !searchQuery.trim()
        ) {
          return true;
        }

        const query =
          searchQuery.toLowerCase();

        return (
          message.displayProfile
            ?.username
            ?.toLowerCase()
            .includes(query) ||

          message.displayProfile
            ?.full_name
            ?.toLowerCase()
            .includes(query) ||

          message.user_name
            ?.toLowerCase()
            .includes(query) ||

          message.last_msg
            ?.toLowerCase()
            .includes(query) ||

          message.content
            ?.toLowerCase()
            .includes(query)
        );
      }
    );

  // =========================================================
  // FILTER SUGGESTED USERS
  // =========================================================

  const filteredSuggestedUsers =
    suggestedUsers.filter(
      (user) => {
        if (
          !newChatSearch.trim()
        ) {
          return true;
        }

        const query =
          newChatSearch.toLowerCase();

        return (
          user.username
            ?.toLowerCase()
            .includes(query) ||
          user.full_name
            ?.toLowerCase()
            .includes(query)
        );
      }
    );

  // =========================================================
  // ACTIVITY ICON
  // =========================================================

  const getActivityIcon =
    (type) => {
      switch (type) {
        case "comment":
        case "video_comments":
        case "video_comment":
          return (
            <MessageCircle
              size={12}
              className="text-cyan-400 fill-cyan-400"
            />
          );

        case "like":
        case "video_likes":
        case "video_like":
          return (
            <Heart
              size={12}
              className="text-pink-500 fill-pink-500"
            />
          );

        case "follow":
        case "user_follow":
          return (
            <UserPlus
              size={12}
              className="text-blue-400"
            />
          );

        default:
          return (
            <Bell
              size={12}
              className="text-yellow-400"
            />
          );
      }
    };

  // =========================================================
  // ACTIVITY TEXT
  // =========================================================

  const getActivityText =
    (item) => {
      if (
        item.type ===
          "follow" ||
        item.type ===
          "user_follow"
      ) {
        return "started following you";
      }

      if (
        item.type ===
          "like" ||
        item.type ===
          "video_likes" ||
        item.type ===
          "video_like"
      ) {
        return "liked your video";
      }

      if (
        item.type ===
          "comment" ||
        item.type ===
          "video_comments" ||
        item.type ===
          "video_comment"
      ) {
        return "commented on your video";
      }

      return "interacted with your profile";
    };

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
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110]"
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
              <div className="p-4 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={
                      onClose
                    }
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <ArrowLeft
                      size={22}
                      className="text-cyan-400"
                    />
                  </button>

                  <h2 className="text-base font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
                    {title}
                  </h2>
                </div>

                <button
                  onClick={() =>
                    markCategoryAsRead(
                      categoryKey
                    )
                  }
                  className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg transition-colors active:scale-95"
                >
                  <CheckCheck
                    size={13}
                  />
                  Mark Read
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                {data.length ===
                0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-sm">
                    <Bell
                      size={32}
                      className="text-zinc-600 mb-2 opacity-50"
                    />

                    No items in this category yet
                  </div>
                ) : (
                  data.map(
                    (item) => {
                      const isFollowingBack =
                        myFollows.has(
                          item.actor_id
                        );

                      const isUnread =
                        !item.is_read;

                      const isComment =
                        item.type ===
                          "comment" ||
                        item.type ===
                          "video_comments" ||
                        item.type ===
                          "video_comment";

                      return (
                        <div
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
                              ? "bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                              : "bg-white/[0.03] border-white/5 hover:bg-white/[0.07]"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="relative shrink-0 cursor-pointer"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                handleActorProfileClick(
                                  item.actor_id ||
                                    item.actor
                                      ?.id,
                                  item.id,
                                  event
                                );

                                onClose();
                              }}
                            >
                              {item.actor
                                ?.avatar_url ? (
                                <img
                                  src={
                                    item
                                      .actor
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

                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/20 shadow">
                                {getActivityIcon(
                                  item.type
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <p
                                  onClick={(
                                    event
                                  ) => {
                                    event.stopPropagation();

                                    handleActorProfileClick(
                                      item.actor_id ||
                                        item
                                          .actor
                                          ?.id,
                                      item.id,
                                      event
                                    );

                                    onClose();
                                  }}
                                  className="text-[13px] font-black text-white truncate hover:underline"
                                >
                                  @
                                  {item.actor
                                    ?.username ||
                                    "user"}
                                </p>

                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,1)] shrink-0 animate-pulse" />
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

                          {(
                            item.type ===
                              "follow" ||
                            item.type ===
                              "user_follow"
                          ) ? (
                            <button
                              onClick={(
                                event
                              ) =>
                                handleFollowBack(
                                  item.actor_id,
                                  event
                                )
                              }
                              disabled={
                                isFollowingBack
                              }
                              className={`text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all shadow-md shrink-0 ${
                                isFollowingBack
                                  ? "bg-zinc-800 text-zinc-400 border border-white/10 cursor-default"
                                  : "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-500/20 active:scale-95"
                              }`}
                            >
                              {isFollowingBack
                                ? "Friends"
                                : "Follow Back"}
                            </button>
                          ) : item.video_id ||
                            item.videos
                              ?.id ? (
                            <div
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                handleVideoThumbnailClick(
                                  item.video_id ||
                                    item
                                      .videos
                                      ?.id,
                                  item.id,
                                  isComment,
                                  event
                                );

                                onClose();
                              }}
                              className="w-12 h-14 rounded-xl bg-zinc-800 relative overflow-hidden border border-cyan-500/30 cursor-pointer flex items-center justify-center shrink-0 shadow-md group hover:border-cyan-400"
                            >
                              {item
                                .videos
                                ?.thumbnail_url ? (
                                <img
                                  src={
                                    item
                                      .videos
                                      .thumbnail_url
                                  }
                                  crossOrigin="anonymous"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  alt=""
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-cyan-950 to-pink-950 flex items-center justify-center">
                                  <Play
                                    size={14}
                                    className="text-cyan-400 fill-cyan-400 opacity-80"
                                  />
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
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
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#07070a] text-white">
        <Loader2
          className="animate-spin text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.9)] mb-3"
          size={40}
        />

        <p className="text-xs uppercase font-black tracking-widest text-zinc-400">
          Loading Inbox & Messages...
        </p>
      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="flex flex-col h-screen bg-[#07070a] text-white overflow-hidden font-sans select-none">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="px-5 pt-8 pb-3.5 flex items-center justify-between border-b border-cyan-500/15 bg-black/40 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Bell
              size={20}
              className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-rose-400">
                Inbox
              </h1>

              {totalUnreadCount >
                0 && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-[10px] shadow-[0_0_10px_rgba(244,63,94,0.7)] animate-pulse">
                  {totalUnreadCount}{" "}
                  New
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              <span>
                Activity &
                Messages
              </span>

              {lastFetchedAt && (
                <span className="text-zinc-600 font-normal lowercase">
                  •{" "}
                  {formatDistanceToNow(
                    lastFetchedAt,
                    {
                      addSuffix:
                        true,
                    }
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">

          {/* REFRESH */}

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
            title="Refresh messages and activities"
            className="p-2 bg-white/5 hover:bg-white/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <RefreshCw
              size={16}
              className={
                isRefreshing
                  ? "animate-spin text-cyan-300"
                  : ""
              }
            />
          </button>

          {/* NEW CHAT */}

          <button
            onClick={() =>
              setShowNewChatModal(
                true
              )
            }
            title="Start new direct message"
            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
          >
            <Plus
              size={16}
              className="text-purple-400"
            />

            <span className="hidden sm:inline text-[11px] font-black uppercase">
              New Chat
            </span>
          </button>

          {/* MARK ALL */}

          {totalUnreadCount >
            0 && (
            <button
              onClick={
                handleMarkAllRead
              }
              title="Mark all notifications and messages as read"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
            >
              <CheckCheck
                size={14}
                className="text-cyan-400"
              />

              <span className="hidden sm:inline">
                Mark All
              </span>
            </button>
          )}

          {/* SEARCH */}

          <button
            onClick={() =>
              setShowSearch(
                (previous) =>
                  !previous
              )
            }
            className={`p-2 rounded-xl border transition-all ${
              showSearch
                ? "bg-pink-500 text-white border-pink-400"
                : "bg-white/5 text-zinc-400 border-white/10 hover:text-white"
            }`}
          >
            <Search size={18} />
          </button>
        </div>
      </header>

      {/* =====================================================
          SEARCH
      ===================================================== */}

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
            className="px-4 py-2.5 bg-black/60 border-b border-cyan-500/20"
          >
            <div className="relative flex items-center">
              <Search
                size={16}
                className="absolute left-3 text-zinc-400"
              />

              <input
                type="text"
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
                placeholder="Search activities, users, messages..."
                className="w-full bg-[#121218] border border-cyan-500/30 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
                autoFocus
              />

              {searchQuery && (
                <button
                  onClick={() =>
                    setSearchQuery(
                      ""
                    )
                  }
                  className="absolute right-3 text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">

        {/* FILTERS */}

        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">

            {/* ALL */}

            <button
              onClick={() =>
                setActiveFilter(
                  "all"
                )
              }
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter ===
                "all"
                  ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>All</span>

              {totalUnreadCount >
                0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    activeFilter ===
                    "all"
                      ? "bg-black text-cyan-300"
                      : "bg-pink-600 text-white"
                  }`}
                >
                  {
                    totalUnreadCount
                  }
                </span>
              )}
            </button>

            {/* LIKES */}

            <button
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
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter ===
                "likes"
                  ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.5)]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Heart
                size={14}
                className={
                  activeFilter ===
                  "likes"
                    ? "fill-white text-white"
                    : "text-pink-500 fill-pink-500"
                }
              />

              <span>
                Likes
              </span>

              {unreadLikes.length >
                0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-pink-500 text-white shadow animate-pulse">
                  {
                    unreadLikes.length
                  }
                </span>
              )}
            </button>

            {/* COMMENTS */}

            <button
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
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter ===
                "comments"
                  ? "bg-cyan-400 text-black border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <MessageCircle
                size={14}
                className={
                  activeFilter ===
                  "comments"
                    ? "fill-black text-black"
                    : "text-cyan-400 fill-cyan-400"
                }
              />

              <span>
                Comments
              </span>

              {unreadComments.length >
                0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-cyan-500 text-black shadow animate-pulse">
                  {
                    unreadComments.length
                  }
                </span>
              )}
            </button>

            {/* MESSAGES */}

            <button
              onClick={() =>
                setActiveFilter(
                  "messages"
                )
              }
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter ===
                "messages"
                  ? "bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <MessageSquare
                size={14}
                className={
                  activeFilter ===
                  "messages"
                    ? "text-white fill-white"
                    : "text-purple-400"
                }
              />

              <span>
                Messages
              </span>

              {unreadMessagesTotal >
                0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-500 text-white shadow animate-pulse">
                  {
                    unreadMessagesTotal
                  }
                </span>
              )}
            </button>

            {/* FOLLOWERS */}

            <button
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
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border ${
                activeFilter ===
                "followers"
                  ? "bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <UserPlus
                size={14}
                className={
                  activeFilter ===
                  "followers"
                    ? "text-white"
                    : "text-blue-400"
                }
              />

              <span>
                Followers
              </span>

              {unreadFollowers.length >
                0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-blue-500 text-white shadow animate-pulse">
                  {
                    unreadFollowers.length
                  }
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ===================================================
            BENTO DASHBOARD
        =================================================== */}

        {activeFilter ===
          "all" && (
          <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">

            {/* LIKES */}

            <div
              onClick={() => {
                setIsLikesPanelOpen(
                  true
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
              className="flex flex-col justify-between p-3.5 rounded-2xl bg-gradient-to-br from-pink-950/40 via-zinc-900 to-black border border-pink-500/30 cursor-pointer hover:border-pink-400/70 hover:shadow-[0_0_20px_rgba(236,72,153,0.25)] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 bg-pink-500/20 text-pink-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Heart
                    size={18}
                    className="fill-pink-500 text-pink-500"
                  />
                </div>

                {unreadLikes.length >
                0 ? (
                  <span className="bg-pink-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-[0_0_10px_rgba(236,72,153,0.8)] animate-pulse">
                    {
                      unreadLikes.length
                    }{" "}
                    New
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">
                    0 New
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-black text-white group-hover:text-pink-300 transition-colors">
                  Likes
                </p>

                <p className="text-[10px] text-zinc-400 font-medium">
                  Video
                  reactions
                </p>
              </div>
            </div>

            {/* COMMENTS */}

            <div
              onClick={() => {
                setIsCommentsPanelOpen(
                  true
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
              className="flex flex-col justify-between p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-zinc-900 to-black border border-cyan-500/30 cursor-pointer hover:border-cyan-400/70 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle
                    size={18}
                    className="fill-cyan-400 text-cyan-400"
                  />
                </div>

                {unreadComments.length >
                0 ? (
                  <span className="bg-cyan-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse">
                    {
                      unreadComments.length
                    }{" "}
                    New
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">
                    0 New
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                  Comments
                </p>

                <p className="text-[10px] text-zinc-400 font-medium">
                  Video
                  remarks
                </p>
              </div>
            </div>

            {/* MESSAGES */}

            <div
              onClick={() =>
                setActiveFilter(
                  "messages"
                )
              }
              className="flex flex-col justify-between p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-zinc-900 to-black border border-purple-500/30 cursor-pointer hover:border-purple-400/70 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare
                    size={18}
                    className="text-purple-400"
                  />
                </div>

                {unreadMessagesTotal >
                0 ? (
                  <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse">
                    {
                      unreadMessagesTotal
                    }{" "}
                    New
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">
                    0 New
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-black text-white group-hover:text-purple-300 transition-colors">
                  Messages
                </p>

                <p className="text-[10px] text-zinc-400 font-medium">
                  Direct
                  chats
                </p>
              </div>
            </div>

            {/* FOLLOWERS */}

            <div
              onClick={() => {
                setIsFollowerPanelOpen(
                  true
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
              className="flex flex-col justify-between p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-zinc-900 to-black border border-blue-500/30 cursor-pointer hover:border-blue-400/70 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus
                    size={18}
                    className="text-blue-400"
                  />
                </div>

                {unreadFollowers.length >
                0 ? (
                  <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse">
                    {
                      unreadFollowers.length
                    }{" "}
                    New
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">
                    0 New
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">
                  Followers
                </p>

                <p className="text-[10px] text-zinc-400 font-medium">
                  Connections
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            LIVE STREAMS
        =================================================== */}

        {liveStreams.length >
          0 && (
          <div className="flex gap-4 px-4 py-3 overflow-x-auto no-scrollbar border-b border-white/5">
            {liveStreams.map(
              (live) => (
                <div
                  key={
                    live.id
                  }
                  onClick={() =>
                    navigate(
                      `/live/watch/${live.id}`
                    )
                  }
                  className="flex flex-col items-center min-w-[72px] cursor-pointer group"
                >
                  <div className="relative p-[2.5px] rounded-full bg-gradient-to-tr from-cyan-400 via-pink-500 to-rose-500 shadow-[0_0_12px_rgba(236,72,153,0.5)] group-hover:scale-105 transition-transform">
                    <img
                      src={
                        live
                          .profiles
                          ?.avatar_url ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                      }
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className="w-[54px] h-[54px] rounded-full object-cover"
                      alt=""
                    />

                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider shadow">
                      Live
                    </div>
                  </div>

                  <span className="text-[11px] font-bold mt-2 truncate w-16 text-center text-cyan-200">
                    @
                    {
                      live
                        .profiles
                        ?.username
                    }
                  </span>
                </div>
              )
            )}
          </div>
        )}

        {/* ===================================================
            LIVE INVITES
        =================================================== */}

        {liveInvites.length >
          0 && (
          <div className="px-4 pt-3 pb-2 space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />

              <h3 className="text-[11px] font-black uppercase tracking-wider text-cyan-300">
                Live Co-Host
                Invites (
                {
                  liveInvites.length
                }
                )
              </h3>
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
                    <div
                      key={
                        invite.id
                      }
                      className="bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-pink-950/30 border border-cyan-500/40 p-4 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.15)] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={
                                hostProfile?.avatar_url ||
                                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                              }
                              alt=""
                              className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400 p-0.5 shadow-md"
                            />

                            <div className="absolute -bottom-1 -right-1 bg-pink-600 text-white p-1 rounded-full text-[10px] shadow">
                              <Radio
                                size={10}
                                className="animate-pulse"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black text-white">
                                @
                                {hostProfile?.username ||
                                  "Host"}
                              </p>

                              <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded text-[9px] font-black uppercase">
                                Live Room
                              </span>
                            </div>

                            <p className="text-[11px] text-cyan-200 font-medium mt-0.5">
                              Invited you
                              to co-host
                              on{" "}
                              {isVideo
                                ? "📹 Video"
                                : "🎙️ Mic"}{" "}
                              panel
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
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
                          className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          {acceptingInviteId ===
                          invite.id ? (
                            <>
                              <Loader2
                                size={
                                  14
                                }
                                className="animate-spin"
                              />

                              Checking
                              space...
                            </>
                          ) : (
                            <>
                              <Sparkles
                                size={
                                  14
                                }
                              />

                              Accept &
                              Join
                              Stage
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeclineLiveInvite(
                              invite
                            )
                          }
                          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-zinc-300 font-bold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1"
                        >
                          <X
                            size={
                              14
                            }
                          />

                          Decline
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* ===================================================
            ACTIVITY FEED
        =================================================== */}

        {activeFilter !==
          "messages" && (
          <div className="px-4 pt-3 space-y-2">
            <div className="flex items-center justify-between px-1 pb-1">
              <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame
                  size={13}
                  className="text-pink-500"
                />

                {activeFilter ===
                "all"
                  ? "Recent Activity"
                  : `${activeFilter.toUpperCase()} Activity`}
              </h3>

              {filteredActivities.some(
                (activity) =>
                  !activity.is_read
              ) && (
                <button
                  onClick={() =>
                    markCategoryAsRead(
                      activeFilter
                    )
                  }
                  className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Check
                    size={12}
                  />

                  Mark section
                  read
                </button>
              )}
            </div>

            {filteredActivities.length ===
            0 ? (
              <div className="py-8 text-center bg-white/[0.02] border border-white/5 rounded-2xl">
                <Bell
                  size={24}
                  className="text-zinc-600 mx-auto mb-1.5 opacity-60"
                />

                <p className="text-xs font-bold text-zinc-500">
                  No activities
                  found in
                  this filter
                </p>
              </div>
            ) : (
              filteredActivities.map(
                (item) => {
                  const isFollowingBack =
                    myFollows.has(
                      item.actor_id
                    );

                  const isUnread =
                    !item.is_read;

                  const isComment =
                    item.type ===
                      "comment" ||
                    item.type ===
                      "video_comments" ||
                    item.type ===
                      "video_comment";

                  return (
                    <div
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
                      className={`flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer border ${
                        isUnread
                          ? "bg-gradient-to-r from-cyan-950/30 via-zinc-900 to-black border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                          : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08]"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">

                        {/* ACTOR */}

                        <div
                          className="relative shrink-0 cursor-pointer group"
                          onClick={(
                            event
                          ) =>
                            handleActorProfileClick(
                              item.actor_id ||
                                item.actor
                                  ?.id,
                              item.id,
                              event
                            )
                          }
                          title="View profile"
                        >
                          {item.actor
                            ?.avatar_url ? (
                            <img
                              src={
                                item
                                  .actor
                                  .avatar_url
                              }
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-full object-cover border border-cyan-400/40 p-0.5 group-hover:border-cyan-300 transition-colors"
                              alt=""
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-cyan-400 uppercase font-black text-xs group-hover:border-cyan-400 transition-colors">
                              {item.actor?.username?.substring(
                                0,
                                2
                              ) ||
                                "??"}
                            </div>
                          )}

                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center border border-white/20 shadow">
                            {getActivityIcon(
                              item.type
                            )}
                          </div>
                        </div>

                        {/* DETAILS */}

                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <p
                              onClick={(
                                event
                              ) =>
                                handleActorProfileClick(
                                  item.actor_id ||
                                    item
                                      .actor
                                      ?.id,
                                  item.id,
                                  event
                                )
                              }
                              className="text-[13px] font-black text-white truncate hover:underline hover:text-cyan-300 transition-colors"
                            >
                              @
                              {item.actor
                                ?.username ||
                                "user"}
                            </p>

                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,1)] shrink-0 animate-pulse" />
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

                      {/* ACTION */}

                      {(
                        item.type ===
                          "follow" ||
                        item.type ===
                          "user_follow"
                      ) ? (
                        <button
                          onClick={(
                            event
                          ) =>
                            handleFollowBack(
                              item.actor_id,
                              event
                            )
                          }
                          disabled={
                            isFollowingBack
                          }
                          className={`text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-all shadow-md shrink-0 ${
                            isFollowingBack
                              ? "bg-zinc-800 text-zinc-400 border border-white/10 cursor-default"
                              : "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-500/20 active:scale-95"
                          }`}
                        >
                          {isFollowingBack
                            ? "Friends"
                            : "Follow Back"}
                        </button>
                      ) : item.video_id ||
                        item.videos
                          ?.id ? (
                        <div
                          onClick={(
                            event
                          ) =>
                            handleVideoThumbnailClick(
                              item.video_id ||
                                item
                                  .videos
                                  ?.id,
                              item.id,
                              isComment,
                              event
                            )
                          }
                          className="w-12 h-14 rounded-xl bg-zinc-800 relative overflow-hidden border border-cyan-500/40 cursor-pointer flex items-center justify-center shrink-0 shadow-md group hover:border-cyan-400 hover:scale-105 transition-all"
                          title="Click to view target video"
                        >
                          {item
                            .videos
                            ?.thumbnail_url ? (
                            <img
                              src={
                                item
                                  .videos
                                  .thumbnail_url
                              }
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              alt=""
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-950 to-pink-950 flex items-center justify-center">
                              <Play
                                size={
                                  14
                                }
                                className="text-cyan-400 fill-cyan-400 opacity-80"
                              />
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                }
              )
            )}
          </div>
        )}

        {/* ===================================================
            DIRECT MESSAGES
        =================================================== */}

        {(
          activeFilter ===
            "all" ||
          activeFilter ===
            "messages"
        ) && (
          <div className="mt-5 px-4">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare
                    size={13}
                    className="text-cyan-400"
                  />

                  Direct Messages (
                  {
                    filteredMessages.length
                  }
                  )
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {unreadMessagesTotal >
                  0 && (
                  <span className="text-[10px] font-black text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 rounded-full animate-pulse">
                    {
                      unreadMessagesTotal
                    }{" "}
                    unread
                  </span>
                )}

                <button
                  onClick={() =>
                    setShowNewChatModal(
                      true
                    )
                  }
                  className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                >
                  <Plus
                    size={12}
                  />

                  New Chat
                </button>
              </div>
            </div>

            {filteredMessages.length ===
            0 ? (
              <div className="py-10 text-center bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center px-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-2">
                  <MessageSquare
                    size={22}
                    className="text-purple-400"
                  />
                </div>

                <p className="text-sm font-black text-white">
                  No
                  Conversations
                  Yet
                </p>

                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  Connect with
                  friends, send
                  voice notes,
                  photos, and
                  start chatting
                  directly.
                </p>

                <button
                  onClick={() =>
                    setShowNewChatModal(
                      true
                    )
                  }
                  className="mt-3.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Plus
                    size={14}
                  />

                  Start A
                  Conversation
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMessages.map(
                  (message) => {
                    const hasUnread =
                      (
                        message.unreadCount ||
                        0
                      ) > 0;

                    const previewText =
                      getMessagePreviewText(
                        message
                      );

                    return (
                      <div
                        key={
                          message.id ||
                          message
                            .displayProfile
                            ?.id
                        }
                        onClick={() =>
                          handleOpenThread(
                            message
                              .displayProfile
                              ?.id
                          )
                        }
                        className={`flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all border ${
                          hasUnread
                            ? "bg-gradient-to-r from-purple-950/30 via-zinc-900 to-black border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                            : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08]"
                        }`}
                      >

                        {/* AVATAR */}

                        <div className="relative shrink-0">
                          <img
                            src={
                              message
                                .displayProfile
                                ?.avatar_url ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.displayProfile?.id}`
                            }
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            className="w-[52px] h-[52px] rounded-full object-cover border-2 border-cyan-400/40 p-0.5 shadow-md"
                            alt=""
                          />

                          {hasUnread && (
                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.9)] border-2 border-black animate-pulse">
                              {
                                message.unreadCount
                              }
                            </div>
                          )}
                        </div>

                        {/* CONTENT */}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-1.5 truncate">
                              <p className="text-[14px] font-black text-white truncate">
                                @
                                {message
                                  .displayProfile
                                  ?.username ||
                                  "user"}
                              </p>

                              {message
                                .displayProfile
                                ?.is_verified && (
                                <span className="text-cyan-400 text-xs">
                                  ✓
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] text-zinc-500 font-bold shrink-0">
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

                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`text-[12px] truncate ${
                                hasUnread
                                  ? "text-cyan-200 font-bold"
                                  : "text-zinc-400"
                              }`}
                            >
                              {message.isFromMe && (
                                <span className="text-zinc-500 font-semibold mr-1">
                                  You:
                                </span>
                              )}

                              {
                                previewText
                              }
                            </p>

                            {hasUnread && (
                              <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0">
                                {
                                  message.unreadCount
                                }{" "}
                                New
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        )}
      </div>

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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120]"
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md max-h-[85vh] bg-[#0c0c12] border border-cyan-500/30 rounded-3xl z-[121] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <MessageSquare
                      size={16}
                    />
                  </div>

                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Start Direct
                    Message
                  </h3>
                </div>

                <button
                  onClick={() =>
                    setShowNewChatModal(
                      false
                    )
                  }
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X
                    size={18}
                  />
                </button>
              </div>

              {/* SEARCH USERS */}

              <div className="p-3 border-b border-white/10 bg-black/20">
                <div className="relative flex items-center">
                  <Search
                    size={15}
                    className="absolute left-3 text-zinc-400"
                  />

                  <input
                    type="text"
                    value={
                      newChatSearch
                    }
                    onChange={(
                      event
                    ) =>
                      setNewChatSearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search by username or name..."
                    className="w-full bg-[#161622] border border-cyan-500/30 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    autoFocus
                  />

                  {newChatSearch && (
                    <button
                      onClick={() =>
                        setNewChatSearch(
                          ""
                        )
                      }
                      className="absolute right-3 text-zinc-400 hover:text-white"
                    >
                      <X
                        size={12}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* USERS */}

              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar max-h-[60vh]">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-2 py-1">
                  {newChatSearch
                    ? "Search Results"
                    : "Suggested Users"}
                </p>

                {filteredSuggestedUsers.length ===
                0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs font-medium">
                    No matching
                    users found
                  </div>
                ) : (
                  filteredSuggestedUsers.map(
                    (user) => {
                      const isFollowed =
                        myFollows.has(
                          user.id
                        );

                      return (
                        <div
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
                          className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-cyan-500/20 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={
                                user.avatar_url ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
                              }
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-full object-cover border border-cyan-500/30 group-hover:border-cyan-400 p-0.5"
                              alt=""
                            />

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-black text-white truncate group-hover:text-cyan-300 transition-colors">
                                  @
                                  {user.username ||
                                    "user"}
                                </p>

                                {user.is_verified && (
                                  <span className="text-cyan-400 text-[10px]">
                                    ✓
                                  </span>
                                )}
                              </div>

                              {user.full_name && (
                                <p className="text-[11px] text-zinc-400 truncate">
                                  {
                                    user.full_name
                                  }
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isFollowed && (
                              <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 uppercase tracking-wider">
                                Friend
                              </span>
                            )}

                            <div className="p-2 rounded-xl bg-purple-500/10 group-hover:bg-purple-500 text-purple-400 group-hover:text-white transition-all">
                              <Send
                                size={
                                  13
                                }
                              />
                            </div>
                          </div>
                        </div>
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
          DRAWERS
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
            activity.type ===
              "follow" ||
            activity.type ===
              "user_follow"
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
            activity.type ===
              "like" ||
            activity.type ===
              "video_likes" ||
            activity.type ===
              "video_like"
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
            activity.type ===
              "comment" ||
            activity.type ===
              "video_comments" ||
            activity.type ===
              "video_comment"
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
            activity.type !==
              "follow" &&
            activity.type !==
              "user_follow"
        )}
      />
    </div>
  );
};

export default Inbox;
