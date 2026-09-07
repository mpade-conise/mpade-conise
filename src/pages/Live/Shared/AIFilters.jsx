import { useCallback, useEffect, useRef } from 'react';
import {
  FaceLandmarker,
  FilesetResolver
} from '@mediapipe/tasks-vision';

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';

const FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const DEFAULT_FILTERS = {
  smoothing: 0,
  jawline: 0,
  eyes: 0,
  slim: 0,

  lut: 'none',
  lutIntensity: 0,

  fx: 'none',
  fxIntensity: 0
};

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const lerp = (a, b, amount) =>
  a + (b - a) * amount;

const hexToRgb = hex => {
  const value = hex.replace('#', '');

  return {
    r: parseInt(value.substring(0, 2), 16),
    g: parseInt(value.substring(2, 4), 16),
    b: parseInt(value.substring(4, 6), 16)
  };
};

const mixColor = (
  source,
  target,
  amount
) => ({
  r: lerp(source.r, target.r, amount),
  g: lerp(source.g, target.g, amount),
  b: lerp(source.b, target.b, amount)
});

const LUTS = {
  retro: {
    contrast: 1.05,
    saturation: 0.82,
    brightness: 1.02,
    overlay: '#c28a5a'
  },

  cyberpunk: {
    contrast: 1.18,
    saturation: 1.45,
    brightness: 1.02,
    overlay: '#8c4cff'
  },

  noir: {
    contrast: 1.35,
    saturation: 0,
    brightness: 0.94,
    overlay: '#151515'
  },

  golden: {
    contrast: 1.04,
    saturation: 1.12,
    brightness: 1.08,
    overlay: '#f4a340'
  },

  tropic: {
    contrast: 1.08,
    saturation: 1.35,
    brightness: 1.04,
    overlay: '#19b875'
  }
};

