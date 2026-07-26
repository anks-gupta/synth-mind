'use client';

import React from 'react';
import { BrandLogo } from './BrandLogo';

export function WorkspaceLoader({ message = 'Loading Research Workspace...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b12] text-slate-100 selection:bg-violet-500/30">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Loader Content */}
      <div className="relative flex flex-col items-center space-y-6 z-10 p-8 rounded-3xl bg-[#0f172a]/60 border border-[#1e293b] backdrop-blur-xl shadow-2xl max-w-sm w-full mx-4 text-center">
        {/* Animated Brand Logo Container */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 blur-md opacity-40 animate-ping" />
          <div className="relative p-3 rounded-2xl bg-[#070b12] border border-violet-500/30 shadow-lg shadow-violet-500/20">
            <BrandLogo size="lg" />
          </div>
        </div>

        {/* Status Text */}
        <div className="space-y-2">
          <h3 className="text-sm font-extrabold tracking-wide text-slate-100 animate-pulse">
            {message}
          </h3>
          <p className="text-xs text-slate-400">
            Synthesizing notebooks, sources &amp; AI studio...
          </p>
        </div>

        {/* Shimmer Progress Bar */}
        <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 rounded-full animate-shimmer" style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear'
          }} />
        </div>
      </div>
    </div>
  );
}
