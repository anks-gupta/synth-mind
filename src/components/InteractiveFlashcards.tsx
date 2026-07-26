'use client';

import React, { useState } from 'react';
import { Citation } from '@/lib/types';
import { RotateCw, ChevronLeft, ChevronRight, CheckCircle, Sparkles, HelpCircle, Eye, Trophy } from 'lucide-react';
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

  if (!cards || cards.length === 0) return null;

  const currentCard = cards[currentIndex];
  const isMastered = masteredIds.includes(currentCard.id);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const toggleMastered = (id: number) => {
    setMasteredIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (next.length === cards.length && cards.length > 0) {
        fireCelebrationConfetti();
      }
      return next;
    });
  };

  return (
    <div className="my-6 max-w-xl mx-auto space-y-4 select-none">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wide text-white">Interactive Recall Deck</h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Card {currentIndex + 1} of {cards.length} • {masteredIds.length} Mastered
            </span>
          </div>
        </div>

        <button
          onClick={() => toggleMastered(currentCard.id)}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border cursor-pointer ${
            isMastered
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-[#0f172a] text-slate-400 border-[#1e293b] hover:text-slate-200'
          }`}
        >
          <CheckCircle className={`w-3.5 h-3.5 ${isMastered ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>{isMastered ? 'Mastered' : 'Mark Mastered'}</span>
        </button>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-64 cursor-pointer perspective-1000 group"
      >
        <div
          className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT SIDE (Question) */}
          <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-[#0f172a] to-[#090d16] border border-violet-500/30 p-6 flex flex-col justify-between backface-hidden shadow-xl group-hover:border-violet-500/60 transition-colors">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
              <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider text-violet-400 flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Question</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Click card to reveal answer ↺</span>
            </div>

            <div className="flex-1 flex items-center justify-center text-center p-2">
              <div className="text-sm font-bold text-slate-100 leading-relaxed max-w-full overflow-hidden">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <span>{children}</span>,
                    code: ({ children }) => (
                      <code className="bg-violet-500/20 text-violet-300 border border-violet-500/40 px-1.5 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {currentCard.front}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-1.5 text-xs text-violet-400 font-bold">
              <Eye className="w-3.5 h-3.5" />
              <span>Tap to Flip Answer</span>
            </div>
          </div>

          {/* BACK SIDE (Answer & Citation) */}
          <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-[#1e1b4b]/95 to-[#0f172a] border border-emerald-500/40 p-6 flex flex-col justify-between backface-hidden rotate-y-180 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
              <span className="text-[10px] uppercase font-mono font-extrabold tracking-wider text-emerald-400 flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Answer & Citation</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Tap card to flip back</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-2 space-y-3">
              <div className="text-xs md:text-sm font-medium text-emerald-100 leading-relaxed max-w-full overflow-hidden">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <span>{children}</span>,
                    code: ({ children }) => (
                      <code className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded text-xs font-mono">
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
                    className="synth-citation text-[11px] font-mono px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 font-bold inline-flex items-center space-x-1 cursor-pointer transition-all hover:scale-105 shadow-sm"
                    title={currentCard.citation ? `Inspect Ground Truth Passage: ${currentCard.citation.sourceTitle}` : `Source Reference [${currentCard.citationId}]`}
                  >
                    <span>Source Reference [{currentCard.citationId}]</span>
                    {currentCard.citation?.sourceTitle && (
                      <span className="opacity-80 text-[10px] truncate max-w-[120px]">
                        ({currentCard.citation.sourceTitle})
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-400 font-bold">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Tap to Flip Question</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={handlePrev}
          className="px-3.5 py-2 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-105"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {/* Progress Dots */}
        <div className="flex items-center space-x-1.5">
          {cards.map((c, i) => (
            <div
              key={c.id}
              onClick={() => {
                setIsFlipped(false);
                setCurrentIndex(i);
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                i === currentIndex
                  ? 'w-6 bg-violet-500'
                  : masteredIds.includes(c.id)
                  ? 'w-2 bg-emerald-500'
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-violet-500/25 hover:scale-105"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Congratulatory Celebration Banner */}
      {masteredIds.length === cards.length && cards.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 border border-emerald-500/50 text-center space-y-1 animate-in fade-in-0 duration-300 shadow-xl shadow-emerald-500/10">
          <h4 className="text-xs font-black text-emerald-300 tracking-wide uppercase flex items-center justify-center space-x-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>🎉 Deck Fully Mastered!</span>
          </h4>
          <p className="text-[11px] text-emerald-200/90 font-medium">
            Outstanding work! You've successfully reviewed and mastered all {cards.length} flashcards in this deck.
          </p>
        </div>
      )}
    </div>
  );
}
