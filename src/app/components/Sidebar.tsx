import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Search,
  Library,
  Trash2,
  Loader2,
  User,
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
import { AnimatePresence, motion } from 'framer-motion';

interface SidebarProps {
  interviews: Interview[];
  currentInterview: Interview | null;
  onStartNew: () => void;
  onSelectInterview: (interview: Interview) => void;
  onDeleteInterview: (interviewId: string) => void;
  onRenameInterview: (interviewId: string, title: string) => Promise<void> | void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userInitial: string;
  userFirstName?: string;
  userCreatedAt?: Date | string;
  userName: string;
  userEmail: string;
  onOpenSettings: () => void;
  onLogout: () => void;
  loading?: boolean;
}

const LIBRARY_CATEGORIES = [
  {
    title: 'Data Structures & Algorithms',
    description: 'Sharpen pattern recognition for arrays, trees, graphs, and dynamic programming.',
    tags: ['Arrays', 'Graphs', 'DP'],
    icon: BarChart3,
  },
  {
    title: 'System Design',
    description: 'Practice designing scalable services, APIs, and data flow under realistic constraints.',
    tags: ['Scalability', 'APIs', 'Databases'],
    icon: Settings,
  },
  {
    title: 'Behavioral Interviewing',
    description: 'Craft STAR-based stories that show ownership, impact, and collaboration.',
    tags: ['STAR', 'Leadership', 'Teamwork'],
    icon: User,
  },
  {
    title: 'Object-Oriented Design',
    description: 'Master class design, SOLID principles, and common engineering tradeoffs.',
    tags: ['SOLID', 'Patterns', 'Tradeoffs'],
    icon: Library,
  },
  {
    title: 'OS & Networks',
    description: 'Review concurrency, memory, processes, latency, and networking fundamentals.',
    tags: ['Concurrency', 'Memory', 'TCP/IP'],
    icon: Search,
  },
  {
    title: 'Communication Skills',
    description: 'Explain your thought process clearly while coding and problem-solving aloud.',
    tags: ['Clarity', 'Structure', 'Confidence'],
    icon: MessageSquare,
  },
  {
    title: 'Resume & Pitch',
    description: 'Align projects and achievements to role expectations with concise talking points.',
    tags: ['Impact', 'Projects', 'Positioning'],
    icon: Check,
  },
  {
    title: 'Problem-Solving Frameworks',
    description: 'Use repeatable frameworks to break down unknown questions with confidence.',
    tags: ['Decompose', 'Validate', 'Iterate'],
    icon: CircleHelp,
  },
];

const Sidebar: React.FC<SidebarProps> = ({
  interviews,
  currentInterview,
  onStartNew,
  onSelectInterview,
  onDeleteInterview,
  onRenameInterview,
  collapsed,
  onToggleCollapse,
  userInitial,
  userFirstName,
  userCreatedAt,
  userName,
  userEmail,
  onOpenSettings,
  onLogout,
  loading = false,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [savingRenameId, setSavingRenameId] = useState<string | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredInterviews = useMemo(() => {
    if (!normalizedSearchQuery) return interviews;

    return interviews.filter((interview) => {
      const title = interview.title.toLowerCase();
      const role = interview.role.toLowerCase();
      const languages = interview.languages.join(' ').toLowerCase();

      return (
        title.includes(normalizedSearchQuery) ||
        role.includes(normalizedSearchQuery) ||
        languages.includes(normalizedSearchQuery)
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
      if (editingInterviewId) {
        setEditingInterviewId(null);
        setEditingTitle('');
      }
    };

    document.addEventListener('keydown', handleGlobalEscape);
    return () => document.removeEventListener('keydown', handleGlobalEscape);
  }, [searchOpen, metricsOpen, libraryOpen, editingInterviewId]);

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

  const openLibraryModal = () => {
    setSearchOpen(false);
    setMetricsOpen(false);
    setLibraryOpen(true);
  };

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

  return (
    <div
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
                    <img
                      src="/naild_logo.png"
                      alt="Naild Logo"
                      className="h-10 w-10 object-contain mr-0 mb-1"
                    />
                    <span className="text-2xl font-regular text-black tracking-tight font-naild">
                      naild.
                    </span>
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-1">powered by AI</p>
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
              onClick={openLibraryModal}
              className="w-full flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-left"
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
            {!collapsed && <span>New Interview</span>}
          </button>
        </div>

        {!collapsed && interviews.length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-sm font-medium text-gray-500 mb-2">Recent</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="animate-spin text-gray-400" size={20} />
              {!collapsed && (
                <span className="ml-2 text-sm text-gray-500">Loading interviews...</span>
              )}
            </div>
          ) : interviews.length === 0 ? (
            <div className="p-4 text-center">
              {!collapsed && <div className="text-sm text-gray-500">No interviews yet</div>}
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
                      <div className="flex-1 min-w-0 pr-14">
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
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {interview.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {interview.status === 'completed' ? 'Completed' : 'In Progress'}
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
                          onDeleteInterview(interview.id);
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
                      placeholder="Search interviews by name, role, or technology"
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
                      No interviews found
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
                          {interview.role} • {interview.languages.join(', ')}
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
                      <h2 className="text-sm font-semibold sm:text-base">Metrics</h2>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                      Track interview performance and progress over time.
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
                    userFirstName={userFirstName}
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
                      <h2 className="text-sm font-semibold sm:text-base">Interview Library</h2>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                      Curated CS learning paths to improve your interview performance.
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
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {LIBRARY_CATEGORIES.map((category, index) => {
                      const Icon = category.icon;
                      return (
                        <motion.div
                          key={category.title}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.06 }}
                          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                              <Icon size={18} />
                            </div>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
                              Curated
                            </span>
                          </div>

                          <h3 className="text-sm font-semibold text-gray-900">{category.title}</h3>
                          <p className="mt-1 text-xs leading-5 text-gray-600">{category.description}</p>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {category.tags.map((tag) => (
                              <span
                                key={`${category.title}-${tag}`}
                                className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </motion.div>
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
            onClick={() => setAccountMenuOpen((prev) => !prev)}
            className="w-full flex items-center gap-2 hover:bg-gray-200 rounded-lg p-2 transition-colors"
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
                }}
                className="dropdown-link py-4"
              >
                <CircleHelp size={18} />
                Help
              </button>
              <div className="border-t border-gray-200" />
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
