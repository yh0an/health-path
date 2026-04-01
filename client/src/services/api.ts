const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4800/api';

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
    throw new Error((err as { error?: string }).error || res.statusText);
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
  getMeals: (date?: string) => request<Meal[]>(`/nutrition${date ? '?date=' + date : ''}`),
  upload: (formData: FormData) => {
    const token = getToken();
    return fetch(`${BASE}/nutrition`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then((r) => r.json()) as Promise<Meal>;
  },
  delete: (id: string) => request<void>(`/nutrition/${id}`, { method: 'DELETE' }),
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
  getImageUrl: (url: string) => url,
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

// ─── Types ───────────────────────────────────────────────────────────────────
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
export interface Meal {
  id: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  date: string;
  time: string | null;
  description: string | null;
  imageUrl: string;
  createdAt: string;
}
export interface WaterIntake { id: string; amountMl: number; date: string; createdAt: string; }
export interface ProgressPhoto { id: string; date: string; category: 'FRONT' | 'SIDE' | 'BACK'; imagePath: string; notes: string | null; createdAt: string; }
export interface CalendarEvent { id: string; title: string; description: string | null; date: string; endDate: string | null; eventType: 'MEDICAL' | 'SPORT' | 'OTHER'; sportType: string | null; isRecurring: boolean; completed: boolean; }
export interface CreateEventPayload { title: string; date: string; eventType: string; description?: string; endDate?: string; sportType?: string; isRecurring?: boolean; recurrenceRule?: string; }
