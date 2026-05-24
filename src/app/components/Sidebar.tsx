import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  House,
  Search,
  Library,
  Trash2,
  Settings,
  CircleHelp,
  LogOut,
  Pencil,
  Check,
  X,
  BarChart3,
} from 'lucide-react';
import { Interview } from '../types/Interview';
import Link from 'next/link';
import MetricsDashboard from './MetricsDashboard';
import { LIBRARY_SECTIONS, type LibrarySectionId } from './Library';
import { AnimatePresence, motion } from 'framer-motion';
import {
  getAudienceLabel,
  getPracticeModeLabel,
  getSessionFocusSummary,
  getSessionSubtitle,
  getSessionTypeLabel,
} from '../lib/practiceConfig';

interface SidebarProps {
  interviews: Interview[];
  currentInterview: Interview | null;
  onGoHome: () => void;
  onStartNew: () => void;
  onSelectInterview: (interview: Interview) => void;
  onDeleteInterview: (interviewId: string) => void;
  onRenameInterview: (interviewId: string, title: string) => Promise<void> | void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userInitial: string;
  userCreatedAt?: Date | string;
  userName: string;
  userEmail: string;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onSelectLibrarySection: (sectionId: LibrarySectionId) => void;
  onLogout: () => void;
  loading?: boolean;
  isHomeActive?: boolean;
  isLibraryActive?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  interviews,
  currentInterview,
  onGoHome,
  onStartNew,
  onSelectInterview,
  onDeleteInterview,
  onRenameInterview,
  collapsed,
  onToggleCollapse,
  userInitial,
  userCreatedAt,
  userName,
  userEmail,
  onOpenSettings,
  onOpenHelp,
  onSelectLibrarySection,
  onLogout,
  loading = false,
  isHomeActive = false,
  isLibraryActive = false,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingRenameId, setSavingRenameId] = useState<string | null>(null);
  const [interviewPendingDelete, setInterviewPendingDelete] = useState<Interview | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredInterviews = useMemo(() => {
    if (!normalizedSearchQuery) return interviews;

    return interviews.filter((interview) => {
      const title = interview.title.toLowerCase();
      const role = interview.role.toLowerCase();
      const languages = interview.languages.join(' ').toLowerCase();
      const practiceMode = getPracticeModeLabel(interview.practiceMode).toLowerCase();
      const audience = getAudienceLabel(interview.audience).toLowerCase();
      const topic = (interview.topic ?? interview.generatedPrompt?.topic ?? '').toLowerCase();
      const sessionType = getSessionTypeLabel(interview.sessionType).toLowerCase();

      return (
        title.includes(normalizedSearchQuery) ||
        role.includes(normalizedSearchQuery) ||
        languages.includes(normalizedSearchQuery) ||
        practiceMode.includes(normalizedSearchQuery) ||
        audience.includes(normalizedSearchQuery) ||
        topic.includes(normalizedSearchQuery) ||
        sessionType.includes(normalizedSearchQuery)
      );
    });
  }, [interviews, normalizedSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleGlobalEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (searchOpen) setSearchOpen(false);
      if (metricsOpen) setMetricsOpen(false);
      if (libraryOpen) setLibraryOpen(false);
      if (interviewPendingDelete) setInterviewPendingDelete(null);
      if (editingInterviewId) {
        setEditingInterviewId(null);
        setEditingTitle('');
      }
    };

    document.addEventListener('keydown', handleGlobalEscape);
    return () => document.removeEventListener('keydown', handleGlobalEscape);
  }, [searchOpen, metricsOpen, libraryOpen, interviewPendingDelete, editingInterviewId]);

  const openSearchModal = () => {
    setSearchQuery('');
    setMetricsOpen(false);
    setLibraryOpen(false);
    setSearchOpen(true);
  };

  const openMetricsModal = () => {
    setSearchOpen(false);
    setLibraryOpen(false);
    setMetricsOpen(true);
  };

  const openLibraryChooser = () => {
    setSearchOpen(false);
    setMetricsOpen(false);
    setLibraryOpen(true);
  };

  const selectLibrarySection = (sectionId: LibrarySectionId) => {
    onSelectLibrarySection(sectionId);
    setLibraryOpen(false);
  };

  const libraryChooserSections = LIBRARY_SECTIONS.slice(0, 2);

  const beginRename = (interview: Interview) => {
    setEditingInterviewId(interview.id);
    setEditingTitle(interview.title);
  };

  const cancelRename = () => {
    setEditingInterviewId(null);
    setEditingTitle('');
  };

  const saveRename = async (interview: Interview) => {
    const nextTitle = editingTitle.trim();
    if (!nextTitle || nextTitle === interview.title) {
      cancelRename();
      return;
    }

    try {
      setSavingRenameId(interview.id);
      await Promise.resolve(onRenameInterview(interview.id, nextTitle));
      cancelRename();
    } catch (error) {
      console.error('Failed to rename interview:', error);
    } finally {
      setSavingRenameId(null);
    }
  };

  const getSidebarSessionTypeText = (interview: Interview) =>
    interview.sessionType === 'tech-chat'
      ? 'tech chat'
      : (interview.sessionType ?? 'behavioral-interview') === 'technical-communication'
        ? 'technical communication'
        : 'interview';

  const getSidebarSessionBaseTitle = (interview: Interview) => {
    if (interview.sessionType === 'tech-chat') {
      return interview.title.trim() || 'Tech Chat';
    }

    const defaultTitle =
      (interview.sessionType ?? 'behavioral-interview') === 'technical-communication'
        ? `${interview.role} • ${getPracticeModeLabel(interview.practiceMode)}`
        : `${interview.role} Behavioral Interview`;
    return interview.title.trim() === defaultTitle ? interview.role : interview.title.trim();
  };

  const getSidebarSessionProgress = (interview: Interview) => {
    if (interview.status === 'completed') {
      return 'Completed';
    }

    const totalQuestions = interview.questions?.length ?? 0;
    if (interview.sessionType === 'tech-chat') {
      const turns = interview.messages.filter((message) => message.role === 'candidate').length;
      return turns > 0 ? `${turns} turns` : 'In progress';
    }

    if ((interview.sessionType ?? 'behavioral-interview') === 'behavioral-interview' && totalQuestions > 0) {
      const completedQuestions = Math.min(interview.currentQuestionIndex ?? 0, totalQuestions);
      return `${completedQuestions}/${totalQuestions} complete`;
    }

    return 'In progress';
  };

  const promptDeleteInterview = (interview: Interview) => {
    setInterviewPendingDelete(interview);
  };

  const closeDeletePrompt = () => {
    setInterviewPendingDelete(null);
  };

  const confirmDeleteInterview = () => {
    if (!interviewPendingDelete) return;
    const interviewId = interviewPendingDelete.id;
    void Promise.resolve(onDeleteInterview(interviewId))
      .catch(() => undefined)
      .finally(() => {
        setInterviewPendingDelete(null);
      });
  };

  return (
    <div
      data-workspace-tour="sidebar"
      className={`fixed left-0 top-0 h-full bg-gray-50 border-r border-gray-200 transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <div className="flex items-center space-x-2 -ml-3">
                  <Link href="/" className="flex items-center space-x-2">
                    <Image
                      src="/knappi_logo.png"
                      alt="Knappi Logo"
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain mr-0 mb-1"
                    />
                    <span className="text-2xl font-regular text-gray-900 tracking-tight font-knappi">
                      Knappi
                    </span>
                  </Link>
                </div>
              </div>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="p-4 space-y-2">
            <button
              onClick={onGoHome}
              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                isHomeActive
                  ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-50'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <House size={18} />
              <span>Home</span>
            </button>
            <button
              onClick={openSearchModal}
              className="w-full flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-left"
            >
              <Search size={18} />
              <span>Search</span>
            </button>
            <button
              onClick={openMetricsModal}
              className="w-full flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-left"
            >
              <BarChart3 size={18} />
              <span>Metrics</span>
            </button>
            <button
            data-workspace-tour="library"
            onClick={openLibraryChooser}
            className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                isLibraryActive || libraryOpen
                  ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-50'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Library size={18} />
              <span>Library</span>
            </button>
          </div>
        )}

        <div className="p-4">
          <button
            onClick={onStartNew}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2 p-3"
          >
            <Plus size={18} />
            {!collapsed && <span>New Session</span>}
          </button>
        </div>

        {!collapsed && interviews.length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-sm font-medium text-gray-500 mb-2">Recent Sessions</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto" aria-busy={loading}>
          {loading && interviews.length === 0 ? null : interviews.length === 0 ? (
            <div className="p-4 text-center">
              {!collapsed && <div className="text-sm text-gray-500">No sessions yet</div>}
            </div>
          ) : (
            interviews.map((interview) => (
              <div
                key={interview.id}
                className={`group relative ${
                  currentInterview?.id === interview.id
                    ? 'bg-gray-100 border-r-2 border-gray-900'
                    : ''
                }`}
              >
                <div
                  onClick={() => {
                    if (editingInterviewId !== interview.id) {
                      onSelectInterview(interview);
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && editingInterviewId !== interview.id) {
                      e.preventDefault();
                      onSelectInterview(interview);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="w-full text-left p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={16} className="text-gray-400 flex-shrink-0" />
                    {!collapsed && (
                      <div className="flex-1 min-w-0 pr-12">
                        {editingInterviewId === interview.id ? (
                          <input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void saveRename(interview);
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelRename();
                              }
                            }}
                            disabled={savingRenameId === interview.id}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <>
                            <div className="text-sm font-medium leading-5 text-gray-900 [display:-webkit-box] overflow-hidden text-ellipsis [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                              {getSidebarSessionBaseTitle(interview)}
                            </div>
                            <div className="mt-1 text-[11px] text-gray-500">
                              {getSidebarSessionTypeText(interview)}
                            </div>
                            <div
                              className={`mt-0.5 text-[11px] ${
                                interview.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                              }`}
                            >
                              {getSidebarSessionProgress(interview)}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {!collapsed && (
                  editingInterviewId === interview.id ? (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void saveRename(interview);
                        }}
                        disabled={savingRenameId === interview.id}
                        className="p-1 hover:bg-green-100 rounded transition-colors"
                        title="Save name"
                      >
                        <Check size={14} className="text-green-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelRename();
                        }}
                        disabled={savingRenameId === interview.id}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Cancel rename"
                      >
                        <X size={14} className="text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          beginRename(interview);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Rename interview"
                      >
                        <Pencil size={14} className="text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          promptDeleteInterview(interview);
                        }}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete interview"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  )
                )}
              </div>
            ))
          )}
        </div>

        <AnimatePresence>
          {interviewPendingDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
              onClick={closeDeletePrompt}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-gray-200 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <Trash2 size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
                        Delete session?
                      </h2>
                      <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <p className="min-w-0 text-sm text-gray-700">
                    Are you sure you want to delete{' '}
                    <span className="font-medium text-gray-900">
                      {interviewPendingDelete.title}
                    </span>
                    ?
                  </p>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      onClick={closeDeletePrompt}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteInterview}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                      autoFocus
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-20"
              onClick={() => setSearchOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    <Search size={18} className="text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search sessions by title, field, audience, or topic"
                      className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => setSearchOpen(false)}
                      className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      title="Close search"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto py-2">
                  {filteredInterviews.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-500">
                      No sessions found
                    </p>
                  ) : (
                    filteredInterviews.map((interview) => (
                      <button
                        key={`search-${interview.id}`}
                        onClick={() => {
                          onSelectInterview(interview);
                          setSearchOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900">{interview.title}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {getSessionSubtitle(interview)}
                          {getSessionFocusSummary(interview) ? ` • ${getSessionFocusSummary(interview)}` : ''}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {metricsOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-4"
              onClick={() => setMetricsOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
                    <div>
                      <div className="flex items-center gap-2 text-gray-900">
                        <BarChart3 size={18} />
                      <h2 className="text-sm font-semibold sm:text-base">Practice Metrics</h2>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                      Track drill completion, consistency, and score trends over time.
                    </p>
                  </div>
                  <button
                    onClick={() => setMetricsOpen(false)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Close metrics"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-[calc(92vh-84px)] overflow-y-auto bg-gradient-to-b from-white to-gray-50">
                  <MetricsDashboard
                    interviews={interviews}
                    userCreatedAt={userCreatedAt}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {libraryOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-4"
              onClick={() => setLibraryOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-5">
                    <div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Library size={18} />
                      <h2 className="text-sm font-semibold sm:text-base">Library</h2>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                      Study guides, playbooks, and documentation for stronger technical communication.
                    </p>
                  </div>
                  <button
                    onClick={() => setLibraryOpen(false)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Close library"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="max-h-[calc(92vh-84px)] overflow-y-auto bg-gradient-to-b from-white to-gray-50 p-4 sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                    {libraryChooserSections.map((section, index) => {
                      const Icon = section.icon;

                      return (
                        <motion.button
                          key={section.id}
                          type="button"
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.06 }}
                          onClick={() => selectLibrarySection(section.id)}
                          className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                              <Icon size={18} />
                            </div>
                          </div>

                          <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                          <p className="mt-1 text-xs leading-5 text-gray-600">{section.description}</p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {section.tags.map((tag) => (
                              <span
                                key={`${section.id}-${tag}`}
                                className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={accountMenuRef} className="p-4 border-t border-gray-200 relative">
          <button
            data-workspace-tour="account"
            onClick={() => setAccountMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            className={`w-full flex items-center gap-2 rounded-lg border p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
              accountMenuOpen
                ? 'border-gray-300 bg-gray-100'
                : 'border-transparent hover:bg-gray-200'
            }`}
          >
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {userInitial || 'U'}
            </div>
            {!collapsed && (
              <p className="text-sm text-gray-800 truncate">{userName}</p>
            )}
          </button>

          {accountMenuOpen && (
            <div
              className={`absolute z-30 bg-white border border-gray-200 rounded-md shadow-lg ${
                collapsed ? 'left-16 bottom-4 w-80' : 'left-4 bottom-16 w-80'
              }`}
            >
              <div className="px-5 py-4 border-b border-gray-200">
                <p className="text-sm text-gray-500 break-all">{userEmail}</p>
              </div>
              <button
                onClick={() => {
                  setAccountMenuOpen(false);
                  onOpenSettings();
                }}
                className="dropdown-link py-4"
              >
                <Settings size={18} />
                Settings
              </button>
              <button
                onClick={() => {
                  setAccountMenuOpen(false);
                  onOpenHelp();
                }}
                className="dropdown-link py-4"
              >
                <CircleHelp size={18} />
                Help
              </button>
              <button
                onClick={() => {
                  setAccountMenuOpen(false);
                  onLogout();
                }}
                className="dropdown-link py-4 text-red-600"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
