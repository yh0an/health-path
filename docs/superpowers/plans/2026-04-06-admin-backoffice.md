# Admin Back-office Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page `/admin` protégée par un flag `isAdmin` en base, affichant KPIs, graphique d'activité 30j et liste des utilisateurs.

**Architecture:** Flag `isAdmin` sur le modèle `User` + middleware `requireAdmin` côté serveur + deux endpoints `/api/admin/stats` et `/api/admin/users` + page React `AdminPage` accessible uniquement si `user.isAdmin`.

**Tech Stack:** TypeScript, Express, Prisma (PostgreSQL), React, Recharts (déjà installé)

---

## File Map

| Fichier | Action |
|---|---|
| `server/prisma/schema.prisma` | Ajout `isAdmin Boolean @default(false)` sur `User` |
| `server/prisma/migrations/…_add_is_admin/` | Migration + UPDATE seed |
| `server/src/middleware/adminAuth.ts` | Nouveau — middleware `requireAdmin` |
| `server/src/controllers/admin.controller.ts` | Nouveau — `getStats` + `getUsers` |
| `server/src/routes/admin.ts` | Nouveau — router Express |
| `server/src/index.ts` | Ajout `app.use('/api/admin', authMiddleware, adminRoutes)` |
| `server/src/controllers/settings.controller.ts` | Ajouter `isAdmin` dans le `select` de `getProfile` |
| `client/src/services/api.ts` | Ajouter `isAdmin` à `UserProfile` + `adminApi` + types `AdminStats`/`AdminUser` |
| `client/src/pages/AdminPage.tsx` | Nouveau — dashboard complet |
| `client/src/App.tsx` | Route `/admin` hors `Layout`, protégée par `user.isAdmin` |

---

## Task 1 : Schéma Prisma + migration isAdmin

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/…_add_is_admin/migration.sql` (généré par Prisma)

- [ ] **Step 1 : Ajouter `isAdmin` au modèle `User`**

Dans `server/prisma/schema.prisma`, ajouter après `createdAt` dans le modèle `User` :

```prisma
isAdmin  Boolean  @default(false)
```

Le modèle `User` devient :

```prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  password       String
  name           String
  pin            String?
  heightCm       Float?
  targetWeightKg Float?
  calorieGoal    Int      @default(2000)
  proteinGoalPct Int      @default(30)
  carbsGoalPct   Int      @default(40)
  fatGoalPct     Int      @default(30)
  waterGoalMl    Int      @default(2000)
  weighDay       Int      @default(1)
  wakeHour       Int      @default(8)
  sleepHour      Int      @default(22)
  isAdmin        Boolean  @default(false)
  createdAt      DateTime @default(now())
  // ... relations inchangées
```

- [ ] **Step 2 : Créer la migration avec seed data**

```bash
cd server && npx prisma migrate dev --name add_is_admin
```

Ensuite, **éditer manuellement** le fichier de migration généré (`server/prisma/migrations/…_add_is_admin/migration.sql`) pour y ajouter à la fin :

```sql
-- Set admin flag for owner
UPDATE "User" SET "isAdmin" = true WHERE email = 'yoan.pons@gmail.com';
```

- [ ] **Step 3 : Appliquer la migration mise à jour**

```bash
cd server && npx prisma migrate dev
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 4 : Régénérer le client Prisma**

```bash
cd server && npx prisma generate
```

- [ ] **Step 5 : Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "feat(db): add isAdmin flag to User, seed yoan.pons@gmail.com"
```

---

## Task 2 : Middleware requireAdmin + controller admin

**Files:**
- Create: `server/src/middleware/adminAuth.ts`
- Create: `server/src/controllers/admin.controller.ts`
- Create: `server/src/routes/admin.ts`

- [ ] **Step 1 : Créer le middleware `requireAdmin`**

Créer `server/src/middleware/adminAuth.ts` :

```typescript
import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import type { AuthRequest } from './auth';

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
```

- [ ] **Step 2 : Créer le controller admin**

Créer `server/src/controllers/admin.controller.ts` :

```typescript
import { Response } from 'express';
import prisma from '../lib/prisma';
import type { AuthRequest } from '../middleware/auth';

