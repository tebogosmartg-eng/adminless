"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DebugPanel = () => {
  const [data, setData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchDebug = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
      const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: termCount } = await supabase.from('terms').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const { count: assCount } = await supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('user_id', user.id);

      setData({
        url: "whfnuntkisnksxhtepqn.supabase.co",
        userId: user.id,
        email: user.email,
        profileExists: !!profile,
        counts: { classes: classCount || 0, terms: termCount || 0, assessments: assCount || 0 }
      });
    };

    if (isOpen) fetchDebug();
  }, [isOpen]);

  // Only show in non-production or Dyad preview environments
  const isPreview = window.location.hostname.includes('dyad') || window.location.hostname === 'localhost';
  if (!isPreview) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] no-print">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black text-white px-3 py-1 rounded text-[10px] font-black opacity-30 hover:opacity-100 transition-opacity"
      >
        {isOpen ? "CLOSE DEBUG" : "AUDIT"}
      </button>
      
      {isOpen && data && (
        <div className="mt-2 p-4 bg-black/90 text-green-400 rounded-lg shadow-2xl border border-green-900/50 text-[10px] font-mono min-w-[300px] animate-in fade-in slide-in-from-bottom-2">
           <p className="mb-2 border-b border-green-900 pb-1 font-black">ENVIRONMENT AUDIT</p>
           <p><span className="text-white font-bold">HOST:</span> {data.url}</p>
           <p><span className="text-white font-bold">USER:</span> {data.userId}</p>
           <p><span className="text-white font-bold">EMAIL:</span> {data.email}</p>
           <p><span className="text-white font-bold">PROFILE:</span> {data.profileExists ? "OK" : "MISSING"}</p>
           <p className="mt-4 mb-2 border-b border-green-900 pb-1 font-black">REMOTE DB COUNTS</p>
           <p><span className="text-white font-bold">CLASSES:</span> {data.counts.classes}</p>
           <p><span className="text-white font-bold">TERMS:</span> {data.counts.terms}</p>
           <p><span className="text-white font-bold">ASSESSMENTS:</span> {data.counts.assessments}</p>
           <div className="mt-4 pt-2 border-t border-green-900 text-[8px] text-green-700">
               Click AUDIT again to refresh.
           </div>
        </div>
      )}
    </div>
  );
};