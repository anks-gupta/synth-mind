'use client';

import React, { useState, useEffect } from 'react';
import { Citation } from '@/lib/types';
import { X, Video, FileText, Globe, Play, ExternalLink, MessageSquareText, Loader2 } from 'lucide-react';
import { extractYouTubeVideoId } from '@/lib/parsers/youtube-parser';
import { formatSeconds } from '@/lib/utils';

interface SourceViewerProps {
  citation: Citation | null;
  onClose: () => void;
}

export function SourceViewer({ citation, onClose }: SourceViewerProps) {
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  useEffect(() => {
    setIsIframeLoading(true);
  }, [citation?.id, citation?.sourceId]);

  if (!citation) return null;

  const isYouTube = citation.sourceType === 'youtube';
  const isPdf = citation.sourceType === 'pdf';
  const isVtt = citation.sourceType === 'vtt';
  const isText = citation.sourceType === 'text';
  const isWeb = citation.sourceType === 'url';

  // Extract YouTube video ID reliably from videoId, urlOrPath, or sourceTitle
  let videoId: string | null = citation.videoId || null;
  if (!videoId && citation.urlOrPath) {
    videoId = extractYouTubeVideoId(citation.urlOrPath);
  }

  const directYouTubeUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}&t=${citation.startTime || 0}s`
    : null;

  const isExternalUrl = citation.urlOrPath && /^https?:\/\//i.test(citation.urlOrPath);

  return (
    <div className="border-t border-[#1e2942] bg-[#0e1526] p-4 relative z-30 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-3 border-b border-[#1e2942] pb-2">
        <div className="flex items-center space-x-2">
          {isYouTube ? (
            <Video className="w-4 h-4 text-rose-400" />
          ) : isPdf ? (
            <FileText className="w-4 h-4 text-emerald-400" />
          ) : isVtt ? (
            <MessageSquareText className="w-4 h-4 text-amber-400" />
          ) : isText ? (
            <FileText className="w-4 h-4 text-violet-400" />
          ) : (
            <Globe className="w-4 h-4 text-cyan-400" />
          )}
          <span className="text-xs font-bold text-slate-100">{citation.sourceTitle}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
            {isYouTube ? 'YouTube Video Citation' : isPdf ? 'PDF Reference' : isVtt ? 'Transcript Citation' : isText ? 'Text Notes' : 'Web Article'}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {isYouTube && directYouTubeUrl ? (
            <a
              href={directYouTubeUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-1.5 transition-all hover:scale-105"
              title="Watch video on YouTube"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : isPdf && citation.sourceId ? (
            <a
              href={`/api/sources/${citation.sourceId}/download#page=${citation.pageNumber || 1}`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center space-x-1.5 transition-all hover:scale-105"
              title="Open PDF at page"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open PDF (Page {citation.pageNumber || 1})</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : isWeb && isExternalUrl ? (
            <a
              href={citation.urlOrPath!}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center space-x-1.5 transition-all hover:scale-105"
              title="Open external article"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Open Article</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : citation.sourceId ? (
            <a
              href={`/api/sources/${citation.sourceId}/download`}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold flex items-center space-x-1.5 transition-all hover:scale-105"
              title="Download original source file"
            >
              <span>Download File</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : null}

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1e2942] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Media Embed / Preview */}
        <div className="aspect-video bg-[#090d16] rounded-xl border border-[#1e2942] flex items-center justify-center overflow-hidden relative group">
          {isYouTube && videoId ? (
            <>
              {isIframeLoading && (
                <div className="absolute inset-0 bg-[#090d16] flex flex-col items-center justify-center space-y-2 z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                  <span className="text-[11px] font-semibold text-slate-300">
                    Loading YouTube video stream ({formatSeconds(citation.startTime)})...
                  </span>
                </div>
              )}
              <iframe
                className={`w-full h-full transition-opacity duration-300 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?start=${citation.startTime || 0}&autoplay=1`}
                title={citation.sourceTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                onLoad={() => setIsIframeLoading(false)}
              />
            </>
          ) : isYouTube ? (
            <div className="text-center p-4">
              <Video className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">YouTube Video Citation</p>
              {citation.startTime !== undefined && (
                <p className="text-[11px] text-sky-400 font-mono mt-1">
                  Timestamp: {formatSeconds(citation.startTime)}
                </p>
              )}
            </div>
          ) : isPdf && citation.sourceId ? (
            <>
              {isIframeLoading && (
                <div className="absolute inset-0 bg-[#090d16] flex flex-col items-center justify-center space-y-2 z-10">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span className="text-[11px] font-semibold text-slate-300">
                    Loading PDF document preview (Page {citation.pageNumber || 1})...
                  </span>
                </div>
              )}
              <iframe
                className={`w-full h-full border-0 rounded-xl bg-white transition-opacity duration-300 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
                src={`/api/sources/${citation.sourceId}/download#page=${citation.pageNumber || 1}`}
                title={citation.sourceTitle}
                onLoad={() => setIsIframeLoading(false)}
              />
            </>
          ) : isPdf ? (
            <div className="text-center p-4">
              <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">PDF Document Reference</p>
              <p className="text-[11px] text-emerald-400 font-mono mt-1">
                Page Number: {citation.pageNumber || 1}
              </p>
            </div>
          ) : isVtt ? (
            <div className="text-center p-4">
              <MessageSquareText className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">WebVTT Transcript Reference</p>
              {citation.startTime !== undefined && (
                <p className="text-[11px] text-amber-400 font-mono mt-1">
                  Timestamp: {formatSeconds(citation.startTime)}
                </p>
              )}
            </div>
          ) : isText ? (
            <div className="text-center p-4">
              <FileText className="w-8 h-8 text-violet-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">Plain Text Research Notes</p>
              <p className="text-[11px] text-violet-300 font-mono mt-1">
                Workspace Note Source
              </p>
            </div>
          ) : (
            <div className="text-center p-4">
              <Globe className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">Web Article Citation</p>
            </div>
          )}
        </div>

        {/* Text Snippet Citation Highlight */}
        <div className="flex flex-col justify-between bg-[#141c30] p-3.5 rounded-xl border border-[#1e2942]">
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-2 uppercase tracking-wider">
              <span>Verified Source Passage:</span>
              {citation.startTime !== undefined && (
                <span className="text-sky-400 font-mono flex items-center space-x-1 font-bold">
                  <Play className="w-3 h-3 fill-sky-400" />
                  <span>{formatSeconds(citation.startTime)}</span>
                </span>
              )}
              {citation.pageNumber !== undefined && (
                <span className="text-emerald-400 font-mono">
                  Page {citation.pageNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-200 italic border-l-2 border-sky-400 pl-3 py-1.5 bg-sky-500/5 rounded-r-lg font-sans leading-relaxed max-h-48 overflow-y-auto">
              "{citation.textSnippet || 'Passage content inspected from workspace source.'}"
            </p>
          </div>

          <div className="pt-3 border-t border-[#1e2942] flex items-center justify-between">
            {directYouTubeUrl ? (
              <a
                href={directYouTubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold hover:underline"
              >
                <span>Open YouTube at {formatSeconds(citation.startTime)}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : isPdf && citation.sourceId ? (
              <a
                href={`/api/sources/${citation.sourceId}/download#page=${citation.pageNumber || 1}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
              >
                <span>Open PDF at Page {citation.pageNumber || 1}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : isExternalUrl ? (
              <a
                href={citation.urlOrPath!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
              >
                <span>Open Original Article</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-[10px] text-slate-400 italic">
                Verified ground truth source citation
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
