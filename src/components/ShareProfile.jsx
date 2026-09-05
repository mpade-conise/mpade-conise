import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Share2,
  Copy,
  Check,
  QrCode,
  Download,
  Globe,
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../supabaseClient';

const ShareProfile = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url, bio')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Profile fetch error:', error.message);
          } else {
            setProfile(data);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /*
   * IMPORTANT:
   * This is the exact URL encoded inside the QR code.
   *
   * Example:
   * https://yourdomain.com/u/mpade
   *
   * Scanning the QR therefore opens the owner's profile directly.
   */
  const shareUrl = profile?.username
    ? `${window.location.origin}/u/${encodeURIComponent(profile.username)}`
    : '';

  const copyToClipboard = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Connect with ${profile?.full_name || profile?.username} on Mpade Universe`,
          text: `Check out my profile on Mpade Universe.`,
          url: shareUrl
        });
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.log('Share failed', err);
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const downloadQR = () => {
    if (!profile?.username || !shareUrl) return;

    try {
      setDownloading(true);

      const svg = document.getElementById('universe-profile-qr');

      if (!svg) {
        console.error('QR code element not found');
        return;
      }

      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);

      const blob = new Blob(
        [source],
        { type: 'image/svg+xml;charset=utf-8' }
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${profile.username}-universe-qr.svg`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('QR download failed:', error);
    } finally {
      setTimeout(() => {
        setDownloading(false);
      }, 600);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#050505] text-white flex flex-col items-center justify-center">

        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />

          <div className="relative w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center">
            <QrCode
              size={22}
              className="text-cyan-400"
            />
          </div>
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
          Preparing your profile
        </p>

      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050505] text-white font-sans overflow-y-auto">

      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">

        <div className="absolute -top-40 -left-40 w-[420px] h-[420px] rounded-full bg-cyan-500/[0.08] blur-[130px]" />

        <div className="absolute top-[35%] -right-40 w-[420px] h-[420px] rounded-full bg-violet-500/[0.07] blur-[140px]" />

        <div className="absolute -bottom-40 left-[25%] w-[420px] h-[320px] rounded-full bg-blue-500/[0.05] blur-[130px]" />

      </div>

      {/* PAGE */}
      <div className="relative z-10 min-h-full max-w-xl mx-auto px-4 sm:px-6 py-5 pb-10">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-7">

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate(-1)}
            className="
              w-10 h-10
              rounded-xl
              flex items-center justify-center
              bg-white/[0.04]
              border border-white/[0.08]
              text-zinc-300
              hover:text-white
              hover:bg-white/[0.07]
              transition-all
            "
            aria-label="Go back"
          >
            <ChevronLeft size={21} />
          </motion.button>

          <div className="text-center">

            <div className="flex items-center justify-center gap-2">
              <QrCode
                size={14}
                className="text-cyan-400"
              />

              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                Share Profile
              </span>
            </div>

            <p className="text-[9px] text-zinc-600 mt-1">
              Your personal Universe link
            </p>

          </div>

          <div className="w-10" />

        </header>

        {/* PROFILE CARD */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative"
        >

          {/* subtle glow */}
          <div className="absolute -inset-[1px] rounded-[28px] bg-gradient-to-b from-cyan-400/20 via-transparent to-violet-500/10 blur-sm" />

          <div className="
            relative
            rounded-[28px]
            border border-white/[0.08]
            bg-[#0a0a0a]/90
            backdrop-blur-2xl
            overflow-hidden
          ">

            {/* CARD TOP */}
            <div className="relative px-6 pt-7 pb-6">

              {/* decorative icon */}
              <div className="absolute top-5 right-5 w-10 h-10 rounded-xl bg-white/[0.035] border border-white/[0.06] flex items-center justify-center">
                <Globe
                  size={18}
                  className="text-cyan-400/40"
                />
              </div>

              {/* AVATAR */}
              <div className="flex justify-center">

                <div className="relative">

                  <div className="absolute -inset-1.5 rounded-[25px] bg-gradient-to-br from-cyan-400/50 via-blue-500/20 to-violet-500/50 blur-md" />

                  <div className="
                    relative
                    w-24 h-24
                    rounded-[23px]
                    p-[2px]
                    bg-gradient-to-br
                    from-cyan-400
                    via-blue-500
                    to-violet-500
                  ">

                    <div className="w-full h-full rounded-[21px] bg-[#080808] p-[3px]">

                      <img
                        src={
                          profile?.avatar_url ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'Universe'}`
                        }
                        className="w-full h-full rounded-[18px] object-cover"
                        alt={profile?.full_name || 'Profile'}
                      />

                    </div>

                  </div>

                </div>

              </div>

              {/* NAME */}
              <div className="text-center mt-5">

                <h1 className="text-xl font-semibold tracking-tight">
                  {profile?.full_name || 'Universe Member'}
                </h1>

                <p className="text-sm text-cyan-400 mt-1">
                  @{profile?.username || 'user'}
                </p>

                <p className="text-xs text-zinc-500 leading-relaxed max-w-[280px] mx-auto mt-3">
                  {profile?.bio ||
                    'Exploring the Mpade Universe ecosystem.'}
                </p>

              </div>

              {/* PROFILE URL */}
              {shareUrl && (
                <div className="mt-5 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.035] border border-white/[0.06]">

                  <Globe
                    size={13}
                    className="text-zinc-600 shrink-0"
                  />

                  <span className="text-[10px] text-zinc-500 truncate flex-1">
                    {shareUrl}
                  </span>

                  <ExternalLink
                    size={12}
                    className="text-zinc-700 shrink-0"
                  />

                </div>
              )}

            </div>

            {/* QR SECTION */}
            <div className="border-t border-white/[0.06] px-6 py-7">

              <div className="text-center mb-5">

                <div className="flex items-center justify-center gap-2 mb-1">

                  <QrCode
                    size={15}
                    className="text-cyan-400"
                  />

                  <h2 className="text-sm font-semibold">
                    Scan to view profile
                  </h2>

                </div>

                <p className="text-[10px] text-zinc-600">
                  Anyone who scans this code will be taken directly to your profile.
                </p>

              </div>

              {/* QR CODE */}
              <div className="flex justify-center">

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="
                    relative
                    p-4
                    rounded-[22px]
                    bg-white
                    shadow-[0_15px_50px_rgba(0,0,0,0.45)]
                  "
                >

                  {/* QR glow */}
                  <div className="absolute -inset-2 rounded-[26px] bg-cyan-400/10 blur-xl -z-10" />

                  {shareUrl && (
                    <QRCodeSVG
                      id="universe-profile-qr"
                      value={shareUrl}
                      size={190}
                      bgColor="#ffffff"
                      fgColor="#080808"
                      level="H"
                      includeMargin={false}
                    />
                  )}

                </motion.div>

              </div>

              {/* QR URL CONFIRMATION */}
              <div className="mt-5 flex justify-center">

                <div className="
                  inline-flex
                  items-center
                  gap-2
                  px-3
                  py-2
                  rounded-full
                  bg-emerald-400/[0.06]
                  border border-emerald-400/[0.12]
                ">

                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />

                  <span className="text-[9px] uppercase tracking-[0.15em] font-semibold text-emerald-400">
                    Direct profile link
                  </span>

                </div>

              </div>

            </div>

          </div>

        </motion.section>

        {/* ACTIONS */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid grid-cols-3 gap-2.5 mt-4"
        >

          {/* COPY */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={copyToClipboard}
            className="
              min-h-[82px]
              rounded-2xl
              bg-white/[0.035]
              border border-white/[0.07]
              hover:bg-white/[0.06]
              hover:border-white/[0.12]
              flex flex-col
              items-center
              justify-center
              gap-2
              transition-all
            "
          >

            <div className="
              w-9 h-9
              rounded-xl
              bg-cyan-400/[0.08]
              border border-cyan-400/[0.12]
              flex items-center justify-center
            ">
              {copied ? (
                <Check
                  size={17}
                  className="text-emerald-400"
                />
              ) : (
                <Copy
                  size={17}
                  className="text-cyan-400"
                />
              )}
            </div>

            <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400">
              {copied ? 'Copied' : 'Copy'}
            </span>

          </motion.button>

          {/* SHARE */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleNativeShare}
            className="
              min-h-[82px]
              rounded-2xl
              bg-white/[0.035]
              border border-white/[0.07]
              hover:bg-white/[0.06]
              hover:border-white/[0.12]
              flex flex-col
              items-center
              justify-center
              gap-2
              transition-all
            "
          >

            <div className="
              w-9 h-9
              rounded-xl
              bg-violet-400/[0.08]
              border border-violet-400/[0.12]
              flex items-center justify-center
            ">

              <Share2
                size={17}
                className="text-violet-400"
              />

            </div>

            <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400">
              Share
            </span>

          </motion.button>

          {/* DOWNLOAD */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={downloadQR}
            disabled={downloading}
            className="
              min-h-[82px]
              rounded-2xl
              bg-white/[0.035]
              border border-white/[0.07]
              hover:bg-white/[0.06]
              hover:border-white/[0.12]
              flex flex-col
              items-center
              justify-center
              gap-2
              transition-all
              disabled:opacity-50
            "
          >

            <div className="
              w-9 h-9
              rounded-xl
              bg-emerald-400/[0.08]
              border border-emerald-400/[0.12]
              flex items-center justify-center
            ">

              {downloading ? (
                <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              ) : (
                <Download
                  size={17}
                  className="text-emerald-400"
                />
              )}

            </div>

            <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400">
              QR Code
            </span>

          </motion.button>

        </motion.div>

        {/* FOOTER INFO */}
        <div className="mt-6 text-center">

          <div className="inline-flex items-center gap-2 text-zinc-700">

            <div className="w-8 h-px bg-white/[0.06]" />

            <span className="text-[8px] uppercase tracking-[0.2em]">
              Mpade Universe
            </span>

            <div className="w-8 h-px bg-white/[0.06]" />

          </div>

          <p className="text-[9px] text-zinc-700 mt-2">
            Share your identity. Connect with your Universe.
          </p>

        </div>

      </div>

      {/* COPY TOAST */}
      <AnimatePresence>

        {copied && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.95
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.95
            }}
            className="
              fixed
              bottom-7
              left-1/2
              -translate-x-1/2
              z-[100]
              px-4
              py-2.5
              rounded-full
              bg-white
              text-black
              shadow-2xl
              flex
              items-center
              gap-2
              whitespace-nowrap
            "
          >

            <Check
              size={14}
              className="text-emerald-500"
            />

            <span className="text-[10px] font-bold">
              Profile link copied
            </span>

          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};

export default ShareProfile;
