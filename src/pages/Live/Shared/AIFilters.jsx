import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Sliders,
  Smile,
  User,
  Eye,
  Sun,
  Moon,
  Film,
  Zap,
  Maximize,
  RotateCcw,
  Wand2,
  Contrast,
  ScanFace
} from 'lucide-react';

const DEFAULTS = {
  smoothing: 3,
  jawline: 0,
  eyeSize: 0,
  faceSlim: 0,
  activeLUT: 'none',
  activeFX: 'none',
  lutIntensity: 100,
  fxIntensity: 100
};

const AIFilters = ({
  streamId,
  onBack
}) => {
  const [smoothing, setSmoothing] =
    useState(DEFAULTS.smoothing);

  const [jawline, setJawline] =
    useState(DEFAULTS.jawline);

  const [eyeSize, setEyeSize] =
    useState(DEFAULTS.eyeSize);

  const [faceSlim, setFaceSlim] =
    useState(DEFAULTS.faceSlim);

  const [activeLUT, setActiveLUT] =
    useState(DEFAULTS.activeLUT);

  const [activeFX, setActiveFX] =
    useState(DEFAULTS.activeFX);

  const [lutIntensity, setLutIntensity] =
    useState(DEFAULTS.lutIntensity);

  const [fxIntensity, setFxIntensity] =
    useState(DEFAULTS.fxIntensity);

  /*
   * ============================================================
   * CENTRAL FILTER EVENT
   * ============================================================
   *
   * Every filter change goes through this one function.
   *
   * The actual camera/video processor should listen for:
   *
   * window.addEventListener(
   *   'mpade-video-filter',
   *   handler
   * );
   *
   */

  const updateStreamFX = useCallback(
    (type, key, value) => {
      if (
        typeof window === 'undefined'
      ) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent(
          'mpade-video-filter',
          {
            detail: {
              streamId:
                streamId || null,
              type,
              key,
              value
            }
          }
        )
      );
    },
    [streamId]
  );

  /*
   * ============================================================
   * BEAUTY CONTROL
   * ============================================================
   */

  const updateBeauty = (
    key,
    value,
    setter
  ) => {
    const numericValue =
      Number(value);

    setter(numericValue);

    updateStreamFX(
      'beauty',
      key,
      numericValue
    );
  };

  /*
   * ============================================================
   * LUT
   * ============================================================
   */

  const handleLUTToggle = (
    lutName
  ) => {
    const nextLUT =
      activeLUT === lutName
        ? 'none'
        : lutName;

    setActiveLUT(nextLUT);

    updateStreamFX(
      'lut',
      'preset',
      nextLUT
    );

    updateStreamFX(
      'lut',
      'intensity',
      nextLUT === 'none'
        ? 0
        : lutIntensity
    );
  };

  const handleLUTIntensity = (
    value
  ) => {
    const numericValue =
      Number(value);

    setLutIntensity(
      numericValue
    );

    updateStreamFX(
      'lut',
      'intensity',
      numericValue
    );
  };

  /*
   * ============================================================
   * STYLIZED FX
   * ============================================================
   */

  const handleFXToggle = (
    fxName
  ) => {
    const nextFX =
      activeFX === fxName
        ? 'none'
        : fxName;

    setActiveFX(nextFX);

    updateStreamFX(
      'fx',
      'preset',
      nextFX
    );

    updateStreamFX(
      'fx',
      'intensity',
      nextFX === 'none'
        ? 0
        : fxIntensity
    );
  };

  const handleFXIntensity = (
    value
  ) => {
    const numericValue =
      Number(value);

    setFxIntensity(
      numericValue
    );

    updateStreamFX(
      'fx',
      'intensity',
      numericValue
    );
  };

  /*
   * ============================================================
   * RESET EVERYTHING
   * ============================================================
   */

  const resetAllFilters =
    () => {
      setSmoothing(
        DEFAULTS.smoothing
      );

      setJawline(
        DEFAULTS.jawline
      );

      setEyeSize(
        DEFAULTS.eyeSize
      );

      setFaceSlim(
        DEFAULTS.faceSlim
      );

      setActiveLUT(
        DEFAULTS.activeLUT
      );

      setActiveFX(
        DEFAULTS.activeFX
      );

      setLutIntensity(
        DEFAULTS.lutIntensity
      );

      setFxIntensity(
        DEFAULTS.fxIntensity
      );

      updateStreamFX(
        'reset',
        'all',
        true
      );
    };

  /*
   * ============================================================
   * KEEP PROCESSOR SYNCHRONIZED
   * ============================================================
   *
   * This sends the initial state when the component mounts.
   */

  useEffect(() => {
    updateStreamFX(
      'beauty',
      'smoothing',
      smoothing
    );

    updateStreamFX(
      'beauty',
      'jawline',
      jawline
    );

    updateStreamFX(
      'beauty',
      'eyes',
      eyeSize
    );

    updateStreamFX(
      'beauty',
      'slim',
      faceSlim
    );

    updateStreamFX(
      'lut',
      'preset',
      activeLUT
    );

    updateStreamFX(
      'lut',
      'intensity',
      activeLUT === 'none'
        ? 0
        : lutIntensity
    );

    updateStreamFX(
      'fx',
      'preset',
      activeFX
    );

    updateStreamFX(
      'fx',
      'intensity',
      activeFX === 'none'
        ? 0
        : fxIntensity
    );
  }, []);

  /*
   * ============================================================
   * SMALL UI COMPONENTS
   * ============================================================
   */

  const RangeControl = ({
    icon: Icon,
    iconClass,
    label,
    value,
    suffix = '',
    max = 5,
    onChange
  }) => (
    <div
      className="
        rounded-xl
        border
        border-white/8
        bg-white/[0.035]
        p-3
      "
    >
      <div
        className="
          mb-2
          flex
          items-center
          justify-between
          gap-2
        "
      >
        <div
          className="
            flex
            min-w-0
            items-center
            gap-2
          "
        >
          <Icon
            size={14}
            className={`
              shrink-0
              ${iconClass}
            `}
          />

          <span
            className="
              truncate
              text-[11px]
              font-medium
              text-zinc-300
            "
          >
            {label}
          </span>
        </div>

        <span
          className="
            shrink-0
            rounded-md
            bg-white/5
            px-1.5
            py-0.5
            text-[9px]
            font-bold
            text-cyan-400
          "
        >
          {value}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min="0"
        max={max}
        step="1"
        value={value}
        onChange={e =>
          onChange(
            e.target.value
          )
        }
        className="
          h-1
          w-full
          cursor-pointer
          appearance-none
          rounded-full
          bg-zinc-800
          accent-cyan-400
        "
      />
    </div>
  );

  const FilterButton = ({
    icon: Icon,
    label,
    active,
    activeClass = '',
    onClick
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        flex
        min-h-[44px]
        w-full
        items-center
        justify-between
        gap-3
        rounded-xl
        border
        px-3
        transition-all
        duration-200
        ${
          active
            ? activeClass
            : `
              border-white/8
              bg-white/[0.035]
              text-zinc-300
              hover:border-white/15
              hover:bg-white/[0.07]
              hover:text-white
            `
        }
      `}
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-2
        "
      >
        <Icon
          size={14}
          className="
            shrink-0
          "
        />

        <span
          className="
            truncate
            text-left
            text-[10px]
            font-medium
            sm:text-[11px]
          "
        >
          {label}
        </span>
      </div>

      <span
        className="
          shrink-0
          text-[8px]
          font-bold
          uppercase
          tracking-wider
          opacity-70
        "
      >
        {active
          ? 'Active'
          : 'Off'}
      </span>
    </button>
  );

  return (
    <div
      className="
        flex
        max-h-[calc(100vh-100px)]
        flex-col
        overflow-y-auto
        pr-1
        custom-scrollbar
      "
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div
        className="
          sticky
          top-0
          z-10
          mb-4
          flex
          items-center
          justify-between
          border-b
          border-white/5
          bg-zinc-950/95
          pb-3
          backdrop-blur-xl
        "
      >
        <button
          type="button"
          onClick={onBack}
          className="
            flex
            items-center
            gap-1.5
            text-[10px]
            font-medium
            text-zinc-400
            transition
            hover:text-white
          "
        >
          <ArrowLeft
            size={14}
          />

          Back to Menu
        </button>

        <button
          type="button"
          onClick={
            resetAllFilters
          }
          className="
            flex
            items-center
            gap-1.5
            rounded-lg
            border
            border-white/10
            bg-white/5
            px-2.5
            py-1.5
            text-[9px]
            font-semibold
            text-zinc-400
            transition
            hover:bg-white/10
            hover:text-white
          "
        >
          <RotateCcw
            size={11}
          />

          Reset
        </button>
      </div>

      {/* ======================================================
          REAL-TIME PROCESSING STATUS
      ====================================================== */}

      <div
        className="
          mb-4
          flex
          items-center
          gap-3
          rounded-xl
          border
          border-cyan-500/15
          bg-cyan-500/[0.04]
          p-3
        "
      >
        <div
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-cyan-400/10
            text-cyan-400
          "
        >
          <ScanFace
            size={16}
          />
        </div>

        <div
          className="
            min-w-0
          "
        >
          <p
            className="
              text-[10px]
              font-bold
              text-white
            "
          >
            Live Video Processing
          </p>

          <p
            className="
              mt-0.5
              text-[8px]
              leading-relaxed
              text-zinc-500
            "
          >
            Effects are sent directly to
            the active video processor.
          </p>
        </div>

        <span
          className="
            ml-auto
            h-1.5
            w-1.5
            shrink-0
            animate-pulse
            rounded-full
            bg-emerald-400
          "
        />
      </div>

      {/* ======================================================
          BEAUTY / FACE
      ====================================================== */}

      <section
        className="
          mb-5
          space-y-2
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            px-1
          "
        >
          <Wand2
            size={13}
            className="text-cyan-400"
          />

          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              text-zinc-400
            "
          >
            Face & Beauty
          </p>
        </div>

        <RangeControl
          icon={Sparkles}
          iconClass="text-amber-400"
          label="Skin Smoothing"
          value={smoothing}
          suffix="/5"
          onChange={value =>
            updateBeauty(
              'smoothing',
              value,
              setSmoothing
            )
          }
        />

        <RangeControl
          icon={Smile}
          iconClass="text-purple-400"
          label="Jawline Definition"
          value={jawline}
          suffix="/5"
          onChange={value =>
            updateBeauty(
              'jawline',
              value,
              setJawline
            )
          }
        />

        <RangeControl
          icon={Eye}
          iconClass="text-emerald-400"
          label="Eye Enhancement"
          value={eyeSize}
          suffix="/5"
          onChange={value =>
            updateBeauty(
              'eyes',
              value,
              setEyeSize
            )
          }
        />

        <RangeControl
          icon={User}
          iconClass="text-blue-400"
          label="Face Slimming"
          value={faceSlim}
          suffix="/5"
          onChange={value =>
            updateBeauty(
              'slim',
              value,
              setFaceSlim
            )
          }
        />
      </section>

      {/* ======================================================
          CINEMATIC
      ====================================================== */}

      <section
        className="
          mb-5
          space-y-2
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            px-1
          "
        >
          <Film
            size={13}
            className="text-amber-400"
          />

          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              text-zinc-400
            "
          >
            Cinematic Grading
          </p>
        </div>

        <FilterButton
          icon={Film}
          label="1990s Retro Vintage"
          active={
            activeLUT ===
            'retro'
          }
          activeClass="
            border-amber-400/30
            bg-amber-400/10
            text-amber-300
          "
          onClick={() =>
            handleLUTToggle(
              'retro'
            )
          }
        />

        <FilterButton
          icon={Sliders}
          label="Cyberpunk Neon Dusk"
          active={
            activeLUT ===
            'cyberpunk'
          }
          activeClass="
            border-purple-400/30
            bg-purple-400/10
            text-purple-300
          "
          onClick={() =>
            handleLUTToggle(
              'cyberpunk'
            )
          }
        />

        <FilterButton
          icon={Moon}
          label="Deep Charcoal Noir"
          active={
            activeLUT ===
            'noir'
          }
          activeClass="
            border-zinc-300/20
            bg-white/10
            text-white
          "
          onClick={() =>
            handleLUTToggle(
              'noir'
            )
          }
        />

        <FilterButton
          icon={Sun}
          label="Sunkissed Golden Hour"
          active={
            activeLUT ===
            'golden'
          }
          activeClass="
            border-yellow-400/30
            bg-yellow-400/10
            text-yellow-300
          "
          onClick={() =>
            handleLUTToggle(
              'golden'
            )
          }
        />

        <FilterButton
          icon={Sparkles}
          label="Vibrant Tropic Flare"
          active={
            activeLUT ===
            'tropic'
          }
          activeClass="
            border-emerald-400/30
            bg-emerald-400/10
            text-emerald-300
          "
          onClick={() =>
            handleLUTToggle(
              'tropic'
            )
          }
        />

        {/* LUT INTENSITY */}

        {activeLUT !==
          'none' && (
          <div
            className="
              rounded-xl
              border
              border-white/8
              bg-white/[0.025]
              p-3
            "
          >
            <div
              className="
                mb-2
                flex
                items-center
                justify-between
              "
            >
              <span
                className="
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-wider
                  text-zinc-500
                "
              >
                Filter Intensity
              </span>

              <span
                className="
                  text-[9px]
                  font-bold
                  text-cyan-400
                "
              >
                {lutIntensity}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={
                lutIntensity
              }
              onChange={e =>
                handleLUTIntensity(
                  e.target.value
                )
              }
              className="
                h-1
                w-full
                cursor-pointer
                appearance-none
                rounded-full
                bg-zinc-800
                accent-cyan-400
              "
            />
          </div>
        )}
      </section>

      {/* ======================================================
          STYLIZED FX
      ====================================================== */}

      <section
        className="
          space-y-2
          pb-5
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
            px-1
          "
        >
          <Zap
            size={13}
            className="text-purple-400"
          />

          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              text-zinc-400
            "
          >
            Stylized Effects
          </p>
        </div>

        <FilterButton
          icon={Zap}
          label="Analog VHS"
          active={
            activeFX ===
            'vhs'
          }
          activeClass="
            border-cyan-400/30
            bg-cyan-400/10
            text-cyan-300
          "
          onClick={() =>
            handleFXToggle(
              'vhs'
            )
          }
        />

        <FilterButton
          icon={Maximize}
          label="Comic Outline Ink"
          active={
            activeFX ===
            'manga'
          }
          activeClass="
            border-white/20
            bg-white/10
            text-white
          "
          onClick={() =>
            handleFXToggle(
              'manga'
            )
          }
        />

        <FilterButton
          icon={Contrast}
          label="Infrared Vision"
          active={
            activeFX ===
            'thermal'
          }
          activeClass="
            border-red-400/30
            bg-red-400/10
            text-red-300
          "
          onClick={() =>
            handleFXToggle(
              'thermal'
            )
          }
        />

        {/* FX INTENSITY */}

        {activeFX !==
          'none' && (
          <div
            className="
              rounded-xl
              border
              border-white/8
              bg-white/[0.025]
              p-3
            "
          >
            <div
              className="
                mb-2
                flex
                items-center
                justify-between
              "
            >
              <span
                className="
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-wider
                  text-zinc-500
                "
              >
                Effect Intensity
              </span>

              <span
                className="
                  text-[9px]
                  font-bold
                  text-purple-400
                "
              >
                {fxIntensity}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={
                fxIntensity
              }
              onChange={e =>
                handleFXIntensity(
                  e.target.value
                )
              }
              className="
                h-1
                w-full
                cursor-pointer
                appearance-none
                rounded-full
                bg-zinc-800
                accent-purple-400
              "
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default AIFilters;
