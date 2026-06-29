import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, BarChart3, TrendingUp, Loader2, Play, Heart, MessageCircle, Percent } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Studio = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [metrics, setMetrics] = useState({
    totalViews: 0,
    totalEngagement: 0,
    estimatedRevenue: 0,
    engagementRate: 0
  });

  useEffect(() => {
    const fetchStudioData = async () => {
      try {
        setLoading(true);
        // 1. Get authenticated creator identity
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Fetch all media rows belonging to this user
        const { data: userVideos, error } = await supabase
          .from('videos')
          .select('id, title, caption, video_url, views_count, likes_count, comments_count, favorites_count, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (userVideos && userVideos.length > 0) {
          setVideos(userVideos);

          // 3. Aggregate metrics safely across the matrix arrays
          let viewsSum = 0;
          let engagementSum = 0;

          userVideos.forEach(v => {
            const views = Number(v.views_count) || 0;
            const likes = Number(v.likes_count) || 0;
            const comments = Number(v.comments_count) || 0;
            const favorites = Number(v.favorites_count) || 0;

            viewsSum += views;
            engagementSum += (likes + comments + favorites);
          });

          // 4. Calculate payouts & mathematical ratios 
          // (Example rate logic: MK 5.00 per standard baseline video entry view)
          const payoutPerView = 5.00; 
          const calculatedRevenue = viewsSum * payoutPerView;
          const rate = viewsSum > 0 ? ((engagementSum / viewsSum) * 100).toFixed(1) : 0;

          setMetrics({
            totalViews: viewsSum,
            totalEngagement: engagementSum,
            estimatedRevenue: calculatedRevenue,
            engagementRate: rate
          });
        }
      } catch (err) {
        console.error("Studio analytics assembly crash:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStudioData();
  }, []);

  const handleWithdrawal = () => {
    if (metrics.estimatedRevenue <= 0) {
      alert("Insufficient funds. Keep uploading high-quality content to grow your universe balance!");
      return;
    }
    alert(`Processing payout request of MK ${metrics.estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} to your connected mobile wallet gateway.`);
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="animate-spin text-cyan-500" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Loading Creator Analytics...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white p-6 overflow-y-auto pb-24 select-none">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)} 
        className="mb-8 flex items-center gap-2 text-zinc-400 font-black uppercase text-[10px] tracking-widest active:opacity-50 transition-opacity"
      >
        <ChevronLeft size={18} /> Back to Profile
      </button>

      {/* Dynamic Balance Card */}
      <div className="bg-white text-black p-8 rounded-[2.5rem] mb-8 shadow-xl shadow-white/5 relative overflow-hidden">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Estimated Revenue</p>
        <h2 className="text-4xl font-black mt-1 italic tracking-tight">
          MK {metrics.estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        <button 
          onClick={handleWithdrawal}
          className="mt-6 w-full py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <CreditCard size={14} /> Withdraw via Mpamba / Airtel
        </button>
      </div>

      {/* Analytics Summary Matrices */}
      <h3 className="font-black uppercase italic text-sm mb-4 tracking-tighter">Performance Matrix</h3>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-6 bg-zinc-900 rounded-[2rem] border border-white/5 text-center">
          <BarChart3 className="mx-auto mb-2 text-cyan-400" size={20} />
          <p className="text-2xl font-black tracking-tight">{metrics.totalViews.toLocaleString()}</p>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mt-0.5">Video Views</p>
        </div>
        
        <div className="p-6 bg-zinc-900 rounded-[2rem] border border-white/5 text-center">
          <TrendingUp className="mx-auto mb-2 text-[#ff0050]" size={20} />
          <p className="text-2xl font-black tracking-tight">{metrics.totalEngagement.toLocaleString()}</p>
          <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest mt-0.5">Engagement</p>
        </div>

        {/* Dynamic Feature Addition: Conversion Conversion Rate */}
        <div className="p-6 bg-zinc-900 rounded-[2rem] border border-white/5 text-center col-span-2 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/10">
              <Percent size={18} />
            </div>
            <div className="text-left">
              <p className="text-sm font-black tracking-tight">{metrics.engagementRate}%</p>
              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Interaction Ratio</p>
            </div>
          </div>
          <span className="text-[9px] bg-white/5 text-zinc-400 font-bold px-3 py-1.5 rounded-full border border-white/5">
            {metrics.engagementRate > 15 ? 'Excellent' : 'Healthy'}
          </span>
        </div>
      </div>

      {/* Feature Addition: Individual Content Performance Lists */}
      <h3 className="font-black uppercase italic text-sm mb-4 tracking-tighter">Content Breakdown ({videos.length})</h3>
      <div className="space-y-3">
        {videos.length === 0 ? (
          <div className="p-8 bg-zinc-900 rounded-[2rem] text-center border border-white/5 text-zinc-500 text-xs font-bold uppercase tracking-wider">
            No videos uploaded yet.
          </div>
        ) : (
          videos.map((vid) => (
            <div key={vid.id} className="p-4 bg-zinc-900 border border-white/5 rounded-[1.5rem] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex-shrink-0 overflow-hidden relative border border-white/10">
                  <video src={vid.video_url} className="w-full h-full object-cover pointer-events-none" muted />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Play size={12} className="text-white fill-white" />
                  </div>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black text-zinc-100 truncate max-w-[180px]">
                    {vid.caption || 'Untitled Broadcast'}
                  </p>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight mt-0.5">
                    {new Date(vid.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right flex-shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-cyan-400">{Number(vid.views_count || 0).toLocaleString()}</span>
                  <span className="text-[7px] text-zinc-500 font-black uppercase tracking-tight">Views</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-[#ff0050]">
                    {(Number(vid.likes_count || 0) + Number(vid.comments_count || 0)).toLocaleString()}
                  </span>
                  <span className="text-[7px] text-zinc-500 font-black uppercase tracking-tight">Actions</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Studio;
