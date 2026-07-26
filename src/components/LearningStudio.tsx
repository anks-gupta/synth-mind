'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StudyPlanStep, Citation, SourceItem, DiscoveryItem, DiscoveryCategory } from '@/lib/types';
import {
  Map,
  Sparkles,
  CheckCircle2,
  Loader2,
  BookOpen,
  ShieldCheck,
  Video,
  FileText,
  Globe,
  ExternalLink,
  Clock,
  Headphones,
  Play,
  Pause,
  Radio,
  Volume2,
  VolumeX,
  AlertTriangle,
  TrendingUp,
  HelpCircle,
  Zap,
  Link2,
  Flame,
  Filter,
  Trophy,
} from 'lucide-react';
import { fireCelebrationConfetti } from '@/lib/confetti';

interface AudioTurn {
  host: 'A' | 'B';
  name: string;
  text: string;
  topicTag?: string;
}

interface AudioOverviewData {
  title: string;
  summary: string;
  turns: AudioTurn[];
  sourceCount: number;
}

interface LearningStudioProps {
  notebookId: string;
  sources: SourceItem[];
  activeSourceIds: string[];
  activeMode: 'roadmap' | 'podcast' | 'discoveries';
  onSelectCitation: (citation: Citation) => void;
  onNavigateMode?: (mode: 'chat' | 'roadmap' | 'podcast' | 'discoveries') => void;
  onSendMessage?: (msg: string) => void;
}

