// src/components/live/GuestManager.jsx

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Radio,
  Video,
  Mic,
  X,
  Users,
  UserX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

const MAX_ACTIVE_GUESTS = 3;

const GuestManager = ({
  streamId,

  activeGuests = [],
  setActiveGuests,

  pendingRequests = [],
  setPendingRequests,

  onBack,
  socket,

  /*
   * Kept for compatibility with existing parent code.
   *
   * WebRTC itself is intentionally NOT handled here.
   * useStreamWebRTC is the single WebRTC owner.
   */
  onGuestStreamReceived
}) => {
  const [processingRequestIds, setProcessingRequestIds] =
    useState(() => new Set());

  const [processingGuestIds, setProcessingGuestIds] =
    useState(() => new Set());

  /*
   * ------------------------------------------------------------
   * Compatibility note
   * ------------------------------------------------------------
   *
   * This component previously:
   *
   * - created RTCPeerConnection objects
   * - listened for WebRTC offers
   * - listened for ICE candidates
   * - answered guest offers
   *
   * That duplicated useStreamWebRTC.
   *
   * WebRTC ownership now belongs exclusively to:
   *
   *     useStreamWebRTC
   *
   * GuestManager only handles:
   *
   *     pending requests
   *     approving guests
   *     rejecting guests
   *     removing guests
   *     database state
   *     guest-management socket events
   */

  /*
   * ------------------------------------------------------------
   * Helper: safely update processing request state
   * ------------------------------------------------------------
   */
  const setRequestProcessing = (
    requestId,
    processing
  ) => {
    if (!requestId) {
      return;
    }

    setProcessingRequestIds(previous => {
      const next = new Set(previous);

      if (processing) {
        next.add(requestId);
      } else {
        next.delete(requestId);
      }

      return next;
    });
  };

  /*
   * ------------------------------------------------------------
   * Helper: safely update processing guest state
   * ------------------------------------------------------------
   */
  const setGuestProcessing = (
    guestId,
    processing
  ) => {
    if (!guestId) {
      return;
    }

    setProcessingGuestIds(previous => {
      const next = new Set(previous);

      if (processing) {
        next.add(guestId);
      } else {
        next.delete(guestId);
      }

      return next;
    });
  };

  /*
   * ------------------------------------------------------------
   * Pending-request synchronization
   *
   * Parent remains the source of truth.
   *
   * StreamDashboard already manages the guest-request
   * realtime subscription, so we do not create another
   * subscription here.
   *
   * This prevents duplicate Supabase listeners.
   * ------------------------------------------------------------
   */
  useEffect(() => {
    if (!streamId) {
      return;
    }

    /*
     * Nothing else is required here.
     *
     * Keeping the effect makes streamId a deliberate dependency
     * and makes the ownership clear.
     */
  }, [streamId]);

  /*
   * ------------------------------------------------------------
   * Accept guest request
   * ------------------------------------------------------------
   */
  const handleAcceptRequest = async (
    request,
    assignedMode
  ) => {
    if (!request?.id) {
      console.error(
        '❌ [GuestManager] Missing request ID:',
        request
      );

      return;
    }

    if (!assignedMode) {
      console.error(
        '❌ [GuestManager] Missing guest mode.'
      );

      return;
    }

    const currentGuests =
      Array.isArray(activeGuests)
        ? activeGuests
        : [];

    /*
     * Prevent duplicate processing.
     */
    if (
      processingRequestIds.has(
        request.id
      )
    ) {
      return;
    }

    /*
     * Check whether this user is already active.
     */
    const alreadyActive =
      currentGuests.some(
        guest =>
          guest?.user_id ===
          request.user_id
      );

    if (alreadyActive) {
      console.warn(
        `⚠️ [GuestManager] Guest ${request.user_id} is already active.`
      );

      return;
    }

    /*
     * Maximum 3 guest seats.
     */
    if (
      currentGuests.length >=
      MAX_ACTIVE_GUESTS
    ) {
      alert(
        'Maximum capacity of 3 guest seats reached!'
      );

      return;
    }

    setRequestProcessing(
      request.id,
      true
    );

    try {
      console.log(
        `🎙️ [GuestManager] Approving guest ${request.user_id} as ${assignedMode}.`
      );

      /*
       * Database is updated FIRST.
       *
       * This prevents the UI from showing a guest as active
       * when Supabase rejected the operation.
       */
      const {
        data,
        error
      } = await supabase
        .from('live_guest_requests')
        .update({
          status: 'approved',
          mode: assignedMode
        })
        .eq('id', request.id)
        .select();

      if (
        error ||
        !data ||
        data.length === 0
      ) {
        console.error(
          '❌ [GuestManager] Failed to approve guest:',
          error?.message ||
            'No row was updated.'
        );

        alert(
          'Failed to approve guest. Please try again.'
        );

        return;
      }

      const approvedRequest =
        data[0];

      /*
       * Update local active guest list only after
       * successful database confirmation.
       */
      if (setActiveGuests) {
        setActiveGuests(
          previous => {
            const guests =
              Array.isArray(previous)
                ? previous
                : [];

            /*
             * Avoid duplicates if realtime has already
             * updated the parent.
             */
            const exists =
              guests.some(
                guest =>
                  guest?.user_id ===
                    request.user_id ||
                  guest?.id ===
                    request.id
              );

            if (exists) {
              return guests;
            }

            return [
              ...guests,
              {
                ...request,
                ...approvedRequest,

                id:
                  approvedRequest.id ||
                  request.id,

                user_id:
                  approvedRequest.user_id ||
                  request.user_id,

                username:
                  approvedRequest.username ||
                  request.username,

                avatar_url:
                  approvedRequest.avatar_url ||
                  request.avatar_url,

                mode: assignedMode,

                isMuted: false,

                /*
                 * WebRTC stream is intentionally not
                 * created here.
                 *
                 * useStreamWebRTC will own the media
                 * connection.
                 */
              }
            ].slice(
              0,
              MAX_ACTIVE_GUESTS
            );
          }
        );
      }

      /*
       * Remove from local pending queue.
       *
       * The Supabase realtime listener may also do this,
       * so filtering is intentionally idempotent.
       */
      if (setPendingRequests) {
        setPendingRequests(
          previous =>
            (
              Array.isArray(previous)
                ? previous
                : []
            ).filter(
              item =>
                item?.id !==
                request.id
            )
        );
      }

      /*
       * Notify backend that the guest has been approved.
       *
       * This is a guest-management event, not a WebRTC
       * signaling event.
       */
      if (
        socket &&
        socket.connected
      ) {
        socket.emit(
          'approve_cohost',
          {
            streamId,
            guestId:
              request.user_id,
            mode: assignedMode
          }
        );

        console.log(
          `📡 [GuestManager] approve_cohost sent for ${request.user_id}.`
        );
      } else {
        console.warn(
          '⚠️ [GuestManager] Socket unavailable while approving guest.'
        );
      }

      console.log(
        '✅ [GuestManager] Guest approved successfully:',
        approvedRequest
      );
    } catch (error) {
      console.error(
        '❌ [GuestManager] Unexpected approval error:',
        error
      );

      alert(
        'Something went wrong while approving the guest.'
      );
    } finally {
      setRequestProcessing(
        request.id,
        false
      );
    }
  };

  /*
   * ------------------------------------------------------------
   * Reject pending request
   * ------------------------------------------------------------
   */
  const handleRejectRequest =
    async request => {
      if (!request?.id) {
        return;
      }

      if (
        processingRequestIds.has(
          request.id
        )
      ) {
        return;
      }

      setRequestProcessing(
        request.id,
        true
      );

      try {
        console.log(
          `🚫 [GuestManager] Rejecting guest request ${request.id}.`
        );

        const {
          error
        } = await supabase
          .from('live_guest_requests')
          .update({
            status: 'rejected'
          })
          .eq(
            'id',
            request.id
          );

        if (error) {
          console.error(
            '❌ [GuestManager] Failed to reject request:',
            error
          );

          alert(
            'Failed to reject the guest request.'
          );

          return;
        }

        if (setPendingRequests) {
          setPendingRequests(
            previous =>
              (
                Array.isArray(
                  previous
                )
                  ? previous
                  : []
              ).filter(
                item =>
                  item?.id !==
                  request.id
              )
          );
        }

        console.log(
          `✅ [GuestManager] Request ${request.id} rejected.`
        );
      } catch (error) {
        console.error(
          '❌ [GuestManager] Unexpected rejection error:',
          error
        );
      } finally {
        setRequestProcessing(
          request.id,
          false
        );
      }
    };

  /*
   * ------------------------------------------------------------
   * Remove active guest
   * ------------------------------------------------------------
   */
  const handleRemoveGuest =
    async guest => {
      if (!guest) {
        return;
      }

      const requestId =
        guest.id;

      const guestUserId =
        guest.user_id ||
        guest.guest_id;

      if (!requestId) {
        console.error(
          '❌ [GuestManager] Active guest has no request ID:',
          guest
        );

        return;
      }

      if (
        processingGuestIds.has(
          guestUserId ||
            requestId
        )
      ) {
        return;
      }

      setGuestProcessing(
        guestUserId ||
          requestId,
        true
      );

      try {
        console.log(
          `🚫 [GuestManager] Removing active guest ${guestUserId || requestId}.`
        );

        /*
         * Update database first.
         */
        const {
          error
        } = await supabase
          .from('live_guest_requests')
          .update({
            status: 'disconnected'
          })
          .eq(
            'id',
            requestId
          );

        if (error) {
          console.error(
            '❌ [GuestManager] Failed to disconnect guest:',
            error
          );

          alert(
            'Failed to remove guest. Please try again.'
          );

          return;
        }

        /*
         * Update parent state.
         *
         * We do NOT close a WebRTC PeerConnection here.
         *
         * useStreamWebRTC is the owner of WebRTC connections.
         */
        if (setActiveGuests) {
          setActiveGuests(
            previous =>
              (
                Array.isArray(
                  previous
                )
                  ? previous
                  : []
              ).filter(
                item => {
                  if (
                    requestId &&
                    item?.id ===
                      requestId
                  ) {
                    return false;
                  }

                  if (
                    guestUserId &&
                    item?.user_id ===
                      guestUserId
                  ) {
                    return false;
                  }

                  return true;
                }
              )
          );
        }

        /*
         * Tell backend to remove the co-host.
         */
        if (
          socket &&
          socket.connected &&
          guestUserId
        ) {
          socket.emit(
            'kick_cohost',
            {
              streamId,
              guestId:
                guestUserId
            }
          );

          console.log(
            `📡 [GuestManager] kick_cohost sent for ${guestUserId}.`
          );
        }

        console.log(
          `✅ [GuestManager] Guest ${guestUserId || requestId} removed.`
        );
      } catch (error) {
        console.error(
          '❌ [GuestManager] Unexpected guest removal error:',
          error
        );
      } finally {
        setGuestProcessing(
          guestUserId ||
            requestId,
          false
        );
      }
    };

  /*
   * ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------
   */
  return (
    <div
      className="
        space-y-4
        font-sans
        text-left
        p-1
      "
    >
      {/* Back */}
      <button
        onClick={onBack}
        className="
          text-[10px]
          text-zinc-400
          hover:text-white
          flex
          items-center
          gap-1
          transition-colors
          uppercase
          font-bold
          tracking-wider
        "
      >
        <ArrowLeft size={12} />

        Exit Guest Configuration
      </button>

      {/* ======================================================
          ACTIVE GUESTS
          ====================================================== */}
      <div className="space-y-2">
        <h3
          className="
            text-[9px]
            font-black
            text-zinc-500
            uppercase
            tracking-[2px]
            px-1
            flex
            items-center
            justify-between
          "
        >
          <span
            className="
              flex
              items-center
              gap-1
            "
          >
            <Users
              size={10}
              className="text-cyan-400"
            />

            Allocated Room Seats
          </span>

          <span
            className="
              text-cyan-400
              font-mono
            "
          >
            ({activeGuests?.length || 0}/
            {MAX_ACTIVE_GUESTS})
          </span>
        </h3>

        <div
          className="
            grid
            grid-cols-1
            gap-1.5
          "
        >
          {activeGuests?.length === 0 ? (
            <p
              className="
                text-[10px]
                text-zinc-600
                px-1
                italic
              "
            >
              No active guests connected.
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              {activeGuests.map(
                guest => {
                  const guestProcessingKey =
                    guest?.user_id ||
                    guest?.id;

                  const isProcessing =
                    processingGuestIds.has(
                      guestProcessingKey
                    );

                  return (
                    <motion.div
                      key={
                        guest.id ||
                        guest.user_id
                      }
                      initial={{
                        opacity: 0,
                        y: 5
                      }}
                      animate={{
                        opacity: 1,
                        y: 0
                      }}
                      exit={{
                        opacity: 0,
                        x: -10
                      }}
                      className="
                        bg-zinc-900
                        p-2
                        rounded-xl
                        border
                        border-white/5
                        flex
                        items-center
                        justify-between
                        gap-3
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          min-w-0
                        "
                      >
                        {guest.avatar_url ? (
                          <img
                            src={
                              guest.avatar_url
                            }
                            alt=""
                            className="
                              w-6
                              h-6
                              rounded-full
                              border
                              border-cyan-500/30
                              object-cover
                            "
                          />
                        ) : (
                          <div
                            className="
                              w-6
                              h-6
                              rounded-full
                              bg-cyan-500/10
                              border
                              border-cyan-500/20
                              flex
                              items-center
                              justify-center
                            "
                          >
                            <Users
                              size={11}
                              className="
                                text-cyan-400
                              "
                            />
                          </div>
                        )}

                        <div
                          className="
                            min-w-0
                          "
                        >
                          <p
                            className="
                              text-xs
                              font-bold
                              text-zinc-200
                              truncate
                            "
                          >
                            {guest.username ||
                              'Guest'}
                          </p>

                          <p
                            className="
                              text-[8px]
                              text-cyan-400
                              font-mono
                              uppercase
                              mt-0.5
                            "
                          >
                            {guest.mode ||
                              'video'}{' '}
                            Active Link
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleRemoveGuest(
                            guest
                          )
                        }
                        disabled={
                          isProcessing
                        }
                        className="
                          p-1.5
                          bg-zinc-800
                          hover:bg-rose-950/40
                          text-zinc-400
                          hover:text-rose-400
                          rounded-lg
                          transition-all
                          disabled:opacity-40
                          disabled:cursor-not-allowed
                        "
                        title="Remove guest"
                      >
                        {isProcessing ? (
                          <span
                            className="
                              block
                              w-[11px]
                              h-[11px]
                              border-2
                              border-zinc-500
                              border-t-transparent
                              rounded-full
                              animate-spin
                            "
                          />
                        ) : (
                          <X size={11} />
                        )}
                      </button>
                    </motion.div>
                  );
                }
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ======================================================
          PENDING REQUESTS
          ====================================================== */}
      <div className="space-y-2">
        <h3
          className="
            text-[9px]
            font-black
            text-zinc-500
            uppercase
            tracking-[2px]
            px-1
            flex
            items-center
            justify-between
          "
        >
          <span
            className="
              flex
              items-center
              gap-1
            "
          >
            <Radio
              size={10}
              className="
                text-purple-400
                animate-pulse
              "
            />

            Pending Requests
          </span>

          <span
            className="
              text-purple-400
              font-mono
            "
          >
            ({pendingRequests?.length || 0})
          </span>
        </h3>

        <div className="space-y-1.5">
          {pendingRequests?.length === 0 ? (
            <p
              className="
                text-[10px]
                text-zinc-600
                px-1
                italic
              "
            >
              No pending requests right now.
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              {pendingRequests.map(
                request => {
                  const isProcessing =
                    processingRequestIds.has(
                      request.id
                    );

                  return (
                    <motion.div
                      key={request.id}
                      initial={{
                        opacity: 0,
                        y: 5
                      }}
                      animate={{
                        opacity: 1,
                        y: 0
                      }}
                      exit={{
                        opacity: 0,
                        x: -10
                      }}
                      className="
                        bg-zinc-900
                        p-2.5
                        rounded-xl
                        border
                        border-white/5
                        flex
                        items-center
                        justify-between
                        gap-2
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          gap-2
                          min-w-0
                        "
                      >
                        {request.avatar_url ? (
                          <img
                            src={
                              request.avatar_url
                            }
                            alt=""
                            className="
                              w-6
                              h-6
                              rounded-full
                              border
                              border-purple-500/30
                              object-cover
                            "
                          />
                        ) : (
                          <div
                            className="
                              w-6
                              h-6
                              rounded-full
                              bg-purple-500/10
                              border
                              border-purple-500/20
                              flex
                              items-center
                              justify-center
                            "
                          >
                            <Users
                              size={11}
                              className="
                                text-purple-400
                              "
                            />
                          </div>
                        )}

                        <span
                          className="
                            text-xs
                            font-bold
                            text-zinc-200
                            truncate
                          "
                        >
                          {request.username ||
                            'Guest'}
                        </span>
                      </div>

                      <div
                        className="
                          flex
                          items-center
                          gap-1
                          bg-zinc-950
                          p-0.5
                          rounded-lg
                          border
                          border-white/5
                        "
                      >
                        {/* AUDIO */}
                        <button
                          onClick={() =>
                            handleAcceptRequest(
                              request,
                              'audio'
                            )
                          }
                          disabled={
                            isProcessing ||
                            activeGuests.length >=
                              MAX_ACTIVE_GUESTS
                          }
                          className="
                            px-2
                            py-1
                            bg-zinc-900
                            hover:bg-zinc-800
                            text-emerald-400
                            text-[8px]
                            font-black
                            uppercase
                            tracking-wider
                            rounded-md
                            transition-all
                            flex
                            items-center
                            gap-0.5
                            disabled:opacity-40
                            disabled:cursor-not-allowed
                          "
                        >
                          <Mic size={8} />

                          Audio
                        </button>

                        {/* VIDEO */}
                        <button
                          onClick={() =>
                            handleAcceptRequest(
                              request,
                              'video'
                            )
                          }
                          disabled={
                            isProcessing ||
                            activeGuests.length >=
                              MAX_ACTIVE_GUESTS
                          }
                          className="
                            px-2
                            py-1
                            bg-purple-600
                            hover:bg-purple-500
                            text-white
                            text-[8px]
                            font-black
                            uppercase
                            tracking-wider
                            rounded-md
                            transition-all
                            flex
                            items-center
                            gap-0.5
                            disabled:opacity-40
                            disabled:cursor-not-allowed
                          "
                        >
                          <Video size={8} />

                          +Video
                        </button>

                        {/* REJECT */}
                        <button
                          onClick={() =>
                            handleRejectRequest(
                              request
                            )
                          }
                          disabled={
                            isProcessing
                          }
                          className="
                            p-1
                            hover:bg-red-500/20
                            text-zinc-500
                            hover:text-red-400
                            rounded-md
                            transition-colors
                            disabled:opacity-40
                            disabled:cursor-not-allowed
                          "
                          title="Reject request"
                        >
                          {isProcessing ? (
                            <span
                              className="
                                block
                                w-[10px]
                                h-[10px]
                                border-2
                                border-zinc-500
                                border-t-transparent
                                rounded-full
                                animate-spin
                              "
                            />
                          ) : (
                            <UserX
                              size={10}
                            />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                }
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestManager;
