import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
// Fixed: Changed userX to UserX (PascalCase)
import { AlertCircle, CheckCircle, UserX, Clock, ShieldAlert, Flag } from 'lucide-react';

const ReportsPanel = ({ streamId }) => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      const { data } = await supabase
        .from('stream_reports')
        .select('*')
        .eq('stream_id', streamId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setReports(data || []);
    };

    fetchReports();

    // Real-time subscription for new reports
    const sub = supabase
      .channel('mod-reports')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'stream_reports',
        filter: `stream_id=eq.${streamId}` 
      }, fetchReports)
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [streamId]);

  const resolveReport = async (reportId) => {
    await supabase
      .from('stream_reports')
      .update({ status: 'resolved' })
      .eq('id', reportId);
    setReports(reports.filter(r => r.id !== reportId));
  };

  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <ShieldAlert size={14} className="text-[#fe2c55]" />
          Universe Intelligence
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold text-zinc-500 uppercase">Live Queue</span>
          <span className="bg-[#fe2c55]/20 text-[#fe2c55] px-2.5 py-1 rounded-full text-[10px] font-black animate-pulse">
            {reports.length}
          </span>
        </div>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {reports.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center opacity-30">
            <CheckCircle size={32} className="mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">Universe Secured</p>
          </div>
        ) : (
          reports.map((report) => (
            <div 
              key={report.id} 
              className="group p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-[#fe2c55]/30 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-500/10 rounded-lg">
                    <Flag size={12} className="text-orange-500" />
                  </div>
                  <p className="text-[10px] font-black text-white uppercase tracking-tight">{report.reason}</p>
                </div>
                <span className="text-[8px] text-zinc-600 font-bold uppercase flex items-center gap-1">
                  <Clock size={10} /> {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <div className="bg-white/5 p-3 rounded-xl mb-4">
                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed italic">
                  "{report.details || "No additional context provided."}"
                </p>
              </div>

              <p className="text-[9px] text-zinc-500 font-bold uppercase mb-4 flex items-center gap-1">
                <span className="opacity-50">Target:</span> 
                <span className="text-zinc-300">@{report.reported_username || 'Anonymous'}</span>
              </p>

              <div className="flex gap-2">
                <button 
                  onClick={() => resolveReport(report.id)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border border-white/5"
                >
                  Dismiss
                </button>
                <button 
                  className="flex-1 bg-[#fe2c55]/10 hover:bg-[#fe2c55] text-[#fe2c55] hover:text-white py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-2"
                >
                  <UserX size={12} />
                  Strike User
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportsPanel;