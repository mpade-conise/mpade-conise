
// src/pages/Live/Shared/HostAnalytics.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import {
  Users,
  Home,
  DollarSign,
  ShieldCheck,
  Zap,
  BarChart2,
  Award,
  ArrowUpRight,
  Share2,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';

const HostAnalytics = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [topFans, setTopFans] = useState([]);
  const [newFollows, setNewFollows] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchUniverseData = async () => {
      if (!streamId) {
        if (!cancelled) {
          setErrorMessage('No stream ID was provided.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setErrorMessage('');

        /*
         * ---------------------------------------------------------
         * 1. LOAD STREAM ANALYTICS
         * ---------------------------------------------------------
         */
        const { data: ana, error: anaErr } = await supabase
          .from('stream_analytics')
          .select(`
            *,
            live_streams(*)
          `)
          .eq('stream_id', streamId)
          .maybeSingle();

        if (anaErr) {
          throw anaErr;
        }

        if (cancelled) return;

        const stream = ana?.live_streams;

        /*
         * ---------------------------------------------------------
         * 2. LOAD GIFT TRANSACTIONS
         * ---------------------------------------------------------
         */
        const { data: gifts, error: giftsErr } = await supabase
          .from('live_gifts')
          .select(`
            sender_id,
            price_total,
            profiles:sender_id(username)
          `)
          .eq('stream_id', streamId);

        if (giftsErr) {
          console.warn(
            '⚠️ [HostAnalytics] Gift analytics unavailable:',
            giftsErr.message
          );
        }

        if (!cancelled) {
          const aggregationMap = {};

          (gifts || []).forEach(row => {
            const senderId = row?.sender_id;

            if (!senderId) return;

            const username =
              row?.profiles?.username || 'anonymous';

            const rawValue = Number(row?.price_total);
            const value = Number.isFinite(rawValue)
              ? rawValue
              : 0;

            if (!aggregationMap[senderId]) {
              aggregationMap[senderId] = {
                sender_id: senderId,
                username,
                total: 0
              };
            }

            aggregationMap[senderId].total += value;
          });

          const sortedFans = Object.values(aggregationMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 4);

          setTopFans(sortedFans);
        }

        /*
         * ---------------------------------------------------------
         * 3. CALCULATE NEW FOLLOWERS
         * ---------------------------------------------------------
         */
        if (stream?.host_id && stream?.started_at) {
          const startDate = new Date(stream.started_at);

          const endDate = stream.ended_at
            ? new Date(stream.ended_at)
            : new Date();

          const validStart =
            !Number.isNaN(startDate.getTime());

          const validEnd =
            !Number.isNaN(endDate.getTime());

          if (validStart && validEnd) {
            const { count, error: followsErr } = await supabase
              .from('follows')
              .select('*', {
                count: 'exact',
                head: true
              })
              .eq('following_id', stream.host_id)
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString());

            if (followsErr) {
              console.warn(
                '⚠️ [HostAnalytics] Follow analytics unavailable:',
                followsErr.message
              );
            } else if (!cancelled) {
              setNewFollows(count || 0);
            }
          }
        }

        /*
         * ---------------------------------------------------------
         * 4. NORMALIZE ANALYTICS VALUES
         * ---------------------------------------------------------
         */
        const safeNumber = value => {
          const number = Number(value);
          return Number.isFinite(number) ? number : 0;
        };

        const finalViewers = safeNumber(ana?.final_viewers);
        const totalLikes = safeNumber(ana?.total_likes);
        const totalCoins = safeNumber(ana?.total_gifts_value);
        const peakViewers = safeNumber(ana?.peak_viewers);

        const rawEngagement =
          finalViewers > 0
            ? (totalLikes / finalViewers) * 10
            : 0;

        const engagement = Math.min(
          100,
          Math.max(0, rawEngagement)
        );

        if (!cancelled) {
          setStats({
            title:
              stream?.title ||
              'Untitled Session',

            viewers: finalViewers,

            coins: totalCoins,

            duration:
              ana?.duration ||
              '00:00:00',

            peak: peakViewers,

            likes: totalLikes,

            engagement: engagement.toFixed(1),

            startedAt: stream?.started_at || null,

            endedAt: stream?.ended_at || null
          });
        }
      } catch (err) {
        console.error(
          '❌ [HostAnalytics] Universe Sync Failed:',
          err
        );

        if (!cancelled) {
          setErrorMessage(
            err?.message ||
            'Unable to load stream analytics.'
          );

          setStats(null);
          setTopFans([]);
          setNewFollows(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUniverseData();

    return () => {
      cancelled = true;
    };
  }, [streamId]);

  /*
   * -------------------------------------------------------------
   * LOADING STATE
   * -------------------------------------------------------------
   */
  if (loading) {
    return (
      <div className="h-screen bg-[#020202] flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-2 border-[#fe2c55]/20 border-t-[#fe2c55] rounded-full animate-spin" />

          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#fe2c55] animate-pulse">
            MPADE
          </div>
        </div>
      </div>
    );
  }

  /*
   * -------------------------------------------------------------
   * ERROR / EMPTY STATE
   * -------------------------------------------------------------
   */
  if (!stats) {
    return (
      <div className="min-h-screen bg-[#050505] text-zinc-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[#fe2c55]/10 border border-[#fe2c55]/20 flex items-center justify-center">
            <BarChart2
              size={24}
              className="text-[#fe2c55]"
            />
          </div>

          <h1 className="text-xl font-black uppercase tracking-tight mb-2">
            Analytics Unavailable
          </h1>

          <p className="text-sm text-zinc-500 mb-6">
            {errorMessage ||
              'No analytics record was found for this stream.'}
          </p>

          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-2xl bg-[#fe2c55] hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  /*
   * -------------------------------------------------------------
   * REPORT
   * -------------------------------------------------------------
   */
  return (
    <div className="h-screen w-full bg-[#050505] text-zinc-100 font-sans selection:bg-[#fe2c55]/30 overflow-y-auto no-scrollbar">

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }

            .no-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `
        }}
      />

      {/* Decorative Blur Backdrops */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-[#fe2c55]/10 blur-[120px] pointer-events-none" />

      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-10 lg:px-12 relative z-10 flex flex-col min-h-screen">

        {/* Navigation Bar */}
        <nav className="flex justify-between items-center mb-12">

          <div className="flex items-center gap-4">

            <div className="w-10 h-10 bg-gradient-to-br from-[#fe2c55] to-[#ff6b81] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(254,44,85,0.4)]">
              <Zap
                size={20}
                fill="white"
              />
            </div>

            <div>
              <h2 className="text-xs font-black tracking-[0.3em] text-zinc-500 uppercase">
                Mpade Analytics
              </h2>

              <p className="text-[10px] font-mono text-zinc-600">
                SID_{streamId?.slice(0, 12)}
              </p>
            </div>

          </div>

          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl transition-all active:scale-95"
          >
            <Home
              size={16}
              className="group-hover:text-[#fe2c55] transition-colors"
            />

            <span className="text-[11px] font-bold uppercase tracking-widest">
              Exit
            </span>
          </button>

        </nav>

        {/* Content Header */}
        <header className="mb-10">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >

            <h1 className="text-5xl lg:text-7xl font-black italic tracking-tighter uppercase leading-[0.8] mb-6">
              Stream{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
                Summary.
              </span>
            </h1>

            <div className="flex flex-wrap gap-4 items-center">

              <span className="px-4 py-1.5 bg-[#fe2c55] text-white text-[10px] font-black uppercase rounded-full shadow-[0_0_15px_rgba(254,44,85,0.3)]">
                Ended
              </span>

              <p className="text-zinc-400 font-medium tracking-tight">
                Data report for{' '}
                <span className="text-white font-bold">
                  "{stats.title}"
                </span>
              </p>

              <div className="h-4 w-px bg-zinc-800 mx-2 hidden md:block" />

              <p className="text-zinc-500 text-xs font-mono">
                {new Date().toLocaleDateString()} •{' '}
                {stats.duration}
              </p>

            </div>

          </motion.div>

        </header>

        {/* Metrics Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">

          <StatCard
            label="Final Viewers"
            value={stats.viewers.toLocaleString()}
            icon={<Users />}
          />

          <StatCard
            label="Universe Coins"
            value={stats.coins.toLocaleString()}
            icon={<DollarSign />}
            color="text-yellow-400"
            glow="shadow-yellow-500/10"
          />

          <StatCard
            label="Peak Reach"
            value={stats.peak.toLocaleString()}
            icon={<BarChart2 />}
          />

          <StatCard
            label="Engagement"
            value={`${stats.engagement}%`}
            icon={<Zap />}
            color="text-[#fe2c55]"
          />

          {/* Audience Pulse */}
          <div className="lg:col-span-3 bg-zinc-900/20 border border-white/5 rounded-[40px] p-8 backdrop-blur-xl relative overflow-hidden flex flex-col">

            <div className="flex justify-between items-start mb-8">

              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">
                  Audience Pulse
                </h3>

                <p className="text-[10px] text-zinc-600 font-mono">
                  Session visualization
                </p>
              </div>

              <div className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-bold border border-white/5 italic">
                PEAK: {stats.peak.toLocaleString()}
              </div>

            </div>

            <div className="flex-grow flex items-end gap-2 md:gap-3 min-h-[200px]">

              {AUDIENCE_PULSE.map((height, index) => (
                <motion.div
                  key={`pulse-bar-${index}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{
                    delay: index * 0.03,
                    duration: 0.8,
                    ease: 'circOut'
                  }}
                  className="flex-1 group relative"
                >
                  <div className="w-full h-full bg-gradient-to-t from-[#fe2c55]/5 via-[#fe2c55]/30 to-[#fe2c55] rounded-t-xl group-hover:brightness-125 transition-all" />
                </motion.div>
              ))}

            </div>

            <div className="flex justify-between mt-6 text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em] border-t border-white/5 pt-4">
              <span>Start</span>
              <span>Peak Pulse</span>
              <span>Session End</span>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Top Gifters */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[32px] p-6 backdrop-blur-xl">

              <h3 className="text-[9px] font-black uppercase tracking-widest mb-6 flex items-center justify-between text-yellow-500">
                <span className="flex items-center gap-2">
                  <Award size={14} />
                  Top Gifters
                </span>
              </h3>

              <div className="space-y-4">

                {topFans.length === 0 ? (
                  <p className="text-zinc-600 text-[10px] italic py-2">
                    No gift totals logged.
                  </p>
                ) : (
                  topFans.map(fan => (
                    <div
                      key={fan.sender_id}
                      className="flex items-center justify-between group"
                    >
                      <span className="text-[10px] font-bold tracking-tight text-zinc-300">
                        @{fan.username}
                      </span>

                      <span className="text-[10px] font-mono font-black text-yellow-400">
                        {fan.total.toLocaleString()} 🪙
                      </span>
                    </div>
                  ))
                )}

              </div>
            </div>

            {/* Stream Health */}
            <div className="bg-[#fe2c55]/5 border border-[#fe2c55]/10 rounded-[32px] p-6">

              <div className="flex items-center gap-3 mb-4">

                <ShieldCheck
                  size={16}
                  className="text-[#fe2c55]"
                />

                <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  Stream Health & Growth
                </h3>

              </div>

              <div className="flex justify-between items-center">

                <p className="text-xl font-black italic text-zinc-100">
                  0 Flags
                </p>

                <p className="text-xs font-mono text-emerald-400 font-bold">
                  +{newFollows} Follows
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* Footer Action Pipeline */}
        <footer className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 mt-10 pt-8 pb-4">

          <ActionButton
            icon={<Download size={18} />}
            label="Export Report"
            primary
          />

          <ActionButton
            icon={<Share2 size={18} />}
            label="Share Statistics"
          />

          <ActionButton
            icon={<ArrowUpRight size={18} />}
            label="Review Replay"
          />

        </footer>

      </div>
    </div>
  );
};

