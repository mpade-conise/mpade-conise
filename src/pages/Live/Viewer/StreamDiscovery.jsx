import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Play, Users, Radio } from 'lucide-react';
import { supabase } from '../../../supabaseClient'; 

const StreamDiscovery = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let realtimeChannel = null;

    // Helper function to fetch host metadata dynamically when a live event lands
    const fetchHostProfile = async (hostId) => {
      try {
        const { data, error } = await supabase
          .from('profiles') // Make sure this matches your profile table name
          .select('id, username, avatar_url')
          .eq('id', hostId)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error("⚠️ Failed to append real-time host profiles:", err.message);
        return { id: hostId, username: 'Universe Host', avatar_url: null };
      }
    };

    const fetchUserAndStreams = async () => {
      try {
        console.log("🛠️ Auth: Fetching user...");
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!isMounted) return;

        if (user) {
          console.log("✅ User Found:", user.id);
          setCurrentUserId(user.id);
        } else {
          console.warn("⚠️ No user logged in.");
        }

        console.log("🛠️ Supabase: Fetching initial live streams...");
        const { data, error } = await supabase
          .from('live_streams')
          .select('*, host:host_id(id, username, avatar_url)')
          .eq('status', 'live'); 

        if (error) throw error;
        
        if (isMounted) {
          console.log("📊 Initial streams loaded:", data);
          setStreams(data || []);
          setLoading(false);
        }

        // ==========================================
        // REAL-TIME SYNC SUBSCRIPTION LAYER
        // ==========================================
        console.log("📡 Turning on live room stream listening matrix...");
        realtimeChannel = supabase
          .channel('public-live-stream-feed')
          .on('postgres_changes', {
            event: '*', 
            schema: 'public',
            table: 'live_streams'
          }, async (payload) => {
            // FIX: Safely merge variable key variations between client engine updates
            const currentEvent = payload.event || payload.eventType;
            console.log(`📥 Realtime stream event captured [${currentEvent}]:`, payload);

            // 1. Handle New Broadcast Additions
            if (currentEvent === 'INSERT' && payload.new.status === 'live') {
              const profile = await fetchHostProfile(payload.new.host_id);
              const consolidatedStream = { ...payload.new, host: profile };
              
              if (isMounted) {
                setStreams((prev) => {
                  if (prev.some(s => s.id === payload.new.id)) return prev;
                  return [consolidatedStream, ...prev];
                });
              }
            }

            // 2. Handle State Transitions / Metadata Adjustments
            if (currentEvent === 'UPDATE') {
              if (payload.new.status !== 'live') {
                // Remove stream card seamlessly if status transitions to anything else
                if (isMounted) {
                  setStreams(prev => prev.filter(s => s.id === payload.new.id));
                }
              } else {
                // If stream details adapt but remain live, map changes while preserving the user profile object
                if (isMounted) {
                  setStreams(prev => prev.map(s => {
                    if (s.id === payload.new.id) {
                      return { ...s, ...payload.new, host: s.host };
                    }
                    return s;
                  }));
                }
              }
            }

            // 3. Handle Complete Table Row Removals
            if (currentEvent === 'DELETE') {
              const oldId = payload.old ? payload.old.id : null;
              if (isMounted && oldId) {
                setStreams(prev => prev.filter(s => s.id === oldId));
              }
            }
          })
          .subscribe();

      } catch (err) {
        if (isMounted) {
          console.error("❌ Universe Sync Error:", err.message);
          setLoading(false);
        }
      }
    };

    fetchUserAndStreams();

    return () => {
      isMounted = false;
      if (realtimeChannel) {
        console.log("🧹 Tearing down real-time grid stream listeners...");
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  const handleResume = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    const targetPath = `/live/dashboard/${id}`;
    console.log("🚀 RESUME BUTTON CLICKED");
    navigate(targetPath); 
  };

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-red-500 font-black animate-pulse tracking-widest uppercase text-xs italic">Synchronizing Universe...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <style>
        {`
          @keyframes universe-glow {
            0% { border-color: #ff0055; box-shadow: 0 0 15px #ff0055; }
            33% { border-color: #00f2ff; box-shadow: 0 0 15px #00f2ff; }
            66% { border-color: #7000ff; box-shadow: 0 0 15px #7000ff; }
            100% { border-color: #ff0055; box-shadow: 0 0 15px #ff0055; }
          }
          .neon-avatar-ring {
            border: 3px solid #ff0055;
            animation: universe-glow 4s linear infinite;
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.05);
          }
        `}
      </style>

      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-16 px-2">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-3 leading-none">
            <Radio className="text-red-600 animate-pulse" size={28} />
            UNIVERSE <span className="text-red-600">LIVE</span>
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-2">Discover active broadcasts</p>
        </div>
        
        <button 
          onClick={() => navigate('/live/go-live')}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
        >
          Go Live Now
        </button>
      </div>

      {/* STREAMS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-16 gap-x-8">
        {streams.length > 0 ? (
          streams.map((stream) => {
            const isHost = currentUserId === stream.host_id;

            return (
              <div key={stream.id} className="flex flex-col items-center group relative">
                {/* THE AVATAR / PREVIEW CIRCLE */}
                <div 
                  className="relative cursor-pointer z-10"
                  onClick={() => {
                     console.log("Viewing stream:", stream.id);
                     !isHost && navigate(`/live/watch/${stream.id}`);
                  }}
                >
                  <div className="w-24 h-24 rounded-full p-1 neon-avatar-ring flex items-center justify-center bg-zinc-900 transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-2">
                    <img 
                      src={stream.host?.avatar_url || 'https://via.placeholder.com/150'} 
                      alt="" 
                      className="w-full h-full rounded-full object-cover bg-black"
                    />
                  </div>
                  
                  {/* LIVE TAG */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 px-2.5 py-0.5 rounded-full border-2 border-black shadow-xl z-20">
                    <p className="text-[8px] font-black italic tracking-tighter">LIVE</p>
                  </div>
                </div>

                {/* INFO SECTION */}
                <div className="mt-8 text-center w-full px-2">
                  <h3 className="text-[11px] font-black uppercase truncate tracking-tight text-zinc-200">
                    {stream.host?.username || 'Universe Host'}
                  </h3>
                  
                  <div className="mt-3 flex justify-center">
                    {isHost ? (
                      <button 
                        type="button"
                        onClick={(e) => handleResume(e, stream.id)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-90"
                      >
                        <Play size={10} fill="currentColor" /> Resume
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card">
                         <Users size={10} className="text-red-500" />
                         <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tighter">Watching</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DECORATIVE BACKGROUND GLOW ON HOVER */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-600/10 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center gap-4 border border-white/5 rounded-[40px] bg-white/[0.02]">
             <Video size={48} className="text-zinc-800" />
             <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.3em]">No active dimensions found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamDiscovery;
