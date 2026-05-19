'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User } from '../types/Users';
import { API_BASE } from '../services/api';
import {
  LOGOUT_BROADCAST_KEY,
  SESSION_EXPIRED_BROADCAST_KEY,
  SESSION_EXPIRED_EVENT,
} from '../services/authSession';

type AuthSessionResponse = {
  user: User;
  sessionExpiresAt: string;
  sessionDurationSeconds: number;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionExpired: boolean;
  expiredUser: User | null;
  sessionExpiresAt: string | null;
  setUser: (user: User | null) => void;
  refreshSession: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [expiredUser, setExpiredUser] = useState<User | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);
  const sessionExpiredRef = useRef(false);

  const applyUnauthenticatedState = useCallback(() => {
    setUserState(null);
    setExpiredUser(null);
    setSessionExpired(false);
    setSessionExpiresAt(null);
    setLoading(false);
  }, []);

  const applyAuthenticatedSession = useCallback((session: AuthSessionResponse) => {
    setUserState(session.user);
    setExpiredUser(session.user);
    setSessionExpired(false);
    setSessionExpiresAt(session.sessionExpiresAt);
    setLoading(false);
  }, []);

  const markSessionExpired = useCallback(() => {
    setExpiredUser((currentExpiredUser) => currentExpiredUser ?? userRef.current);
    setSessionExpired(true);
    setSessionExpiresAt(null);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        if (userRef.current || sessionExpiredRef.current) {
          markSessionExpired();
        } else {
          applyUnauthenticatedState();
        }
        return null;
      }

      const session = (await response.json()) as AuthSessionResponse;
      applyAuthenticatedSession(session);
      return session.user;
    } catch {
      if (userRef.current || sessionExpiredRef.current) {
        markSessionExpired();
      } else {
        applyUnauthenticatedState();
      }
      return null;
    }
  }, [applyAuthenticatedSession, applyUnauthenticatedState, markSessionExpired]);

  const setUser = useCallback((nextUser: User | null) => {
    setUserState(nextUser);

    if (!nextUser) {
      setExpiredUser(null);
      setSessionExpired(false);
      setSessionExpiresAt(null);
      return;
    }

    setExpiredUser(nextUser);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    sessionExpiredRef.current = sessionExpired;
  }, [sessionExpired]);

  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (!event.newValue) return;

      if (event.key === LOGOUT_BROADCAST_KEY) {
        applyUnauthenticatedState();
        return;
      }

      if (event.key === SESSION_EXPIRED_BROADCAST_KEY) {
        markSessionExpired();
      }
    };

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [applyUnauthenticatedState, markSessionExpired]);

  useEffect(() => {
    const handleSessionExpired = () => {
      markSessionExpired();
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [markSessionExpired]);

  useEffect(() => {
    if (!user || !sessionExpiresAt || sessionExpired) return;

    const msUntilExpiry = new Date(sessionExpiresAt).getTime() - Date.now();
    if (msUntilExpiry <= 0) {
      markSessionExpired();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      markSessionExpired();
    }, msUntilExpiry);

    return () => window.clearTimeout(timeoutId);
  }, [markSessionExpired, sessionExpired, sessionExpiresAt, user]);

  useEffect(() => {
    if (!user || sessionExpired) return;

    const refreshVisibleSession = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshSession();
    };

    const refreshFocusedSession = () => {
      void refreshSession();
    };

    window.addEventListener('focus', refreshFocusedSession);
    document.addEventListener('visibilitychange', refreshVisibleSession);

    return () => {
      window.removeEventListener('focus', refreshFocusedSession);
      document.removeEventListener('visibilitychange', refreshVisibleSession);
    };
  }, [refreshSession, sessionExpired, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionExpired,
        expiredUser,
        sessionExpiresAt,
        setUser,
        refreshSession,
      }}
    >
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
