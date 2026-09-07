
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAIEffects } from "./useAIEffects";

/**
 * AIEffects
 *
 * Professional AI video-effects control panel for StreamDashboard.
 *
 * The component is intentionally separated from the processing logic.
 * All MediaPipe / AI processing belongs inside useAIEffects.
 *
 * Props:
 *   stream              - Source camera MediaStream
 *   onProcessedStream   - Receives the processed MediaStream
 *   className           - Optional additional CSS class
 *   compact             - Compact dashboard presentation
 */
export default function AIEffects({
  stream = null,
  onProcessedStream = null,
  className = "",
  compact = false,
}) {
  const previewRef = useRef(null);

  const [enabled, setEnabled] = useState(true);
  const [selectedEffect, setSelectedEffect] = useState("none");
  const [intensity, setIntensity] = useState(70);
  const [error, setError] = useState(null);

  /*
   * The hook owns the actual AI processing.
   * We will recreate this hook next so that its API matches
   * this component exactly.
   */
  const {
    attachStream,
    getProcessedStream,
    getProcessedVideoTrack,
    destroy,
    isProcessing = false,
    isReady = false,
  } = useAIEffects({
    effect: selectedEffect,
    intensity,
    enabled,
  });

  const effects = useMemo(
    () => [
      {
        id: "none",
        name: "Original",
        description: "Keep your camera exactly as it is.",
        icon: "◉",
      },
      {
        id: "background-blur",
        name: "Background Blur",
        description: "Blur your surroundings while keeping you sharp.",
        icon: "◌",
      },
      {
        id: "background-remove",
        name: "Background Remove",
        description: "Remove the background from your camera feed.",
        icon: "✦",
      },
      {
        id: "face-focus",
        name: "Face Focus",
        description: "Keep attention centered on your face.",
        icon: "⌾",
      },
    ],
    []
  );

  /*
   * Attach the camera stream whenever the source changes.
   */
  useEffect(() => {
    if (!stream || !enabled) {
      return undefined;
    }

    let cancelled = false;

    const initialize = async () => {
      try {
        setError(null);

        await attachStream(stream);

        if (cancelled) return;

        const processedStream = getProcessedStream();

        if (processedStream) {
          if (previewRef.current) {
            previewRef.current.srcObject = processedStream;
          }

          if (onProcessedStream) {
            onProcessedStream(processedStream);
          }
        }
      } catch (err) {
        console.error("[AIEffects] Failed to initialize:", err);

        if (!cancelled) {
          setError(
            err?.message ||
              "Unable to initialize AI video processing."
          );
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [
    stream,
    enabled,
    attachStream,
    getProcessedStream,
    onProcessedStream,
  ]);

  /*
   * Keep the preview and parent component synchronized
   * whenever the selected effect changes.
   */
  useEffect(() => {
    if (!enabled) return;

    const processedStream = getProcessedStream();

    if (!processedStream) return;

    if (previewRef.current) {
      previewRef.current.srcObject = processedStream;
    }

    if (onProcessedStream) {
      onProcessedStream(processedStream);
    }
  }, [
    selectedEffect,
    intensity,
    enabled,
    getProcessedStream,
    onProcessedStream,
  ]);

  /*
   * Disable processing cleanly.
   */
  useEffect(() => {
    if (enabled) return;

    if (previewRef.current) {
      previewRef.current.srcObject = stream || null;
    }

    if (onProcessedStream) {
      onProcessedStream(stream || null);
    }
  }, [enabled, stream, onProcessedStream]);

  /*
   * Cleanup.
   */
  useEffect(() => {
    return () => {
      try {
        destroy();
      } catch (err) {
        console.error("[AIEffects] Cleanup failed:", err);
      }
    };
  }, [destroy]);

  const activeEffect = effects.find(
    (effect) => effect.id === selectedEffect
  );

  const handleEffectChange = (effectId) => {
    setError(null);
    setSelectedEffect(effectId);
  };

  const handleToggle = () => {
    setError(null);
    setEnabled((current) => !current);
  };

  return (
    <section
      className={`ai-effects-panel ${
        compact ? "ai-effects-panel--compact" : ""
      } ${className}`}
      aria-label="AI video effects"
    >
      {/* Header */}
      <div className="ai-effects-panel__header">
        <div className="ai-effects-panel__title-group">
          <div className="ai-effects-panel__ai-icon">
            <span>✦</span>
          </div>

          <div>
            <div className="ai-effects-panel__title-row">
              <h2>AI Effects</h2>

              <span className="ai-effects-panel__badge">
                AI
              </span>
            </div>

            <p>
              Enhance your livestream with real-time AI processing.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={`ai-effects-toggle ${
            enabled ? "ai-effects-toggle--active" : ""
          }`}
          onClick={handleToggle}
          aria-pressed={enabled}
          aria-label={
            enabled
              ? "Disable AI effects"
              : "Enable AI effects"
          }
        >
          <span className="ai-effects-toggle__label">
            {enabled ? "Enabled" : "Disabled"}
          </span>

          <span className="ai-effects-toggle__track">
            <span className="ai-effects-toggle__thumb" />
          </span>
        </button>
      </div>

      {/* Status */}
      <div className="ai-effects-status">
        <div className="ai-effects-status__left">
          <span
            className={`ai-effects-status__dot ${
              enabled && (isReady || isProcessing)
                ? "ai-effects-status__dot--active"
                : ""
            }`}
          />

          <span>
            {!enabled
              ? "AI effects disabled"
              : isProcessing
              ? "Processing camera feed..."
              : isReady
              ? "AI processing ready"
              : "Waiting for camera"}
          </span>
        </div>

        {enabled && isProcessing && (
          <span className="ai-effects-status__processing">
            Processing
          </span>
        )}
      </div>

      {/* Preview */}
      {!compact && (
        <div className="ai-effects-preview">
          <video
            ref={previewRef}
            autoPlay
            muted
            playsInline
            className="ai-effects-preview__video"
          />

          {!stream && (
            <div className="ai-effects-preview__empty">
              <div className="ai-effects-preview__empty-icon">
                ◉
              </div>

              <strong>Camera preview</strong>

              <span>
                Start your camera to preview AI effects.
              </span>
            </div>
          )}

          {stream && enabled && isProcessing && (
            <div className="ai-effects-preview__overlay">
              <div className="ai-effects-spinner" />
              <span>Applying {activeEffect?.name}</span>
            </div>
          )}

          {stream && !enabled && (
            <div className="ai-effects-preview__disabled">
              AI effects are off
            </div>
          )}

          {activeEffect && selectedEffect !== "none" && enabled && (
            <div className="ai-effects-preview__label">
              <span>{activeEffect.icon}</span>
              {activeEffect.name}
            </div>
          )}
        </div>
      )}

      {/* Effects */}
      <div className="ai-effects-section">
        <div className="ai-effects-section__heading">
          <div>
            <h3>Choose an effect</h3>
            <span>
              Select an effect for your livestream camera.
            </span>
          </div>
        </div>

        <div className="ai-effects-grid">
          {effects.map((effect) => {
            const active = selectedEffect === effect.id;

            return (
              <button
                key={effect.id}
                type="button"
                className={`ai-effect-card ${
                  active ? "ai-effect-card--active" : ""
                }`}
                onClick={() => handleEffectChange(effect.id)}
                disabled={!enabled}
                aria-pressed={active}
              >
                <div className="ai-effect-card__top">
                  <div className="ai-effect-card__icon">
                    {effect.icon}
                  </div>

                  {active && (
                    <span className="ai-effect-card__check">
                      ✓
                    </span>
                  )}
                </div>

                <div className="ai-effect-card__content">
                  <strong>{effect.name}</strong>

                  <span>{effect.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Intensity */}
      {selectedEffect !== "none" && (
        <div className="ai-effects-intensity">
          <div className="ai-effects-intensity__header">
            <div>
              <h3>Effect intensity</h3>
              <span>Adjust how strongly the effect is applied.</span>
            </div>

            <strong>{intensity}%</strong>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={intensity}
            onChange={(event) =>
              setIntensity(Number(event.target.value))
            }
            disabled={!enabled}
            className="ai-effects-slider"
            aria-label="Effect intensity"
          />

          <div className="ai-effects-intensity__scale">
            <span>Subtle</span>
            <span>Strong</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="ai-effects-error" role="alert">
          <div className="ai-effects-error__icon">!</div>

          <div>
            <strong>AI effect error</strong>
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="ai-effects-footer">
        <div className="ai-effects-footer__info">
          <span className="ai-effects-footer__icon">
            ✦
          </span>

          <span>
            AI processing runs locally in your browser.
          </span>
        </div>

        {getProcessedVideoTrack() && (
          <span className="ai-effects-footer__ready">
            Video track ready
          </span>
        )}
      </div>
    </section>
  );
}

