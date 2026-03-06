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
} from 'lucide-react';
import { Interview } from '../types/Interview';
import Link from 'next/link';

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
  userName: string;
  userEmail: string;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  loading?: boolean;
}

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
  userName,
  userEmail,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  loading = false,
}) => {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
      if (editingInterviewId) {
        setEditingInterviewId(null);
        setEditingTitle('');
      }
    };

    document.addEventListener('keydown', handleGlobalEscape);
    return () => document.removeEventListener('keydown', handleGlobalEscape);
  }, [searchOpen, editingInterviewId]);

  const openSearchModal = () => {
    setSearchQuery('');
    setSearchOpen(true);
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
      className={`fixed left-0 top-0 h-full bg-gray-50 border-r border-gray-200 transition-all duration-300 z-10 ${
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
            <button className="w-full flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-left">
              <MessageSquare size={18} />
              <span>Interviews</span>
            </button>
            <button className="w-full flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-left">
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

        {searchOpen && (
          <div
            className="fixed inset-0 z-40 flex items-start justify-center bg-black/30 p-4 pt-20"
            onClick={() => setSearchOpen(false)}
          >
            <div
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
            </div>
          </div>
        )}

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
                  onOpenProfile();
                }}
                className="dropdown-link py-4"
              >
                <User size={18} />
                Profile
              </button>
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
