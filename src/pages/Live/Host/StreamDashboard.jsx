import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  Sparkles,
  X,
  RotateCcw,
  Camera,
  AlertCircle,
  Check,
  ChevronLeft,
  SlidersHorizontal
} from 'lucide-react';

/* =========================================================
   EFFECT DEFINITIONS
   ========================================================= */

const EFFECTS = [
  {
    id: 'none',
    name: 'Original',
    category: 'Basic',
    description: 'Original camera image',
    icon: '◉'
  },

  {
    id: 'beauty',
    name: 'Beauty',
    category: 'Beauty',
    description: 'Softens skin and improves appearance',
    icon: '✦'
  },

  {
    id: 'face-light',
    name: 'Face Light',
    category: 'Beauty',
    description: 'Brightens the face',
    icon: '☼'
  },

  {
    id: 'cinematic',
    name: 'Cinematic',
    category: 'Cinematic',
    description: 'Film-style contrast',
    icon: '▣'
  },

  {
    id: 'vivid',
    name: 'Vivid',
    category: 'Color',
    description: 'Stronger colors',
    icon: '◆'
  },

  {
    id: 'warm',
    name: 'Warm',
    category: 'Color',
    description: 'Warm golden tone',
    icon: '☀'
  },

  {
    id: 'cool',
    name: 'Cool',
    category: 'Color',
    description: 'Cool blue tone',
    icon: '❄'
  },

  {
    id: 'noir',
    name: 'Noir',
    category: 'Cinematic',
    description: 'Black and white',
    icon: '◐'
  },

  {
    id: 'vintage',
    name: 'Vintage',
    category: 'Cinematic',
    description: 'Old film appearance',
    icon: '▤'
  },

  {
    id: 'dream',
    name: 'Dream',
    category: 'Creative',
    description: 'Soft dreamy glow',
    icon: '✧'
  },

  {
    id: 'purple-glow',
    name: 'Purple Glow',
    category: 'Creative',
    description: 'Purple cinematic glow',
    icon: '◆'
  },

  {
    id: 'neon',
    name: 'Neon',
    category: 'Creative',
    description: 'Bright neon colors',
    icon: '⚡'
  },

  {
    id: 'drama',
    name: 'Drama',
    category: 'Cinematic',
    description: 'High contrast dramatic look',
    icon: '◈'
  },

  {
    id: 'film',
    name: 'Film',
    category: 'Cinematic',
    description: 'Film-style processing',
    icon: '▥'
  },

  {
    id: 'soft-focus',
    name: 'Soft Focus',
    category: 'Beauty',
    description: 'Gentle soft focus',
    icon: '◎'
  },

  {
    id: 'face-focus',
    name: 'Face Focus',
    category: 'Beauty',
    description: 'Bright centered portrait',
    icon: '◉'
  },

  {
    id: 'hdr',
    name: 'HDR',
    category: 'Color',
    description: 'Enhanced dynamic range',
    icon: '▰'
  },

  {
    id: 'duo-tone',
    name: 'Duo Tone',
    category: 'Creative',
    description: 'Stylized two-tone image',
    icon: '◒'
  }
];

const CATEGORIES = [
  'All',
  'Basic',
  'Beauty',
  'Color',
  'Cinematic',
  'Creative'
];

/* =========================================================
   STREAM HELPERS
   ========================================================= */

/*
 * A stream is considered usable only when it contains
 * a LIVE and ENABLED video track.
 *
 * This is important.
 *
 * A MediaStream can still exist after the dashboard camera
 * has been switched off, but its video track may be disabled.
 *
 * Treating that stream as usable causes the canvas to receive
 * blank frames.
 */
function isUsableStream(source) {
  if (
    !source ||
    typeof source.getVideoTracks !== 'function'
  ) {
    return false;
  }

  const videoTracks =
    source.getVideoTracks();

  return videoTracks.some(
    track =>
      track &&
      track.readyState === 'live' &&
      track.enabled !== false
  );
}

/*
 * Finds a video track even when the track is disabled.
 *
 * Used only for restoring the dashboard's original track.
 */
function getAnyVideoTrack(source) {
  if (
    !source ||
    typeof source.getVideoTracks !== 'function'
  ) {
    return null;
  }

  return (
    source
      .getVideoTracks()
      .find(
        track =>
          track &&
          track.readyState !== 'ended'
      ) || null
  );
}

/* =========================================================
   FILTER FUNCTIONS
   ========================================================= */

function applyEffect(
  ctx,
  canvas,
  effect,
  intensity
) {
  if (!ctx || !canvas) return;

  const width = canvas.width;
  const height = canvas.height;

  const level = Math.max(
    0,
    Math.min(1, intensity)
  );

  /*
   * Always begin from a clean canvas state.
   */
  ctx.filter = 'none';

  switch (effect) {
    case 'beauty':
      ctx.filter = `
        brightness(${1 + 0.04 * level})
        contrast(${1 - 0.05 * level})
        saturate(${1 + 0.05 * level})
        blur(${0.35 * level}px)
      `;
      break;

    case 'face-light':
      ctx.filter = `
        brightness(${1 + 0.15 * level})
        contrast(${1 + 0.02 * level})
        saturate(${1 + 0.04 * level})
      `;
      break;

    case 'cinematic':
      ctx.filter = `
        contrast(${1 + 0.18 * level})
        saturate(${1 - 0.08 * level})
        brightness(${1 - 0.02 * level})
      `;
      break;

    case 'vivid':
      ctx.filter = `
        saturate(${1 + 0.45 * level})
        contrast(${1 + 0.08 * level})
      `;
      break;

    case 'warm':
      ctx.filter = `
        sepia(${0.22 * level})
        saturate(${1 + 0.18 * level})
        brightness(${1 + 0.03 * level})
      `;
      break;

    case 'cool':
      ctx.filter = `
        hue-rotate(${8 * level}deg)
        saturate(${1 + 0.12 * level})
        brightness(${1 + 0.02 * level})
      `;
      break;

    case 'noir':
      ctx.filter = `
        grayscale(1)
        contrast(${1 + 0.25 * level})
        brightness(${1 + 0.02 * level})
      `;
      break;

    case 'vintage':
      ctx.filter = `
        sepia(${0.5 * level})
        contrast(${1 - 0.05 * level})
        saturate(${1 - 0.15 * level})
        brightness(${1 + 0.03 * level})
      `;
      break;

    case 'dream':
      ctx.filter = `
        brightness(${1 + 0.08 * level})
        saturate(${1 + 0.08 * level})
        blur(${0.7 * level}px)
      `;
      break;

    case 'purple-glow':
      ctx.filter = `
        hue-rotate(${18 * level}deg)
        saturate(${1 + 0.3 * level})
        contrast(${1 + 0.05 * level})
      `;
      break;

    case 'neon':
      ctx.filter = `
        saturate(${1 + 0.65 * level})
        contrast(${1 + 0.28 * level})
        brightness(${1 + 0.04 * level})
      `;
      break;

    case 'drama':
      ctx.filter = `
        contrast(${1 + 0.35 * level})
        saturate(${1 + 0.05 * level})
        brightness(${1 - 0.03 * level})
      `;
      break;

    case 'film':
      ctx.filter = `
        contrast(${1 + 0.12 * level})
        saturate(${1 + 0.04 * level})
        sepia(${0.08 * level})
      `;
      break;

    case 'soft-focus':
      ctx.filter = `
        brightness(${1 + 0.04 * level})
        contrast(${1 - 0.08 * level})
        blur(${1 * level}px)
      `;
      break;

    case 'face-focus':
      ctx.filter = `
        brightness(${1 + 0.07 * level})
        contrast(${1 + 0.06 * level})
        saturate(${1 + 0.08 * level})
      `;
      break;

    case 'hdr':
      ctx.filter = `
        contrast(${1 + 0.3 * level})
        saturate(${1 + 0.2 * level})
        brightness(${1 + 0.02 * level})
      `;
      break;

    case 'duo-tone':
      ctx.filter = `
        contrast(${1 + 0.2 * level})
        saturate(${1 + 0.12 * level})
        hue-rotate(${10 * level}deg)
      `;
      break;

    case 'none':
    default:
      ctx.filter = 'none';
      break;
  }

  /*
   * The actual drawing is handled by the processing loop.
   * This helper only controls the canvas filter state.
   */

  void width;
  void height;
}

