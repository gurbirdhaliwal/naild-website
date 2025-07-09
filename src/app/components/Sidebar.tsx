
import React from 'react';
import { Plus, MessageSquare, ChevronLeft, ChevronRight, Search, Library } from 'lucide-react';
import { Interview } from '../types/Interview';
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

interface SidebarProps {
  interviews: Interview[];
  currentInterview: Interview | null;
  onStartNew: () => void;
  onSelectInterview: (interview: Interview) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  interviews,
  currentInterview,
  onStartNew,
  onSelectInterview,
  collapsed,
  onToggleCollapse
}) => {
  return (
    <div className={`fixed left-0 top-0 h-full bg-gray-50 border-r border-gray-200 transition-all duration-300 z-10 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
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

        {/* User greeting */}
        {!collapsed && (
          <div className="p-4 border-b border-gray-200">
            <p className="text-lg font-medium text-gray-900">Hey, Developer!</p>
          </div>
        )}

        {/* Navigation */}
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

        {/* New Interview Button */}
        <div className="p-4">
          <button
            onClick={onStartNew}
            className={`w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              collapsed ? 'p-3' : 'p-3'
            }`}
          >
            <Plus size={18} />
            {!collapsed && <span>New Interview</span>}
          </button>
        </div>

        {/* Recent Section */}
        {!collapsed && interviews.length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-sm font-medium text-gray-500 mb-2">Recent</p>
          </div>
        )}

        {/* Interview List */}
        <div className="flex-1 overflow-y-auto">
          {interviews.map((interview) => (
            <button
              key={interview.id}
              onClick={() => onSelectInterview(interview)}
              className={`w-full text-left p-4 hover:bg-gray-100 transition-colors ${
                currentInterview?.id === interview.id
                  ? 'bg-gray-100 border-r-2 border-gray-900'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={16} className="text-gray-400 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {interview.title}
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                D
              </div>
              <div className="text-xs text-gray-500">
                <p>Upgrade Plan</p>
                <p>More access to best models</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
