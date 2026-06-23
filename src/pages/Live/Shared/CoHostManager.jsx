import React, { useEffect, useState } from 'react';
import { ArrowLeft, Users, UserPlus, Layers, ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

const CoHostManager = ({ streamId, currentCoHosts, socket, onBack, onDropUser, onDropAll }) => {
  const [activeCreators, setActiveCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all active live hosts on Mpade platform
  useEffect(() => {
    const fetchLiveCreators = async () => {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select('*, host:host_id(username, avatar_url)')
          .eq('status', 'live')
          .not('id', 'eq', streamId); // Don't show myself

        if (!error && data) {
          setActiveCreators(data);
        }
      } catch (err) {
        console.error("Error checking live creators:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveCreators();
    const interval = setInterval(fetchLiveCreators, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [streamId]);

  const handleAction = (creatorStream) => {
    if (!socket) return;

    // Check if they already have co-hosts attached (Dynamic Array structure check)
    const currentGroupSize = creatorStream.co_host_ids ? creatorStream.co_host_ids.length : 0;

    if (currentGroupSize > 0) {
      // SCENARIO B: Host is already co-hosting -> Send a request to JOIN their active session
      socket.emit('send_join_group_request', {
        targetStreamId: creatorStream.id,
        senderStreamId: streamId
      });
      alert(`Request sent to join @${creatorStream.host?.username}'s active group panel!`);
    } else {
      // SCENARIO A: Host is completely alone -> Send a standard invite to form a co-host link
      socket.emit('send_cohost_invite', {
        targetStreamId: creatorStream.id,
        senderStreamId: streamId
      });
      alert(`Direct invitation transmitted to @${creatorStream.host?.username}`);
    }
  };

  return (
    <div className="space-y-4 p-4 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar text-white">
      <button onClick={onBack} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={14} /> Back to Dashboard
      </button>

      {/* ACTIVE MANAGED LIVE PANEL SQUAD */}
      {currentCoHosts.length > 0 && (
        <div className="space-y-2 p-3 bg-white/5 rounded-xl border border-white/5">
          <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
            <Users size={12} className="text-cyan-400" /> Active Panel Squad ({currentCoHosts.length + 1}/4)
          </p>
          <div className="space-y-2 pt-1">
            {currentCoHosts.map((peer) => (
              <div key={peer.id} className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-white/5">
                <span className="text-xs text-zinc-200">@{peer.username}</span>
                <button 
                  onClick={() => onDropUser(peer.id)}
                  className="text-[10px] bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 px-2 py-1 rounded-md text-red-400 transition-all font-bold"
                >
                  Drop
                </button>
              </div>
            ))}
            <button 
              onClick={onDropAll}
              className="w-full mt-1 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
            >
              <LogOut size={12} /> Drop All Co-Hosts
            </button>
          </div>
        </div>
      )}

      {/* LIVE DISCOVERY HUB */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Discover Live Creators</p>
        
        {loading ? (
          <div className="text-xs text-zinc-500 animate-pulse py-4 text-center">Searching active nodes...</div>
        ) : activeCreators.length === 0 ? (
          <div className="text-xs text-zinc-600 py-4 text-center italic">No other solo or grouped hosts active right now.</div>
        ) : (
          <div className="space-y-2">
            {activeCreators.map((creator) => {
              const groupCount = creator.co_host_ids ? creator.co_host_ids.length : 0;
              const isGrouped = groupCount > 0;
              const isFull = groupCount >= 3; // Host + 3 co-hosts maxes out at 4 panels

              return (
                <div key={creator.id} className="p-3 bg-zinc-900/50 rounded-xl border border-white/5 flex items-center justify-between transition-all hover:border-white/10">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-zinc-100">@{creator.host?.username || 'Unknown Creator'}</p>
                    <p className="text-[9px] text-zinc-400 flex items-center gap-1">
                      <Layers size={10} className={isGrouped ? "text-purple-400" : "text-emerald-400"} />
                      {isGrouped ? `Co-hosted Group (${groupCount + 1}/4)` : 'Solo Host (Open Link)'}
                    </p>
                  </div>

                  <button
                    disabled={isFull}
                    onClick={() => handleAction(creator)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1 ${
                      isFull 
                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                        : isGrouped 
                          ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white'
                          : 'bg-cyan-500 text-black hover:bg-cyan-400'
                    }`}
                  >
                    <UserPlus size={12} />
                    {isFull ? 'Panel Full' : isGrouped ? 'Request Join' : 'Invite'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoHostManager;
