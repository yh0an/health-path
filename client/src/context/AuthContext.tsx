import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsApi, UserProfile } from '../services/api';
import { authApi } from '../services/api';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; heightCm?: number; targetWeightKg?: number }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hp_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      settingsApi.getProfile()
        .then(setUser)
        .catch(() => { localStorage.removeItem('hp_token'); setToken(null); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('hp_token', res.token);
    setToken(res.token);
    const profile = await settingsApi.getProfile();
    setUser(profile);
  };

  const register = async (data: Parameters<typeof authApi.register>[0]) => {
    const res = await authApi.register(data);
    localStorage.setItem('hp_token', res.token);
    setToken(res.token);
    const profile = await settingsApi.getProfile();
    setUser(profile);
  };

  const logout = () => {
    localStorage.removeItem('hp_token');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    const profile = await settingsApi.getProfile();
    setUser(profile);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
