"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const PilotSignup = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Growth features disabled - redirect to standard login
    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Redirecting to Secure Login...</p>
      </div>
    </div>
  );
};

export default PilotSignup;