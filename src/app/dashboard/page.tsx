'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NotebookItem, SourceItem, Citation, SourceType } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { SourcesPanel } from '@/components/SourcesPanel';
import { ChatPanel } from '@/components/ChatPanel';
import { LearningStudio } from '@/components/LearningStudio';
import { SourceViewer } from '@/components/SourceViewer';
import { WorkspaceLoader } from '@/components/WorkspaceLoader';

export default function DashboardPage() {
  const [notebooks, setNotebooks] = useState<NotebookItem[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<NotebookItem | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [activeSourceIds, setActiveSourceIds] = useState<string[]>([]);

  const [isLoadingNotebooks, setIsLoadingNotebooks] = useState(true);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isMobileSourcesOpen, setIsMobileSourcesOpen] = useState(false);

  const [activeMode, setActiveMode] = useState<'chat' | 'roadmap' | 'podcast' | 'discoveries'>('chat');

  const [messages, setMessages] = useState<
    { id: string; role: 'user' | 'assistant'; content: string; citations?: Citation[] }[]
  >([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Fetch Notebooks
  const fetchNotebooks = async () => {
    setIsLoadingNotebooks(true);
    try {
      const res = await fetch('/api/notebooks');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.notebooks) {
        setNotebooks(data.notebooks);
        if (data.notebooks.length > 0) {
          setActiveNotebook((prev) => prev || data.notebooks[0]);
        } else {
          handleCreateNotebook('My Research Workspace', 'Multi-source research workspace');
        }
      }
    } catch (err) {
      // Gracefully ignore aborted fetch errors
    } finally {
      setIsLoadingNotebooks(false);
    }
  };

  // Fetch Sources for Active Notebook
  const fetchSources = async (notebookId: string, isSilent = false) => {
    if (!isSilent) {
      setIsLoadingSources(true);
    }
    try {
      const res = await fetch(`/api/sources?notebookId=${notebookId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.sources) {
        setSources((prev) => {
          const prevStr = JSON.stringify(prev);
          const nextStr = JSON.stringify(data.sources);
          if (prevStr === nextStr) return prev; // Prevent unnecessary re-render if data is identical
          return data.sources;
        });

        const allSourceIds = data.sources.map((s: SourceItem) => s.id);
        setActiveSourceIds((prev) => {
          if (prev.length === allSourceIds.length && prev.every((id) => allSourceIds.includes(id))) {
            return prev;
          }
          return allSourceIds;
        });
      }
    } catch (err) {
      // Gracefully ignore aborted fetch errors
    } finally {
      if (!isSilent) {
        setIsLoadingSources(false);
      }
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  // Load persisted chat history for a notebook
  const loadMessages = async (notebookId: string) => {
    try {
      setIsLoadingMessages(true);
      const res = await fetch(`/api/messages?notebookId=${notebookId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.messages) {
        setMessages((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data.messages)) return prev;
          return data.messages;
        });
      }
    } catch (err) {
      // Gracefully ignore
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Clear all chat messages for a notebook
  const handleClearMessages = async () => {
    if (!activeNotebook) return;
    try {
      await fetch(`/api/messages?notebookId=${activeNotebook.id}`, { method: 'DELETE' });
      setMessages([]);
      setActiveCitation(null);
    } catch (err) {
      console.error('Failed to clear messages:', err);
    }
  };

  const activeNotebookRef = useRef(activeNotebook);
  activeNotebookRef.current = activeNotebook;

  const currentChatAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (activeNotebook) {
      if (currentChatAbortControllerRef.current) {
        currentChatAbortControllerRef.current.abort();
        currentChatAbortControllerRef.current = null;
      }
      setIsLoadingChat(false);
      setSources([]);
      setMessages([]);
      setIsLoadingSources(true);
      setIsLoadingMessages(true);
      setActiveSourceIds([]);
      fetchSources(activeNotebook.id, false);
      loadMessages(activeNotebook.id);
      setActiveCitation(null);
    }
  }, [activeNotebook?.id]);

  // SMART POLLING: Only poll silently if any source is pending or indexing
  useEffect(() => {
    if (!activeNotebook) return;

    const hasPendingSources = sources.some(
      (s) => s.status === 'pending' || s.status === 'indexing'
    );

    if (!hasPendingSources) return;

    const interval = setInterval(() => {
      fetchSources(activeNotebook.id, true); // Silent background poll
    }, 2000);

    return () => clearInterval(interval);
  }, [sources, activeNotebook?.id]);

  // Create Notebook
  const handleCreateNotebook = async (title: string, description?: string) => {
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (data.success && data.notebook) {
        setNotebooks((prev) => [data.notebook, ...prev]);
        setActiveNotebook(data.notebook);
      }
    } catch (err) {
      console.error('Failed to create notebook:', err);
    }
  };

  // Delete Notebook
  const handleDeleteNotebook = async (id: string) => {
    try {
      await fetch(`/api/notebooks/${id}`, { method: 'DELETE' });
      setNotebooks((prev) => prev.filter((n) => n.id !== id));
      if (activeNotebook?.id === id) {
        const remaining = notebooks.filter((n) => n.id !== id);
        setActiveNotebook(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete notebook:', err);
    }
  };

  // Rename Notebook
  const handleRenameNotebook = async (id: string, title: string, description?: string) => {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (data.success && data.notebook) {
        setNotebooks((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, ...data.notebook, _count: data.notebook._count || n._count } : n
          )
        );
        if (activeNotebook?.id === id) {
          setActiveNotebook((prev) =>
            prev ? { ...prev, ...data.notebook, _count: data.notebook._count || prev._count } : data.notebook
          );
        }
      }
    } catch (err) {
      console.error('Failed to rename notebook:', err);
    }
  };

  // Add Source
  const handleAddSource = async (payload: {
    type: SourceType;
    title: string;
    contentOrUrl?: string;
    file?: File;
  }) => {
    let currentNotebook = activeNotebook;

    if (!currentNotebook) {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Research Workspace' }),
      });
      const data = await res.json();
      if (data.success && data.notebook) {
        currentNotebook = data.notebook;
        setActiveNotebook(data.notebook);
        setNotebooks((prev) => [data.notebook, ...prev]);
      } else {
        return;
      }
    }

    try {
      let body: any;
      let headers: any = {};

      if (!currentNotebook) return;

      if (payload.file) {
        const formData = new FormData();
        formData.append('notebookId', currentNotebook.id);
        formData.append('type', payload.type);
        formData.append('title', payload.title);
        formData.append('file', payload.file);
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          notebookId: currentNotebook.id,
          type: payload.type,
          title: payload.title,
          urlOrPath: payload.contentOrUrl,
          content: payload.contentOrUrl,
        });
      }

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers,
        body,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to ingest source');
      }

      if (data.success && data.source) {
        setSources((prev) => [data.source, ...prev]);
        setActiveSourceIds((prev) => [...prev, data.source.id]);
        fetchSources(currentNotebook.id);
      }
    } catch (err: any) {
      console.error('Add source error:', err);
      throw err;
    }
  };

  // Delete Source
  const handleDeleteSource = async (id: string) => {
    try {
      await fetch(`/api/sources?id=${id}`, { method: 'DELETE' });
      setSources((prev) => prev.filter((s) => s.id !== id));
      setActiveSourceIds((prev) => prev.filter((sId) => sId !== id));
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  // Toggle Source Selection
  const handleToggleSource = (id: string) => {
    setActiveSourceIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  // Send RAG Query
  const handleSendMessage = async (query: string) => {
    if (!activeNotebook) return;

    const targetNotebookId = activeNotebook.id;

    if (currentChatAbortControllerRef.current) {
      currentChatAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    currentChatAbortControllerRef.current = abortController;

    const userMsgId = Date.now().toString();
    const userMsg = { id: userMsgId, role: 'user' as const, content: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoadingChat(true);

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          notebookId: targetNotebookId,
          message: query,
          activeSourceIds,
        }),
      });

      const data = await res.json();

      if (activeNotebookRef.current?.id === targetNotebookId) {
        const assistantMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: data.answer || 'No response generated.',
          citations: data.citations || [],
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('RAG Query Failed:', err);
      if (activeNotebookRef.current?.id === targetNotebookId) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Sorry, an error occurred while searching your active sources.',
          },
        ]);
      }
    } finally {
      if (activeNotebookRef.current?.id === targetNotebookId) {
        setIsLoadingChat(false);
      }
    }
  };

  if (isLoadingNotebooks) {
    return <WorkspaceLoader message="Loading Research Workspace..." />;
  }

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[#070b12]">
      <Navbar
        notebooks={notebooks}
        activeNotebook={activeNotebook}
        isLoadingNotebooks={isLoadingNotebooks}
        activeMode={activeMode}
        onChangeMode={setActiveMode}
        onSelectNotebook={setActiveNotebook}
        onCreateNotebook={handleCreateNotebook}
        onRenameNotebook={handleRenameNotebook}
        onDeleteNotebook={handleDeleteNotebook}
        sourceCount={sources.length}
        onToggleMobileSources={() => setIsMobileSourcesOpen((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 h-[calc(100dvh-6.5rem)] md:h-[calc(100vh-4rem)]">
        {/* Left Pane: Knowledge Vault */}
        <SourcesPanel
          sources={sources}
          activeSourceIds={activeSourceIds}
          activeNotebook={activeNotebook}
          isLoadingSources={isLoadingSources}
          onToggleSource={handleToggleSource}
          onAddSource={handleAddSource}
          onDeleteSource={handleDeleteSource}
          onSelectCitation={setActiveCitation}
          isMobileOpen={isMobileSourcesOpen}
          onCloseMobile={() => setIsMobileSourcesOpen(false)}
        />

        {/* Main Stage: Chat or Learning Mode */}
        <div className="flex-1 flex flex-col min-w-0 h-full min-h-0 overflow-hidden relative">
          {activeMode === 'chat' ? (
            <ChatPanel
              notebookTitle={activeNotebook?.title || 'Knowledge Workspace'}
              activeSourceCount={sources.filter((s) => activeSourceIds.includes(s.id)).length}
              sources={sources}
              activeSourceIds={activeSourceIds}
              messages={messages}
              isLoading={isLoadingChat}
              isLoadingHistory={isLoadingMessages}
              onSendMessage={handleSendMessage}
              onClearMessages={handleClearMessages}
              onSelectCitation={setActiveCitation}
              onNavigateMode={setActiveMode}
            />
          ) : (
            activeNotebook && (
              <LearningStudio
                notebookId={activeNotebook.id}
                sources={sources}
                activeSourceIds={activeSourceIds}
                activeMode={activeMode}
                onSelectCitation={setActiveCitation}
                onNavigateMode={setActiveMode}
                onSendMessage={handleSendMessage}
              />
            )
          )}

          {/* Citation Source Viewer Grounding Drawer */}
          {activeCitation && (
            <SourceViewer
              citation={activeCitation}
              onClose={() => setActiveCitation(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