export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    totalMeals,
    totalWorkouts,
    totalWeightEntries,
    totalWaterIntakes,
    mealsLast7,
    workoutsLast7,
    weightLast7,
    waterLast7,
    mealsLast30,
    workoutsLast30,
    weightLast30,
    waterLast30,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.meal.count(),
    prisma.workoutSession.count(),
    prisma.weightEntry.count(),
    prisma.waterIntake.count(),
    prisma.meal.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.workoutSession.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.weightEntry.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.waterIntake.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { amountMl: true } }),
    prisma.meal.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    prisma.workoutSession.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    prisma.weightEntry.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    prisma.waterIntake.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
  ]);

  const avgWaterMl = waterLast7.length > 0
    ? Math.round(waterLast7.reduce((s, w) => s + w.amountMl, 0) / 7)
    : 0;

  // Aggregate activity per day for last 30 days
  const dayMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  const allEntries = [...mealsLast30, ...workoutsLast30, ...weightLast30, ...waterLast30];
  for (const entry of allEntries) {
    const key = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const activityLast30Days = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));

  res.json({
    totals: { users: totalUsers, meals: totalMeals, workouts: totalWorkouts, weightEntries: totalWeightEntries, waterIntakes: totalWaterIntakes },
    last7Days: { meals: mealsLast7, workouts: workoutsLast7, weightEntries: weightLast7, avgWaterMl },
    activityLast30Days,
  });
}

