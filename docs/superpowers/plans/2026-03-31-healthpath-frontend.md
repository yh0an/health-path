# HealthPath — Plan 2/3 : Frontend React

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le client React/Vite/TypeScript/TailwindCSS avec toutes les pages (Dashboard, Poids, Nutrition, Hydratation, Photos, Calendrier, Réglages) et la navigation bottom tab bar.

**Architecture:** SPA React Router v6. `AuthContext` gère le JWT (localStorage). `services/api.ts` est un wrapper fetch centralisé. Chaque page est dans `pages/`. Les composants réutilisables sont dans `components/`. Recharts pour les graphiques.

**Tech Stack:** React 18, Vite, TypeScript, TailwindCSS, React Router v6, Recharts, date-fns

**Prérequis:** Plan 1 complété — serveur Express en écoute sur http://localhost:3001

---

## Fichiers créés

```
client/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── package.json
├── public/
│   └── manifest.json          ← placeholder, complété en Plan 3
└── src/
    ├── main.tsx
    ├── App.tsx                 ← routing
    ├── index.css               ← variables CSS + Tailwind
    ├── context/
    │   └── AuthContext.tsx
    ├── services/
    │   └── api.ts              ← fetch wrapper + toutes les fonctions API
    ├── hooks/
    │   ├── useAuth.ts
    │   └── useToast.ts
    ├── components/
    │   ├── Layout.tsx          ← wrapper avec BottomNav
    │   ├── BottomNav.tsx
    │   ├── Card.tsx
    │   ├── Button.tsx
    │   ├── Modal.tsx
    │   ├── Toast.tsx
    │   ├── Skeleton.tsx
    │   ├── CircularGauge.tsx   ← jauge SVG animée (eau)
    │   └── SparklineChart.tsx  ← mini graphique (dashboard poids)
    └── pages/
        ├── LoginPage.tsx
        ├── RegisterPage.tsx
        ├── DashboardPage.tsx
        ├── WeightPage.tsx
        ├── NutritionPage.tsx
        ├── PhotosPage.tsx
        ├── WaterPage.tsx
        ├── CalendarPage.tsx
        └── SettingsPage.tsx
```

---

## Task 1 : Scaffold Vite + Tailwind

- [ ] **Étape 1 : Créer le projet Vite**

```bash
cd healthpath
npm create vite@latest client -- --template react-ts
cd client
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom recharts date-fns
npm install -D @types/react @types/react-dom
```

- [ ] **Étape 2 : Configurer tailwind.config.js**

