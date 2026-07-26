'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Citation } from '@/lib/types';
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Eye,
  Trophy,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { fireCelebrationConfetti } from '@/lib/confetti';

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  citationId?: number;
  citation?: Citation;
}

interface InteractiveFlashcardsProps {
  cards: Flashcard[];
  onSelectCitation?: (citation: Citation) => void;
}

export function InteractiveFlashcards({ cards, onSelectCitation }: InteractiveFlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<number[]>([]);

  const totalCards = cards?.length || 0;
  const currentCard = cards?.[currentIndex];

  const handleNext = useCallback(() => {
    if (totalCards === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % totalCards);
  }, [totalCards]);

  const handlePrev = useCallback(() => {
    if (totalCards === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + totalCards) % totalCards);
  }, [totalCards]);

  const toggleMastered = useCallback((id: number) => {
    setMasteredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (next.length === totalCards && totalCards > 0) {
        fireCelebrationConfetti();
      }
      return next;
    });
  }, [totalCards]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs/textareas
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key.toLowerCase() === 'm' && currentCard) {
        e.preventDefault();
        toggleMastered(currentCard.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, toggleMastered, currentCard]);

  if (!cards || totalCards === 0 || !currentCard) return null;

  const isMastered = masteredIds.includes(currentCard.id);
  const progressPercent = Math.round(((currentIndex + 1) / totalCards) * 100);
  const masteredPercent = Math.round((masteredIds.length / totalCards) * 100);

  return (
    <div className="my-4 sm:my-6 w-full max-w-[720px] mx-auto select-none p-3.5 sm:p-5 md:p-8 bg-[#0B1120] rounded-2xl sm:rounded-3xl border border-white/[0.08] shadow-2xl space-y-4 sm:space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0 shadow-lg shadow-violet-500/10">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#F9FAFB] tracking-tight truncate">
              Interactive Recall Deck
            </h3>
            <p className="text-xs text-[#9CA3AF] font-medium truncate">
              Card <span className="text-violet-400 font-semibold">{currentIndex + 1}</span> of {totalCards} • <span className="text-emerald-400 font-semibold">{masteredIds.length}</span> Mastered ({masteredPercent}%)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toggleMastered(currentCard.id)}
          aria-label={isMastered ? 'Card mastered' : 'Mark card as mastered'}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-2 border shrink-0 cursor-pointer shadow-sm ${
            isMastered
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-[#111827] text-[#9CA3AF] border-white/[0.08] hover:text-[#F9FAFB] hover:border-violet-500/40'
          }`}
        >
          <CheckCircle2 className={`w-4 h-4 ${isMastered ? 'text-emerald-400' : 'text-[#9CA3AF]'}`} />
          <span>{isMastered ? 'Mastered' : 'Mark Mastered'}</span>
        </button>
      </div>

      {/* 2. Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
          <span>Deck Completion</span>
          <span className="text-violet-400 font-bold">{progressPercent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#111827] border border-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500 transition-all duration-300 rounded-full shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. Hero Flashcard Section */}
      <div
        onClick={() => setIsFlipped((prev) => !prev)}
        className="w-full cursor-pointer perspective-1000 group relative min-h-[320px] sm:min-h-[380px]"
      >
        <div
          className={`w-full h-full min-h-[320px] sm:min-h-[380px] duration-500 transform-style-3d transition-all ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT SIDE (Question) */}
          <div className="w-full h-full min-h-[320px] sm:min-h-[380px] rounded-2xl sm:rounded-3xl bg-[#111827] border border-white/[0.08] p-4 sm:p-6 md:p-8 flex flex-col justify-between backface-hidden shadow-[0_0_30px_rgba(139,92,246,0.08)] group-hover:border-violet-500/50 group-hover:shadow-[0_0_40px_rgba(139,92,246,0.2)] group-hover:-translate-y-1 transition-all duration-300 space-y-4 sm:space-y-6">
            {/* Top Badge Row */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 gap-2">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-violet-400 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 shrink-0">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Question</span>
              </span>
              <span className="text-xs text-[#9CA3AF] font-mono flex items-center space-x-1 shrink-0">
                <RotateCw className="w-3 h-3 text-violet-400" />
                <span className="hidden sm:inline">Click card to reveal answer</span>
                <span className="sm:hidden">Tap to flip</span>
              </span>
            </div>

            {/* Question Center Content */}
            <div className="py-2 text-center my-auto min-h-[100px] flex items-center justify-center">
              <div className="text-base sm:text-xl md:text-2xl font-semibold text-[#F9FAFB] leading-relaxed max-w-full overflow-y-auto max-h-[280px] px-1 font-sans">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <span>{children}</span>,
                    code: ({ children }) => (
                      <code className="bg-violet-500/20 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded-lg text-sm font-mono">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {currentCard.front}
                </ReactMarkdown>
              </div>
            </div>

            {/* Bottom Interactive Area */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-center space-x-2 text-xs text-violet-400 font-bold group-hover:text-violet-300 transition-colors">
              <Eye className="w-4 h-4" />
              <span>Click anywhere to reveal answer</span>
            </div>
          </div>

          {/* BACK SIDE (Answer State) */}
          <div className="absolute inset-0 w-full h-full rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#17153b] via-[#111827] to-[#0d1322] border border-violet-500/40 p-4 sm:p-6 md:p-8 flex flex-col justify-between backface-hidden rotate-y-180 shadow-[0_0_40px_rgba(139,92,246,0.25)] overflow-hidden">
            {/* Top Question Context */}
            <div className="space-y-1.5 text-left pb-3 border-b border-white/[0.08] shrink-0">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-violet-400 flex items-center space-x-1">
                <HelpCircle className="w-3 h-3" />
                <span>Question Context</span>
              </span>
              <p className="text-xs font-medium text-[#9CA3AF] line-clamp-2">
                {currentCard.front}
              </p>
            </div>

            {/* Single Answer Scroll Area (Eliminates Double Scrollbars) */}
            <div className="flex-1 overflow-y-auto pr-1 my-2 space-y-3 text-left">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-emerald-400 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-max">
                <Check className="w-3.5 h-3.5" />
                <span>Answer</span>
              </span>

              <div className="text-base sm:text-lg font-medium text-emerald-100 leading-relaxed font-sans">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <span>{children}</span>,
                    code: ({ children }) => (
                      <code className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-lg text-xs font-mono">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {currentCard.back}
                </ReactMarkdown>
              </div>

              {currentCard.citationId && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentCard.citation) {
                        onSelectCitation?.(currentCard.citation);
                      }
                    }}
                    className="text-xs font-mono px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 font-bold inline-flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <span>Source #{currentCard.citationId}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Interactive Area */}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-center space-x-2 text-xs text-emerald-400 font-bold group-hover:text-emerald-300 transition-colors shrink-0">
              <RotateCw className="w-4 h-4" />
              <span>Click anywhere to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Navigation Row */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-3 pt-2 w-full min-w-0">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Previous card"
          className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#111827] hover:bg-[#1f2937] border border-white/[0.08] text-[#F9FAFB] text-xs font-bold transition-all flex items-center justify-center space-x-1 sm:space-x-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm min-w-0 shrink"
        >
          <ChevronLeft className="w-4 h-4 text-[#9CA3AF] shrink-0" />
          <span className="truncate">Previous</span>
        </button>

        <div className="text-xs font-mono font-bold text-[#F9FAFB] px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#111827] border border-white/[0.06] shadow-inner shrink-0 select-none">
          {currentIndex + 1} / {totalCards}
        </div>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next card"
          className="flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1 sm:space-x-2 cursor-pointer shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 min-w-0 shrink"
        >
          <span className="truncate">Next</span>
          <ChevronRight className="w-4 h-4 shrink-0" />
        </button>
      </div>

      {/* 5. Keyboard Shortcuts Helper Legend (Desktop Only) */}
      <div className="pt-2 hidden sm:flex items-center justify-center space-x-3 text-[10px] font-mono text-[#9CA3AF] border-t border-white/[0.06]">
        <span className="flex items-center space-x-1">
          <kbd className="px-1.5 py-0.5 rounded bg-[#111827] border border-white/[0.1] text-violet-300">←</kbd>
          <span>Prev</span>
        </span>
        <span className="flex items-center space-x-1">
          <kbd className="px-1.5 py-0.5 rounded bg-[#111827] border border-white/[0.1] text-violet-300">Space</kbd>
          <span>Flip</span>
        </span>
        <span className="flex items-center space-x-1">
          <kbd className="px-1.5 py-0.5 rounded bg-[#111827] border border-white/[0.1] text-violet-300">→</kbd>
          <span>Next</span>
        </span>
        <span className="flex items-center space-x-1">
          <kbd className="px-1.5 py-0.5 rounded bg-[#111827] border border-white/[0.1] text-violet-300">M</kbd>
          <span>Master</span>
        </span>
      </div>

      {/* 6. Congratulatory Deck Mastery Banner */}
      {masteredIds.length === totalCards && totalCards > 0 && (
        <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/50 text-center space-y-2 animate-in fade-in-0 duration-300 shadow-2xl shadow-emerald-500/20">
          <h4 className="text-sm font-black text-emerald-300 tracking-wide uppercase flex items-center justify-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>🎉 Deck Fully Mastered!</span>
          </h4>
          <p className="text-xs text-emerald-200/90 font-medium max-w-md mx-auto leading-relaxed">
            Outstanding work! You've successfully reviewed and mastered all {totalCards} flashcards in this recall deck.
          </p>
        </div>
      )}
    </div>
  );
}