export async function getUsers(_req: AuthRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      isAdmin: true,
      _count: { select: { meals: true, workoutSessions: true, weightEntries: true } },
      meals:           { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      workoutSessions: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      weightEntries:   { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      waterIntakes:    { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const result = users.map(u => {
    const candidates = [
      u.meals[0]?.createdAt,
      u.workoutSessions[0]?.createdAt,
      u.weightEntries[0]?.createdAt,
      u.waterIntakes[0]?.createdAt,
    ].filter(Boolean) as Date[];
    const lastActivityAt = candidates.length > 0
      ? new Date(Math.max(...candidates.map(d => d.getTime()))).toISOString()
      : null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      isAdmin: u.isAdmin,
      counts: { meals: u._count.meals, workouts: u._count.workoutSessions, weightEntries: u._count.weightEntries },
      lastActivityAt,
    };
  });

  res.json(result);
}
```

- [ ] **Step 3 : Créer le router admin**

Créer `server/src/routes/admin.ts` :

```typescript
import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { getStats, getUsers } from '../controllers/admin.controller';

const router = Router();
router.use(requireAdmin);
router.get('/stats', getStats);
router.get('/users', getUsers);
export default router;
```

- [ ] **Step 4 : Enregistrer la route dans index.ts**

Dans `server/src/index.ts`, ajouter l'import :

```typescript
import adminRoutes from './routes/admin';
```

Et après la ligne `app.use('/api/workouts', authMiddleware, workoutRoutes);` :

```typescript
app.use('/api/admin', authMiddleware, adminRoutes);
```

- [ ] **Step 5 : Commit**

```bash
git add server/src/middleware/adminAuth.ts server/src/controllers/admin.controller.ts server/src/routes/admin.ts server/src/index.ts
git commit -m "feat(server): add /api/admin endpoints with requireAdmin middleware"
```

---

## Task 3 : Exposer isAdmin dans le profil

**Files:**
- Modify: `server/src/controllers/settings.controller.ts`

- [ ] **Step 1 : Ajouter `isAdmin` au select de getProfile**

Dans `server/src/controllers/settings.controller.ts`, modifier la fonction `getProfile` pour inclure `isAdmin` :

```typescript
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: {
      id: true, email: true, name: true, heightCm: true, targetWeightKg: true,
      calorieGoal: true, proteinGoalPct: true, carbsGoalPct: true, fatGoalPct: true,
      waterGoalMl: true, weighDay: true, wakeHour: true, sleepHour: true,
      isAdmin: true,
      notificationSettings: true,
    },
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
}
```

- [ ] **Step 2 : Commit**

```bash
git add server/src/controllers/settings.controller.ts
git commit -m "feat(server): expose isAdmin in /api/settings/profile"
```

---

## Task 4 : Types et API client

**Files:**
- Modify: `client/src/services/api.ts`

- [ ] **Step 1 : Ajouter `isAdmin` à `UserProfile` et les nouveaux types**

Dans `client/src/services/api.ts` :

1. Ajouter `isAdmin` à l'interface `UserProfile` :

```typescript
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
  weighDay: number;
  isAdmin: boolean;
  notificationSettings: NotificationSettings | null;
}
```

2. Ajouter après les types existants (avant la dernière ligne) :

```typescript
export interface AdminStats {
  totals: { users: number; meals: number; workouts: number; weightEntries: number; waterIntakes: number };
  last7Days: { meals: number; workouts: number; weightEntries: number; avgWaterMl: number };
  activityLast30Days: { date: string; count: number }[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  counts: { meals: number; workouts: number; weightEntries: number };
  lastActivityAt: string | null;
}
```

3. Ajouter l'objet `adminApi` avant la section `// ─── Types ───` :

```typescript
export const adminApi = {
  getStats: () => request<AdminStats>('/admin/stats'),
  getUsers: () => request<AdminUser[]>('/admin/users'),
};
```

- [ ] **Step 2 : Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat(client): add AdminStats/AdminUser types and adminApi"
```

---

## Task 5 : Page AdminPage

**Files:**
- Create: `client/src/pages/AdminPage.tsx`

- [ ] **Step 1 : Créer la page**

Créer `client/src/pages/AdminPage.tsx` :

```typescript
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi } from '../services/api';
import type { AdminStats, AdminUser } from '../services/api';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return `Il y a ${days}j`;
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: '#111', borderRadius: 14, padding: '14px 16px', border: '1px solid #1e1e1e' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getUsers()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#555', fontSize: 13 }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '24px 16px 48px', maxWidth: 768, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#f0f0f0', letterSpacing: -0.5 }}>Back-office</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{todayCapitalized}</div>
        </div>
        <a href="/" style={{ fontSize: 12, color: '#555', textDecoration: 'none', paddingTop: 4 }}>← App</a>
      </div>

      {/* KPI cards */}
      {stats && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <KpiCard label="Utilisateurs" value={stats.totals.users} color="#f0f0f0" />
            <KpiCard label="Repas 7j" value={stats.last7Days.meals} color="#d4a843" />
            <KpiCard label="Séances 7j" value={stats.last7Days.workouts} color="#a78bfa" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            <KpiCard label="Pesées 7j" value={stats.last7Days.weightEntries} color="#4ade80" />
            <KpiCard label="Eau moy. 7j" value={`${stats.last7Days.avgWaterMl} ml`} color="#0ea5e9" />
          </div>

          {/* Activity chart */}
          <div style={{ background: '#111', borderRadius: 14, padding: '16px', marginBottom: 24, border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
              Activité — 30 derniers jours
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={stats.activityLast30Days} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 9, fill: '#444' }}
                  interval={6}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#444' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#888' }}
                  itemStyle={{ color: '#d4a843' }}
                  labelFormatter={formatDate}
                  cursor={false}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#d4a843"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#d4a843' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Users table */}
      <div style={{ background: '#111', borderRadius: 14, border: '1px solid #1e1e1e', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e1e' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Utilisateurs ({users.length})
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Nom', 'Email', 'Inscrit le', 'Repas', 'Séances', 'Pesées', 'Dernière activité'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid #1e1e1e', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: '#f0f0f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {u.name}{u.isAdmin && <span style={{ marginLeft: 6, fontSize: 9, color: '#d4a843', background: '#1a150a', padding: '1px 5px', borderRadius: 99, border: '1px solid #3a2e0a' }}>admin</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#666', whiteSpace: 'nowrap' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px', color: '#555', whiteSpace: 'nowrap' }}>{formatDateLong(u.createdAt)}</td>
                  <td style={{ padding: '12px 16px', color: '#d4a843', textAlign: 'right' }}>{u.counts.meals}</td>
                  <td style={{ padding: '12px 16px', color: '#a78bfa', textAlign: 'right' }}>{u.counts.workouts}</td>
                  <td style={{ padding: '12px 16px', color: '#4ade80', textAlign: 'right' }}>{u.counts.weightEntries}</td>
                  <td style={{ padding: '12px 16px', color: '#555', whiteSpace: 'nowrap' }}>{timeAgo(u.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```bash
git add client/src/pages/AdminPage.tsx
git commit -m "feat(client): add AdminPage with KPIs, activity chart and user table"
```

---

## Task 6 : Route /admin dans App.tsx

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1 : Ajouter la route `/admin` hors Layout**

Remplacer le contenu de `client/src/App.tsx` par :

```typescript
// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TodayPage } from './pages/TodayPage';
import { TrendsPage } from './pages/TrendsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PhotosPage } from './pages/PhotosPage';
import { AdminPage } from './pages/AdminPage';
import { Skeleton } from './components/Skeleton';

function AdminRoute() {
  const { user, token, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <Skeleton className="w-32 h-8" />
    </div>
  );
  if (!token || !user?.isAdmin) return <Navigate to="/" replace />;
  return <AdminPage />;
}

function ProtectedRoutes() {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/photos" element={<PhotosPage />} />
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
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 2 : Vérifier que la page s'affiche**

Démarrer le serveur et le client, naviguer vers `http://localhost:5173/admin`. Doit afficher le dashboard (si connecté avec `yoan.pons@gmail.com`), sinon redirection vers `/`.

- [ ] **Step 3 : Commit final**

```bash
git add client/src/App.tsx
git commit -m "feat(client): add /admin route protected by isAdmin flag"
git push
```
