"use client";

import { useEffect, useState } from "react";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";

export const DebugPanel = () => {
  const [data, setData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lastApi, setLastApi] = useState<any>(null);

  useEffect(() => {
    const fetchDebug = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
      const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      
      const host = SUPABASE_URL ? new URL(SUPABASE_URL).hostname : 'Unknown';

      setData({
        url: host,
        userId: user.id,
        email: user.email,
        profileExists: !!profile,
        counts: { classes: classCount || 0 }
      });
    };

    if (isOpen) {
        fetchDebug();
        // Capture last AI response from window global
        setLastApi((window as any).__LAST_AI_DEBUG__ || null);
    }
  }, [isOpen]);

  const isPreview = window.location.hostname.includes('dyad') || window.location.hostname === 'localhost';
  if (!isPreview) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] no-print">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black text-white px-3 py-1 rounded text-[10px] font-black opacity-30 hover:opacity-100 transition-opacity border border-white/20 shadow-lg"
      >
        {isOpen ? "CLOSE AUDIT" : "SYSTEM AUDIT"}
      </button>
      
      {isOpen && data && (
        <div className="mt-2 p-4 bg-black/95 text-green-400 rounded-xl shadow-2xl border border-green-900/50 text-[10px] font-mono min-w-[320px] max-w-md animate-in fade-in slide-in-from-bottom-2 overflow-hidden">
           <div className="flex justify-between items-center mb-3 border-b border-green-900 pb-1">
                <p className="font-black text-white">ENVIRONMENT & AUTH</p>
                <span className="text-[8px] px-1 bg-green-900/50 rounded">PREVIEW_MODE</span>
           </div>
           
           <div className="space-y-1 mb-4">
                <p><span className="text-white/60">SUPABASE_HOST:</span> {data.url}</p>
                <p><span className="text-white/60">USER_ID:</span> <span className="text-[9px]">{data.userId}</span></p>
                <p><span className="text-white/60">EMAIL:</span> {data.email}</p>
                <p><span className="text-white/60">PROFILE:</span> {data.profileExists ? "CONNECTED" : "ORPHANED"}</p>
           </div>

           <div className="flex justify-between items-center mb-2 border-b border-green-900 pb-1">
                <p className="font-black text-white">LAST EDGE CALL (gemini-ai)</p>
           </div>

           {lastApi ? (
               <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <p><span className="text-white/60">ACTION:</span> {lastApi.action}</p>
                        <p><span className="text-white/60">STATUS:</span> <span className={lastApi.status === 200 ? 'text-green-400' : 'text-red-400 font-bold'}>{lastApi.status}</span></p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-white/60">RAW JSON RESPONSE:</p>
                        <div className="bg-black border border-green-900/30 p-2 rounded max-h-40 overflow-y-auto whitespace-pre-wrap text-[9px] leading-tight text-green-300/80">
                            {JSON.stringify(lastApi.json, null, 2)}
                        </div>
                    </div>
               </div>
           ) : (
               <p className="text-white/30 italic py-4 text-center">No AI calls recorded this session.</p>
           )}

           <div className="mt-4 pt-2 border-t border-green-900 flex justify-between text-[8px] text-green-700 font-bold">
               <span>DYAD INFRASTRUCTURE AUDIT</span>
               <button onClick={() => window.location.reload()} className="hover:text-white underline">FORCE RELOAD</button>
           </div>
        </div>
      )}
    </div>
  );
};