function formatResourceTimestamp(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '';
  const totalSecs = Math.floor(seconds);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

function getDynamicRoadmapStages(activeSources: SourceItem[]) {
  const hasPdf = activeSources.some((s) => s.type === 'pdf');
  const hasVideo = activeSources.some((s) => s.type === 'youtube' || s.type === 'vtt');
  const hasWeb = activeSources.some((s) => s.type === 'url');

  let citationText = 'source references';
  if (hasVideo && hasPdf) {
    citationText = 'page numbers & video timestamps';
  } else if (hasVideo && hasWeb) {
    citationText = 'article sections & video timestamps';
  } else if (hasVideo) {
    citationText = 'exact video timestamps';
  } else if (hasPdf) {
    citationText = 'exact page numbers';
  } else if (hasWeb) {
    citationText = 'article sections & web links';
  }

  const count = activeSources.length;
  const countLabel = `${count} active ${count === 1 ? 'source' : 'sources'}`;

  return [
    { text: `Analyzing key topics across ${countLabel}...`, icon: BookOpen },
    { text: 'Structuring step-by-step learning modules...', icon: Map },
    { text: `Pinpointing ${citationText}...`, icon: Sparkles },
  ];
}

function RoadmapLoadingScreen({ activeSources }: { activeSources: SourceItem[] }) {
  const [stageIdx, setStageIdx] = useState(0);
  const stages = getDynamicRoadmapStages(activeSources);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIdx((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 2400); // 2.4s per stage
    return () => clearInterval(timer);
  }, [stages.length]);

  const CurrentIcon = stages[stageIdx].icon;

  return (
    <div className="py-10 space-y-6 animate-in fade-in-0 duration-300">
      {/* Central Glassmorphic Progress Card */}
      <div className="p-6 rounded-2xl bg-[#0f172a] border border-violet-500/40 text-center space-y-4 shadow-xl shadow-violet-500/10 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-violet-500/30">
          <CurrentIcon className="w-6 h-6 animate-spin" />
        </div>

        <div>
          <h4 className="text-sm font-extrabold text-white">Building Sequential Study Roadmap</h4>
          <p key={stageIdx} className="text-xs text-violet-300 mt-1.5 font-medium animate-in fade-in-0 duration-300">
            {stages[stageIdx].text}
          </p>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${((stageIdx + 1) / stages.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Shimmering Step Skeleton Cards */}
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl bg-[#0f172a]/60 border border-[#1e293b] border-l-4 border-l-violet-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-violet-500/20 rounded-full w-1/3 animate-pulse" />
              <div className="h-4 bg-slate-800/60 rounded-full w-10 animate-pulse" />
            </div>
            <div className="h-3 bg-slate-800/60 rounded-full w-4/5 animate-pulse" />
            <div className="h-3 bg-slate-800/40 rounded-full w-2/3 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

const PODCAST_LOADING_STAGES = [
  { text: 'Extracting key insights across active knowledge sources...', icon: Radio },
  { text: 'Scripting natural co-host dialogue for Alex & Blake...', icon: Headphones },
  { text: 'Tuning voice synthesis & conversational intonations...', icon: Sparkles },
];

function PodcastLoadingScreen({ activeSourceCount }: { activeSourceCount: number }) {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIdx((prev) => {
        if (prev < PODCAST_LOADING_STAGES.length - 1) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 2400); // 2.4s per stage
    return () => clearInterval(timer);
  }, []);

  const CurrentIcon = PODCAST_LOADING_STAGES[stageIdx].icon;

  return (
    <div className="py-10 space-y-6 animate-in fade-in-0 duration-300">
      {/* Central Glassmorphic Progress Card */}
      <div className="p-6 rounded-2xl bg-[#0f172a] border border-violet-500/40 text-center space-y-4 shadow-xl shadow-violet-500/10 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-violet-500/30">
          <CurrentIcon className="w-6 h-6 animate-spin" />
        </div>

        <div>
          <h4 className="text-sm font-extrabold text-white">Synthesizing AI Podcast Episode</h4>
          <p key={stageIdx} className="text-xs text-violet-300 mt-1.5 font-medium animate-in fade-in-0 duration-300">
            {PODCAST_LOADING_STAGES[stageIdx].text}
          </p>
        </div>

        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${((stageIdx + 1) / PODCAST_LOADING_STAGES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Shimmering Audio Waveform & Transcript Skeletons */}
      <div className="space-y-4 max-w-4xl mx-auto">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`p-4.5 rounded-2xl bg-[#0f172a]/60 border border-[#1e293b] space-y-2 ${
              i % 2 === 1 ? 'mr-10' : 'ml-10 border-l-4 border-l-cyan-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="h-3 bg-violet-500/20 rounded-full w-1/4 animate-pulse" />
              <div className="h-3 bg-slate-800/60 rounded-full w-12 animate-pulse" />
            </div>
            <div className="h-3 bg-slate-800/60 rounded-full w-4/5 animate-pulse" />
            <div className="h-3 bg-slate-800/40 rounded-full w-3/5 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LearningStudio({
  notebookId,
  sources,
  activeSourceIds,
  activeMode,
  onSelectCitation,
  onNavigateMode,
  onSendMessage,
}: LearningStudioProps) {
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [roadmapSteps, setRoadmapSteps] = useState<StudyPlanStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const readyActiveSources = sources.filter(
    (s) => s.status === 'ready' && (activeSourceIds.length === 0 || activeSourceIds.includes(s.id))
  );

  // Generate Roadmap
  const handleGenerateRoadmap = async () => {
    if (readyActiveSources.length === 0) return;
    setLoadingRoadmap(true);
    try {
      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId, activeSourceIds }),
      });
      const data = await res.json();
      if (data.steps) {
        setRoadmapSteps(data.steps);
        setCompletedSteps([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const toggleStepCompletion = (stepNum: number) => {
    setCompletedSteps((prev) => {
      const next = prev.includes(stepNum) ? prev.filter((s) => s !== stepNum) : [...prev, stepNum];
      if (next.length === roadmapSteps.length && roadmapSteps.length > 0) {
        fireCelebrationConfetti();
      }
      return next;
    });
  };

  // Podcast Audio Overview State
  const [loadingPodcast, setLoadingPodcast] = useState(false);
  const [podcastData, setPodcastData] = useState<AudioOverviewData | null>(null);
  const [podcastLength, setPodcastLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState<number | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedMaleVoice, setSelectedMaleVoice] = useState<string>('');
  const [selectedFemaleVoice, setSelectedFemaleVoice] = useState<string>('');

  const isPlayingRef = useRef(false);
  const turnRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Smooth scroll to active turn during speech narration
  useEffect(() => {
    if (activeTurnIdx !== null && turnRefs.current[activeTurnIdx]) {
      turnRefs.current[activeTurnIdx]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeTurnIdx]);

  // Load and cache browser system voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);

        const maleNames = ['alex', 'david', 'daniel', 'fred', 'george', 'google us english male', 'rishi', 'oliver', 'male', 'guy', 'stephen'];
        const femaleNames = ['samantha', 'victoria', 'karen', 'zira', 'fiona', 'moira', 'google us english female', 'female', 'aria', 'jenny'];

        const male = voices.find((v) => maleNames.some((m) => v.name.toLowerCase().includes(m))) || voices[0];
        const female = voices.find((v) => femaleNames.some((f) => v.name.toLowerCase().includes(f))) || voices[1] || voices[0];

        if (male && !selectedMaleVoice) setSelectedMaleVoice(male.name);
        if (female && !selectedFemaleVoice) {
          if (female.name !== male?.name) {
            setSelectedFemaleVoice(female.name);
          } else if (voices.length > 1) {
            setSelectedFemaleVoice(voices[1].name);
          }
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, [selectedMaleVoice, selectedFemaleVoice]);

  // Stop audio on unmount or tab switch
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playPodcastJingle = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // 3-note harmonic intro jingle: C5 -> E5 -> G5
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.35);
      });
    } catch {
      // Gracefully ignore audio ctx errors
    }
  };

  const [podcastError, setPodcastError] = useState<string | null>(null);

  const handleGeneratePodcast = async () => {
    if (readyActiveSources.length === 0) return;
    stopPodcastAudio();
    setLoadingPodcast(true);
    setPodcastError(null);
    try {
      const res = await fetch('/api/audio-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId, activeSourceIds, length: podcastLength }),
      });
      if (!res.ok) {
        throw new Error(`Server returned error status ${res.status}`);
      }
      const data = await res.json();
      if (data.turns) {
        setPodcastData(data);
        setActiveTurnIdx(null);
      } else if (data.error) {
        setPodcastError(data.error);
      }
    } catch (err: any) {
      console.error(err);
      setPodcastError(err?.message || 'Failed to connect to server. Please try again.');
    } finally {
      setLoadingPodcast(false);
    }
  };

  const playPodcastAudio = () => {
    if (!podcastData || podcastData.turns.length === 0) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    isPlayingRef.current = true;
    setIsPlayingAudio(true);

    playPodcastJingle();

    const synth = window.speechSynthesis;
    const voices = synth.getVoices();

    const maleObj = voices.find((v) => v.name === selectedMaleVoice) || voices[0];
    const femaleObj = voices.find((v) => v.name === selectedFemaleVoice) || voices[1] || voices[0];

    const speakTurn = (idx: number) => {
      if (!isPlayingRef.current) return;

      if (idx >= podcastData.turns.length) {
        isPlayingRef.current = false;
        setIsPlayingAudio(false);
        setActiveTurnIdx(null);
        return;
      }

      setActiveTurnIdx(idx);
      const turn = podcastData.turns[idx];
      const utterance = new SpeechSynthesisUtterance(turn.text);

      utterance.rate = playbackSpeed; // 1.0x speed by default for both hosts

      if (turn.host === 'A') {
        utterance.pitch = 0.95; // Natural male human pitch
        if (maleObj) utterance.voice = maleObj;
      } else {
        utterance.pitch = 1.05; // Natural female human pitch
        if (femaleObj) utterance.voice = femaleObj;
      }

      utterance.onend = () => {
        if (isPlayingRef.current) {
          setTimeout(() => {
            if (isPlayingRef.current) {
              speakTurn(idx + 1);
            }
          }, 450); // 450ms natural human conversational pause between co-host turns
        }
      };

      utterance.onerror = () => {
        if (isPlayingRef.current) {
          speakTurn(idx + 1);
        }
      };

      synth.speak(utterance);
    };

    speakTurn(0);
  };

  const stopPodcastAudio = () => {
    isPlayingRef.current = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setActiveTurnIdx(null);
  };

  // Proactive Discoveries Engine State
  const [loadingDiscoveries, setLoadingDiscoveries] = useState(false);
  const [discoveries, setDiscoveries] = useState<DiscoveryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [discoveriesError, setDiscoveriesError] = useState<string | null>(null);

  const handleGenerateDiscoveries = async () => {
    if (readyActiveSources.length === 0) return;
    setLoadingDiscoveries(true);
    setDiscoveriesError(null);
    try {
      const res = await fetch('/api/discoveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId, activeSourceIds }),
      });
      const data = await res.json();
      if (data.discoveries) {
        setDiscoveries(data.discoveries);
      } else if (data.error) {
        setDiscoveriesError(data.error);
      }
    } catch (err: any) {
      console.error(err);
      setDiscoveriesError(err?.message || 'Failed to analyze discoveries');
    } finally {
      setLoadingDiscoveries(false);
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'Contradiction':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
          accent: 'border-l-rose-500 bg-rose-500/5',
        };
      case 'Hidden Relationship':
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          icon: <Link2 className="w-3.5 h-3.5 text-cyan-400" />,
          accent: 'border-l-cyan-500 bg-cyan-500/5',
        };
      case 'Missing Information':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          icon: <HelpCircle className="w-3.5 h-3.5 text-amber-400" />,
          accent: 'border-l-amber-500 bg-amber-500/5',
        };
      case 'Trend':
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          icon: <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />,
          accent: 'border-l-indigo-500 bg-indigo-500/5',
        };
      case 'Surprising Fact':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          icon: <Flame className="w-3.5 h-3.5 text-emerald-400" />,
          accent: 'border-l-emerald-500 bg-emerald-500/5',
        };
      case 'Actionable Insight':
      default:
        return {
          bg: 'bg-violet-500/10 border-violet-500/30 text-violet-300',
          icon: <Zap className="w-3.5 h-3.5 text-violet-400" />,
          accent: 'border-l-violet-500 bg-violet-500/5',
        };
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'youtube': return <Video className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'url': return <Globe className="w-4 h-4 text-cyan-400 shrink-0" />;
      default: return <BookOpen className="w-4 h-4 text-violet-400 shrink-0" />;
    }
  };

  if (sources.length === 0 || readyActiveSources.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-0 bg-[#070b12] p-8 text-center space-y-4 select-none">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-lg shadow-violet-500/10">
          <BookOpen className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-100">Knowledge Hub Empty</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Ingest at least 1 ready source (PDF, YouTube, Web URL, or Text) to unlock Study Roadmaps.
          </p>
        </div>
      </div>
    );
  }

  const completionPercent = roadmapSteps.length > 0
    ? Math.round((completedSteps.length / roadmapSteps.length) * 100)
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#070b12] overflow-y-auto p-6 md:p-10 select-none">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* MODE 1: STUDY ROADMAP */}
        {activeMode === 'roadmap' && (
          <div className="space-y-6">
            {/* Header Title & CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
              <div>
                <div className="flex items-center space-x-2 text-violet-400 font-extrabold text-sm uppercase tracking-wider">
                  <Map className="w-5 h-5" />
                  <span>Sequential Study Roadmap</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Structured learning curriculum generated from {readyActiveSources.length} active sources
                </p>
              </div>

              <button
                onClick={handleGenerateRoadmap}
                disabled={loadingRoadmap}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5"
              >
                {loadingRoadmap ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{roadmapSteps.length > 0 ? 'Regenerate Roadmap' : 'Generate Roadmap'}</span>
              </button>
            </div>

            {/* Interactive Progress Meter Bar */}
            {roadmapSteps.length > 0 && !loadingRoadmap && (
              <div className="p-4 rounded-2xl bg-[#0f172a]/90 border border-[#1e293b] space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Curriculum Progress: {completedSteps.length} of {roadmapSteps.length} Modules Completed</span>
                  </span>
                  <span className="text-violet-400 font-mono font-extrabold">{completionPercent}%</span>
                </div>
                <div className="w-full bg-[#070b12] rounded-full h-2 overflow-hidden border border-[#1e293b]">
                  <div
                    className="bg-gradient-to-r from-violet-500 via-indigo-500 to-emerald-400 h-full transition-all duration-500 ease-out"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            )}

            {loadingRoadmap ? (
              <RoadmapLoadingScreen activeSources={readyActiveSources} />
            ) : roadmapSteps.length === 0 ? (
              <div className="text-center py-16 p-8 rounded-2xl border border-dashed border-[#1e293b] bg-[#0f172a]/40 space-y-3">
                <Map className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-200">No Roadmap generated yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Click Generate Roadmap to create a step-by-step study plan from your {readyActiveSources.length} active {readyActiveSources.length === 1 ? 'source' : 'sources'} with direct reference links.
                </p>
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-violet-500/50 before:via-indigo-500/30 before:to-transparent">
                {roadmapSteps.map((step) => {
                  const isDone = completedSteps.includes(step.stepNumber);

                  return (
                    <div
                      key={step.stepNumber}
                      className={`p-6 rounded-2xl bg-[#0f172a] border transition-all space-y-4 shadow-lg relative overflow-hidden group ml-2 sm:ml-4 animate-in fade-in-0 slide-in-from-bottom-3 duration-200 ${
                        isDone
                          ? 'border-emerald-500/40 bg-[#0f172a]/95 shadow-emerald-500/5'
                          : 'border-[#1e293b] border-l-4 border-l-violet-500 hover:border-violet-500/50 shadow-violet-500/5'
                      }`}
                    >
                      {/* Header Row with Badge & Toggle Checkbox */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2.5">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <span className={`px-3 py-1 rounded-full font-mono text-[11px] font-extrabold uppercase tracking-wide shrink-0 ${
                            isDone
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20'
                          }`}>
                            STEP {step.stepNumber.toString().padStart(2, '0')}
                          </span>
                          <span className={`text-sm font-extrabold truncate ${isDone ? 'text-emerald-300 line-through opacity-85' : 'text-white'}`}>
                            {step.topic}
                          </span>
                        </div>

                        {/* Interactive Completion Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleStepCompletion(step.stepNumber)}
                          className={`flex items-center justify-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 cursor-pointer self-start sm:self-auto ${
                            isDone
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-[#070b12] border-[#334155] text-slate-400 hover:text-slate-200 hover:border-violet-500/50'
                          }`}
                        >
                          <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-emerald-400 fill-emerald-500/20' : 'text-slate-500'}`} />
                          <span>{isDone ? 'Completed' : 'Mark Done'}</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed pr-8">{step.summary}</p>

                      {/* Rich Pinpointed Resources */}
                      {step.resources && step.resources.length > 0 && (
                        <div className="pt-4 border-t border-[#1e293b] space-y-3">
                          <span className="text-[10px] text-violet-300 font-extrabold uppercase tracking-wider flex items-center space-x-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                            <span>Direct Resource References:</span>
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {step.resources.map((res, i) => {
                              const isYouTube = res.type === 'youtube' || !!res.videoId;
                              const isPdf = res.type === 'pdf';
                              const isWeb = res.type === 'url';

                              const youtubeLink = isYouTube && res.videoId
                                ? `https://www.youtube.com/watch?v=${res.videoId}&t=${res.startTime || 0}s`
                                : res.urlOrPath;

                              const webDeepLink = isWeb && res.urlOrPath
                                ? res.sectionAnchor
                                  ? `${res.urlOrPath.split('#')[0]}#${res.sectionAnchor.replace(/^#/, '')}`
                                  : (res.sectionTitle || step.topic)
                                  ? `${res.urlOrPath.split('#')[0]}#:~:text=${encodeURIComponent((res.sectionTitle || step.topic).trim())}`
                                  : res.urlOrPath
                                : res.urlOrPath;

                              return (
                                <div
                                  key={i}
                                  className="p-3.5 sm:p-4 rounded-xl bg-[#070b12] border border-[#1e293b] hover:border-violet-500/50 hover:shadow-md hover:shadow-violet-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group/item"
                                >
                                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                                    <div className="mt-0.5 p-1.5 rounded-lg bg-[#0f172a] border border-[#1e293b] shrink-0">
                                      {getSourceIcon(res.type)}
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                      <p className="text-xs font-bold text-slate-200 truncate group-hover/item:text-violet-300">
                                        {res.title}
                                      </p>

                                      {/* Range Badges */}
                                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                        {res.timeRange && (
                                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 font-mono font-semibold whitespace-nowrap shrink-0">
                                            <Clock className="w-3 h-3 text-rose-400 shrink-0" />
                                            <span>{res.timeRange}</span>
                                          </span>
                                        )}

                                        {res.pageRange && (
                                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono font-semibold whitespace-nowrap shrink-0">
                                            <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                                            <span>{res.pageRange}</span>
                                          </span>
                                        )}

                                        {isWeb && (
                                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono font-semibold whitespace-nowrap truncate max-w-[180px]" title={res.sectionTitle || res.sectionAnchor || 'Web Article'}>
                                            <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
                                            <span className="truncate">
                                              {res.sectionTitle
                                                ? `§ ${res.sectionTitle}`
                                                : res.sectionAnchor
                                                ? `#${res.sectionAnchor}`
                                                : (() => {
                                                    try {
                                                      return res.urlOrPath ? new URL(res.urlOrPath).hostname.replace('www.', '') : 'Web Article';
                                                    } catch {
                                                      return 'Web Article';
                                                    }
                                                  })()}
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Action Button: Triggers SourceViewer Grounding Modal */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectCitation({
                                        id: i + 1,
                                        sourceId: res.sourceId,
                                        sourceTitle: res.title,
                                        sourceType: res.type,
                                        pageNumber: res.pageNumber,
                                        startTime: res.startTime,
                                        textSnippet: res.snippet || step.summary,
                                        urlOrPath: res.urlOrPath,
                                      })
                                    }
                                    className="whitespace-nowrap inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:text-violet-100 text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-95 shrink-0 cursor-pointer w-full sm:w-auto"
                                    title={`Inspect Ground Truth Citation: ${res.title}`}
                                  >
                                    <span>
                                      {res.type === 'pdf' && res.pageNumber
                                        ? `Page ${res.pageNumber}`
                                        : res.type === 'youtube' && res.startTime !== undefined
                                        ? `Watch at ${formatResourceTimestamp(res.startTime)}`
                                        : res.type === 'url'
                                        ? 'Read Article'
                                        : 'Inspect'}
                                    </span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Congratulatory Celebration Banner */}
            {completedSteps.length === roadmapSteps.length && roadmapSteps.length > 0 && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/50 text-center space-y-1.5 animate-in fade-in-0 duration-300 shadow-xl shadow-emerald-500/10 mb-4">
                <h4 className="text-sm font-black text-emerald-300 tracking-wide uppercase flex items-center justify-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>🎉 Curriculum Fully Completed!</span>
                </h4>
                <p className="text-xs text-emerald-200/90 font-medium">
                  Congratulations! You have completed all {roadmapSteps.length} learning modules in this study plan.
                </p>
              </div>
            )}

            {/* Collaborative AI Partner Suggestions Footer */}
            {roadmapSteps.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#0f172a]/80 border border-violet-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in-0 duration-200">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-extrabold text-white">Research Partner Suggested Next Steps:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onNavigateMode?.('podcast')}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-105"
                  >
                    <Headphones className="w-3.5 h-3.5 text-rose-400" />
                    <span>Synthesize Audio Podcast</span>
                  </button>

                  <button
                    onClick={() => onNavigateMode?.('discoveries')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-105"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Discover Contradictions & Insights</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigateMode?.('chat');
                      onSendMessage?.('Summarize the main learnings from this study roadmap with citations');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-105"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                    <span>Ask AI Assistant</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: AUDIO PODCAST OVERVIEW */}
        {activeMode === 'podcast' && (
          <div className="space-y-6">
            {/* Header Title & CTA Toolbar */}
            <div className="pb-4 border-b border-[#1e293b] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-violet-400 font-extrabold text-sm uppercase tracking-wider">
                    <Headphones className="w-5 h-5" />
                    <span>AI Audio Podcast Overview</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Conversational deep-dive podcast hosted by Alex &amp; Blake from {readyActiveSources.length} active sources
                  </p>
                </div>

                <button
                  onClick={handleGeneratePodcast}
                  disabled={loadingPodcast}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 shrink-0 cursor-pointer"
                >
                  {loadingPodcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{podcastData ? 'Regenerate Podcast' : 'Generate Podcast'}</span>
                </button>
              </div>

              {/* Dedicated Sleek Episode Length Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 mr-1">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span>Episode Target Length:</span>
                </span>

                <div className="inline-flex items-center bg-[#070b12] border border-[#1e293b] p-1 rounded-xl shadow-inner">
                  <button
                    type="button"
                    onClick={() => setPodcastLength('short')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      podcastLength === 'short'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Short (~1-2m)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPodcastLength('medium')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      podcastLength === 'medium'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Medium (~3-4m)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPodcastLength('long')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      podcastLength === 'long'
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Detailed (~5-8m)
                  </button>
                </div>
              </div>
            </div>

            {podcastError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
                <span>⚠️ {podcastError}</span>
                <button
                  onClick={handleGeneratePodcast}
                  className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white font-bold text-xs"
                >
                  Retry
                </button>
              </div>
            )}

            {loadingPodcast ? (
              <PodcastLoadingScreen activeSourceCount={readyActiveSources.length} />
            ) : !podcastData ? (
              <div className="text-center py-16 p-8 rounded-2xl border border-dashed border-[#1e293b] bg-[#0f172a]/40 space-y-3">
                <Headphones className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-200">No Audio Podcast generated yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Click Generate Podcast to create a two-host conversational audio overview with interactive voice narration.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Audio Player Control Card */}
                <div className="p-6 rounded-2xl bg-[#0f172a] border border-violet-500/40 shadow-xl shadow-violet-500/10 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/30 relative">
                      <Radio className="w-6 h-6" />
                      {isPlayingAudio && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-white">{podcastData.title}</h3>
                        {isPlayingAudio && (
                          <div className="flex items-end space-x-0.5 h-4 px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30">
                            <span className="w-1 h-3 bg-violet-400 animate-pulse" />
                            <span className="w-1 h-4 bg-indigo-400 animate-bounce" />
                            <span className="w-1 h-2 bg-cyan-400 animate-pulse" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{podcastData.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Playback Speed Selector */}
                    <div className="flex items-center space-x-1 bg-[#070b12]/80 p-1.5 rounded-2xl border border-[#1e293b] text-xs font-mono font-bold">
                      {[1.0, 1.25, 1.5].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => setPlaybackSpeed(spd)}
                          className={`px-2.5 py-1 rounded-xl font-extrabold transition-all ${
                            playbackSpeed === spd
                              ? 'bg-violet-500 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    {!isPlayingAudio ? (
                      <button
                        onClick={playPodcastAudio}
                        className="whitespace-nowrap inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-violet-500/25 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-violet-400/30 shrink-0"
                      >
                        <Play className="w-4 h-4 fill-current text-white shrink-0" />
                        <span>Play Episode Audio</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopPodcastAudio}
                        className="whitespace-nowrap inline-flex items-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-black shadow-lg shadow-rose-500/25 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-rose-400/30 shrink-0"
                      >
                        <Pause className="w-4 h-4 fill-current text-white shrink-0" />
                        <span>Stop Audio</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Host Transcript Turns */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                    <span>INTERACTIVE TRANSCRIPT ({podcastData.turns.length} TURNS)</span>
                    <span className="text-violet-400 font-mono">Alex (Male) &amp; Blake (Female)</span>
                  </div>

                  {podcastData.turns.map((turn, tIdx) => {
                    const isActive = activeTurnIdx === tIdx;
                    const isHostA = turn.host === 'A';

                    return (
                      <div
                        key={tIdx}
                        ref={(el) => {
                          turnRefs.current[tIdx] = el;
                        }}
                        className={`p-4.5 rounded-2xl border transition-all space-y-2 relative ${
                          isActive
                            ? 'bg-violet-500/15 border-violet-500 shadow-xl shadow-violet-500/20 scale-[1.01] ring-2 ring-violet-500/30'
                            : 'bg-[#0f172a] border-[#1e293b] hover:border-slate-700 opacity-85'
                        } ${isHostA ? 'mr-6 sm:mr-12' : 'ml-6 sm:ml-12 border-l-4 border-l-cyan-500'}`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2.5">
                            {isActive ? (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHostA ? 'bg-violet-400' : 'bg-cyan-400'}`} />
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isHostA ? 'bg-violet-400' : 'bg-cyan-400'}`} />
                              </span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-700" />
                            )}
                            <span className={`font-extrabold ${isActive ? (isHostA ? 'text-violet-300' : 'text-cyan-300') : 'text-slate-400'}`}>
                              {turn.name} ({isHostA ? 'Host A - Male' : 'Host B - Female'})
                            </span>
                            {isActive && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono tracking-wider animate-pulse ${
                                isHostA ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}>
                                NOW SPEAKING
                              </span>
                            )}
                          </div>
                          {turn.topicTag && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {turn.topicTag}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs leading-relaxed font-sans ${isActive ? 'text-white font-medium' : 'text-slate-300'}`}>
                          {turn.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: PROACTIVE DISCOVERIES ENGINE */}
        {activeMode === 'discoveries' && (
          <div className="space-y-6">
            {/* Header Title & CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e293b]">
              <div>
                <div className="flex items-center space-x-2 text-violet-400 font-extrabold text-sm uppercase tracking-wider">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Proactive Discoveries &amp; Insights Engine</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cross-document analytical reasoning surfacing hidden patterns, contradictions, missing information, and actionable opportunities.
                </p>
              </div>

              <button
                onClick={handleGenerateDiscoveries}
                disabled={loadingDiscoveries}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 shrink-0"
              >
                {loadingDiscoveries ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                <span>{discoveries.length > 0 ? 'Re-analyze Discoveries' : 'Run Proactive Analysis'}</span>
              </button>
            </div>

            {discoveriesError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between">
                <span>⚠️ {discoveriesError}</span>
                <button
                  onClick={handleGenerateDiscoveries}
                  className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white font-bold text-xs"
                >
                  Retry
                </button>
              </div>
            )}

            {loadingDiscoveries ? (
              <div className="py-16 space-y-6 text-center max-w-lg mx-auto">
                <div className="p-8 rounded-2xl bg-[#0f172a] border border-violet-500/40 space-y-4 shadow-xl shadow-violet-500/10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md shadow-violet-500/30">
                    <Sparkles className="w-6 h-6 animate-spin text-amber-300" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Reasoning Across Knowledge Base...</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Analyzing {readyActiveSources.length} active sources to identify contradictions, hidden relationships, missing info, trends, and actionable insights.
                    </p>
                  </div>
                </div>
              </div>
            ) : discoveries.length === 0 ? (
              <div className="text-center py-16 p-8 rounded-2xl border border-dashed border-[#1e293b] bg-[#0f172a]/40 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#1e293b] text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">No Discoveries Generated Yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                    Click <span className="text-violet-300 font-semibold">Run Proactive Analysis</span> above to discover unasked insights, hidden links, contradictions, and strategic opportunities across your active sources.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Category Filter Bar */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                  {['All', 'Contradiction', 'Hidden Relationship', 'Missing Information', 'Trend', 'Surprising Fact', 'Actionable Insight'].map((cat) => {
                    const count = cat === 'All' ? discoveries.length : discoveries.filter((d) => d.category === cat).length;
                    const isSel = selectedCategory === cat;

                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                          isSel
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-500 shadow-md shadow-violet-500/25'
                            : 'bg-[#0f172a] text-slate-400 hover:text-slate-200 border-[#1e293b] hover:border-slate-700'
                        }`}
                      >
                        <span>{cat}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isSel ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Ranked Discovery Cards List */}
                <div className="space-y-4">
                  {discoveries
                    .filter((d) => selectedCategory === 'All' || d.category === selectedCategory)
                    .map((disc) => {
                      const theme = getCategoryTheme(disc.category);

                      return (
                        <div
                          key={disc.id}
                          className="p-5 rounded-2xl bg-[#0f172a] border border-[#1e293b] hover:border-violet-500/40 transition-all space-y-4 shadow-lg shadow-black/20 group"
                        >
                          {/* Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-3">
                            <div className="flex items-center space-x-2.5">
                              <span className="text-xs font-mono font-black text-violet-400 bg-violet-500/10 border border-violet-500/30 px-2.5 py-0.5 rounded-lg">
                                #{disc.rank}
                              </span>

                              <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-extrabold ${theme.bg}`}>
                                {theme.icon}
                                <span>{disc.category}</span>
                              </span>
                            </div>

                            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                              disc.confidence === 'High'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : disc.confidence === 'Medium'
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>
                              Confidence: {disc.confidence}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-black text-white group-hover:text-violet-300 transition-colors leading-snug">
                            {disc.title}
                          </h3>

                          {/* Why It Matters Callout Box */}
                          <div className={`p-3.5 rounded-xl border-l-4 ${theme.accent} space-y-1`}>
                            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 block">
                              Why It Matters:
                            </span>
                            <p className="text-xs text-slate-200 leading-relaxed font-sans">
                              {disc.whyItMatters}
                            </p>
                          </div>

                          {/* Supporting Evidence */}
                          {disc.supportingEvidence && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 block">
                                Supporting Document Evidence:
                              </span>
                              <p className="text-xs text-slate-300 italic border-l-2 border-slate-700 pl-3 py-1 bg-[#070b12] rounded-r-lg font-sans leading-relaxed">
                                "{disc.supportingEvidence}"
                              </p>
                            </div>
                          )}

                          {/* Citations Footer */}
                          {disc.citations && disc.citations.length > 0 && (
                            <div className="pt-3 border-t border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400 font-extrabold uppercase tracking-wider">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Verified Source References:</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {disc.citations.map((cit, cIdx) => {
                                  const rawTitle = cit.sourceTitle || 'Source';
                                  const cleanTitle = rawTitle.replace(/^WEBVTT\s+[\d:.]+\s*-->\s*[\d:.]+\s*/i, '').trim() || rawTitle;
                                  const displayTitle = cleanTitle.length > 28 ? `${cleanTitle.slice(0, 26)}...` : cleanTitle;
                                  const pageOrTime = cit.pageNumber ? `Pg ${cit.pageNumber}` : cit.startTime !== undefined ? `${cit.startTime}s` : null;

                                  return (
                                    <button
                                      key={cIdx}
                                      type="button"
                                      onClick={() => onSelectCitation(cit)}
                                      className="whitespace-nowrap inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#070b12] hover:bg-violet-500/15 border border-[#1e293b] hover:border-violet-500/50 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-sm hover:scale-[1.02] active:scale-95 group/btn"
                                      title={`Inspect Reference: ${cleanTitle}`}
                                    >
                                      {getSourceIcon(cit.sourceType)}
                                      <span className="font-bold">{displayTitle}</span>
                                      {pageOrTime && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                          {pageOrTime}
                                        </span>
                                      )}
                                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover/btn:text-violet-400 transition-colors" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
