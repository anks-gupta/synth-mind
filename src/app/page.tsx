import React from 'react';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import {
  FileText,
  Video,
  Globe,
  HelpCircle,
  Map,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-violet-500/30 selection:text-violet-200">
      {/* Top Header Navbar */}
      <header className="h-16 sm:h-20 border-b border-[#1e293b] backdrop-blur-xl bg-[#070b12]/80 px-4 sm:px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 shadow-[0_1px_0_0_rgba(139,92,246,0.12)]">
        <BrandLogo size="md" className="sm:hidden" />
        <BrandLogo size="lg" className="hidden sm:flex" />

        <div className="flex items-center space-x-2 sm:space-x-4">
          {!isSignedIn ? (
            <>
              <Link
                href="/sign-in"
                className="text-xs font-bold text-slate-300 hover:text-violet-300 transition-colors px-2.5 sm:px-3 py-2 min-h-[44px] flex items-center"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 min-h-[44px]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 min-h-[44px]"
              >
                <span>Workspace</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
              <UserButton />
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-20 px-4 sm:px-6 md:px-12 max-w-6xl mx-auto text-center space-y-6 sm:space-y-8 overflow-hidden">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] sm:text-xs font-semibold shadow-inner">
          <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
          <span>Multi-Source AI Research Assistant</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-slate-100 max-w-4xl mx-auto">
          Synthesize Any Source into{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            Instant Understanding
          </span>
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed px-2">
          Upload PDFs, YouTube lectures, Web URLs, VTT transcripts, and plain text. SynthMind indexes your knowledge into isolated notebooks, providing verified answers with clickable citations, sequential study roadmaps, and practice quizzes.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm transition-all shadow-xl shadow-violet-500/25 flex items-center justify-center space-x-2 hover:-translate-y-0.5 min-h-[44px]"
            >
              <span>Go to Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm transition-all shadow-xl shadow-violet-500/25 flex items-center justify-center space-x-2 hover:-translate-y-0.5 min-h-[44px]"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-slate-200 font-semibold text-xs sm:text-sm transition-all text-center min-h-[44px] flex items-center justify-center"
          >
            Explore Features
          </a>
        </div>

        {/* Feature Grid */}
        <div id="features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-12 sm:pt-16 text-left">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] hover:border-violet-500/40 transition-all space-y-3 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">5-in-1 Source Ingestion</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ingest PDF Documents, YouTube Videos, Web Articles, VTT Transcripts, and Text Notes with real-time status tracking.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] hover:border-violet-500/40 transition-all space-y-3 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">YouTube Timestamp Deep-Linking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clicking citation badges automatically links to YouTube videos at exact start timestamps (`t=seconds`).
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] hover:border-violet-500/40 transition-all space-y-3 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Map className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Sequential Study Plan Roadmap</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Auto-generates structured step-by-step learning modules pinned to PDF pages, web sections, and video timestamps.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] hover:border-violet-500/40 transition-all space-y-3 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Web Article Deep Navigation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Extracts web articles and generates deep anchors to precise sections and exact text fragments.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] hover:border-violet-500/40 transition-all space-y-3 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Proactive Discoveries Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Autonomous AI Research Analyst surfacing contradictions, hidden relationships, missing info, trends, and actionable insights without asking.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] hover:border-violet-500/40 transition-all space-y-3 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-200">Dual-Host Audio Podcast Overview</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates two-host conversational audio deep-dives with interactive transcript playback and variable playback speeds.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#1e293b] p-6 text-center text-xs text-slate-500">
        SynthMind AI © {new Date().getFullYear()} — Built for Multi-Source Research &amp; Study
      </footer>
    </div>
  );
}
