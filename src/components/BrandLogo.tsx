'use client';

import Link from 'next/link';
import React, { useId } from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  const rawId = useId();
  const gradientId = `brandLogoGrad_${rawId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12',
  }[size];

  const svgDimensions = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  }[size];

  return (
    <Link
      href="/"
      className={`flex items-center space-x-2.5 select-none shrink-0 whitespace-nowrap overflow-visible ${className}`}
    >
      <div
        className={`${iconDimensions} rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-violet-500/25 flex items-center justify-center relative group transition-all duration-300 hover:scale-105 shrink-0`}
      >
        <div className="w-full h-full bg-[#090d16] rounded-[11px] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-cyan-500/20 opacity-80 group-hover:opacity-100 transition-opacity" />
          <svg
            className={`${svgDimensions} relative z-10`}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            {/* Left Brain Synapse */}
            <path
              d="M16 4C10 4 6 8.5 6 13.5C6 16.5 7.5 19 9.5 20.5C8 22 7 24 7 26.5C7 29.5 9.5 32 12.5 32H13.5"
              stroke={`url(#${gradientId})`}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Right Brain Synapse */}
            <path
              d="M16 4C22 4 26 8.5 26 13.5C26 16.5 24.5 19 22.5 20.5C24 22 25 24 25 26.5C25 29.5 22.5 32 19.5 32H18.5"
              stroke={`url(#${gradientId})`}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Center Neural Connection */}
            <path d="M16 5V27" stroke={`url(#${gradientId})`} strokeWidth="2" strokeDasharray="2 2" opacity="0.6" />
            {/* Core AI Sparkle Diamond */}
            <path d="M16 10L18.2 14.8L23 17L18.2 19.2L16 24L13.8 19.2L9 17L13.8 14.8Z" fill={`url(#${gradientId})`} />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-black text-base tracking-tight text-white leading-none">
            Synth<span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">Mind</span>
          </span>
          <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase mt-0.5 font-mono">
            AI Research Studio
          </span>
        </div>
      )}
    </Link>
  );
}
