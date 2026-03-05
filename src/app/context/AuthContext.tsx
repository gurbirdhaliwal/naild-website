'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '../types/Users';
import { API_BASE } from '../services/api';
import { getSafeRedirectPath, POST_AUTH_REDIRECT_STORAGE_KEY } from '../services/safeRedirect';
 
interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch(`${API_BASE}/user/me`, {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    const pendingRedirect = window.sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY);
    if (!pendingRedirect) return;

    const targetPath = getSafeRedirectPath(pendingRedirect, '/interview');
    const isAuthEntryPath = pathname === '/' || pathname === '/login' || pathname === '/signup';

    if (pathname === targetPath) {
      window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY);
      return;
    }

    if (isAuthEntryPath) {
      router.replace(targetPath);
    }
  }, [loading, pathname, router, user]);

  return (
    <AuthContext.Provider value={{ user, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
