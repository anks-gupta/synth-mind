'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Citation, SourceItem } from '@/lib/types';
import {
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Send,
  BrainCircuit,
  Database,
  Layers,
  RotateCcw,
  BookOpen,
  History,
  Map,
  Headphones,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { InteractiveFlashcards, Flashcard } from './InteractiveFlashcards';

function parseFlashcardsFromText(text: string, citations?: Citation[]): Flashcard[] {
  const cards: Flashcard[] = [];
  const sections = text.split(/(?=Flashcard\s*\d+|Front:)/i);

  let idCounter = 1;
  for (const section of sections) {
    const frontMatch = section.match(/Front:\s*([\s\S]*?)(?=\n*Back:|$)/i);
    const backMatch = section.match(/Back:\s*([\s\S]*?)(?=\n*Citation:|\n*Flashcard|\n*Front:|$)/i);
    const citMatch = section.match(/Citation:\s*\[?(\d+)\]?/i);

    if (frontMatch && backMatch) {
      let front = frontMatch[1].trim();
      let back = backMatch[1].trim();
      const citationId = citMatch ? parseInt(citMatch[1], 10) : undefined;
      const citation = citationId && citations ? citations.find((c) => c.id === citationId) || citations[citationId - 1] : undefined;

      // Clean leading/trailing bold wrappers and square brackets like ** [Question] **
      front = front.replace(/^\*\*|\*\*$/g, '').replace(/^\[\s*/, '').replace(/\s*\]$/, '').trim();
      back = back.replace(/^\*\*|\*\*$/g, '').replace(/^\[\s*/, '').replace(/\s*\]$/, '').trim();

      if (front && back) {
        cards.push({
          id: idCounter++,
          front,
          back,
          citationId,
          citation,
        });
      }
    }
  }

  return cards;
}

interface ChatPanelProps {
  notebookTitle: string;
  activeSourceCount: number;
  sources?: SourceItem[];
  activeSourceIds?: string[];
  messages: { id: string; role: 'user' | 'assistant'; content: string; citations?: Citation[] }[];
  isLoading: boolean;
  isLoadingHistory?: boolean;
  onSendMessage: (message: string) => void;
  onClearMessages?: () => void;
  onSelectCitation?: (citation: Citation) => void;
  onNavigateMode?: (mode: 'roadmap' | 'podcast' | 'discoveries') => void;
}

const RAG_LOADING_STAGES = [
  { text: 'Understanding your research question...', icon: BrainCircuit },
  { text: 'Searching your active knowledge sources...', icon: Database },
  { text: 'Finding relevant passages & evidence...', icon: Layers },
  { text: 'Formulating response with exact citations...', icon: Sparkles },
];

function AnimatedRAGLoading() {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIdx((prev) => {
        if (prev < RAG_LOADING_STAGES.length - 1) {
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 2400); // Slow realistic progression (2.4 seconds per stage)
    return () => clearInterval(timer);
  }, []);

  const CurrentIcon = RAG_LOADING_STAGES[stageIdx].icon;

  return (
    <div className="flex items-start space-x-3 max-w-5xl mx-auto w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-900 to-[#0f172a] text-violet-400 flex items-center justify-center shrink-0 border border-violet-500/30 shadow-md mt-1 shadow-violet-500/10">
        <Bot className="w-3.5 h-3.5" />
      </div>

      <div className="p-4 md:p-5 rounded-2xl bg-[#0f172a]/90 border border-violet-500/30 rounded-tl-none space-y-3 shadow-xl shadow-violet-500/5 max-w-xl">
        <div className="flex items-center space-x-2.5 text-xs font-semibold text-violet-300">
          <CurrentIcon className="w-4 h-4 animate-spin text-violet-400 shrink-0" />
          <span>{RAG_LOADING_STAGES[stageIdx].text}</span>
        </div>
        <div className="w-full bg-[#070b12] rounded-full h-1.5 overflow-hidden border border-violet-500/20">
          <div
            className="bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 h-full transition-all duration-700 ease-out"
            style={{ width: `${((stageIdx + 1) / RAG_LOADING_STAGES.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({
  notebookTitle,
  activeSourceCount,
  sources = [],
  activeSourceIds = [],
  messages,
  isLoading,
  isLoadingHistory = false,
  onSendMessage,
  onClearMessages,
  onSelectCitation,
  onNavigateMode,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message only when a new message is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const readyActiveSources = sources.filter(
    (s) => s.status === 'ready' && (activeSourceIds.length === 0 || activeSourceIds.includes(s.id))
  );

  const getDynamicSuggestedQuestions = () => {
    const questions: string[] = [];

    // Fixed Starter Prompts
    questions.push('Summarize key takeaways with exact numerical citations');

    // Dynamic Source-Specific Prompts
    const hasPdf = readyActiveSources.find((s) => s.type === 'pdf');
    const hasVideo = readyActiveSources.find((s) => s.type === 'youtube' || s.type === 'vtt');
    const hasWeb = readyActiveSources.find((s) => s.type === 'url');

    if (hasPdf) {
      const pdfTitle = hasPdf.title.length > 24 ? `${hasPdf.title.slice(0, 22)}...` : hasPdf.title;
      questions.push(`What are the key technical concepts & page references in ${pdfTitle}?`);
    }

    if (hasVideo) {
      questions.push('Summarize the main arguments discussed in the video lecture at key timestamps');
    }

    if (hasWeb) {
      const webTitle = hasWeb.title.length > 24 ? `${hasWeb.title.slice(0, 22)}...` : hasWeb.title;
      questions.push(`Extract key section highlights and main arguments from ${webTitle}`);
    }

    if (readyActiveSources.length > 1) {
      questions.push('Compare complementary findings and opposing claims across all active sources');
    }

    // Default Fallbacks
    if (questions.length < 4) {
      questions.push('Summarize main conclusions into an actionable study checklist');
    }
    if (questions.length < 4) {
      questions.push('What are the core concepts covered across active knowledge sources?');
    }

    return questions.slice(0, 4);
  };

  const samplePrompts = getDynamicSuggestedQuestions();

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-[#070b12] relative select-text overflow-hidden">
      {/* Top Context Header Bar */}
      <div className="h-12 border-b border-[#1e293b] bg-[#0f172a]/60 px-6 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-2 text-slate-300 font-semibold">
          <BookOpen className="w-4 h-4 text-violet-400" />
          <span>AI Research Assistant</span>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && onClearMessages && (
            <button
              onClick={() => setIsConfirmClearOpen(true)}
              title="Clear Chat History"
              className="px-2.5 py-1 flex items-center space-x-1.5 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer text-xs font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-300" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 touch-pan-y overscroll-contain px-4 md:px-8 py-6 space-y-6">
        {/* History loading skeleton */}
        {isLoadingHistory ? (
          <div className="max-w-3xl mx-auto space-y-4 py-4">
            <div className="flex items-center space-x-2 text-slate-500 text-xs">
              <History className="w-3.5 h-3.5 animate-pulse" />
              <span>Loading chat history...</span>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex items-start space-x-3 ${i % 2 === 0 ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-xl bg-[#1e293b] animate-pulse shrink-0" />
                <div className={`h-10 rounded-2xl bg-[#1e293b] animate-pulse ${i % 2 === 0 ? 'w-48' : 'w-72'}`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-violet-500/25 font-bold">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-100">
                SynthMind Intelligence Hub
              </h2>
              <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                Synthesize insights from your active knowledge vault. Every answer is backed by verifiable vector citations.
              </p>
            </div>

            {/* Prompt Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 text-left max-w-xl mx-auto">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(prompt)}
                  className="p-3.5 rounded-2xl bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] hover:border-violet-500/50 text-xs text-slate-300 text-left transition-all cursor-pointer hover:scale-[1.01] active:scale-95 group shadow-sm hover:shadow-violet-500/10"
                >
                  <span className="leading-snug">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            // Transform raw inline citation numbers like [1], [2], [1][3] into markdown links [[1]](#citation-1)
            const processedContent = msg.content.replace(/\[(\d+)\]/g, '[[$1]](#citation-$1)');
            const detectedCards = msg.role === 'assistant' ? parseFlashcardsFromText(msg.content, msg.citations) : [];

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 max-w-5xl mx-auto w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-150 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
              >
                <div
                  className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center shrink-0 shadow-md mt-1 ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold shadow-violet-500/20'
                    : 'bg-gradient-to-br from-slate-900 to-[#0f172a] text-violet-400 border border-violet-500/30'
                    }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-5 md:p-6 rounded-2xl text-xs md:text-sm leading-relaxed space-y-4 shadow-xl ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-[#1e1b4b]/90 to-[#0f172a] text-violet-100 font-medium rounded-tr-none border border-violet-500/30 shadow-violet-500/10 max-w-xl md:max-w-2xl'
                    : 'bg-[#0f172a]/95 text-slate-200 border border-[#1e293b] rounded-tl-none flex-1 min-w-0 shadow-slate-950/50'
                    }`}
                >
                  {detectedCards.length > 0 ? (
                    <InteractiveFlashcards
                      cards={detectedCards}
                      onSelectCitation={(c) => onSelectCitation?.(c)}
                    />
                  ) : (
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => {
                          if (href?.startsWith('#citation-')) {
                            const citId = parseInt(href.replace('#citation-', ''), 10);
                            const citation =
                              msg.citations?.find((c) => c.id === citId) ||
                              msg.citations?.[citId - 1];

                            return (
                              <button
                                type="button"
                                onClick={() => citation && onSelectCitation?.(citation)}
                                className="synth-citation font-mono text-[11px] cursor-pointer"
                                title={
                                  citation
                                    ? `Inspect Citation [${citId}]: ${citation.sourceTitle}`
                                    : `Citation [${citId}]`
                                }
                              >
                                {children}
                              </button>
                            );
                          }
                          return (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-violet-400 hover:text-violet-300 underline font-semibold cursor-pointer"
                            >
                              {children}
                            </a>
                          );
                        },
                        p: ({ children }) => <p className="mb-3 leading-relaxed text-slate-200 last:mb-0 font-normal">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-white tracking-wide">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc pl-5 sm:pl-6 space-y-2.5 my-3 text-slate-200">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 sm:pl-6 space-y-3 my-4 text-slate-200 font-medium">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed text-slate-200 pl-1">{children}</li>,
                        pre: ({ children }) => <pre className="bg-[#090d16] p-3 rounded-xl border border-[#1e293b] overflow-x-auto max-w-full my-3 text-xs text-slate-200 font-mono">{children}</pre>,
                        code: ({ children }) => <code className="bg-violet-500/15 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded text-[11px] font-mono break-all">{children}</code>,
                      }}
                    >
                      {processedContent}
                    </ReactMarkdown>
                  )}

                  {/* Verified Citation Reference Pills Footer (only for normal messages) */}
                  {detectedCards.length === 0 && msg.citations && msg.citations.length > 0 && (
                    <div className="pt-3.5 border-t border-[#1e293b]/80 flex flex-wrap items-center gap-2 mt-4">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-violet-400 mr-1 flex items-center space-x-1 shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                        <span>Verified Source References:</span>
                      </span>
                      {msg.citations.map((c) => {
                        const citTitle = c.sourceTitle.length > 22 ? `${c.sourceTitle.slice(0, 20)}...` : c.sourceTitle;
                        return (
                          <button
                            key={c.id}
                            onClick={() => onSelectCitation?.(c)}
                            className="synth-citation text-[11px] font-mono px-2.5 py-1 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 transition-all cursor-pointer flex items-center space-x-1 hover:scale-105 shadow-sm"
                            title={`Inspect source passage: ${c.sourceTitle}`}
                          >
                            <span className="font-bold text-violet-400">[{c.id}]</span>
                            <span className="truncate max-w-[150px]">{citTitle}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Collaborative AI Proactive Next Action Suggestions */}
                  {idx === messages.length - 1 && msg.role === 'assistant' && !isLoading && (
                    <div className="pt-3.5 border-t border-[#1e293b]/60 mt-3.5 space-y-2 animate-in fade-in-0 duration-200">
                      <div className="flex items-center space-x-1.5 text-[10px] font-extrabold tracking-wider uppercase text-slate-400">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Research Partner Suggested Next Actions:</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onSendMessage('Explore related technical concepts and underlying mechanisms based on active sources')}
                          className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-105 shadow-sm"
                        >
                          <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Explore Related Concepts</span>
                        </button>

                        <button
                          onClick={() => onNavigateMode?.('discoveries')}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-105 shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Find Contradictions & Insights</span>
                        </button>

                        <button
                          onClick={() => onSendMessage('Create 5 practice recall flashcards')}
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-105 shadow-sm"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Create Recall Flashcards</span>
                        </button>

                        <button
                          onClick={() => onNavigateMode?.('roadmap')}
                          className="px-2.5 py-1 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-105 shadow-sm"
                        >
                          <Map className="w-3.5 h-3.5 text-violet-400" />
                          <span>Build Study Plan Roadmap</span>
                        </button>

                        <button
                          onClick={() => onNavigateMode?.('podcast')}
                          className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1.5 hover:scale-105 shadow-sm"
                        >
                          <Headphones className="w-3.5 h-3.5 text-rose-400" />
                          <span>Synthesize Audio Podcast</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isLoading && <AnimatedRAGLoading />}
      </div>

      {/* Bottom Input Floating Glass Dock */}
      <div className="p-4 md:p-6 bg-gradient-to-t from-[#070b12] via-[#070b12]/95 to-transparent border-t border-[#1e293b]/60 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full relative">
          <div className="bg-[#0b101d]/90 border border-violet-500/30 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl shadow-violet-500/10 backdrop-blur-xl transition-all flex items-center gap-3">
            <textarea
              rows={1}
              placeholder={
                activeSourceCount > 0
                  ? "Ask anything about your active knowledge sources..."
                  : "Ingest a source to start asking questions..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
              className="w-full bg-transparent text-slate-100 text-xs focus:outline-none resize-none placeholder:text-slate-500"
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 text-white font-bold flex items-center justify-center transition-all shadow-md shadow-violet-500/25 shrink-0"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>

      {/* Clear Chat History Confirmation Modal */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 bg-[#070b12]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-150 select-none">
          <div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl shadow-2xl space-y-4 my-auto relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-slate-100 pb-3 border-b border-[#1e293b]">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Clear Chat History?</h2>
                <p className="text-xs text-slate-400">This action will clear all messages in this workspace</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to reset and clear the current research chat history? Your ingested knowledge sources will remain completely safe.
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onClearMessages) onClearMessages();
                  setIsConfirmClearOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