/* =========================================================
   COMPONENT
   ========================================================= */

const AIFilters = ({
  stream = null,
  videoRef = null,
  onProcessedStream = null,
  onProcessedTrack = null,
  className = '',
  compact = false,
  defaultOpen = false
}) => {
  /* =======================================================
     COMPONENT STATE
     ======================================================= */

  const [open, setOpen] =
    useState(defaultOpen);

  const [enabled, setEnabled] =
    useState(false);

  const [selectedEffect, setSelectedEffect] =
    useState('none');

  const [intensity, setIntensity] =
    useState(0.75);

  const [category, setCategory] =
    useState('All');

  const [status, setStatus] =
    useState('idle');

  const [error, setError] =
    useState('');

  const [fps, setFps] =
    useState(0);

  const [cameraOwned, setCameraOwned] =
    useState(false);

  /* =======================================================
     REFS
     ======================================================= */

  const mountedRef =
    useRef(true);

  const startingRef =
    useRef(false);

  /*
   * Parent/dashboard stream.
   */
  const sourceStreamRef =
    useRef(null);

  /*
   * AI's private camera stream.
   *
   * IMPORTANT:
   * This stream is owned by AIFilters.
   *
   * Therefore only this stream may be stopped by
   * AIFilters cleanup.
   */
  const aiOwnedStreamRef =
    useRef(null);

  /*
   * The original dashboard camera track.
   *
   * This is what WebRTC was using before AI replaced it.
   */
  const originalCameraTrackRef =
    useRef(null);

  /*
   * Hidden source video.
   */
  const sourceVideoRef =
    useRef(null);

  /*
   * Processing canvas.
   */
  const canvasRef =
    useRef(null);

  const canvasContextRef =
    useRef(null);

  /*
   * Output MediaStream generated from canvas.captureStream().
   */
  const outputStreamRef =
    useRef(null);

  const outputTrackRef =
    useRef(null);

  /*
   * Processing loop.
   */
  const animationFrameRef =
    useRef(null);

  const processingRef =
    useRef(false);

  const processedSourceRef =
    useRef(null);

  /*
   * Current effect values.
   */
  const effectRef =
    useRef(selectedEffect);

  const intensityRef =
    useRef(intensity);

  const enabledRef =
    useRef(enabled);

  /*
   * Callback refs prevent stale callback problems.
   */
  const onProcessedStreamRef =
    useRef(onProcessedStream);

  const onProcessedTrackRef =
    useRef(onProcessedTrack);

  /*
   * Preview video.
   */
  const previewVideoRef =
    useRef(null);

  /*
   * FPS measurement.
   */
  const fpsFramesRef =
    useRef(0);

  const fpsTimeRef =
    useRef(
      typeof performance !== 'undefined'
        ? performance.now()
        : 0
    );

  const fpsTimerRef =
    useRef(null);

  /* =======================================================
     SYNCHRONIZE REFS
     ======================================================= */

  useEffect(() => {
    effectRef.current =
      selectedEffect;
  }, [selectedEffect]);

  useEffect(() => {
    intensityRef.current =
      intensity;
  }, [intensity]);

  useEffect(() => {
    enabledRef.current =
      enabled;
  }, [enabled]);

  useEffect(() => {
    onProcessedStreamRef.current =
      onProcessedStream;
  }, [onProcessedStream]);

  useEffect(() => {
    onProcessedTrackRef.current =
      onProcessedTrack;
  }, [onProcessedTrack]);

  /* =======================================================
     MOUNT / UNMOUNT
     ======================================================= */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* =======================================================
     GET ACTIVE DASHBOARD SOURCE
     ======================================================= */

  const getDashboardSource =
    useCallback(() => {
      /*
       * First priority:
       * the stream passed by StreamDashboard.
       */
      if (isUsableStream(stream)) {
        return stream;
      }

      /*
       * Second priority:
       * the stream attached to the dashboard video element.
       */
      const attachedStream =
        videoRef?.current?.srcObject;

      if (isUsableStream(attachedStream)) {
        return attachedStream;
      }

      /*
       * If the dashboard stream exists but its track is
       * disabled, DO NOT use it for processing.
       */
      return null;
    }, [stream, videoRef]);

  /* =======================================================
     OPEN INDEPENDENT CAMERA
     ======================================================= */

  const openIndependentCamera =
    useCallback(async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !==
          'function'
      ) {
        throw new Error(
          'Camera access is not supported by this browser.'
        );
      }

      /*
       * Reuse an already-owned AI camera if it is still alive.
       */
      if (
        isUsableStream(
          aiOwnedStreamRef.current
        )
      ) {
        return aiOwnedStreamRef.current;
      }

      setStatus('requesting-camera');
      setError('');

      console.log(
        '📷 [AIFilters] Opening independent AI camera...'
      );

      /*
       * VIDEO ONLY.
       *
       * We intentionally do NOT request audio here.
       *
       * This prevents AI Effects from creating a second
       * microphone stream.
       */
      const independentStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: {
              ideal: 1280
            },
            height: {
              ideal: 720
            },
            frameRate: {
              ideal: 30,
              max: 30
            }
          },
          audio: false
        });

      if (!mountedRef.current) {
        independentStream
          .getTracks()
          .forEach(track => {
            try {
              track.stop();
            } catch {
              // Already stopped.
            }
          });

        return null;
      }

      const videoTracks =
        independentStream.getVideoTracks();

      if (!videoTracks.length) {
        independentStream
          .getTracks()
          .forEach(track => {
            try {
              track.stop();
            } catch {
              // Already stopped.
            }
          });

        throw new Error(
          'The camera opened but no video track was available.'
        );
      }

      const videoTrack =
        videoTracks[0];

      if (
        videoTrack.readyState === 'ended'
      ) {
        independentStream
          .getTracks()
          .forEach(track => {
            try {
              track.stop();
            } catch {
              // Already stopped.
            }
          });

        throw new Error(
          'The camera track ended immediately.'
        );
      }

      aiOwnedStreamRef.current =
        independentStream;

      setCameraOwned(true);
      setStatus('camera-ready');

      console.log(
        '✅ [AIFilters] Independent camera opened:',
        videoTrack.id
      );

      return independentStream;
    }, []);

  /* =======================================================
     CLEANUP AI-OWNED CAMERA
     ======================================================= */

  const cleanupOwnedCamera =
    useCallback(() => {
      const ownedStream =
        aiOwnedStreamRef.current;

      if (!ownedStream) {
        setCameraOwned(false);
        return;
      }

      console.log(
        '🧹 [AIFilters] Stopping AI-owned camera only.'
      );

      ownedStream
        .getTracks()
        .forEach(track => {
          try {
            track.stop();
          } catch {
            // Track may already be stopped.
          }
        });

      aiOwnedStreamRef.current =
        null;

      setCameraOwned(false);
    }, []);

  /* =======================================================
     CREATE SOURCE VIDEO
     ======================================================= */

  const createSourceVideo =
    useCallback(async source => {
      if (!source) {
        throw new Error(
          'No camera source is available.'
        );
      }

      /*
       * Reuse the existing hidden source video when possible.
       */
      if (
        sourceVideoRef.current &&
        sourceVideoRef.current.srcObject ===
          source
      ) {
        const existing =
          sourceVideoRef.current;

        if (
          existing.readyState >= 2 &&
          existing.videoWidth > 0 &&
          existing.videoHeight > 0
        ) {
          return existing;
        }
      }

      /*
       * Remove old source video.
       */
      if (sourceVideoRef.current) {
        try {
          sourceVideoRef.current.pause();
        } catch {
          // Ignore.
        }

        sourceVideoRef.current.srcObject =
          null;

        sourceVideoRef.current =
          null;
      }

      const video =
        document.createElement('video');

      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      /*
       * Do not insert it visibly into the page.
       */
      video.style.position =
        'fixed';

      video.style.left =
        '-10000px';

      video.style.top =
        '-10000px';

      video.style.width =
        '1px';

      video.style.height =
        '1px';

      video.style.opacity =
        '0';

      video.srcObject =
        source;

      sourceVideoRef.current =
        video;

      /*
       * Wait for metadata.
       */
      await new Promise(
        (resolve, reject) => {
          let settled = false;

          const finish = () => {
            if (settled) return;

            settled = true;

            video.removeEventListener(
              'loadedmetadata',
              handleMetadata
            );

            video.removeEventListener(
              'canplay',
              handleCanPlay
            );

            video.removeEventListener(
              'error',
              handleError
            );

            resolve();
          };

          const handleMetadata =
            () => {
              if (
                video.videoWidth > 0 &&
                video.videoHeight > 0
              ) {
                finish();
              }
            };

          const handleCanPlay =
            () => {
              if (
                video.videoWidth > 0 &&
                video.videoHeight > 0
              ) {
                finish();
              }
            };

          const handleError =
            () => {
              if (settled) return;

              settled = true;

              reject(
                new Error(
                  'Unable to read camera video.'
                )
              );
            };

          video.addEventListener(
            'loadedmetadata',
            handleMetadata
          );

          video.addEventListener(
            'canplay',
            handleCanPlay
          );

          video.addEventListener(
            'error',
            handleError
          );

          /*
           * Some browsers have metadata already available.
           */
          if (
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
          ) {
            finish();
          }

          video
            .play()
            .catch(error => {
              console.warn(
                '⚠️ [AIFilters] Source video play:',
                error
              );
            });
        }
      );

      return video;
    }, []);

  /* =======================================================
     CREATE CANVAS
     ======================================================= */

  const createCanvas =
    useCallback(video => {
      if (!video) {
        throw new Error(
          'Source video is unavailable.'
        );
      }

      let canvas =
        canvasRef.current;

      if (!canvas) {
        canvas =
          document.createElement('canvas');

        canvasRef.current =
          canvas;
      }

      const width =
        video.videoWidth || 1280;

      const height =
        video.videoHeight || 720;

      canvas.width =
        width;

      canvas.height =
        height;

      let ctx =
        canvasContextRef.current;

      if (!ctx) {
        ctx =
          canvas.getContext(
            '2d',
            {
              alpha: false,
              desynchronized: true
            }
          );

        canvasContextRef.current =
          ctx;
      }

      if (!ctx) {
        throw new Error(
          'Your browser could not create a 2D canvas context.'
        );
      }

      return {
        canvas,
        ctx
      };
    }, []);

  /* =======================================================
     CREATE OUTPUT STREAM
     ======================================================= */

  const createOutputStream =
    useCallback(
      (canvas, sourceStream) => {
        if (
          !canvas ||
          typeof canvas.captureStream !==
            'function'
        ) {
          throw new Error(
            'Canvas video processing is not supported by this browser.'
          );
        }

        /*
         * Stop previous output video track only.
         */
        if (
          outputStreamRef.current
        ) {
          outputStreamRef.current
            .getVideoTracks()
            .forEach(track => {
              try {
                track.stop();
              } catch {
                // Already stopped.
              }
            });
        }

        const outputStream =
          canvas.captureStream(30);

        const outputVideoTrack =
          outputStream.getVideoTracks()[0];

        if (!outputVideoTrack) {
          throw new Error(
            'Unable to create the processed video track.'
          );
        }

        /*
         * Preserve dashboard audio.
         *
         * If the source is the dashboard stream,
         * copy its audio tracks.
         *
         * The independent AI camera itself never contains audio.
         */
        if (
          sourceStream &&
          typeof sourceStream.getAudioTracks ===
            'function'
        ) {
          sourceStream
            .getAudioTracks()
            .forEach(audioTrack => {
              if (
                audioTrack &&
                audioTrack.readyState !==
                  'ended'
              ) {
                try {
                  outputStream.addTrack(
                    audioTrack
                  );
                } catch {
                  // Ignore duplicate track errors.
                }
              }
            });
        }

        outputStreamRef.current =
          outputStream;

        outputTrackRef.current =
          outputVideoTrack;

        return outputStream;
      },
      []
    );

  /* =======================================================
     PROCESS FRAME
     ======================================================= */

  const processFrame =
    useCallback(() => {
      if (
        !mountedRef.current ||
        !processingRef.current
      ) {
        return;
      }

      const video =
        sourceVideoRef.current;

      const canvas =
        canvasRef.current;

      const ctx =
        canvasContextRef.current;

      if (
        !video ||
        !canvas ||
        !ctx
      ) {
        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );

        return;
      }

      /*
       * If source camera has ended, stop processing.
       */
      const sourceStream =
        video.srcObject;

      const videoTrack =
        getAnyVideoTrack(
          sourceStream
        );

      if (
        !videoTrack ||
        videoTrack.readyState ===
          'ended'
      ) {
        console.warn(
          '⚠️ [AIFilters] Source camera track ended.'
        );

        processingRef.current =
          false;

        setStatus('camera-ended');

        return;
      }

      /*
       * Ensure dimensions remain valid.
       */
      if (
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        (
          canvas.width !==
            video.videoWidth ||
          canvas.height !==
            video.videoHeight
        )
      ) {
        canvas.width =
          video.videoWidth;

        canvas.height =
          video.videoHeight;
      }

      try {
        /*
         * Save context.
         */
        ctx.save();

        /*
         * Apply selected effect.
         */
        applyEffect(
          ctx,
          canvas,
          effectRef.current,
          intensityRef.current
        );

        /*
         * Draw current camera frame.
         */
        ctx.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.restore();

        /*
         * FPS accounting.
         */
        fpsFramesRef.current += 1;

        const now =
          performance.now();

        const elapsed =
          now -
          fpsTimeRef.current;

        if (
          elapsed >= 1000
        ) {
          const currentFps =
            Math.round(
              (
                fpsFramesRef.current *
                1000
              ) /
                elapsed
            );

          setFps(
            Math.min(
              currentFps,
              60
            )
          );

          fpsFramesRef.current =
            0;

          fpsTimeRef.current =
            now;
        }
      } catch (frameError) {
        console.error(
          '❌ [AIFilters] Frame processing error:',
          frameError
        );
      }

      if (
        processingRef.current
      ) {
        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );
      }
    }, []);

  /* =======================================================
     RESTORE ORIGINAL DASHBOARD CAMERA
     ======================================================= */

  const restoreOriginalCamera =
    useCallback(() => {
      const originalTrack =
        originalCameraTrackRef.current;

      console.log(
        '🔄 [AIFilters] Restoring original camera track:',
        originalTrack?.id ||
          'none'
      );

      /*
       * Tell WebRTC to stop using the processed track.
       */
      if (
        onProcessedTrackRef.current
      ) {
        try {
          onProcessedTrackRef.current(
            originalTrack || null
          );
        } catch (error) {
          console.error(
            '❌ [AIFilters] Failed restoring original track:',
            error
          );
        }
      }

      /*
       * Dashboard owns the original stream.
       *
       * We intentionally do not send the dashboard stream
       * to the cleanup routine.
       */
      if (
        onProcessedStreamRef.current
      ) {
        try {
          onProcessedStreamRef.current(
            null
          );
        } catch (error) {
          console.error(
            '❌ [AIFilters] Failed clearing processed stream:',
            error
          );
        }
      }
    }, []);

  /* =======================================================
     CLEAN OUTPUT
     ======================================================= */

  const cleanupOutput =
    useCallback(() => {
      /*
       * Stop animation.
       */
      processingRef.current =
        false;

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current =
          null;
      }

      /*
       * Stop output canvas video track.
       *
       * IMPORTANT:
       * Do NOT stop source/dashboard tracks here.
       */
      if (
        outputStreamRef.current
      ) {
        outputStreamRef.current
          .getVideoTracks()
          .forEach(track => {
            try {
              track.stop();
            } catch {
              // Already stopped.
            }
          });
      }

      outputStreamRef.current =
        null;

      outputTrackRef.current =
        null;

      processedSourceRef.current =
        null;

      /*
       * Clear canvas.
       */
      const canvas =
        canvasRef.current;

      const ctx =
        canvasContextRef.current;

      if (
        canvas &&
        ctx
      ) {
        try {
          ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
          );
        } catch {
          // Ignore.
        }
      }
    }, []);

  /* =======================================================
     FULL PROCESSING CLEANUP
     ======================================================= */

  const cleanupProcessing =
    useCallback(() => {
      console.log(
        '🧹 [AIFilters] Cleaning AI processing.'
      );

      /*
       * First restore WebRTC's original track.
       */
      restoreOriginalCamera();

      /*
       * Then stop canvas processing.
       */
      cleanupOutput();

      /*
       * Remove source video element.
       *
       * Setting srcObject to null does NOT stop the
       * underlying MediaStream.
       */
      if (
        sourceVideoRef.current
      ) {
        try {
          sourceVideoRef.current.pause();
        } catch {
          // Ignore.
        }

        sourceVideoRef.current.srcObject =
          null;

        sourceVideoRef.current =
          null;
      }

      /*
       * Finally stop ONLY the private AI camera.
       *
       * Dashboard-owned camera is never touched.
       */
      cleanupOwnedCamera();

      setStatus('idle');
      setFps(0);
    }, [
      cleanupOutput,
      cleanupOwnedCamera,
      restoreOriginalCamera
    ]);

  /* =======================================================
     START PROCESSING
     ======================================================= */

  const startProcessing =
    useCallback(
      async source => {
        if (
          startingRef.current
        ) {
          return;
        }

        if (
          !mountedRef.current
        ) {
          return;
        }

        startingRef.current =
          true;

        try {
          setError('');
          setStatus(
            'starting'
          );

          /*
           * Determine the dashboard's original track
           * BEFORE potentially opening our private camera.
           *
           * We intentionally allow the original track to be
           * disabled here because we may need to restore it.
           */
          let dashboardOriginalTrack =
            getAnyVideoTrack(
              stream
            );

          if (
            !dashboardOriginalTrack
          ) {
            dashboardOriginalTrack =
              getAnyVideoTrack(
                videoRef?.current?.srcObject
              );
          }

          if (
            dashboardOriginalTrack
          ) {
            originalCameraTrackRef.current =
              dashboardOriginalTrack;
          }

          /*
           * If there is no active dashboard source,
           * independently open the AI camera.
           */
          let activeSource =
            isUsableStream(source)
              ? source
              : null;

          if (!activeSource) {
            activeSource =
              await openIndependentCamera();
          }

          if (
            !activeSource
          ) {
            throw new Error(
              'No camera stream is available.'
            );
          }

          /*
           * If the AI private camera was opened but the
           * original dashboard track wasn't found earlier,
           * try once more to find it.
           */
          if (
            !originalCameraTrackRef.current
          ) {
            const possibleOriginal =
              getAnyVideoTrack(
                stream
              ) ||
              getAnyVideoTrack(
                videoRef?.current?.srcObject
              );

            if (
              possibleOriginal &&
              possibleOriginal !==
                activeSource.getVideoTracks?.()[0]
            ) {
              originalCameraTrackRef.current =
                possibleOriginal;
            }
          }

          sourceStreamRef.current =
            activeSource;

          /*
           * Create hidden video.
           */
          const video =
            await createSourceVideo(
              activeSource
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          /*
           * Verify source is actually producing frames.
           */
          if (
            !video.videoWidth ||
            !video.videoHeight
          ) {
            throw new Error(
              'Camera opened, but no video frames are available.'
            );
          }

          /*
           * Create processing canvas.
           */
          const {
            canvas
          } = createCanvas(
            video
          );

          /*
           * Create processed output stream.
           */
          const outputStream =
            createOutputStream(
              canvas,
              activeSource
            );

          const outputTrack =
            outputStream.getVideoTracks()[0];

          if (!outputTrack) {
            throw new Error(
              'Processed video track could not be created.'
            );
          }

          processedSourceRef.current =
            activeSource;

          /*
           * Send processed stream to dashboard.
           */
          if (
            onProcessedStreamRef.current
          ) {
            try {
              onProcessedStreamRef.current(
                outputStream
              );
            } catch (callbackError) {
              console.error(
                '❌ [AIFilters] Processed stream callback failed:',
                callbackError
              );
            }
          }

          /*
           * Send processed video track to WebRTC.
           */
          if (
            onProcessedTrackRef.current
          ) {
            try {
              onProcessedTrackRef.current(
                outputTrack
              );
            } catch (callbackError) {
              console.error(
                '❌ [AIFilters] Processed track callback failed:',
                callbackError
              );
            }
          }

          /*
           * Start frame processing.
           */
          processingRef.current =
            true;

          fpsFramesRef.current =
            0;

          fpsTimeRef.current =
            performance.now();

          if (
            animationFrameRef.current
          ) {
            cancelAnimationFrame(
              animationFrameRef.current
            );
          }

          animationFrameRef.current =
            requestAnimationFrame(
              processFrame
            );

          /*
           * Preview the processed stream.
           */
          if (
            previewVideoRef.current
          ) {
            previewVideoRef.current.srcObject =
              outputStream;

            previewVideoRef.current
              .play()
              .catch(error => {
                console.warn(
                  '⚠️ [AIFilters] Preview autoplay:',
                  error
                );
              });
          }

          setStatus(
            'processing'
          );

          console.log(
            '✅ [AIFilters] AI processing started.',
            {
              sourceOwnedByAI:
                activeSource ===
                aiOwnedStreamRef.current,

              sourceTrack:
                activeSource.getVideoTracks?.()[0]
                  ?.id,

              processedTrack:
                outputTrack.id
            }
          );
        } catch (startError) {
          console.error(
            '❌ [AIFilters] Failed to start processing:',
            startError
          );

          setError(
            startError?.message ||
              'Unable to start AI camera effects.'
          );

          setStatus(
            'error'
          );

          /*
           * If startup failed, clean only the processing
           * resources and private camera.
           */
          cleanupOutput();

          if (
            sourceVideoRef.current
          ) {
            try {
              sourceVideoRef.current.pause();
            } catch {
              // Ignore.
            }

            sourceVideoRef.current.srcObject =
              null;

            sourceVideoRef.current =
              null;
          }

          cleanupOwnedCamera();
        } finally {
          startingRef.current =
            false;
        }
      },
      [
        cleanupOutput,
        cleanupOwnedCamera,
        createCanvas,
        createOutputStream,
        createSourceVideo,
        getDashboardSource,
        openIndependentCamera,
        processFrame,
        stream,
        videoRef
      ]
    );

  /* =======================================================
     ATTACH / START SOURCE
     ======================================================= */

  const attachStream =
    useCallback(
      async source => {
        if (!open) {
          return;
        }

        /*
         * Re-check dashboard source.
         */
        let activeSource =
          isUsableStream(source)
            ? source
            : getDashboardSource();

        /*
         * If dashboard camera is unavailable,
         * use AI's independent camera.
         */
        if (!isUsableStream(activeSource)) {
          activeSource =
            await openIndependentCamera();
        }

        if (
          !activeSource
        ) {
          throw new Error(
            'Unable to obtain a camera stream.'
          );
        }

        /*
         * If already processing this exact source,
         * don't restart it.
         */
        if (
          processingRef.current &&
          processedSourceRef.current ===
            activeSource
        ) {
          return;
        }

        /*
         * If another source is being processed,
         * clean processing but DO NOT close the dashboard
         * camera.
         */
        if (
          processingRef.current
        ) {
          cleanupOutput();

          if (
            sourceVideoRef.current
          ) {
            try {
              sourceVideoRef.current.pause();
            } catch {
              // Ignore.
            }

            sourceVideoRef.current.srcObject =
              null;

            sourceVideoRef.current =
              null;
          }
        }

        await startProcessing(
          activeSource
        );
      },
      [
        cleanupOutput,
        getDashboardSource,
        open,
        openIndependentCamera,
        startProcessing
      ]
    );

  /* =======================================================
     OPEN BUTTON
     ======================================================= */

  const handleOpen =
    useCallback(() => {
      setError('');
      setOpen(true);
    }, []);

  /* =======================================================
     CLOSE BUTTON
     ======================================================= */

  const handleClose =
    useCallback(() => {
      /*
       * Closing AI Effects restores WebRTC's original
       * dashboard track and releases only AI-owned resources.
       */
      cleanupProcessing();

      setEnabled(false);
      enabledRef.current =
        false;

      setOpen(false);
    }, [cleanupProcessing]);

  /* =======================================================
     ENABLE / DISABLE EFFECTS
     ======================================================= */

  const handleToggleEnabled =
    useCallback(async () => {
      if (!enabled) {
        try {
          setError('');
          setEnabled(true);
          enabledRef.current =
            true;

          /*
           * Get current dashboard source.
           *
           * If unavailable, attachStream will open
           * an independent AI camera.
           */
          const dashboardSource =
            getDashboardSource();

          await attachStream(
            dashboardSource
          );
        } catch (toggleError) {
          console.error(
            '❌ [AIFilters] Enable failed:',
            toggleError
          );

          enabledRef.current =
            false;

          setEnabled(false);

          setError(
            toggleError?.message ||
              'Unable to enable AI Effects.'
          );

          cleanupProcessing();
        }

        return;
      }

      /*
       * Disable AI.
       */
      setEnabled(false);
      enabledRef.current =
        false;

      cleanupProcessing();
    }, [
      attachStream,
      cleanupProcessing,
      enabled,
      getDashboardSource
    ]);

  /* =======================================================
     EFFECT SELECTION
     ======================================================= */

  const handleEffectSelect =
    useCallback(
      async effectId => {
        setSelectedEffect(
          effectId
        );

        effectRef.current =
          effectId;

        /*
         * Selecting an effect automatically enables
         * processing if it isn't already running.
         */
        if (!enabled) {
          try {
            setError('');

            setEnabled(true);
            enabledRef.current =
              true;

            const source =
              getDashboardSource();

            await attachStream(
              source
            );
          } catch (effectError) {
            console.error(
              '❌ [AIFilters] Effect startup failed:',
              effectError
            );

            enabledRef.current =
              false;

            setEnabled(false);

            setError(
              effectError?.message ||
                'Unable to start this effect.'
            );

            cleanupProcessing();
          }
        }
      },
      [
        attachStream,
        cleanupProcessing,
        enabled,
        getDashboardSource
      ]
    );

  /* =======================================================
     RESET
     ======================================================= */

  const handleReset =
    useCallback(() => {
      setSelectedEffect(
        'none'
      );

      effectRef.current =
        'none';

      setIntensity(
        0.75
      );

      intensityRef.current =
        0.75;
    }, []);

  /* =======================================================
     RESTART CAMERA
     ======================================================= */

  const handleRestart =
    useCallback(async () => {
      try {
        setError('');

        cleanupProcessing();

        const source =
          getDashboardSource();

        await attachStream(
          source
        );
      } catch (restartError) {
        console.error(
          '❌ [AIFilters] Restart failed:',
          restartError
        );

        setError(
          restartError?.message ||
            'Unable to restart AI camera.'
        );

        setStatus(
          'error'
        );
      }
    }, [
      attachStream,
      cleanupProcessing,
      getDashboardSource
    ]);

  /* =======================================================
     CAMERA SOURCE WATCHER
     ======================================================= */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    /*
     * We deliberately do NOT continuously poll and open
     * cameras here.
     *
     * When the panel opens, we make one controlled attempt.
     */
    let cancelled = false;

    const initialise =
      async () => {
        if (
          cancelled ||
          !mountedRef.current
        ) {
          return;
        }

        /*
         * If AI is already processing, leave it alone.
         */
        if (
          processingRef.current ||
          startingRef.current
        ) {
          return;
        }

        try {
          const source =
            getDashboardSource();

          await attachStream(
            source
          );
        } catch (watchError) {
          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

          console.error(
            '❌ [AIFilters] Camera initialization failed:',
            watchError
          );

          setError(
            watchError?.message ||
              'Unable to initialize camera.'
          );

          setStatus(
            'error'
          );
        }
      };

    initialise();

    return () => {
      cancelled = true;
    };
  }, [
    attachStream,
    getDashboardSource,
    open
  ]);

  /* =======================================================
     UPDATE SOURCE WHEN DASHBOARD STREAM CHANGES
     ======================================================= */

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    /*
     * If dashboard obtains a usable camera stream while AI
     * is open, prefer the dashboard source.
     *
     * This prevents permanently using a private camera when
     * the dashboard camera becomes available again.
     */
    const dashboardSource =
      getDashboardSource();

    if (
      !dashboardSource
    ) {
      return undefined;
    }

    if (
      processingRef.current &&
      processedSourceRef.current ===
        dashboardSource
    ) {
      return undefined;
    }

    /*
     * If the current source is the AI-owned camera,
     * do not automatically switch immediately.
     *
     * This prevents unnecessary camera restarts caused by
     * React/WebRTC state transitions.
     */
    if (
      processedSourceRef.current ===
      aiOwnedStreamRef.current
    ) {
      return undefined;
    }

    if (
      processingRef.current
    ) {
      attachStream(
        dashboardSource
      ).catch(error => {
        console.warn(
          '⚠️ [AIFilters] Dashboard source update:',
          error
        );
      });
    }

    return undefined;
  }, [
    attachStream,
    getDashboardSource,
    open,
    stream
  ]);

  /* =======================================================
     FPS TIMER CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      if (
        fpsTimerRef.current
      ) {
        clearInterval(
          fpsTimerRef.current
        );

        fpsTimerRef.current =
          null;
      }
    };
  }, []);

  /* =======================================================
     COMPONENT UNMOUNT CLEANUP
     ======================================================= */

  useEffect(() => {
    return () => {
      /*
       * Restore dashboard WebRTC track.
       */
      restoreOriginalCamera();

      /*
       * Stop canvas output.
       */
      cleanupOutput();

      /*
       * Remove hidden source video.
       */
      if (
        sourceVideoRef.current
      ) {
        try {
          sourceVideoRef.current.pause();
        } catch {
          // Ignore.
        }

        sourceVideoRef.current.srcObject =
          null;

        sourceVideoRef.current =
          null;
      }

      /*
       * Stop ONLY the private AI camera.
       */
      const ownedStream =
        aiOwnedStreamRef.current;

      if (ownedStream) {
        ownedStream
          .getTracks()
          .forEach(track => {
            try {
              track.stop();
            } catch {
              // Ignore.
            }
          });

        aiOwnedStreamRef.current =
          null;
      }
    };
  }, [
    cleanupOutput,
    restoreOriginalCamera
  ]);

  /* =======================================================
     FILTERED EFFECT LIST
     ======================================================= */

  const visibleEffects =
    category === 'All'
      ? EFFECTS
      : EFFECTS.filter(
          effect =>
            effect.category ===
            category
        );

  /* =======================================================
     STATUS TEXT
     ======================================================= */

  const getStatusText =
    () => {
      switch (status) {
        case 'requesting-camera':
          return 'Requesting camera...';

        case 'camera-ready':
          return 'Camera ready';

        case 'starting':
          return 'Starting effects...';

        case 'processing':
          return enabled
            ? 'AI effects active'
            : 'Processing';

        case 'camera-ended':
          return 'Camera ended';

        case 'error':
          return 'Camera error';

        default:
          return 'AI Effects';
      }
    };

  /* =======================================================
     CLOSED LAUNCHER
     ======================================================= */

  if (!open) {
    return (
      <div
        className={`fixed bottom-24 right-4 z-[120] ${className}`}
      >
        <button
          type="button"
          onClick={handleOpen}
          className="
            group
            relative
            w-14
            h-14
            rounded-full
            border
            border-cyan-400/30
            bg-zinc-950/90
            backdrop-blur-xl
            shadow-2xl
            flex
            items-center
            justify-center
            text-cyan-300
            hover:text-white
            hover:border-cyan-300/60
            hover:scale-105
            active:scale-95
            transition-all
          "
          title="AI Effects"
          aria-label="Open AI Effects"
        >
          <Sparkles
            size={21}
          />

          <span
            className="
              absolute
              -top-1
              -right-1
              w-4
              h-4
              rounded-full
              bg-cyan-400
              shadow-lg
              shadow-cyan-400/40
            "
          />

          <span
            className="
              absolute
              right-[calc(100%+8px)]
              top-1/2
              -translate-y-1/2
              whitespace-nowrap
              px-2.5
              py-1.5
              rounded-lg
              bg-zinc-950/95
              border
              border-white/10
              text-[9px]
              font-black
              uppercase
              tracking-widest
              text-white/80
              opacity-0
              group-hover:opacity-100
              pointer-events-none
              transition-opacity
            "
          >
            AI Effects
          </span>
        </button>
      </div>
    );
  }

  /* =======================================================
     FULL AI STUDIO
     ======================================================= */

  return (
    <div
      className="
        fixed
        inset-0
        z-[150]
        pointer-events-none
      "
    >
      <div
        className="
          absolute
          inset-0
          bg-black/30
          backdrop-blur-[2px]
          pointer-events-auto
        "
        onClick={handleClose}
      />

      <aside
        className="
          absolute
          top-0
          right-0
          h-full
          w-full
          max-w-md
          bg-zinc-950
          border-l
          border-white/10
          shadow-2xl
          pointer-events-auto
          flex
          flex-col
        "
      >
        {/* =================================================
            HEADER
            ================================================= */}

        <header
          className="
            shrink-0
            px-4
            pt-5
            pb-4
            border-b
            border-white/10
            bg-zinc-950/95
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  w-10
                  h-10
                  rounded-2xl
                  bg-cyan-400/10
                  border
                  border-cyan-400/20
                  flex
                  items-center
                  justify-center
                  text-cyan-300
                "
              >
                <Sparkles
                  size={19}
                />
              </div>

              <div>
                <h2
                  className="
                    text-sm
                    font-black
                    uppercase
                    tracking-wider
                  "
                >
                  AI Effects
                </h2>

                <p
                  className="
                    text-[9px]
                    text-white/40
                    uppercase
                    tracking-widest
                    font-semibold
                    mt-0.5
                  "
                >
                  Independent camera studio
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="
                w-9
                h-9
                rounded-full
                bg-white/5
                hover:bg-white/10
                flex
                items-center
                justify-center
                text-white/60
                hover:text-white
                transition
              "
              title="Close AI Effects"
            >
              <X
                size={17}
              />
            </button>
          </div>

          {/* STATUS */}

          <div
            className="
              flex
              items-center
              justify-between
              mt-4
              px-3
              py-2
              rounded-xl
              bg-white/[0.03]
              border
              border-white/5
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <span
                className={`
                  w-2
                  h-2
                  rounded-full
                  ${
                    status ===
                      'error' ||
                    status ===
                      'camera-ended'
                      ? 'bg-red-400'
                      : enabled
                      ? 'bg-emerald-400'
                      : 'bg-white/20'
                  }
                `}
              />

              <span
                className="
                  text-[9px]
                  uppercase
                  tracking-widest
                  font-black
                  text-white/60
                "
              >
                {getStatusText()}
              </span>
            </div>

            {fps > 0 && (
              <span
                className="
                  text-[9px]
                  font-mono
                  text-cyan-300/70
                "
              >
                {fps} FPS
              </span>
            )}
          </div>
        </header>

        {/* =================================================
            BODY
            ================================================= */}

        <div
          className="
            flex-1
            overflow-y-auto
            overscroll-contain
          "
        >
          {/* =================================================
              CAMERA / PREVIEW
              ================================================= */}

          <section
            className="
              p-4
            "
          >
            <div
              className="
                relative
                w-full
                aspect-video
                rounded-2xl
                overflow-hidden
                bg-black
                border
                border-white/10
                shadow-2xl
              "
            >
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                className="
                  absolute
                  inset-0
                  w-full
                  h-full
                  object-cover
                "
              />

              {!enabled && (
                <div
                  className="
                    absolute
                    inset-0
                    flex
                    flex-col
                    items-center
                    justify-center
                    bg-zinc-900
                    text-center
                    p-6
                  "
                >
                  <div
                    className="
                      w-14
                      h-14
                      rounded-full
                      bg-cyan-400/10
                      border
                      border-cyan-400/20
                      flex
                      items-center
                      justify-center
                      text-cyan-300
                      mb-3
                    "
                  >
                    <Camera
                      size={23}
                    />
                  </div>

                  <p
                    className="
                      text-xs
                      font-black
                      uppercase
                      tracking-widest
                    "
                  >
                    AI Effects Ready
                  </p>

                  <p
                    className="
                      text-[9px]
                      text-white/35
                      mt-2
                      max-w-[240px]
                      leading-relaxed
                    "
                  >
                    Enable an effect to process
                    your camera independently.
                  </p>
                </div>
              )}

              {error && (
                <div
                  className="
                    absolute
                    inset-x-3
                    bottom-3
                    p-3
                    rounded-xl
                    bg-red-950/90
                    border
                    border-red-400/20
                    backdrop-blur-xl
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      gap-2
                    "
                  >
                    <AlertCircle
                      size={15}
                      className="
                        shrink-0
                        text-red-300
                        mt-0.5
                      "
                    />

                    <p
                      className="
                        text-[9px]
                        leading-relaxed
                        text-red-100/80
                      "
                    >
                      {error}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* CAMERA OWNERSHIP */}

            <div
              className="
                flex
                items-center
                justify-between
                mt-3
              "
            >
              <span
                className="
                  text-[8px]
                  uppercase
                  tracking-widest
                  text-white/30
                  font-bold
                "
              >
                {cameraOwned
                  ? 'Independent AI camera'
                  : 'Dashboard camera source'}
              </span>

              {cameraOwned && (
                <span
                  className="
                    text-[8px]
                    uppercase
                    tracking-widest
                    text-cyan-300/60
                    font-bold
                  "
                >
                  Video only
                </span>
              )}
            </div>
          </section>

          {/* =================================================
              MAIN ENABLE BUTTON
              ================================================= */}

          <section
            className="
              px-4
              pb-4
            "
          >
            <button
              type="button"
              onClick={
                handleToggleEnabled
              }
              className={`
                w-full
                h-12
                rounded-2xl
                font-black
                uppercase
                tracking-widest
                text-[10px]
                flex
                items-center
                justify-center
                gap-2
                transition-all
                ${
                  enabled
                    ? 'bg-cyan-400 text-black hover:bg-cyan-300'
                    : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                }
              `}
            >
              {enabled ? (
                <>
                  <Check
                    size={16}
                  />
                  AI Effects Active
                </>
              ) : (
                <>
                  <Sparkles
                    size={16}
                  />
                  Enable AI Effects
                </>
              )}
            </button>
          </section>

          {/* =================================================
              CATEGORIES
              ================================================= */}

          <section
            className="
              px-4
              pb-3
            "
          >
            <div
              className="
                flex
                gap-1.5
                overflow-x-auto
                pb-1
                scrollbar-hide
              "
            >
              {CATEGORIES.map(
                item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setCategory(
                        item
                      )
                    }
                    className={`
                      shrink-0
                      px-3
                      py-2
                      rounded-xl
                      text-[8px]
                      font-black
                      uppercase
                      tracking-wider
                      transition
                      ${
                        category ===
                        item
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </section>

          {/* =================================================
              EFFECT GRID
              ================================================= */}

          <section
            className="
              px-4
              pb-5
            "
          >
            <div
              className="
                grid
                grid-cols-3
                gap-2
              "
            >
              {visibleEffects.map(
                effect => {
                  const active =
                    selectedEffect ===
                    effect.id;

                  return (
                    <button
                      key={
                        effect.id
                      }
                      type="button"
                      onClick={() =>
                        handleEffectSelect(
                          effect.id
                        )
                      }
                      className={`
                        relative
                        min-h-[86px]
                        rounded-2xl
                        border
                        p-3
                        text-left
                        transition-all
                        ${
                          active
                            ? 'border-cyan-400/50 bg-cyan-400/10'
                            : 'border-white/5 bg-white/[0.025] hover:bg-white/[0.06] hover:border-white/10'
                        }
                      `}
                    >
                      <div
                        className={`
                          w-8
                          h-8
                          rounded-xl
                          flex
                          items-center
                          justify-center
                          text-sm
                          mb-2
                          ${
                            active
                              ? 'bg-cyan-400 text-black'
                              : 'bg-white/5 text-white/50'
                          }
                        `}
                      >
                        {
                          effect.icon
                        }
                      </div>

                      <p
                        className={`
                          text-[9px]
                          font-black
                          uppercase
                          tracking-wide
                          ${
                            active
                              ? 'text-cyan-300'
                              : 'text-white/70'
                          }
                        `}
                      >
                        {
                          effect.name
                        }
                      </p>

                      {active && (
                        <span
                          className="
                            absolute
                            top-2
                            right-2
                            w-4
                            h-4
                            rounded-full
                            bg-cyan-400
                            text-black
                            flex
                            items-center
                            justify-center
                          "
                        >
                          <Check
                            size={9}
                            strokeWidth={
                              4
                            }
                          />
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* =================================================
              INTENSITY
              ================================================= */}

          <section
            className="
              px-4
              pb-5
            "
          >
            <div
              className="
                rounded-2xl
                border
                border-white/5
                bg-white/[0.025]
                p-4
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  mb-3
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <SlidersHorizontal
                    size={13}
                    className="text-white/40"
                  />

                  <span
                    className="
                      text-[9px]
                      font-black
                      uppercase
                      tracking-widest
                      text-white/60
                    "
                  >
                    Intensity
                  </span>
                </div>

                <span
                  className="
                    text-[9px]
                    font-mono
                    text-cyan-300
                  "
                >
                  {Math.round(
                    intensity *
                      100
                  )}
                  %
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={intensity}
                onChange={event => {
                  const value =
                    Number(
                      event.target
                        .value
                    );

                  setIntensity(
                    value
                  );

                  intensityRef.current =
                    value;
                }}
                className="
                  w-full
                  accent-cyan-400
                  cursor-pointer
                "
              />
            </div>
          </section>

          {/* =================================================
              ACTIONS
              ================================================= */}

          <section
            className="
              px-4
              pb-8
              grid
              grid-cols-2
              gap-2
            "
          >
            <button
              type="button"
              onClick={
                handleReset
              }
              className="
                h-10
                rounded-xl
                bg-white/5
                hover:bg-white/10
                text-white/60
                hover:text-white
                text-[9px]
                font-black
                uppercase
                tracking-wider
                flex
                items-center
                justify-center
                gap-2
                transition
              "
            >
              <RotateCcw
                size={13}
              />
              Reset
            </button>

            <button
              type="button"
              onClick={
                handleRestart
              }
              className="
                h-10
                rounded-xl
                bg-white/5
                hover:bg-white/10
                text-white/60
                hover:text-white
                text-[9px]
                font-black
                uppercase
                tracking-wider
                flex
                items-center
                justify-center
                gap-2
                transition
              "
            >
              <Camera
                size={13}
              />
              Restart
            </button>
          </section>
        </div>

        {/* =================================================
            FOOTER
            ================================================= */}

        <footer
          className="
            shrink-0
            px-4
            py-3
            border-t
            border-white/10
            bg-zinc-950
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
            "
          >
            <button
              type="button"
              onClick={
                handleClose
              }
              className="
                flex
                items-center
                gap-1.5
                text-[9px]
                font-black
                uppercase
                tracking-wider
                text-white/40
                hover:text-white
                transition
              "
            >
              <ChevronLeft
                size={13}
              />
              Back
            </button>

            <span
              className="
                text-[8px]
                text-white/20
                uppercase
                tracking-widest
              "
            >
              Camera Effects
            </span>
          </div>
        </footer>
      </aside>
    </div>
  );
};

export default AIFilters;