```js
// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#34C759',
        blue: { DEFAULT: '#007AFF' },
        warning: '#FF9500',
        danger: '#FF3B30',
        surface: '#F5F5F7',
        label: '#1D1D1F',
        secondary: '#86868B',
      },
      borderRadius: { card: '16px' },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Étape 3 : Remplacer src/index.css**

```css
/* client/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
  background: #FFFFFF;
  color: #1D1D1F;
  margin: 0;
  -webkit-font-smoothing: antialiased;
}

@layer utilities {
  .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
}
```

- [ ] **Étape 4 : Créer public/manifest.json placeholder**

```json
{
  "name": "HealthPath",
  "short_name": "HealthPath",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#34C759",
  "icons": []
}
```

- [ ] **Étape 5 : Vérifier que Vite démarre**

```bash
npm run dev
```
Résultat attendu : app sur http://localhost:5173.

- [ ] **Étape 6 : Commit**

```bash
cd healthpath
git add client/
git commit -m "feat: scaffold React client with Vite and Tailwind"
```

---

## Task 2 : AuthContext + service API

- [ ] **Étape 1 : Créer services/api.ts**

```typescript
// client/src/services/api.ts
const BASE = 'http://localhost:3001/api';

function getToken(): string | null {
  return localStorage.getItem('hp_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string; heightCm?: number; targetWeightKg?: number }) =>
    request<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
};

// Profile
export const settingsApi = {
  getProfile: () => request<UserProfile>('/settings/profile'),
  updateProfile: (data: Partial<UserProfile>) =>
    request<UserProfile>('/settings/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean }>('/settings/password', { method: 'PUT', body: JSON.stringify(data) }),
  updateNotifications: (data: Partial<NotificationSettings>) =>
    request<NotificationSettings>('/settings/notifications', { method: 'PUT', body: JSON.stringify(data) }),
};

// Weight
export const weightApi = {
  getEntries: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<WeightEntry[]>(`/weight${qs ? '?' + qs : ''}`);
  },
  create: (data: { weightKg: number; date: string; notes?: string }) =>
    request<WeightEntry>('/weight', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ weightKg: number; notes: string }>) =>
    request<WeightEntry>(`/weight/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/weight/${id}`, { method: 'DELETE' }),
};

// Nutrition
export const nutritionApi = {
  getMeals: (date: string) => request<Meal[]>(`/nutrition?date=${date}`),
  searchFood: (q: string) => request<OFFProduct[]>(`/nutrition/search?q=${encodeURIComponent(q)}`),
  addItem: (data: AddMealItemPayload) =>
    request<MealItem>('/nutrition/items', { method: 'POST', body: JSON.stringify(data) }),
  deleteItem: (id: string) => request<void>(`/nutrition/items/${id}`, { method: 'DELETE' }),
};

// Water
export const waterApi = {
  getIntakes: (date: string) => request<WaterIntake[]>(`/water?date=${date}`),
  getHistory: () => request<Record<string, number>>('/water/history'),
  add: (data: { amountMl: number; date: string }) =>
    request<WaterIntake>('/water', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/water/${id}`, { method: 'DELETE' }),
};

// Photos
export const photosApi = {
  getPhotos: (category?: string) =>
    request<ProgressPhoto[]>(`/photos${category ? '?category=' + category : ''}`),
  upload: (formData: FormData) => {
    const token = getToken();
    return fetch(`${BASE}/photos`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then((r) => r.json()) as Promise<ProgressPhoto>;
  },
  delete: (id: string) => request<void>(`/photos/${id}`, { method: 'DELETE' }),
  getImageUrl: (filename: string) => `${BASE}/uploads/${filename}`,
};

// Calendar
export const calendarApi = {
  getEvents: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<CalendarEvent[]>(`/calendar${qs ? '?' + qs : ''}`);
  },
  create: (data: CreateEventPayload) =>
    request<CalendarEvent>('/calendar', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CalendarEvent>) =>
    request<CalendarEvent>(`/calendar/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/calendar/${id}`, { method: 'DELETE' }),
};

// Push
export const pushApi = {
  getVapidKey: () => request<{ publicKey: string }>('/push/vapid-public-key'),
  subscribe: (sub: PushSubscriptionJSON) =>
    request<{ ok: boolean }>('/push/subscribe', { method: 'POST', body: JSON.stringify(sub) }),
  unsubscribe: (endpoint: string) =>
    request<{ ok: boolean }>('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
};

// Types
export interface User { id: string; email: string; name: string; }
export interface UserProfile extends User {
  heightCm: number | null;
  targetWeightKg: number | null;
  calorieGoal: number;
  proteinGoalPct: number;
  carbsGoalPct: number;
  fatGoalPct: number;
  waterGoalMl: number;
  wakeHour: number;
  sleepHour: number;
  notificationSettings: NotificationSettings | null;
}
export interface NotificationSettings {
  waterReminderEnabled: boolean;
  waterReminderIntervalMinutes: number;
  photoReminderEnabled: boolean;
  photoReminderIntervalDays: number;
  eventReminderEnabled: boolean;
  eventReminderMinutesBefore: number;
}
export interface WeightEntry { id: string; weightKg: number; date: string; notes: string | null; createdAt: string; }
export interface Meal { id: string; mealType: string; date: string; mealItems: MealItem[]; }
export interface MealItem { id: string; mealId: string; name: string; calories: number; proteinG: number; carbsG: number; fatG: number; quantity: number; unit: string; }
export interface OFFProduct { id: string; name: string; brand: string; calories: number; proteinG: number; carbsG: number; fatG: number; }
export interface WaterIntake { id: string; amountMl: number; date: string; createdAt: string; }
export interface ProgressPhoto { id: string; date: string; category: 'FRONT' | 'SIDE' | 'BACK'; imagePath: string; notes: string | null; createdAt: string; }
export interface CalendarEvent { id: string; title: string; description: string | null; date: string; endDate: string | null; eventType: 'MEDICAL' | 'SPORT' | 'OTHER'; sportType: string | null; isRecurring: boolean; completed: boolean; }
export interface AddMealItemPayload { date: string; mealType: string; name: string; calories: number; proteinG: number; carbsG: number; fatG: number; quantity: number; unit: string; openFoodFactsId?: string; }
export interface CreateEventPayload { title: string; date: string; eventType: string; description?: string; endDate?: string; sportType?: string; isRecurring?: boolean; recurrenceRule?: string; }
```

- [ ] **Étape 2 : Créer context/AuthContext.tsx**

```typescript
// client/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, settingsApi, User, UserProfile } from '../services/api';

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
```

- [ ] **Étape 3 : Créer hooks/useToast.ts**

```typescript
// client/src/hooks/useToast.ts
import { useState, useCallback } from 'react';

export interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return { toasts, addToast };
}
```

- [ ] **Étape 4 : Commit**

```bash
git add client/src/services/ client/src/context/ client/src/hooks/
git commit -m "feat: add API service layer and auth context"
```

---

## Task 3 : Composants de base

- [ ] **Étape 1 : components/Card.tsx**

```typescript
// client/src/components/Card.tsx
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-card shadow-card p-4 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Étape 2 : components/Button.tsx**

```typescript
// client/src/components/Button.tsx
import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-accent text-white hover:bg-opacity-90',
    secondary: 'bg-surface text-label hover:bg-gray-200',
    danger: 'bg-danger text-white hover:bg-opacity-90',
    ghost: 'bg-transparent text-accent hover:bg-surface',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-base', lg: 'px-6 py-3 text-lg' };
  return (
    <button
      {...props}
      className={`${variants[variant]} ${sizes[size]} rounded-xl font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Étape 3 : components/Modal.tsx**

```typescript
// client/src/components/Modal.tsx
import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-label">{title}</h2>
          <button onClick={onClose} className="text-secondary text-2xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Étape 4 : components/Toast.tsx**

```typescript
// client/src/components/Toast.tsx
import { Toast as ToastType } from '../hooks/useToast';

interface ToastContainerProps { toasts: ToastType[]; }

export function ToastContainer({ toasts }: ToastContainerProps) {
  const colors = { success: 'bg-accent', error: 'bg-danger', info: 'bg-blue' };
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div key={t.id} className={`${colors[t.type]} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-down`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Étape 5 : components/Skeleton.tsx**

```typescript
// client/src/components/Skeleton.tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-surface animate-pulse rounded-lg ${className}`} />;
}
```

- [ ] **Étape 6 : components/CircularGauge.tsx**

```typescript
// client/src/components/CircularGauge.tsx
interface CircularGaugeProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function CircularGauge({ value, max, size = 180, strokeWidth = 14, color = '#34C759', label, sublabel }: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#F5F5F7" strokeWidth={strokeWidth} />
      <circle
        cx={center} cy={center} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={center} y={center - 8} textAnchor="middle" dominantBaseline="middle"
        fill="#1D1D1F" fontSize={size * 0.18} fontWeight="700"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${center}px ${center}px` }}>
        {label || `${Math.round(pct * 100)}%`}
      </text>
      {sublabel && (
        <text x={center} y={center + 18} textAnchor="middle"
          fill="#86868B" fontSize={size * 0.09}
          style={{ transform: `rotate(90deg)`, transformOrigin: `${center}px ${center}px` }}>
          {sublabel}
        </text>
      )}
    </svg>
  );
}
```

- [ ] **Étape 7 : Commit**

```bash
git add client/src/components/
git commit -m "feat: add reusable UI components (Card, Button, Modal, Toast, Skeleton, CircularGauge)"
```

---

## Task 4 : Layout + BottomNav + App routing

- [ ] **Étape 1 : components/BottomNav.tsx**

```typescript
// client/src/components/BottomNav.tsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/weight', label: 'Poids', icon: '⚖️' },
  { to: '/nutrition', label: 'Nutrition', icon: '🍽' },
  { to: '/water', label: 'Eau', icon: '💧' },
  { to: '/calendar', label: 'Agenda', icon: '📅' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-40"
         style={{ height: '64px' }}>
      <div className="flex h-16 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
                isActive ? 'text-accent' : 'text-secondary'
              }`
            }
          >
            <span className="text-2xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Étape 2 : components/Layout.tsx**

```typescript
// client/src/components/Layout.tsx
import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-lg mx-auto pb-20 px-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Étape 3 : src/App.tsx**

```typescript
// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { WeightPage } from './pages/WeightPage';
import { NutritionPage } from './pages/NutritionPage';
import { PhotosPage } from './pages/PhotosPage';
import { WaterPage } from './pages/WaterPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { Skeleton } from './components/Skeleton';

function ProtectedRoutes() {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Skeleton className="w-32 h-8" /></div>;
  if (!token) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/water" element={<WaterPage />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Étape 4 : src/main.tsx**

```typescript
// client/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

- [ ] **Étape 5 : Commit**

```bash
git add client/src/App.tsx client/src/main.tsx client/src/components/Layout.tsx client/src/components/BottomNav.tsx
git commit -m "feat: add app routing with React Router and bottom navigation"
```

---

## Task 5 : Pages Login / Register

- [ ] **Étape 1 : pages/LoginPage.tsx**

```typescript
// client/src/pages/LoginPage.tsx
import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-label mb-2">HealthPath</h1>
        <p className="text-secondary mb-8">Ton suivi santé personnel</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-accent text-label" required />
          <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-accent text-label" required />
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>
        <p className="text-center text-secondary mt-6">
          Pas encore de compte ? <Link to="/register" className="text-accent font-medium">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : pages/RegisterPage.tsx**

```typescript
// client/src/pages/RegisterPage.tsx
import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', heightCm: '', targetWeightKg: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        name: form.name, email: form.email, password: form.password,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-label mb-2">Créer un compte</h1>
        <p className="text-secondary mb-8">Commence ton suivi aujourd'hui</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { key: 'name', label: 'Nom', type: 'text', required: true },
            { key: 'email', label: 'Email', type: 'email', required: true },
            { key: 'password', label: 'Mot de passe', type: 'password', required: true },
            { key: 'heightCm', label: 'Taille (cm)', type: 'number', required: false },
            { key: 'targetWeightKg', label: 'Objectif poids (kg)', type: 'number', required: false },
          ].map(({ key, label, type, required }) => (
            <input key={key} type={type} placeholder={label} value={form[key as keyof typeof form]}
              onChange={set(key as keyof typeof form)} required={required}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-accent text-label" />
          ))}
          {error && <p className="text-danger text-sm">{error}</p>}
          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? 'Création...' : 'Créer mon compte'}
          </Button>
        </form>
        <p className="text-center text-secondary mt-6">
          Déjà un compte ? <Link to="/login" className="text-accent font-medium">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Étape 3 : Tester le flux auth**

```bash
# Démarrer server et client
cd healthpath/server && npm run dev &
cd healthpath/client && npm run dev
```
Naviguer sur http://localhost:5173/login, créer un compte, vérifier la redirection vers `/`.

- [ ] **Étape 4 : Commit**

```bash
git add client/src/pages/LoginPage.tsx client/src/pages/RegisterPage.tsx
git commit -m "feat: add login and register pages"
```

---

## Task 6 : Dashboard

- [ ] **Étape 1 : pages/DashboardPage.tsx**

```typescript
// client/src/pages/DashboardPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { weightApi, waterApi, calendarApi, nutritionApi, WeightEntry, WaterIntake, CalendarEvent, Meal } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CircularGauge } from '../components/CircularGauge';
import { Skeleton } from '../components/Skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const today = new Date().toISOString().split('T')[0];

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterIntakes, setWaterIntakes] = useState<WaterIntake[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
    Promise.all([
      weightApi.getEntries({ from: sevenDaysAgo.toISOString().split('T')[0] }),
      nutritionApi.getMeals(today),
      waterApi.getIntakes(today),
      calendarApi.getEvents({ from: today, to: nextWeek.toISOString().split('T')[0] }),
    ]).then(([w, m, wi, e]) => { setWeights(w); setMeals(m); setWaterIntakes(wi); setEvents(e); })
      .finally(() => setLoading(false));
  }, []);

  const totalWater = waterIntakes.reduce((s, i) => s + i.amountMl, 0);
  const totalCalories = meals.flatMap(m => m.mealItems).reduce((s, i) => s + i.calories, 0);
  const totalProtein = meals.flatMap(m => m.mealItems).reduce((s, i) => s + i.proteinG, 0);
  const totalCarbs = meals.flatMap(m => m.mealItems).reduce((s, i) => s + i.carbsG, 0);
  const totalFat = meals.flatMap(m => m.mealItems).reduce((s, i) => s + i.fatG, 0);
  const currentWeight = weights[weights.length - 1]?.weightKg;
  const prevWeight = weights.length > 1 ? weights[weights.length - 2]?.weightKg : null;
  const weightDiff = currentWeight && prevWeight ? (currentWeight - prevWeight).toFixed(1) : null;

  const addWater = async () => {
    await waterApi.add({ amountMl: 250, date: today });
    const updated = await waterApi.getIntakes(today);
    setWaterIntakes(updated);
  };

  const eventTypeColors = { MEDICAL: '#007AFF', SPORT: '#FF9500', OTHER: '#86868B' };

  if (loading) return (
    <div className="pt-6 flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-36" />)}
    </div>
  );

  return (
    <div className="pt-6 pb-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-label">Bonjour {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-secondary text-sm">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</p>
        </div>
        <button onClick={() => navigate('/settings')} className="text-2xl">⚙️</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Carte Poids */}
        <Card onClick={() => navigate('/weight')} className="col-span-2">
          <p className="text-secondary text-sm mb-1">Poids</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-label">{currentWeight ? `${currentWeight} kg` : '—'}</p>
              {weightDiff && (
                <p className={`text-sm font-medium ${Number(weightDiff) > 0 ? 'text-warning' : 'text-accent'}`}>
                  {Number(weightDiff) > 0 ? '+' : ''}{weightDiff} kg cette semaine
                </p>
              )}
            </div>
            {weights.length > 1 && (
              <ResponsiveContainer width={100} height={50}>
                <LineChart data={weights.map(w => ({ v: w.weightKg }))}>
                  <Line type="monotone" dataKey="v" stroke="#34C759" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Carte Alimentation */}
        <Card onClick={() => navigate('/nutrition')}>
          <p className="text-secondary text-xs mb-1">Calories</p>
          <p className="text-2xl font-bold text-label">{totalCalories}</p>
          <p className="text-secondary text-xs">/ {user?.calorieGoal} kcal</p>
          <div className="mt-2 h-1.5 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.min(totalCalories / (user?.calorieGoal || 2000) * 100, 100)}%` }} />
          </div>
          <div className="mt-2 flex gap-1 text-[10px] text-secondary">
            <span>P {Math.round(totalProtein)}g</span>
            <span>·</span>
            <span>G {Math.round(totalCarbs)}g</span>
            <span>·</span>
            <span>L {Math.round(totalFat)}g</span>
          </div>
        </Card>

        {/* Carte Eau */}
        <Card onClick={() => navigate('/water')}>
          <p className="text-secondary text-xs mb-2">Hydratation</p>
          <div className="flex justify-center mb-2">
            <CircularGauge
              value={totalWater} max={user?.waterGoalMl || 2000} size={80} strokeWidth={8}
              label={`${(totalWater / 1000).toFixed(1)}L`}
            />
          </div>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); addWater(); }} className="w-full text-xs">
            +250ml
          </Button>
        </Card>

        {/* Carte Agenda */}
        <Card onClick={() => navigate('/calendar')} className="col-span-2">
          <p className="text-secondary text-sm mb-2">Prochains événements</p>
          {events.length === 0 ? (
            <p className="text-secondary text-sm">Aucun événement à venir</p>
          ) : (
            <div className="flex flex-col gap-2">
              {events.slice(0, 3).map(event => (
                <div key={event.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: eventTypeColors[event.eventType] }} />
                  <p className="text-sm text-label font-medium truncate">{event.title}</p>
                  <p className="text-xs text-secondary ml-auto shrink-0">
                    {format(new Date(event.date), 'd MMM', { locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <button onClick={() => navigate('/photos')} className="mt-3 w-full py-3 rounded-card bg-surface text-secondary text-sm font-medium">
        📸 Photos de progression
      </button>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add client/src/pages/DashboardPage.tsx
git commit -m "feat: add dashboard with weight, nutrition, water, and calendar summary cards"
```

---

## Task 7 : Page Poids

- [ ] **Étape 1 : pages/WeightPage.tsx**

```typescript
// client/src/pages/WeightPage.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { weightApi, WeightEntry } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format, subDays, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

const today = new Date().toISOString().split('T')[0];
const PERIODS = [
  { label: '7j', days: 7 }, { label: '30j', days: 30 }, { label: '90j', days: 90 },
  { label: '6m', days: 180 }, { label: '1an', days: 365 }, { label: 'Tout', days: 0 },
];

function calcBMI(weightKg: number, heightCm: number) {
  const h = heightCm / 100;
  return (weightKg / (h * h)).toFixed(1);
}

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return { text: 'Sous-poids', color: '#007AFF' };
  if (bmi < 25) return { text: 'Normal', color: '#34C759' };
  if (bmi < 30) return { text: 'Surpoids', color: '#FF9500' };
  return { text: 'Obésité', color: '#FF3B30' };
}

export function WeightPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [form, setForm] = useState({ weightKg: '', date: today, notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    const from = period > 0 ? subDays(new Date(), period).toISOString().split('T')[0] : undefined;
    const data = await weightApi.getEntries(from ? { from } : {});
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [period]);

  const handleSave = async () => {
    if (!form.weightKg) return;
    setSaving(true);
    await weightApi.create({ weightKg: Number(form.weightKg), date: form.date, notes: form.notes || undefined });
    setForm({ weightKg: '', date: today, notes: '' });
    await fetchEntries();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await weightApi.delete(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const current = entries[entries.length - 1];
  const first = entries[0];
  const bmi = current && user?.heightCm ? Number(calcBMI(current.weightKg, user.heightCm)) : null;
  const bmiInfo = bmi ? bmiLabel(bmi) : null;

  const weekAgo = entries.find(e => {
    const d = new Date(e.date); const wa = subDays(new Date(), 7);
    return d >= wa;
  });
  const monthAgo = entries.find(e => {
    const d = new Date(e.date); const ma = subMonths(new Date(), 1);
    return d >= ma;
  });

  const chartData = entries.map(e => ({ date: format(new Date(e.date), 'd/M'), weight: e.weightKg }));

  return (
    <div className="pt-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-label">Poids</h1>

      {/* Formulaire */}
      <Card>
        <p className="text-secondary text-sm mb-3">Ajouter une mesure</p>
        <div className="flex gap-2 mb-2">
          <input type="number" step="0.1" placeholder="Poids (kg)" value={form.weightKg}
            onChange={e => setForm(p => ({ ...p, weightKg: e.target.value }))}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent text-label" />
          <input type="date" value={form.date}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent text-label" />
        </div>
        <input type="text" placeholder="Notes (optionnel)" value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent text-label mb-2" />
        <Button onClick={handleSave} disabled={saving || !form.weightKg} className="w-full">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </Card>

      {/* Stats */}
      {current && (
        <Card>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-label">{current.weightKg}</p>
              <p className="text-xs text-secondary">Actuel</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-label">{first?.weightKg || '—'}</p>
              <p className="text-xs text-secondary">Départ</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-label">{user?.targetWeightKg || '—'}</p>
              <p className="text-xs text-secondary">Objectif</p>
            </div>
          </div>
          {bmi && bmiInfo && (
            <div className="mt-3 flex items-center justify-between px-2">
              <span className="text-sm text-secondary">IMC : <strong className="text-label">{bmi}</strong></span>
              <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ background: bmiInfo.color + '22', color: bmiInfo.color }}>
                {bmiInfo.text}
              </span>
            </div>
          )}
          {weekAgo && (
            <div className="mt-2 flex gap-4 text-sm px-2">
              <span className="text-secondary">Cette semaine :
                <strong className={current.weightKg - weekAgo.weightKg > 0 ? ' text-warning' : ' text-accent'}>
                  {' '}{current.weightKg - weekAgo.weightKg > 0 ? '+' : ''}{(current.weightKg - weekAgo.weightKg).toFixed(1)} kg
                </strong>
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Graphique */}
      <Card>
        <div className="flex gap-1 mb-3 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.label} onClick={() => setPeriod(p.days)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${period === p.days ? 'bg-accent text-white' : 'bg-surface text-secondary'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {loading ? <Skeleton className="h-48" /> : chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#86868B' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#86868B' }} />
              <Tooltip formatter={(v) => [`${v} kg`, 'Poids']} />
              {user?.targetWeightKg && (
                <ReferenceLine y={user.targetWeightKg} stroke="#34C759" strokeDasharray="5 5" label={{ value: 'Objectif', fill: '#34C759', fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="#007AFF" strokeWidth={2} dot={{ fill: '#007AFF', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-secondary text-sm text-center py-8">Pas assez de données</p>}
      </Card>

      {/* Historique */}
      <div className="flex flex-col gap-2">
        {entries.slice().reverse().map(entry => (
          <div key={entry.id} className="flex items-center justify-between bg-surface rounded-xl px-4 py-3">
            <div>
              <p className="font-semibold text-label">{entry.weightKg} kg</p>
              <p className="text-xs text-secondary">{format(new Date(entry.date), 'd MMMM yyyy', { locale: fr })}</p>
              {entry.notes && <p className="text-xs text-secondary mt-0.5">{entry.notes}</p>}
            </div>
            <button onClick={() => handleDelete(entry.id)} className="text-danger text-sm font-medium">Suppr.</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add client/src/pages/WeightPage.tsx
git commit -m "feat: add weight page with chart, BMI, and history"
```

---

## Task 8 : Page Nutrition

- [ ] **Étape 1 : pages/NutritionPage.tsx**

```typescript
// client/src/pages/NutritionPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { nutritionApi, Meal, OFFProduct } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MEAL_TYPES = [
  { key: 'BREAKFAST', label: 'Petit-déj', icon: '🌅' },
  { key: 'LUNCH', label: 'Déjeuner', icon: '☀️' },
  { key: 'DINNER', label: 'Dîner', icon: '🌙' },
  { key: 'SNACK', label: 'Snack', icon: '🍎' },
];

export function NutritionPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activeMeal, setActiveMeal] = useState('BREAKFAST');
  const [loading, setLoading] = useState(true);
  const [searchModal, setSearchModal] = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OFFProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OFFProduct | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [manualForm, setManualForm] = useState({ name: '', calories: '', proteinG: '', carbsG: '', fatG: '', quantity: '100' });

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    const data = await nutritionApi.getMeals(date);
    setMeals(data);
    setLoading(false);
  }, [date]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  const currentMealItems = meals.find(m => m.mealType === activeMeal)?.mealItems || [];
  const allItems = meals.flatMap(m => m.mealItems);
  const totalCalories = allItems.reduce((s, i) => s + i.calories, 0);
  const totalProtein = allItems.reduce((s, i) => s + i.proteinG, 0);
  const totalCarbs = allItems.reduce((s, i) => s + i.carbsG, 0);
  const totalFat = allItems.reduce((s, i) => s + i.fatG, 0);

  const searchFood = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await nutritionApi.searchFood(searchQuery);
    setSearchResults(results);
    setSearching(false);
  };

  const addFromSearch = async () => {
    if (!selectedProduct) return;
    const ratio = Number(quantity) / 100;
    await nutritionApi.addItem({
      date, mealType: activeMeal,
      name: selectedProduct.name,
      calories: Math.round(selectedProduct.calories * ratio),
      proteinG: selectedProduct.proteinG * ratio,
      carbsG: selectedProduct.carbsG * ratio,
      fatG: selectedProduct.fatG * ratio,
      quantity: Number(quantity), unit: 'g',
      openFoodFactsId: selectedProduct.id,
    });
    setSearchModal(false);
    setSelectedProduct(null);
    setSearchQuery('');
    setSearchResults([]);
    setQuantity('100');
    await fetchMeals();
  };

  const addManual = async () => {
    await nutritionApi.addItem({
      date, mealType: activeMeal,
      name: manualForm.name,
      calories: Number(manualForm.calories),
      proteinG: Number(manualForm.proteinG || 0),
      carbsG: Number(manualForm.carbsG || 0),
      fatG: Number(manualForm.fatG || 0),
      quantity: Number(manualForm.quantity || 100), unit: 'g',
    });
    setManualModal(false);
    setManualForm({ name: '', calories: '', proteinG: '', carbsG: '', fatG: '', quantity: '100' });
    await fetchMeals();
  };

  const deleteItem = async (id: string) => {
    await nutritionApi.deleteItem(id);
    await fetchMeals();
  };

  const macroBar = (value: number, total: number, color: string) => (
    <div className="flex-1">
      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(total > 0 ? (value / total) * 100 : 0, 100)}%`, background: color }} />
      </div>
    </div>
  );

  return (
    <div className="pt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-label">Alimentation</h1>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-sm text-secondary border-none outline-none bg-transparent" />
      </div>

      {/* Résumé journalier */}
      <Card>
        <div className="flex justify-between items-center mb-2">
          <p className="font-semibold text-label">{totalCalories} <span className="text-secondary font-normal text-sm">/ {user?.calorieGoal} kcal</span></p>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden mb-3">
          <div className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${Math.min(totalCalories / (user?.calorieGoal || 2000) * 100, 100)}%` }} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-label">{Math.round(totalProtein)}g</p>
            <p className="text-xs text-secondary">Protéines</p>
            <div className="mt-1 h-1.5 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-blue rounded-full" style={{ width: `${Math.min(totalProtein / ((user?.calorieGoal || 2000) * (user?.proteinGoalPct || 30) / 400) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-label">{Math.round(totalCarbs)}g</p>
            <p className="text-xs text-secondary">Glucides</p>
            <div className="mt-1 h-1.5 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-warning rounded-full" style={{ width: `${Math.min(totalCarbs / ((user?.calorieGoal || 2000) * (user?.carbsGoalPct || 40) / 400) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-label">{Math.round(totalFat)}g</p>
            <p className="text-xs text-secondary">Lipides</p>
            <div className="mt-1 h-1.5 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-danger rounded-full" style={{ width: `${Math.min(totalFat / ((user?.calorieGoal || 2000) * (user?.fatGoalPct || 30) / 900) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Onglets repas */}
      <div className="flex gap-1 bg-surface rounded-xl p-1">
        {MEAL_TYPES.map(m => (
          <button key={m.key} onClick={() => setActiveMeal(m.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeMeal === m.key ? 'bg-white shadow-card text-label' : 'text-secondary'}`}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Items du repas actif */}
      <div className="flex flex-col gap-2">
        {loading ? <Skeleton className="h-16" /> : currentMealItems.length === 0 ? (
          <p className="text-secondary text-sm text-center py-4">Aucun aliment ajouté</p>
        ) : currentMealItems.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-surface rounded-xl px-4 py-3">
            <div>
              <p className="font-medium text-label text-sm">{item.name}</p>
              <p className="text-xs text-secondary">{item.quantity}{item.unit} · {item.calories} kcal · P {item.proteinG.toFixed(1)}g G {item.carbsG.toFixed(1)}g L {item.fatG.toFixed(1)}g</p>
            </div>
            <button onClick={() => deleteItem(item.id)} className="text-danger text-sm">✕</button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setSearchModal(true)} className="flex-1">🔍 Rechercher</Button>
        <Button onClick={() => setManualModal(true)} variant="secondary" className="flex-1">✏️ Manuel</Button>
      </div>

      {/* Modal recherche */}
      <Modal isOpen={searchModal} onClose={() => setSearchModal(false)} title="Rechercher un aliment">
        <div className="flex gap-2 mb-4">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchFood()}
            placeholder="Pomme, poulet, yaourt..."
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
          <Button onClick={searchFood} disabled={searching} size="sm">
            {searching ? '...' : '🔍'}
          </Button>
        </div>
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {searchResults.map(product => (
            <div key={product.id}
              onClick={() => setSelectedProduct(product)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedProduct?.id === product.id ? 'border-accent bg-green-50' : 'border-gray-100'}`}>
              <p className="font-medium text-sm text-label">{product.name}</p>
              <p className="text-xs text-secondary">{product.brand} · {product.calories} kcal/100g</p>
            </div>
          ))}
        </div>
        {selectedProduct && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium text-label mb-2">Quantité (g)</p>
            <div className="flex gap-2">
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
              <Button onClick={addFromSearch}>Ajouter</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal manuel */}
      <Modal isOpen={manualModal} onClose={() => setManualModal(false)} title="Ajout manuel">
        <div className="flex flex-col gap-3">
          {[
            { key: 'name', label: 'Nom', type: 'text' },
            { key: 'calories', label: 'Calories (kcal)', type: 'number' },
            { key: 'quantity', label: 'Quantité (g)', type: 'number' },
            { key: 'proteinG', label: 'Protéines (g)', type: 'number' },
            { key: 'carbsG', label: 'Glucides (g)', type: 'number' },
            { key: 'fatG', label: 'Lipides (g)', type: 'number' },
          ].map(({ key, label, type }) => (
            <input key={key} type={type} placeholder={label}
              value={manualForm[key as keyof typeof manualForm]}
              onChange={e => setManualForm(p => ({ ...p, [key]: e.target.value }))}
              className="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
          ))}
          <Button onClick={addManual} disabled={!manualForm.name || !manualForm.calories} className="w-full">
            Ajouter
          </Button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add client/src/pages/NutritionPage.tsx
git commit -m "feat: add nutrition page with OpenFoodFacts search and manual entry"
```

---

## Task 9 : Page Hydratation

- [ ] **Étape 1 : pages/WaterPage.tsx**

```typescript
// client/src/pages/WaterPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { waterApi, WaterIntake } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { CircularGauge } from '../components/CircularGauge';
import { Skeleton } from '../components/Skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const today = new Date().toISOString().split('T')[0];
const QUICK_AMOUNTS = [150, 250, 500];

export function WaterPage() {
  const { user } = useAuth();
  const [intakes, setIntakes] = useState<WaterIntake[]>([]);
  const [history, setHistory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState('');

  const goalMl = user?.waterGoalMl || 2000;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [todayIntakes, hist] = await Promise.all([
      waterApi.getIntakes(today),
      waterApi.getHistory(),
    ]);
    setIntakes(todayIntakes);
    setHistory(hist);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalToday = intakes.reduce((s, i) => s + i.amountMl, 0);

  const addWater = async (amount: number) => {
    if (!amount) return;
    await waterApi.add({ amountMl: amount, date: today });
    await fetchData();
  };

  const deleteIntake = async (id: string) => {
    await waterApi.delete(id);
    await fetchData();
  };

  const chartData = Object.entries(history).map(([date, total]) => ({
    date: format(new Date(date), 'E', { locale: fr }),
    total,
  }));

  if (loading) return (
    <div className="pt-6 flex flex-col gap-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-64" />
    </div>
  );

  return (
    <div className="pt-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-label">Hydratation</h1>

      {/* Jauge */}
      <Card className="flex flex-col items-center py-6">
        <CircularGauge
          value={totalToday} max={goalMl} size={200} strokeWidth={16}
          label={`${(totalToday / 1000).toFixed(2)}L`}
          sublabel={`/ ${(goalMl / 1000).toFixed(1)}L`}
        />
        <p className="mt-3 text-secondary text-sm">{intakes.length} prise{intakes.length > 1 ? 's' : ''} aujourd'hui</p>
      </Card>

      {/* Boutons rapides */}
      <div className="flex gap-2">
        {QUICK_AMOUNTS.map(amount => (
          <Button key={amount} onClick={() => addWater(amount)} variant="secondary" className="flex-1 !py-3">
            +{amount}ml
          </Button>
        ))}
      </div>

      {/* Ajout custom */}
      <div className="flex gap-2">
        <input type="number" placeholder="Quantité (ml)" value={customAmount}
          onChange={e => setCustomAmount(e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
        <Button onClick={() => { if (customAmount) { addWater(Number(customAmount)); setCustomAmount(''); } }} disabled={!customAmount}>
          Ajouter
        </Button>
      </div>

      {/* Historique du jour */}
      <Card>
        <p className="font-semibold text-label mb-3">Aujourd'hui</p>
        {intakes.length === 0 ? (
          <p className="text-secondary text-sm">Aucune prise enregistrée</p>
        ) : (
          <div className="flex flex-col gap-2">
            {intakes.slice().reverse().map(intake => (
              <div key={intake.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💧</span>
                  <div>
                    <p className="text-sm font-medium text-label">{intake.amountMl} ml</p>
                    <p className="text-xs text-secondary">{format(new Date(intake.createdAt), 'HH:mm', { locale: fr })}</p>
                  </div>
                </div>
                <button onClick={() => deleteIntake(intake.id)} className="text-danger text-sm">✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Graphique 7 jours */}
      <Card>
        <p className="font-semibold text-label mb-3">7 derniers jours</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#86868B' }} />
            <YAxis tick={{ fontSize: 10, fill: '#86868B' }} />
            <Tooltip formatter={(v) => [`${v} ml`, 'Total']} />
            <ReferenceLine y={goalMl} stroke="#34C759" strokeDasharray="5 5" />
            <Bar dataKey="total" fill="#007AFF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add client/src/pages/WaterPage.tsx
git commit -m "feat: add water page with circular gauge, quick add, and weekly chart"
```

---

## Task 10 : Page Photos

- [ ] **Étape 1 : pages/PhotosPage.tsx**

```typescript
// client/src/pages/PhotosPage.tsx
import { useEffect, useState, useRef } from 'react';
import { photosApi, ProgressPhoto } from '../services/api';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CATEGORIES = [
  { key: 'FRONT', label: 'Face' },
  { key: 'SIDE', label: 'Profil' },
  { key: 'BACK', label: 'Dos' },
] as const;

type Category = typeof CATEGORIES[number]['key'];

function groupByDate(photos: ProgressPhoto[]): Record<string, ProgressPhoto[]> {
  return photos.reduce<Record<string, ProgressPhoto[]>>((acc, p) => {
    const key = p.date.split('T')[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
}

export function PhotosPage() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<Category | 'ALL'>('ALL');
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<Category>('FRONT');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareDates, setCompareDates] = useState<[string, string] | null>(null);
  const [compareCategory, setCompareCategory] = useState<Category>('FRONT');
  const [sliderPos, setSliderPos] = useState(50);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    setLoading(true);
    const data = await photosApi.getPhotos(filterCat !== 'ALL' ? filterCat : undefined);
    setPhotos(data);
    setLoading(false);
  };

  useEffect(() => { fetchPhotos(); }, [filterCat]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('date', uploadDate);
    fd.append('category', uploadCategory);
    if (uploadNotes) fd.append('notes', uploadNotes);
    await photosApi.upload(fd);
    setUploadModal(false);
    setUploading(false);
    await fetchPhotos();
  };

  const handleDelete = async (id: string) => {
    await photosApi.delete(id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const grouped = groupByDate(photos);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const comparePhotos = compareDates
    ? [
        photos.find(p => p.date.startsWith(compareDates[0]) && p.category === compareCategory),
        photos.find(p => p.date.startsWith(compareDates[1]) && p.category === compareCategory),
      ]
    : [null, null];

  return (
    <div className="pt-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-label">Photos</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setCompareMode(!compareMode)}>
            {compareMode ? '← Retour' : '⚖️ Comparer'}
          </Button>
          <Button size="sm" onClick={() => setUploadModal(true)}>+ Photo</Button>
        </div>
      </div>

      {/* Filtre catégorie */}
      <div className="flex gap-1">
        <button onClick={() => setFilterCat('ALL')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === 'ALL' ? 'bg-accent text-white' : 'bg-surface text-secondary'}`}>
          Tout
        </button>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setFilterCat(c.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === c.key ? 'bg-accent text-white' : 'bg-surface text-secondary'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Mode comparaison */}
      {compareMode ? (
        <div className="flex flex-col gap-4">
          <p className="text-secondary text-sm">Sélectionne 2 dates et une catégorie</p>
          <div className="flex gap-2">
            <input type="date" value={compareDates?.[0] || ''} onChange={e => setCompareDates(prev => [e.target.value, prev?.[1] || ''])}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200" />
            <input type="date" value={compareDates?.[1] || ''} onChange={e => setCompareDates(prev => [prev?.[0] || '', e.target.value])}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200" />
          </div>
          <div className="flex gap-1">
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCompareCategory(c.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${compareCategory === c.key ? 'bg-accent text-white' : 'bg-surface text-secondary'}`}>
                {c.label}
              </button>
            ))}
          </div>
          {comparePhotos[0] && comparePhotos[1] && (
            <div className="relative overflow-hidden rounded-card" style={{ height: 320 }}>
              <img src={photosApi.getImageUrl(comparePhotos[1]!.imagePath)} alt="après"
                className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                <img src={photosApi.getImageUrl(comparePhotos[0]!.imagePath)} alt="avant"
                  className="absolute inset-0 w-full h-full object-cover" style={{ width: `${10000 / sliderPos}%` }} />
              </div>
              <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${sliderPos}%` }}>
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-xs">⇔</div>
              </div>
              <input type="range" min="0" max="100" value={sliderPos} onChange={e => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize" />
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">{compareDates![0]}</div>
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">{compareDates![1]}</div>
            </div>
          )}
        </div>
      ) : (
        /* Grille photos */
        loading ? <Skeleton className="h-64" /> : sortedDates.length === 0 ? (
          <div className="text-center py-16 text-secondary">
            <p className="text-4xl mb-3">📸</p>
            <p>Aucune photo pour l'instant</p>
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date}>
              <p className="text-sm font-semibold text-secondary mb-2">
                {format(new Date(date), 'd MMMM yyyy', { locale: fr })}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {grouped[date].map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={photosApi.getImageUrl(photo.imagePath)} alt={photo.category}
                      className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-1">
                      {CATEGORIES.find(c => c.key === photo.category)?.label}
                    </div>
                    <button onClick={() => handleDelete(photo.id)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )
      )}

      {/* Modal upload */}
      <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title="Ajouter une photo">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-secondary mb-2">Catégorie</p>
            <div className="flex gap-2">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setUploadCategory(c.key)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${uploadCategory === c.key ? 'bg-accent text-white' : 'bg-surface text-secondary'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <input type="date" value={uploadDate} onChange={e => setUploadDate(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200" />
          <input type="text" placeholder="Notes (optionnel)" value={uploadNotes}
            onChange={e => setUploadNotes(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-200" />
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handleFileUpload} className="hidden" />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} size="lg" className="w-full">
            {uploading ? 'Envoi...' : '📷 Prendre / choisir une photo'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add client/src/pages/PhotosPage.tsx
git commit -m "feat: add photos page with grid, comparison slider, and camera upload"
```

---

## Task 11 : Page Calendrier

- [ ] **Étape 1 : pages/CalendarPage.tsx**

```typescript
// client/src/pages/CalendarPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { calendarApi, CalendarEvent, CreateEventPayload } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';

const EVENT_COLORS = { MEDICAL: '#007AFF', SPORT: '#FF9500', OTHER: '#86868B' };
const SPORT_TYPES = ['Cardio', 'Musculation', 'Yoga', 'Natation', 'Course', 'Vélo', 'Autre'];

export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [createModal, setCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [form, setForm] = useState<CreateEventPayload>({
    title: '', date: new Date().toISOString().slice(0, 16),
    eventType: 'OTHER',
  });

  const fetchEvents = useCallback(async () => {
    const from = startOfMonth(currentMonth).toISOString();
    const to = endOfMonth(currentMonth).toISOString();
    const data = await calendarApi.getEvents({ from, to });
    setEvents(data);
  }, [currentMonth]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const createEvent = async () => {
    await calendarApi.create(form);
    setCreateModal(false);
    setForm({ title: '', date: new Date().toISOString().slice(0, 16), eventType: 'OTHER' });
    await fetchEvents();
  };

  const toggleComplete = async (event: CalendarEvent) => {
    await calendarApi.update(event.id, { completed: !event.completed });
    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await calendarApi.delete(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = (getDay(days[0]) + 6) % 7; // Lundi = 0

  const eventsOnDay = (day: Date) =>
    events.filter(e => isSameDay(new Date(e.date), day));

  const sportEvents = events.filter(e => e.eventType === 'SPORT');
  const completedSport = sportEvents.filter(e => e.completed);

  return (
    <div className="pt-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-label">Agenda</h1>
        <div className="flex gap-2">
          <button onClick={() => setView(v => v === 'calendar' ? 'list' : 'calendar')}
            className="text-secondary text-sm font-medium">{view === 'calendar' ? '≡ Liste' : '⊞ Calendrier'}</button>
          <Button size="sm" onClick={() => setCreateModal(true)}>+ Événement</Button>
        </div>
      </div>

      {/* Navigation mois */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; })}
          className="text-xl px-2">‹</button>
        <p className="font-semibold text-label capitalize">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</p>
        <button onClick={() => setCurrentMonth(m => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; })}
          className="text-xl px-2">›</button>
      </div>

      {view === 'calendar' ? (
        <Card className="p-3">
          <div className="grid grid-cols-7 mb-1">
            {['L','M','M','J','V','S','D'].map((d, i) => (
              <div key={i} className="text-center text-xs text-secondary font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const dayEvents = eventsOnDay(day);
              const selected = selectedDate && isSameDay(day, selectedDate);
              return (
                <button key={day.toISOString()}
                  onClick={() => setSelectedDate(isSameDay(day, selectedDate!) ? null : day)}
                  className={`flex flex-col items-center py-1.5 rounded-xl transition-colors ${selected ? 'bg-accent/10' : ''} ${isToday(day) ? 'font-bold' : ''}`}>
                  <span className={`text-sm w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-accent text-white' : 'text-label'}`}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map(e => (
                      <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ background: EVENT_COLORS[e.eventType] }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedDate && eventsOnDay(selectedDate).length > 0 && (
            <div className="mt-3 border-t pt-3 flex flex-col gap-2">
              {eventsOnDay(selectedDate).map(event => (
                <EventRow key={event.id} event={event} onToggle={toggleComplete} onDelete={deleteEvent} />
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {events.length === 0 ? <p className="text-secondary text-sm text-center py-8">Aucun événement ce mois</p>
          : events.map(event => (
            <EventRow key={event.id} event={event} onToggle={toggleComplete} onDelete={deleteEvent} showDate />
          ))}
        </div>
      )}

      {/* Stats sport */}
      <Card>
        <p className="font-semibold text-label mb-2">Séances ce mois</p>
        <p className="text-2xl font-bold text-label">{completedSport.length}<span className="text-secondary font-normal text-base"> / {sportEvents.length}</span></p>
        {sportEvents.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {[...new Set(sportEvents.map(e => e.sportType).filter(Boolean))].map(type => (
              <span key={type} className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium">{type}</span>
            ))}
          </div>
        )}
      </Card>

      {/* Modal création */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Nouvel événement">
        <div className="flex flex-col gap-3">
          <input placeholder="Titre" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
          <input type="datetime-local" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
          <select value={form.eventType} onChange={e => setForm(p => ({ ...p, eventType: e.target.value as 'MEDICAL'|'SPORT'|'OTHER' }))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent bg-white">
            <option value="MEDICAL">🏥 Médical</option>
            <option value="SPORT">🏋️ Sport</option>
            <option value="OTHER">📌 Autre</option>
          </select>
          {form.eventType === 'SPORT' && (
            <select value={form.sportType || ''} onChange={e => setForm(p => ({ ...p, sportType: e.target.value }))}
              className="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent bg-white">
              <option value="">Type de séance</option>
              {SPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <textarea placeholder="Description (optionnel)" value={form.description || ''}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent resize-none" rows={2} />
          <Button onClick={createEvent} disabled={!form.title} className="w-full">Créer</Button>
        </div>
      </Modal>
    </div>
  );
}

function EventRow({ event, onToggle, onDelete, showDate = false }: {
  event: CalendarEvent; onToggle: (e: CalendarEvent) => void; onDelete: (id: string) => void; showDate?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 bg-surface rounded-xl px-3 py-2.5">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: EVENT_COLORS[event.eventType] }} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${event.completed ? 'line-through text-secondary' : 'text-label'}`}>{event.title}</p>
        <p className="text-xs text-secondary">
          {showDate ? format(new Date(event.date), 'd MMM · HH:mm', { locale: fr }) : format(new Date(event.date), 'HH:mm')}
          {event.sportType && ` · ${event.sportType}`}
        </p>
      </div>
      {event.eventType === 'SPORT' && (
        <button onClick={() => onToggle(event)}
          className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${event.completed ? 'bg-accent/20 text-accent' : 'bg-surface border border-gray-200 text-secondary'}`}>
          {event.completed ? '✓' : 'Fait'}
        </button>
      )}
      <button onClick={() => onDelete(event.id)} className="text-danger text-sm">✕</button>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add client/src/pages/CalendarPage.tsx
git commit -m "feat: add calendar page with monthly view, list view, and sport stats"
```

---

## Task 12 : Page Réglages

- [ ] **Étape 1 : pages/SettingsPage.tsx**

```typescript
// client/src/pages/SettingsPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { settingsApi, UserProfile } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export function SettingsPage() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) setProfile({
      name: user.name, email: user.email, heightCm: user.heightCm ?? undefined,
      targetWeightKg: user.targetWeightKg ?? undefined, calorieGoal: user.calorieGoal,
      proteinGoalPct: user.proteinGoalPct, carbsGoalPct: user.carbsGoalPct, fatGoalPct: user.fatGoalPct,
      waterGoalMl: user.waterGoalMl, wakeHour: user.wakeHour, sleepHour: user.sleepHour,
    });
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    await settingsApi.updateProfile(profile);
    await refreshProfile();
    setMsg('Profil mis à jour ✓');
    setTimeout(() => setMsg(''), 2500);
    setSaving(false);
  };

  const changePassword = async () => {
    if (!passwords.current || !passwords.next) return;
    setSaving(true);
    try {
      await settingsApi.changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '' });
      setMsg('Mot de passe modifié ✓');
      setTimeout(() => setMsg(''), 2500);
    } catch {
      setMsg('Mot de passe actuel incorrect');
    }
    setSaving(false);
  };

  const saveNotif = async () => {
    if (!user?.notificationSettings) return;
    await settingsApi.updateNotifications(user.notificationSettings);
    await refreshProfile();
    setMsg('Notifications mises à jour ✓');
    setTimeout(() => setMsg(''), 2500);
  };

  const set = (k: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile(p => ({ ...p, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }));

  const fields: { key: keyof typeof profile; label: string; type: string }[] = [
    { key: 'name', label: 'Nom', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'heightCm', label: 'Taille (cm)', type: 'number' },
    { key: 'targetWeightKg', label: 'Objectif poids (kg)', type: 'number' },
    { key: 'calorieGoal', label: 'Objectif calories (kcal)', type: 'number' },
    { key: 'waterGoalMl', label: 'Objectif eau (ml)', type: 'number' },
    { key: 'wakeHour', label: 'Heure de réveil', type: 'number' },
    { key: 'sleepHour', label: 'Heure de coucher', type: 'number' },
  ];

  return (
    <div className="pt-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-xl text-secondary">‹</button>
        <h1 className="text-2xl font-bold text-label">Réglages</h1>
      </div>

      {msg && <div className="bg-accent/10 text-accent text-sm font-medium px-4 py-2.5 rounded-xl">{msg}</div>}

      {/* Profil */}
      <Card>
        <p className="font-semibold text-label mb-3">Profil</p>
        <div className="flex flex-col gap-3">
          {fields.map(({ key, label, type }) => (
            <div key={key}>
              <label className="text-xs text-secondary mb-1 block">{label}</label>
              <input type={type} value={String(profile[key] ?? '')} onChange={set(key)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            {(['proteinGoalPct', 'carbsGoalPct', 'fatGoalPct'] as const).map((k, i) => (
              <div key={k}>
                <label className="text-xs text-secondary mb-1 block">{['Prot %', 'Gluc %', 'Lip %'][i]}</label>
                <input type="number" value={Number(profile[k] ?? 0)} onChange={set(k)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
              </div>
            ))}
          </div>
          <Button onClick={saveProfile} disabled={saving} className="w-full">Enregistrer</Button>
        </div>
      </Card>

      {/* Mot de passe */}
      <Card>
        <p className="font-semibold text-label mb-3">Mot de passe</p>
        <div className="flex flex-col gap-3">
          <input type="password" placeholder="Mot de passe actuel" value={passwords.current}
            onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
          <input type="password" placeholder="Nouveau mot de passe" value={passwords.next}
            onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))}
            className="px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-accent" />
          <Button onClick={changePassword} disabled={saving || !passwords.current || !passwords.next} variant="secondary" className="w-full">
            Changer le mot de passe
          </Button>
        </div>
      </Card>

      {/* Déconnexion */}
      <Button onClick={() => { logout(); navigate('/login'); }} variant="danger" className="w-full">
        Se déconnecter
      </Button>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add client/src/pages/SettingsPage.tsx
git commit -m "feat: add settings page with profile, goals, and password change"
```

---

## Vérification finale frontend

- [ ] Naviguer sur http://localhost:5173, créer un compte
- [ ] Tester toutes les pages depuis la bottom nav
- [ ] Vérifier que les données s'affichent correctement (ajouter des données de test)
- [ ] Vérifier le responsive sur mobile (dev tools 390×844)

```bash
git add -A
git commit -m "chore: frontend complete — all pages implemented"
```
