'use client';

import React, { useState } from 'react';
import { NotebookItem } from '@/lib/types';
import {
  Brain,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  MessageSquare,
  Map,
  Headphones,
  Sparkles,
  Loader2,
  FolderPlus,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  notebooks: NotebookItem[];
  activeNotebook: NotebookItem | null;
  isLoadingNotebooks?: boolean;
  activeMode: 'chat' | 'roadmap' | 'podcast' | 'discoveries';
  onChangeMode: (mode: 'chat' | 'roadmap' | 'podcast' | 'discoveries') => void;
  onSelectNotebook: (notebook: NotebookItem) => void;
  onCreateNotebook: (title: string, description?: string) => void;
  onRenameNotebook?: (id: string, title: string, description?: string) => void;
  onDeleteNotebook: (id: string) => void;
  sourceCount?: number;
  onToggleMobileSources?: () => void;
}

export function Navbar({
  notebooks,
  activeNotebook,
  isLoadingNotebooks = false,
  activeMode,
  onChangeMode,
  onSelectNotebook,
  onCreateNotebook,
  onRenameNotebook,
  onDeleteNotebook,
  sourceCount = 0,
  onToggleMobileSources,
}: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [renamingNotebook, setRenamingNotebook] = useState<NotebookItem | null>(null);
  const [deletingNotebook, setDeletingNotebook] = useState<NotebookItem | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateNotebook(newTitle.trim(), newDesc.trim());
    setNewTitle('');
    setNewDesc('');
    setIsCreateModalOpen(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingNotebook || !editTitle.trim()) return;
    if (onRenameNotebook) {
      onRenameNotebook(renamingNotebook.id, editTitle.trim(), editDesc.trim());
    }
    setRenamingNotebook(null);
    setEditTitle('');
    setEditDesc('');
  };

  const confirmDeleteNotebook = () => {
    if (deletingNotebook) {
      onDeleteNotebook(deletingNotebook.id);
      setDeletingNotebook(null);
    }
  };

  return (
    <>
      <header className="border-b border-[#1e293b] backdrop-blur-xl bg-[#070b12]/95 sticky top-0 z-40 select-none shadow-[0_1px_0_0_rgba(139,92,246,0.12)]">
        {/* Primary Navbar Row */}
        <div className="h-16 px-3 sm:px-6 flex items-center justify-between gap-2">
          {/* Left: SynthMind Logo & Notebook Dropdown */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <BrandLogo size="md" />

            <div className="h-4 w-px bg-[#1e293b] hidden sm:block shrink-0" />

            {/* Notebook Dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-slate-200 text-xs font-semibold transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <span className="truncate max-w-[90px] xs:max-w-[120px] sm:max-w-[180px]">
                  {activeNotebook?.title || 'Select Workspace'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isDropdownOpen && (
                <>
                  {/* Backdrop overlay on mobile */}
                  <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden"
                    onClick={() => setIsDropdownOpen(false)}
                  />

                  <div className="fixed inset-x-3 top-16 sm:absolute sm:top-11 sm:left-0 sm:inset-auto w-auto sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[#0f172a] border border-[#1e293b] shadow-2xl p-3 z-50 animate-in fade-in-0 slide-in-from-top-2 duration-150">
                    <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider flex items-center justify-between border-b border-[#1e293b]">
                      <span>Workspaces</span>
                      <span className="text-violet-400 font-mono">({notebooks.length})</span>
                    </div>

                    <div className="max-h-56 sm:max-h-64 overflow-y-auto space-y-1 my-1.5 pr-1">
                      {notebooks.map((nb) => (
                        <div
                          key={nb.id}
                          className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${activeNotebook?.id === nb.id
                            ? 'bg-[#1e293b] text-violet-300 font-bold border border-violet-500/40 shadow-sm'
                            : 'text-slate-300 hover:bg-[#1e293b]/60'
                            }`}
                          onClick={() => {
                            onSelectNotebook(nb);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-slate-100">{nb.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {nb._count?.sources || 0} sources
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0 ml-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsDropdownOpen(false);
                                setRenamingNotebook(nb);
                                setEditTitle(nb.title);
                                setEditDesc(nb.description || '');
                              }}
                              className="text-slate-400 hover:text-violet-300 p-1.5 rounded-lg hover:bg-[#334155] transition-colors cursor-pointer"
                              title="Rename Notebook"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {activeNotebook?.id !== nb.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsDropdownOpen(false);
                                  setDeletingNotebook(nb);
                                }}
                                className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-[#334155] transition-colors cursor-pointer"
                                title="Delete Notebook"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#1e293b]">
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setIsCreateModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 min-h-[44px] px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-violet-500/25 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>New Workspace</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Knowledge Vault Trigger */}
            {onToggleMobileSources && (
              <button
                onClick={onToggleMobileSources}
                className="lg:hidden flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-bold transition-all cursor-pointer shrink-0"
                title="Open Knowledge Vault"
              >
                <Database className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">Vault</span>
                <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 text-[10px] text-violet-200 font-mono">
                  {sourceCount}
                </span>
              </button>
            )}
          </div>

          {/* Desktop Mode Switcher (Hidden on Mobile) */}
          <div className="hidden md:flex items-center space-x-1 bg-[#0f172a] p-1 rounded-2xl border border-[#1e293b]">
            <button
              onClick={() => onChangeMode('chat')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${activeMode === 'chat'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Research Chat</span>
            </button>

            <button
              onClick={() => onChangeMode('roadmap')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${activeMode === 'roadmap'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Roadmap</span>
            </button>

            <button
              onClick={() => onChangeMode('podcast')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${activeMode === 'podcast'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Audio Podcast</span>
            </button>

            <button
              onClick={() => onChangeMode('discoveries')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${activeMode === 'discoveries'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Discoveries</span>
            </button>
          </div>

          {/* Right: User Profile */}
          <div className="flex items-center space-x-3 shrink-0">
            <UserButton />
          </div>
        </div>

        {/* Mobile Sub-Bar for Mode Switcher (Visible on Mobile `< md`) */}
        <div className="md:hidden border-t border-[#1e293b]/80 bg-[#070b12] px-1.5 py-1 flex items-center justify-start xs:justify-center gap-1 overflow-x-auto no-scrollbar scrollbar-none min-w-0">
          <button
            onClick={() => onChangeMode('chat')}
            aria-label="Switch to Research Chat mode"
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 min-h-[36px] ${activeMode === 'chat'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => onChangeMode('roadmap')}
            aria-label="Switch to Study Plan Roadmap mode"
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 min-h-[36px] ${activeMode === 'roadmap'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Roadmap</span>
          </button>

          <button
            onClick={() => onChangeMode('podcast')}
            aria-label="Switch to Audio Podcast mode"
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 min-h-[36px] ${activeMode === 'podcast'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Podcast</span>
          </button>

          <button
            onClick={() => onChangeMode('discoveries')}
            aria-label="Switch to Proactive Discoveries mode"
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 min-h-[36px] ${activeMode === 'discoveries'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
              : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Discoveries</span>
          </button>
        </div>
      </header>

      {/* New Workspace Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-[#070b12]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl shadow-2xl space-y-4 my-auto">
            <div className="flex items-center space-x-3 text-slate-100 pb-3 border-b border-[#1e293b]">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Create New Workspace</h2>
                <p className="text-xs text-slate-400">Group your documents, lectures & research links</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Workspace Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Distributed Systems, Pydantic AI..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Optional description..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Workspace Modal */}
      {renamingNotebook && (
        <div className="fixed inset-0 bg-[#070b12]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#0f172a] border border-[#1e293b] p-6 rounded-2xl shadow-2xl space-y-4 my-auto">
            <div className="flex items-center space-x-3 text-slate-100 pb-3 border-b border-[#1e293b]">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Rename Workspace</h2>
                <p className="text-xs text-slate-400">Update title or description</p>
              </div>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Workspace Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Advanced Distributed Systems"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Optional description..."
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setRenamingNotebook(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-md shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingNotebook && (
        <div className="fixed inset-0 bg-[#070b12]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-[#0f172a] border border-[#1e293b] p-5 rounded-2xl shadow-2xl space-y-4 my-auto">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Delete Workspace?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">"{deletingNotebook.title}"</span>? All sources and indexed vectors will be removed.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => setDeletingNotebook(null)}
                className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteNotebook}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-all shadow-md shadow-rose-500/20"
              >
                Delete Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