/*
 * Decorative visualization only.
 *
 * These values are intentionally not presented as actual
 * viewer-history measurements because the current analytics
 * schema does not provide a pulse/time-series field here.
 */
const AUDIENCE_PULSE = [
  30,
  50,
  45,
  80,
  100,
  70,
  90,
  60,
  40,
  85,
  30
];

const StatCard = ({
  label,
  value,
  icon,
  color = 'text-white',
  glow = 'shadow-transparent'
}) => (
  <motion.div
    whileHover={{
      y: -4,
      borderColor: 'rgba(255,255,255,0.08)'
    }}
    className={`bg-zinc-900/40 border border-white/5 p-6 rounded-[32px] backdrop-blur-md transition-all ${glow}`}
  >

    <div className="flex items-center justify-between mb-6">

      <div className="p-2 bg-white/5 rounded-xl text-zinc-400">
        {icon}
      </div>

      <div className="text-[7px] font-black text-[#fe2c55] bg-[#fe2c55]/10 px-2 py-0.5 rounded uppercase tracking-wider">
        Session
      </div>

    </div>

    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">
      {label}
    </p>

    <h4
      className={`text-4xl font-black italic tracking-tighter leading-none ${color}`}
    >
      {value}
    </h4>

  </motion.div>
);

const ActionButton = ({
  icon,
  label,
  primary = false
}) => (
  <button
    className={`
      flex items-center justify-center gap-3 py-5 rounded-2xl
      text-[10px] font-black uppercase tracking-[0.2em]
      transition-all active:scale-95
      ${
        primary
          ? 'bg-[#fe2c55] text-white shadow-[0_10px_30px_rgba(254,44,85,0.3)] hover:brightness-110'
          : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
      }
    `}
  >
    {icon}
    {label}
  </button>
);

export default HostAnalytics;
