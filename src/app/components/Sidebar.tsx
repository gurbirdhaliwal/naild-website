import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { Interview } from '../types/Interview';
import Link from 'next/link';

interface SidebarProps {
  interviews: Interview[];
  currentInterview: Interview | null;
  onStartNew: () => void;
  onSelectInterview: (interview: Interview) => void;
  onDeleteInterview: (interviewId: string) => void;
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
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <button className="w-full flex items-center gap-3 p-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-left">
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
                <button
                  onClick={() => onSelectInterview(interview)}
                  className="w-full text-left p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={16} className="text-gray-400 flex-shrink-0" />
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {interview.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {interview.status === 'completed' ? 'Completed' : 'In Progress'}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
                {!collapsed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteInterview(interview.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                    title="Delete interview"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

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
