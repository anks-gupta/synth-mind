'use client';

import React, { useState } from 'react';
import { SourceItem, SourceType } from '@/lib/types';
import {
  FileText,
  Video,
  Globe,
  FileCode,
  Upload,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Info,
  Check,
  X,
  ExternalLink,
  FileCheck,
  Database,
  Folder,
  AlertCircle,
  Link2,
  AlertTriangle,
} from 'lucide-react';
import { formatSourceBadge } from '@/lib/utils';

interface SourcesPanelProps {
  sources: SourceItem[];
  activeSourceIds: string[];
  activeNotebook?: { title: string; description?: string | null } | null;
  isLoadingSources?: boolean;
  onToggleSource: (id: string) => void;
  onAddSource: (payload: { type: SourceType; title: string; contentOrUrl?: string; file?: File }) => void;
  onDeleteSource: (id: string) => void;
}

export function SourcesPanel({
  sources,
  activeSourceIds,
  activeNotebook,
  isLoadingSources = false,
  onToggleSource,
  onAddSource,
  onDeleteSource,
}: SourcesPanelProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingSource, setDeletingSource] = useState<SourceItem | null>(null);

  const [selectedType, setSelectedType] = useState<SourceType>('youtube');
  const [titleInput, setTitleInput] = useState('');
  const [urlOrTextInput, setUrlOrTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (selectedType === 'pdf' && !selectedFile) return;
    if (selectedType === 'vtt' && !selectedFile && !urlOrTextInput.trim()) return;
    if (selectedType !== 'pdf' && selectedType !== 'vtt' && !urlOrTextInput.trim()) return;

    setIsSubmitting(true);
    try {
      let autoTitle = titleInput.trim();
      if (!autoTitle) {
        if ((selectedType === 'pdf' || selectedType === 'vtt') && selectedFile) {
          autoTitle = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        } else if (selectedType === 'text' || selectedType === 'vtt') {
          const words = urlOrTextInput.trim().split(/\s+/).slice(0, 6).join(' ');
          autoTitle = words ? `${words}...` : `${selectedType.toUpperCase()} Note`;
        }
      }

      await onAddSource({
        type: selectedType,
        title: autoTitle,
        contentOrUrl: urlOrTextInput.trim(),
        file: selectedFile || undefined,
      });

      setTitleInput('');
      setUrlOrTextInput('');
      setSelectedFile(null);
      setModalError(null);
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Failed to ingest source');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteSource = async () => {
    if (deletingSource) {
      setIsDeleting(true);
      try {
        await onDeleteSource(deletingSource.id);
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(false);
        setDeletingSource(null);
      }
    }
  };

  const handleSelectAllToggle = () => {
    const allIds = sources.map((s) => s.id);
    const areAllSelected = sources.length > 0 && activeSourceIds.length === sources.length;

    if (areAllSelected) {
      allIds.forEach((id) => {
        if (activeSourceIds.includes(id)) onToggleSource(id);
      });
    } else {
      allIds.forEach((id) => {
        if (!activeSourceIds.includes(id)) onToggleSource(id);
      });
    }
  };

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'pdf':
        return (
          <span title="PDF Document Source" className="shrink-0 flex items-center">
            <FileText className="w-4 h-4 text-emerald-400" />
          </span>
        );
      case 'youtube':
        return (
          <span title="YouTube Video Lecture" className="shrink-0 flex items-center">
            <Video className="w-4 h-4 text-rose-400" />
          </span>
        );
      case 'url':
        return (
          <span title="Web Article Link" className="shrink-0 flex items-center">
            <Globe className="w-4 h-4 text-cyan-400" />
          </span>
        );
      case 'vtt':
        return (
          <span title="VTT Subtitle Transcript" className="shrink-0 flex items-center">
            <FileCode className="w-4 h-4 text-amber-400" />
          </span>
        );
      case 'text':
      default:
        return (
          <span title="Text Note Source" className="shrink-0 flex items-center">
            <FileCheck className="w-4 h-4 text-violet-400" />
          </span>
        );
    }
  };

  const getCleanTitle = (title: string, type: SourceType): string => {
    if (!title) return `${type.toUpperCase()} Source`;
    const trimmed = title.trim();
    if (/^WEBVTT/i.test(trimmed) || /^\d{2}:\d{2}\.\d{3}/.test(trimmed)) {
      return 'VTT Subtitle Transcript';
    }
    return title;
  };

  const getSourceTypeBorder = (type: SourceType) => {
    switch (type) {
      case 'pdf': return 'border-l-emerald-500';
      case 'youtube': return 'border-l-rose-500';
      case 'url': return 'border-l-cyan-500';
      case 'vtt': return 'border-l-amber-500';
      case 'text': return 'border-l-indigo-500';
    }
  };

  const allSelected = sources.length > 0 && activeSourceIds.length === sources.length;

  return (
    <aside className="w-full lg:w-80 border-r border-[#1e293b] bg-[#0f172a] flex flex-col h-full shrink-0 select-none overflow-hidden">
      {/* Knowledge Vault Header */}
      <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#070b12]/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/40 flex items-center justify-center text-violet-400 shadow-md shadow-violet-500/10">
            <Database className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400">
              Knowledge Vault
            </h2>
            <span className="text-[9px] font-medium tracking-wide text-slate-400 block -mt-0.5">
              Vector Grounding Engine
            </span>
          </div>
        </div>
      </div>

      {/* Active Workspace Info Card */}
      {activeNotebook && (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-[#070b12]/80 border border-violet-500/30 shadow-md">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-violet-400 shrink-0" />
            <h3 className="text-xs font-black text-white truncate">{activeNotebook.title}</h3>
          </div>
          {activeNotebook.description && (
            <p className="text-[11px] font-medium text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {activeNotebook.description}
            </p>
          )}
        </div>
      )}

      <div className="p-4">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Ingest Source</span>
        </button>
      </div>

      {/* Select All Toggle */}
      {sources.length > 0 && (
        <div className="px-4 py-2 border-t border-b border-[#1e293b] flex items-center justify-between text-xs text-slate-400 bg-[#070b12]/60">
          <span className="font-semibold text-[11px] tracking-wide">Active In Search</span>
          <button
            onClick={handleSelectAllToggle}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              allSelected
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Select All</span>
          </button>
        </div>
      )}

      {/* Source Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingSources ? (
          <div className="space-y-3 animate-in fade-in-0 duration-200">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-[#0f172a]/60 border border-[#1e293b] space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-lg bg-slate-800 animate-pulse" />
                  <div className="w-5 h-5 rounded-lg bg-slate-800 animate-pulse" />
                  <div className="h-3.5 bg-slate-800 rounded-full w-2/3 animate-pulse" />
                </div>
                <div className="flex items-center space-x-2 pl-8">
                  <div className="h-3 bg-slate-800/60 rounded-full w-14 animate-pulse" />
                  <div className="h-3 bg-violet-500/20 rounded-full w-16 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#0b101d]/60 border border-[#1e293b] text-center space-y-3.5 my-2 animate-in fade-in-0 duration-200">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-100">Knowledge Base Empty</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Add PDFs, YouTube video lectures, Web URLs, or VTT transcripts to ground your AI assistant in real evidence.
              </p>
            </div>

            <div className="pt-2 border-t border-[#1e293b]/60 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Quick Demo Ingest:</span>
              <button
                type="button"
                onClick={() => onAddSource({
                  type: 'youtube',
                  title: '',
                  contentOrUrl: 'https://www.youtube.com/watch?v=bBC-nXj3Ng4'
                })}
                className="w-full py-1.5 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer hover:scale-[1.01]"
              >
                <Video className="w-3.5 h-3.5 text-rose-400" />
                <span>+ Add Sample YouTube Source</span>
              </button>
            </div>
          </div>
        ) : (
          sources.map((source) => {
            const isChecked = activeSourceIds.includes(source.id);
            const borderAccent = getSourceTypeBorder(source.type);
            const isError = source.status === 'error';

            return (
                <div
                  key={source.id}
                  onClick={() => onToggleSource(source.id)}
                  className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer group ${
                    isError
                      ? 'bg-rose-950/20 border-rose-500/40 text-slate-200'
                      : isChecked
                      ? 'bg-violet-950/20 border-violet-500/30 text-slate-100 shadow-sm'
                      : 'bg-[#0b101d]/60 border-[#1e293b]/70 text-slate-400 hover:bg-[#111827] hover:border-slate-700/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      {/* Selection Checkbox */}
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-all border shrink-0 ${
                          isChecked
                            ? isError
                              ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                              : 'bg-violet-600 border-violet-500 text-white shadow-sm'
                            : isError
                            ? 'border-rose-500/50 bg-[#070b12] text-transparent group-hover:border-rose-400'
                            : 'border-[#334155] bg-[#070b12] text-transparent group-hover:border-slate-500'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>

                      {/* Sleek Source Type Icon */}
                      {getSourceIcon(source.type)}

                      {/* Title & Error Subtitle */}
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-xs font-semibold truncate block leading-snug ${
                            isChecked ? 'text-slate-100' : 'text-slate-300 group-hover:text-slate-100'
                          }`}
                          title={getCleanTitle(source.title, source.type)}
                        >
                          {getCleanTitle(source.title, source.type)}
                        </span>

                        {isError && (
                          <span
                            className="text-[11px] text-rose-200 font-medium leading-normal truncate block mt-1 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-lg"
                            title={source.errorMessage || 'Failed to extract text content'}
                          >
                            ⚠️ {source.errorMessage || 'Failed to extract text content'}
                          </span>
                        )}
                      </div>

                      {/* Active Non-Ready Status Indicators */}
                      {source.status === 'pending' && (
                        <span title="Status: Uploading & extracting text..." className="shrink-0 flex items-center">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        </span>
                      )}

                      {source.status === 'indexing' && (
                        <span title="Status: Indexing vectors into Qdrant..." className="shrink-0 flex items-center">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                        </span>
                      )}

                      {isError && (
                        <span title={`Status: Ingestion Failed (${source.errorMessage || 'Content unavailable'})`} className="shrink-0 flex items-center">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        </span>
                      )}
                    </div>

                    {/* Actions: Always visible if error, otherwise on hover */}
                    <div className={`flex items-center space-x-0.5 shrink-0 transition-opacity ${isError ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {source.urlOrPath && (source.type === 'youtube' || source.type === 'url' || source.type === 'pdf') && (
                        <a
                          href={source.urlOrPath}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={`Open original ${source.type === 'youtube' ? 'YouTube video' : source.type === 'url' ? 'web article' : 'document'}`}
                          className="text-slate-400 hover:text-cyan-300 p-1 rounded-lg hover:bg-[#334155]/60 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingSource(source);
                        }}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
                        title="Remove Failed Source"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
          })
        )}
      </div>

      {/* Sidebar Footer Storage & System Status */}
      <div className="p-3.5 border-t border-[#1e293b] bg-[#070b12]/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-slate-300">RAG Vector Index Online</span>
        </div>
        <span className="font-mono text-violet-400 font-semibold">{sources.filter((s) => s.status === 'ready').length}/{sources.length} Ready</span>
      </div>

      {/* Styled Add Source Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#070b12]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in-0 duration-150 select-text">
          <div className="w-full max-w-lg bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl shadow-2xl space-y-4 my-auto relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-slate-100 pb-3 border-b border-[#1e293b]">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Ingest Knowledge Source</h2>
                <p className="text-xs text-slate-400">Title will auto-extract if left empty</p>
              </div>
            </div>

            {/* Type Switcher Tabs */}
            <div className="grid grid-cols-5 gap-1.5 bg-[#070b12] p-1.5 rounded-xl border border-[#1e293b]">
              {(['youtube', 'pdf', 'url', 'vtt', 'text'] as SourceType[]).map((t) => {
                const isActive = selectedType === t;
                const activeTabClasses =
                  t === 'youtube'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                    : t === 'pdf'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : t === 'url'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                    : t === 'vtt'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm';

                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center space-y-1 transition-all border ${
                      isActive
                        ? `${activeTabClasses} font-bold`
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]/60'
                    }`}
                  >
                    {getSourceIcon(t)}
                    <span className="text-[10px]">{formatSourceBadge(t)}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Source Title (Optional - Auto-Extracted)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chai aur Code DSA, Pydantic AI Guide..."
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
                />
              </div>

              {selectedType === 'pdf' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Upload PDF Document *
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1e293b] file:text-emerald-400 hover:file:bg-[#334155] cursor-pointer"
                  />
                </div>
              ) : selectedType === 'youtube' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    YouTube Video URL *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={urlOrTextInput}
                      onChange={(e) => setUrlOrTextInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
                    />
                    <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>
                </div>
              ) : selectedType === 'url' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Website Article Link *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      placeholder="https://pydantic.dev/docs/ai/harness/guardrails/"
                      value={urlOrTextInput}
                      onChange={(e) => setUrlOrTextInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 transition-all"
                    />
                    <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>
                </div>
              ) : selectedType === 'vtt' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Upload VTT Transcript File (*.vtt, *.txt)
                    </label>
                    <input
                      type="file"
                      accept=".vtt,.txt"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1e293b] file:text-amber-400 hover:file:bg-[#334155] cursor-pointer"
                    />
                  </div>

                  <div className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    — OR PASTE VTT TEXT BELOW —
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      placeholder={"WEBVTT\n00:00:01.000 --> 00:00:05.000\nHello and welcome..."}
                      value={urlOrTextInput}
                      onChange={(e) => setUrlOrTextInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 font-mono resize-none transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Plain Text Notes *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Paste raw notes or transcript text here..."
                    value={urlOrTextInput}
                    onChange={(e) => setUrlOrTextInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40 font-mono resize-none transition-all"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-violet-500/25 flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting Source...</span>
                    </>
                  ) : (
                    <span>Ingest &amp; Index</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSource && (
        <div className="fixed inset-0 bg-[#070b12]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-[#0f172a] border border-[#1e293b] p-5 rounded-2xl shadow-2xl space-y-4 my-auto">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Delete Source?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">"{deletingSource.title}"</span>? All vector embeddings will be removed.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1e293b]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingSource(null)}
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] disabled:opacity-50 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteSource}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-rose-500/20 flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Removing Vectors...</span>
                  </>
                ) : (
                  <span>Delete Source</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