export const useVideoFilterEngine = () => {
  const sourceVideoRef =
    useRef(null);

  const canvasRef =
    useRef(null);

  const outputStreamRef =
    useRef(null);

  const sourceStreamRef =
    useRef(null);

  const animationFrameRef =
    useRef(null);

  const faceLandmarkerRef =
    useRef(null);

  const initializingRef =
    useRef(false);

  const destroyedRef =
    useRef(false);

  const lastFaceResultRef =
    useRef(null);

  const lastTimestampRef =
    useRef(0);

  const filtersRef =
    useRef({
      ...DEFAULT_FILTERS
    });

  const outputVideoTrackRef =
    useRef(null);

  /*
   * ------------------------------------------------------------
   * CREATE FACE LANDMARKER
   * ------------------------------------------------------------
   */

  const initializeFaceLandmarker =
    useCallback(async () => {
      if (
        faceLandmarkerRef.current
      ) {
        return faceLandmarkerRef.current;
      }

      const vision =
        await FilesetResolver.forVisionTasks(
          WASM_URL
        );

      const landmarker =
        await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                FACE_MODEL_URL
            },

            runningMode: 'VIDEO',

            numFaces: 1,

            minFaceDetectionConfidence:
              0.5,

            minFacePresenceConfidence:
              0.5,

            minTrackingConfidence:
              0.5
          }
        );

      faceLandmarkerRef.current =
        landmarker;

      return landmarker;
    }, []);

  /*
   * ------------------------------------------------------------
   * FILTER EVENT
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (
      typeof window === 'undefined'
    ) {
      return undefined;
    }

    const handleFilterEvent =
      event => {
        const detail =
          event?.detail;

        if (!detail) {
          return;
        }

        if (
          detail.type ===
          'reset'
        ) {
          filtersRef.current = {
            ...DEFAULT_FILTERS
          };

          return;
        }

        if (
          detail.type ===
          'beauty'
        ) {
          filtersRef.current = {
            ...filtersRef.current,
            [detail.key]:
              Number(detail.value) || 0
          };

          return;
        }

        if (
          detail.type ===
          'morph'
        ) {
          filtersRef.current = {
            ...filtersRef.current,
            [detail.key]:
              Number(detail.value) || 0
          };

          return;
        }

        if (
          detail.type ===
          'lut'
        ) {
          if (
            detail.key ===
            'preset'
          ) {
            filtersRef.current.lut =
              detail.value ||
              'none';
          }

          if (
            detail.key ===
            'intensity'
          ) {
            filtersRef.current.lutIntensity =
              Number(
                detail.value
              ) || 0;
          }

          return;
        }

        if (
          detail.type ===
          'fx'
        ) {
          if (
            detail.key ===
            'preset'
          ) {
            filtersRef.current.fx =
              detail.value ||
              'none';
          }

          if (
            detail.key ===
            'intensity'
          ) {
            filtersRef.current.fxIntensity =
              Number(
                detail.value
              ) || 0;
          }
        }
      };

    window.addEventListener(
      'mpade-video-filter',
      handleFilterEvent
    );

    return () => {
      window.removeEventListener(
        'mpade-video-filter',
        handleFilterEvent
      );
    };
  }, []);

  /*
   * ------------------------------------------------------------
   * DRAW IMAGE
   * ------------------------------------------------------------
   */

  const drawBaseFrame = (
    ctx,
    video,
    width,
    height
  ) => {
    ctx.save();

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    ctx.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    ctx.restore();
  };

  /*
   * ------------------------------------------------------------
   * COLOR PROCESSING
   * ------------------------------------------------------------
   */

  const applyLUT = (
    ctx,
    width,
    height,
    lutName,
    intensity
  ) => {
    if (
      lutName === 'none' ||
      intensity <= 0
    ) {
      return;
    }

    const preset =
      LUTS[lutName];

    if (!preset) {
      return;
    }

    const image =
      ctx.getImageData(
        0,
        0,
        width,
        height
      );

    const data =
      image.data;

    const factor =
      intensity / 100;

    const overlay =
      hexToRgb(
        preset.overlay
      );

    for (
      let i = 0;
      i < data.length;
      i += 4
    ) {
      let r =
        data[i];

      let g =
        data[i + 1];

      let b =
        data[i + 2];

      /*
       * Contrast
       */

      r =
        (r - 128) *
          preset.contrast +
        128;

      g =
        (g - 128) *
          preset.contrast +
        128;

      b =
        (b - 128) *
          preset.contrast +
        128;

      /*
       * Saturation
       */

      const gray =
        0.299 * r +
        0.587 * g +
        0.114 * b;

      r =
        gray +
        (r - gray) *
          preset.saturation;

      g =
        gray +
        (g - gray) *
          preset.saturation;

      b =
        gray +
        (b - gray) *
          preset.saturation;

      /*
       * Brightness
       */

      r *=
        preset.brightness;

      g *=
        preset.brightness;

      b *=
        preset.brightness;

      /*
       * Color tone
       */

      const toned =
        mixColor(
          {
            r,
            g,
            b
          },
          overlay,
          factor * 0.12
        );

      data[i] =
        clamp(
          Math.round(
            toned.r
          ),
          0,
          255
        );

      data[i + 1] =
        clamp(
          Math.round(
            toned.g
          ),
          0,
          255
        );

      data[i + 2] =
        clamp(
          Math.round(
            toned.b
          ),
          0,
          255
        );
    }

    ctx.putImageData(
      image,
      0,
      0
    );
  };

  /*
   * ------------------------------------------------------------
   * SKIN SMOOTHING
   * ------------------------------------------------------------
   */

  const applySmoothing = (
    ctx,
    width,
    height,
    level
  ) => {
    if (level <= 0) {
      return;
    }

    /*
     * The canvas filter performs
     * real pixel-level smoothing.
     *
     * We keep the effect subtle so
     * the face doesn't become blurry.
     */

    const amount =
      clamp(
        level / 5,
        0,
        1
      );

    ctx.save();

    ctx.globalAlpha =
      amount * 0.18;

    ctx.filter =
      `blur(${0.6 +
        amount * 1.4}px)`;

    ctx.globalCompositeOperation =
      'source-atop';

    ctx.drawImage(
      canvasRef.current,
      0,
      0,
      width,
      height
    );

    ctx.restore();
  };

  /*
   * ------------------------------------------------------------
   * FACE HELPERS
   * ------------------------------------------------------------
   */

  const getLandmark =
    (landmarks, index) => {
      if (
        !landmarks ||
        !landmarks[index]
      ) {
        return null;
      }

      return {
        x:
          landmarks[index].x,
        y:
          landmarks[index].y
      };
    };

  const drawFacePatch =
    (
      ctx,
      canvas,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      destinationX,
      destinationY,
      destinationW,
      destinationH
    ) => {
      ctx.drawImage(
        canvas,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        destinationX,
        destinationY,
        destinationW,
        destinationH
      );
    };

  /*
   * ------------------------------------------------------------
   * EYE ENHANCEMENT
   * ------------------------------------------------------------
   */

  const applyEyeEnhancement =
    (
      ctx,
      canvas,
      landmarks,
      width,
      height,
      level
    ) => {
      if (
        level <= 0 ||
        !landmarks
      ) {
        return;
      }

      /*
       * MediaPipe Face Landmarker
       * gives us facial landmarks.
       *
       * These indices identify
       * approximate eye regions.
       */

      const leftOuter =
        getLandmark(
          landmarks,
          33
        );

      const leftInner =
        getLandmark(
          landmarks,
          133
        );

      const rightOuter =
        getLandmark(
          landmarks,
          263
        );

      const rightInner =
        getLandmark(
          landmarks,
          362
        );

      if (
        !leftOuter ||
        !leftInner ||
        !rightOuter ||
        !rightInner
      ) {
        return;
      }

      const strength =
        level / 5;

      const processEye =
        (
          outer,
          inner
        ) => {
          const cx =
            ((outer.x +
              inner.x) /
              2) *
            width;

          const cy =
            ((outer.y +
              inner.y) /
              2) *
            height;

          const eyeWidth =
            Math.abs(
              outer.x -
                inner.x
            ) *
            width;

          const eyeHeight =
            eyeWidth *
            0.75;

          if (
            eyeWidth <
            4
          ) {
            return;
          }

          const scale =
            1 +
            strength *
              0.18;

          const sourceW =
            eyeWidth * 2.2;

          const sourceH =
            eyeHeight * 2.5;

          const sourceX =
            cx -
            sourceW / 2;

          const sourceY =
            cy -
            sourceH / 2;

          const destinationW =
            sourceW *
            scale;

          const destinationH =
            sourceH *
            scale;

          const destinationX =
            cx -
            destinationW / 2;

          const destinationY =
            cy -
            destinationH / 2;

          ctx.save();

          ctx.globalCompositeOperation =
            'source-over';

          drawFacePatch(
            ctx,
            canvas,
            sourceX,
            sourceY,
            sourceW,
            sourceH,
            destinationX,
            destinationY,
            destinationW,
            destinationH
          );

          ctx.restore();
        };

      processEye(
        leftOuter,
        leftInner
      );

      processEye(
        rightOuter,
        rightInner
      );
    };

  /*
   * ------------------------------------------------------------
   * FACE SLIMMING / JAWLINE
   * ------------------------------------------------------------
   *
   * These use landmark-guided local
   * image deformation. They are deliberately
   * subtle to avoid obvious edge tearing.
   */

  const applyFaceShape =
    (
      ctx,
      canvas,
      landmarks,
      width,
      height,
      slimLevel,
      jawLevel
    ) => {
      if (
        !landmarks ||
        (
          slimLevel <= 0 &&
          jawLevel <= 0
        )
      ) {
        return;
      }

      const leftCheek =
        getLandmark(
          landmarks,
          234
        );

      const rightCheek =
        getLandmark(
          landmarks,
          454
        );

      const chin =
        getLandmark(
          landmarks,
          152
        );

      if (
        !leftCheek ||
        !rightCheek ||
        !chin
      ) {
        return;
      }

      const slim =
        slimLevel / 5;

      const jaw =
        jawLevel / 5;

      const centerX =
        ((leftCheek.x +
          rightCheek.x) /
          2) *
        width;

      const centerY =
        ((leftCheek.y +
          rightCheek.y) /
          2) *
        height;

      const faceWidth =
        Math.abs(
          rightCheek.x -
            leftCheek.x
        ) *
        width;

      const faceHeight =
        Math.abs(
          chin.y -
            centerY / height
        ) *
        height;

      if (
        faceWidth < 20 ||
        faceHeight < 20
      ) {
        return;
      }

      /*
       * This is intentionally conservative.
       *
       * A full mesh warp should eventually
       * replace this patch-based deformation
       * for maximum quality.
       */

      const amount =
        slim * 0.08 +
        jaw * 0.05;

      const sourceW =
        faceWidth * 0.72;

      const sourceH =
        faceHeight * 0.75;

      const sourceX =
        centerX -
        sourceW / 2;

      const sourceY =
        centerY -
        sourceH * 0.25;

      const destinationW =
        sourceW *
        (1 - amount);

      const destinationX =
        centerX -
        destinationW / 2;

      ctx.save();

      drawFacePatch(
        ctx,
        canvas,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        destinationX,
        sourceY,
        destinationW,
        sourceH
      );

      ctx.restore();
    };

  /*
   * ------------------------------------------------------------
   * VHS
   * ------------------------------------------------------------
   */

  const applyVHS =
    (
      ctx,
      width,
      height,
      intensity
    ) => {
      if (
        intensity <= 0
      ) {
        return;
      }

      const amount =
        intensity / 100;

      ctx.save();

      /*
       * Scanlines
       */

      ctx.globalAlpha =
        0.12 * amount;

      ctx.fillStyle =
        '#000';

      for (
        let y = 0;
        y < height;
        y += 4
      ) {
        ctx.fillRect(
          0,
          y,
          width,
          1
        );
      }

      /*
       * VHS color wash
       */

      ctx.globalCompositeOperation =
        'screen';

      ctx.globalAlpha =
        0.08 * amount;

      ctx.fillStyle =
        '#ff004c';

      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      ctx.globalCompositeOperation =
        'screen';

      ctx.globalAlpha =
        0.06 * amount;

      ctx.fillStyle =
        '#00e5ff';

      ctx.fillRect(
        3,
        0,
        width,
        height
      );

      ctx.restore();
    };

  /*
   * ------------------------------------------------------------
   * MANGA
   * ------------------------------------------------------------
   */

  const applyManga =
    (
      ctx,
      width,
      height,
      intensity
    ) => {
      if (
        intensity <= 0
      ) {
        return;
      }

      const image =
        ctx.getImageData(
          0,
          0,
          width,
          height
        );

      const data =
        image.data;

      const copy =
        new Uint8ClampedArray(
          data
        );

      const amount =
        intensity / 100;

      /*
       * Lightweight edge detection.
       *
       * This intentionally avoids a
       * heavy OpenCV dependency.
       */

      for (
        let y = 1;
        y < height - 1;
        y++
      ) {
        for (
          let x = 1;
          x < width - 1;
          x++
        ) {
          const index =
            (y * width + x) *
            4;

          const right =
            index + 4;

          const down =
            index +
            width * 4;

          const current =
            (
              copy[index] +
              copy[index + 1] +
              copy[index + 2]
            ) / 3;

          const rightValue =
            (
              copy[right] +
              copy[right + 1] +
              copy[right + 2]
            ) / 3;

          const downValue =
            (
              copy[down] +
              copy[down + 1] +
              copy[down + 2]
            ) / 3;

          const edge =
            Math.abs(
              current -
                rightValue
            ) +
            Math.abs(
              current -
                downValue
            );

          if (
            edge >
            55
          ) {
            const dark =
              clamp(
                255 -
                  edge *
                    2 *
                    amount,
                0,
                255
              );

            data[index] =
              dark;

            data[index + 1] =
              dark;

            data[index + 2] =
              dark;
          }
        }
      }

      ctx.putImageData(
        image,
        0,
        0
      );
    };

  /*
   * ------------------------------------------------------------
   * THERMAL
   * ------------------------------------------------------------
   */

  const applyThermal =
    (
      ctx,
      width,
      height,
      intensity
    ) => {
      if (
        intensity <= 0
      ) {
        return;
      }

      const image =
        ctx.getImageData(
          0,
          0,
          width,
          height
        );

      const data =
        image.data;

      const amount =
        intensity / 100;

      for (
        let i = 0;
        i < data.length;
        i += 4
      ) {
        const brightness =
          (
            0.299 *
              data[i] +
            0.587 *
              data[i + 1] +
            0.114 *
              data[i + 2]
          ) / 255;

        let r = 0;
        let g = 0;
        let b = 0;

        if (
          brightness < 0.25
        ) {
          r = 20;
          g = 0;
          b = 80;
        } else if (
          brightness < 0.5
        ) {
          r = 30;
          g = 60;
          b = 220;
        } else if (
          brightness < 0.75
        ) {
          r = 255;
          g = 170;
          b = 20;
        } else {
          r = 255;
          g = 255;
          b = 255;
        }

        data[i] =
          lerp(
            data[i],
            r,
            amount
          );

        data[i + 1] =
          lerp(
            data[i + 1],
            g,
            amount
          );

        data[i + 2] =
          lerp(
            data[i + 2],
            b,
            amount
          );
      }

      ctx.putImageData(
        image,
        0,
        0
      );
    };

  /*
   * ------------------------------------------------------------
   * PROCESS FRAME
   * ------------------------------------------------------------
   */

  const processFrame =
    useCallback(
      async () => {
        if (
          destroyedRef.current
        ) {
          return;
        }

        const video =
          sourceVideoRef.current;

        const canvas =
          canvasRef.current;

        const landmarker =
          faceLandmarkerRef.current;

        if (
          !video ||
          !canvas
        ) {
          animationFrameRef.current =
            requestAnimationFrame(
              processFrame
            );

          return;
        }

        if (
          video.readyState <
          HTMLMediaElement
            .HAVE_CURRENT_DATA
        ) {
          animationFrameRef.current =
            requestAnimationFrame(
              processFrame
            );

          return;
        }

        const width =
          canvas.width;

        const height =
          canvas.height;

        const ctx =
          canvas.getContext(
            '2d',
            {
              willReadFrequently:
                true
            }
          );

        if (!ctx) {
          return;
        }

        drawBaseFrame(
          ctx,
          video,
          width,
          height
        );

        const timestamp =
          performance.now();

        /*
         * Face detection
         */

        if (
          landmarker &&
          timestamp >
            lastTimestampRef.current
        ) {
          try {
            const result =
              landmarker.detectForVideo(
                video,
                timestamp
              );

            lastFaceResultRef.current =
              result;
          } catch (
            error
          ) {
            console.debug(
              'Face landmark processing:',
              error?.message ||
                error
            );
          }

          lastTimestampRef.current =
            timestamp;
        }

        const filters =
          filtersRef.current;

        const landmarks =
          lastFaceResultRef.current
            ?.faceLandmarks?.[0];

        /*
         * Face processing
         */

        if (landmarks) {
          applyFaceShape(
            ctx,
            canvas,
            landmarks,
            width,
            height,
            filters.slim,
            filters.jawline
          );

          applyEyeEnhancement(
            ctx,
            canvas,
            landmarks,
            width,
            height,
            filters.eyes
          );
        }

        applySmoothing(
          ctx,
          width,
          height,
          filters.smoothing
        );

        /*
         * Color
         */

        applyLUT(
          ctx,
          width,
          height,
          filters.lut,
          filters.lutIntensity
        );

        /*
         * FX
         */

        if (
          filters.fx === 'vhs'
        ) {
          applyVHS(
            ctx,
            width,
            height,
            filters.fxIntensity
          );
        }

        if (
          filters.fx === 'manga'
        ) {
          applyManga(
            ctx,
            width,
            height,
            filters.fxIntensity
          );
        }

        if (
          filters.fx === 'thermal'
        ) {
          applyThermal(
            ctx,
            width,
            height,
            filters.fxIntensity
          );
        }

        animationFrameRef.current =
          requestAnimationFrame(
            processFrame
          );
      },
      []
    );

  /*
   * ------------------------------------------------------------
   * ATTACH STREAM
   * ------------------------------------------------------------
   */

  const attachStream =
    useCallback(
      async stream => {
        if (!stream) {
          return null;
        }

        sourceStreamRef.current =
          stream;

        if (
          !sourceVideoRef.current
        ) {
          sourceVideoRef.current =
            document.createElement(
              'video'
            );
        }

        const sourceVideo =
          sourceVideoRef.current;

        sourceVideo.muted =
          true;

        sourceVideo.autoplay =
          true;

        sourceVideo.playsInline =
          true;

        sourceVideo.srcObject =
          stream;

        await sourceVideo.play();

        if (
          destroyedRef.current
        ) {
          return null;
        }

        if (
          !canvasRef.current
        ) {
          canvasRef.current =
            document.createElement(
              'canvas'
            );
        }

        const canvas =
          canvasRef.current;

        const videoTrack =
          stream.getVideoTracks()[0];

        const settings =
          videoTrack?.getSettings?.() ||
          {};

        canvas.width =
          settings.width ||
          1280;

        canvas.height =
          settings.height ||
          720;

        /*
         * Create MediaPipe.
         */

        try {
          await initializeFaceLandmarker();
        } catch (
          error
        ) {
          console.error(
            '❌ Failed to initialize MediaPipe Face Landmarker:',
            error
          );
        }

        /*
         * Start renderer.
         */

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
         * Canvas capture becomes
         * the processed video track.
         */

        const processedVideoStream =
          canvas.captureStream(
            30
          );

        const processedVideoTrack =
          processedVideoStream.getVideoTracks()[0];

        outputVideoTrackRef.current =
          processedVideoTrack;

        /*
         * Preserve original audio.
         */

        const outputStream =
          new MediaStream();

        outputStream.addTrack(
          processedVideoTrack
        );

        stream
          .getAudioTracks()
          .forEach(
            audioTrack => {
              outputStream.addTrack(
                audioTrack
              );
            }
          );

        outputStreamRef.current =
          outputStream;

        return outputStream;
      },
      [
        initializeFaceLandmarker,
        processFrame
      ]
    );

  /*
   * ------------------------------------------------------------
   * CLEANUP
   * ------------------------------------------------------------
   */

  const destroy =
    useCallback(() => {
      destroyedRef.current =
        true;

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current =
          null;
      }

      if (
        sourceVideoRef.current
      ) {
        sourceVideoRef.current.pause();

        sourceVideoRef.current.srcObject =
          null;
      }

      if (
        faceLandmarkerRef.current
      ) {
        try {
          faceLandmarkerRef.current.close();
        } catch (
          error
        ) {
          console.debug(
            'FaceLandmarker cleanup:',
            error
          );
        }

        faceLandmarkerRef.current =
          null;
      }

      if (
        outputVideoTrackRef.current
      ) {
        try {
          outputVideoTrackRef.current.stop();
        } catch (
          error
        ) {
          console.debug(
            'Processed track cleanup:',
            error
          );
        }

        outputVideoTrackRef.current =
          null;
      }

      outputStreamRef.current =
        null;

      sourceStreamRef.current =
        null;
    }, []);

  useEffect(() => {
    destroyedRef.current =
      false;

    return () => {
      destroy();
    };
  }, [destroy]);

  return {
    attachStream,
    getProcessedStream:
      () =>
        outputStreamRef.current,
    getProcessedVideoTrack:
      () =>
        outputVideoTrackRef.current,
    destroy
  };
};

export default useVideoFilterEngine;
