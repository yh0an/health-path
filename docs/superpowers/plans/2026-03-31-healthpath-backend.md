# HealthPath — Plan 1/3 : Backend & Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffolder l'infrastructure Docker/PostgreSQL et implémenter l'API REST Express/TypeScript/Prisma complète (auth, poids, nutrition, eau, photos, calendrier, profil, notifications push).

**Architecture:** Monorepo `healthpath/` avec `client/` et `server/`. Le backend Express tourne sur le port 3001, PostgreSQL via Docker Compose sur le port 5432. Toutes les routes (sauf `/auth/*`) sont protégées par un middleware JWT. Les fichiers uploadés sont servis depuis `server/uploads/` via une route protégée.

**Tech Stack:** Node.js 20, Express 4, TypeScript 5, Prisma 5, PostgreSQL 15, bcrypt, jsonwebtoken, multer, web-push, node-cron, zod (validation), cors, dotenv

---

## Fichiers créés/modifiés

```
healthpath/
├── docker-compose.yml
├── .env.example
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   ├── prisma/
│   │   └── schema.prisma
│   ├── uploads/                         ← créé au runtime
│   └── src/
│       ├── index.ts                     ← entrée Express
│       ├── middleware/
│       │   ├── auth.ts                  ← vérification JWT
│       │   └── upload.ts                ← multer config
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── weight.ts
│       │   ├── nutrition.ts
│       │   ├── water.ts
│       │   ├── photos.ts
│       │   ├── calendar.ts
│       │   ├── settings.ts
│       │   └── push.ts
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── weight.controller.ts
│       │   ├── nutrition.controller.ts
│       │   ├── water.controller.ts
│       │   ├── photos.controller.ts
│       │   ├── calendar.controller.ts
│       │   ├── settings.controller.ts
│       │   └── push.controller.ts
│       └── services/
│           ├── push.service.ts          ← web-push + cron jobs
│           └── openfoodfacts.service.ts ← proxy OpenFoodFacts
```

---

## Task 1 : Monorepo + Docker Compose

**Files:**
- Create: `healthpath/docker-compose.yml`
- Create: `healthpath/.env.example`

- [ ] **Étape 1 : Créer la structure racine**

```bash
mkdir -p healthpath
cd healthpath
mkdir -p client server
```

- [ ] **Étape 2 : Créer docker-compose.yml**

```yaml
# healthpath/docker-compose.yml
version: '3.9'

services:
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: healthpath
      POSTGRES_PASSWORD: healthpath_secret
      POSTGRES_DB: healthpath
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Étape 3 : Créer .env.example**

```bash
# healthpath/.env.example
DATABASE_URL="postgresql://healthpath:healthpath_secret@localhost:5432/healthpath"
JWT_SECRET="change_me_in_production_at_least_64_chars"
JWT_EXPIRES_IN="7d"
PORT=3001
CLIENT_URL="http://localhost:5173"
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_EMAIL="mailto:admin@healthpath.app"
UPLOADS_DIR="./uploads"
```

- [ ] **Étape 4 : Démarrer PostgreSQL**

```bash
cd healthpath
docker compose up -d db
docker compose ps
```
Résultat attendu : `db` dans l'état `Up`.

---

## Task 2 : Initialisation du projet server

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/.env`

- [ ] **Étape 1 : Init npm et dépendances**

```bash
cd healthpath/server
npm init -y
npm install express cors dotenv bcryptjs jsonwebtoken multer web-push node-cron @prisma/client zod
npm install -D typescript ts-node-dev @types/express @types/cors @types/bcryptjs @types/jsonwebtoken @types/multer @types/web-push @types/node prisma
```

- [ ] **Étape 2 : tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Étape 3 : Scripts dans package.json**

Ajouter dans `server/package.json` :
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

- [ ] **Étape 4 : Créer server/.env**

```bash
DATABASE_URL="postgresql://healthpath:healthpath_secret@localhost:5432/healthpath"
JWT_SECRET="dev_jwt_secret_change_in_production_at_least_64_chars_long"
JWT_EXPIRES_IN="7d"
PORT=3001
CLIENT_URL="http://localhost:5173"
VAPID_EMAIL="mailto:admin@healthpath.app"
UPLOADS_DIR="./uploads"
```

Note : VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY seront générées en Task 12.

---

## Task 3 : Prisma Schema

**Files:**
- Create: `server/prisma/schema.prisma`

- [ ] **Étape 1 : Init Prisma**

```bash
cd healthpath/server
npx prisma init --datasource-provider postgresql
```

- [ ] **Étape 2 : Remplacer server/prisma/schema.prisma**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

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
  wakeHour       Int      @default(8)
  sleepHour      Int      @default(22)
  createdAt      DateTime @default(now())

  weightEntries        WeightEntry[]
  meals                Meal[]
  waterIntakes         WaterIntake[]
  progressPhotos       ProgressPhoto[]
  calendarEvents       CalendarEvent[]
  pushSubscriptions    PushSubscription[]
  notificationSettings NotificationSettings?
}

model WeightEntry {
  id        String   @id @default(cuid())
  userId    String
  weightKg  Float
  date      DateTime @db.Date
  notes     String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
}

enum MealType {
  BREAKFAST
  LUNCH
  DINNER
  SNACK
}

model Meal {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @db.Date
  mealType  MealType
  createdAt DateTime @default(now())

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  mealItems MealItem[]
}

model MealItem {
  id                String  @id @default(cuid())
  mealId            String
  name              String
  calories          Int
  proteinG          Float
  carbsG            Float
  fatG              Float
  quantity          Float
  unit              String
  openFoodFactsId   String?

  meal Meal @relation(fields: [mealId], references: [id], onDelete: Cascade)
}

model WaterIntake {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @db.Date
  amountMl  Int
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum PhotoCategory {
  FRONT
  SIDE
  BACK
}

model ProgressPhoto {
  id        String        @id @default(cuid())
  userId    String
  date      DateTime      @db.Date
  category  PhotoCategory
  imagePath String
  notes     String?
  createdAt DateTime      @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum EventType {
  MEDICAL
  SPORT
  OTHER
}

model CalendarEvent {
  id              String    @id @default(cuid())
  userId          String
  title           String
  description     String?
  date            DateTime
  endDate         DateTime?
  eventType       EventType
  sportType       String?
  isRecurring     Boolean   @default(false)
  recurrenceRule  String?
  completed       Boolean   @default(false)
  createdAt       DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model NotificationSettings {
  id                            String  @id @default(cuid())
  userId                        String  @unique
  waterReminderEnabled          Boolean @default(true)
  waterReminderIntervalMinutes  Int     @default(60)
  photoReminderEnabled          Boolean @default(true)
  photoReminderIntervalDays     Int     @default(14)
  eventReminderEnabled          Boolean @default(true)
  eventReminderMinutesBefore    Int     @default(30)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Étape 3 : Générer et appliquer la migration**

```bash
cd healthpath/server
npx prisma migrate dev --name init
npx prisma generate
```

Résultat attendu : migration appliquée, client Prisma généré.

- [ ] **Étape 4 : Vérifier dans Prisma Studio**

```bash
npx prisma studio
```
Toutes les tables doivent être visibles. Fermer après vérification.

---

## Task 4 : Entrée Express + middleware auth

**Files:**
- Create: `server/src/index.ts`
- Create: `server/src/middleware/auth.ts`

- [ ] **Étape 1 : Créer src/index.ts**

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth';
import weightRoutes from './routes/weight';
import nutritionRoutes from './routes/nutrition';
import waterRoutes from './routes/water';
import photosRoutes from './routes/photos';
import calendarRoutes from './routes/calendar';
import settingsRoutes from './routes/settings';
import pushRoutes from './routes/push';
import { authMiddleware } from './middleware/auth';
import { startCronJobs } from './services/push.service';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Routes publiques
app.use('/api/auth', authRoutes);

// Fichiers uploadés (protégés)
app.use('/api/uploads', authMiddleware, express.static(path.join(__dirname, '..', 'uploads')));

// Routes protégées
app.use('/api/weight', authMiddleware, weightRoutes);
app.use('/api/nutrition', authMiddleware, nutritionRoutes);
app.use('/api/water', authMiddleware, waterRoutes);
app.use('/api/photos', authMiddleware, photosRoutes);
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/push', authMiddleware, pushRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startCronJobs();
});

export default app;
```

- [ ] **Étape 2 : Créer src/middleware/auth.ts**

```typescript
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

- [ ] **Étape 3 : Tester que le serveur démarre**

```bash
cd healthpath/server
npm run dev
```
Résultat attendu : `Server running on port 3001` dans la console.

```bash
curl http://localhost:3001/api/health
# {"ok":true}
```

- [ ] **Étape 4 : Commit**

```bash
cd healthpath
git init
git add server/src/index.ts server/src/middleware/auth.ts server/package.json server/tsconfig.json server/prisma/schema.prisma docker-compose.yml .env.example
git commit -m "feat: bootstrap server with Express, Prisma schema, and auth middleware"
```

---

## Task 5 : Routes Auth (register / login)

**Files:**
- Create: `server/src/controllers/auth.controller.ts`
- Create: `server/src/routes/auth.ts`

- [ ] **Étape 1 : Créer auth.controller.ts**

```typescript
// server/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, heightCm, targetWeightKg } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password and name are required' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      heightCm: heightCm ? Number(heightCm) : null,
      targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
      notificationSettings: { create: {} },
    },
    select: { id: true, email: true, name: true },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.status(201).json({ token, user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
}
```

- [ ] **Étape 2 : Créer routes/auth.ts**

```typescript
// server/src/routes/auth.ts
import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';

const router = Router();
router.post('/register', register);
router.post('/login', login);
export default router;
```

- [ ] **Étape 3 : Tester register et login**

```bash
# Register
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test User","heightCm":175,"targetWeightKg":70}' | jq .

# Login
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq .
```
Résultat attendu : token JWT dans les deux réponses.

- [ ] **Étape 4 : Commit**

```bash
git add server/src/routes/auth.ts server/src/controllers/auth.controller.ts
git commit -m "feat: add auth register and login endpoints"
```

---

## Task 6 : Routes Poids (Weight)

**Files:**
- Create: `server/src/controllers/weight.controller.ts`
- Create: `server/src/routes/weight.ts`

- [ ] **Étape 1 : Créer weight.controller.ts**

```typescript
// server/src/controllers/weight.controller.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function getEntries(req: AuthRequest, res: Response): Promise<void> {
  const { from, to } = req.query;
  const where: Record<string, unknown> = { userId: req.userId! };
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from as string) } : {}),
      ...(to ? { lte: new Date(to as string) } : {}),
    };
  }
  const entries = await prisma.weightEntry.findMany({
    where,
    orderBy: { date: 'asc' },
  });
  res.json(entries);
}

export async function createEntry(req: AuthRequest, res: Response): Promise<void> {
  const { weightKg, date, notes } = req.body;
  if (!weightKg || !date) {
    res.status(400).json({ error: 'weightKg and date are required' });
    return;
  }
  const entry = await prisma.weightEntry.upsert({
    where: { userId_date: { userId: req.userId!, date: new Date(date) } },
    update: { weightKg: Number(weightKg), notes: notes ?? null },
    create: { userId: req.userId!, weightKg: Number(weightKg), date: new Date(date), notes: notes ?? null },
  });
  res.status(201).json(entry);
}

export async function updateEntry(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { weightKg, notes } = req.body;
  const entry = await prisma.weightEntry.findFirst({ where: { id, userId: req.userId! } });
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  const updated = await prisma.weightEntry.update({
    where: { id },
    data: { weightKg: weightKg ? Number(weightKg) : entry.weightKg, notes: notes ?? entry.notes },
  });
  res.json(updated);
}

export async function deleteEntry(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const entry = await prisma.weightEntry.findFirst({ where: { id, userId: req.userId! } });
  if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.weightEntry.delete({ where: { id } });
  res.status(204).send();
}
```

- [ ] **Étape 2 : Créer routes/weight.ts**

```typescript
// server/src/routes/weight.ts
import { Router } from 'express';
import { getEntries, createEntry, updateEntry, deleteEntry } from '../controllers/weight.controller';

const router = Router();
router.get('/', getEntries);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);
export default router;
```

- [ ] **Étape 3 : Tester (avec le token obtenu en Task 5)**

```bash
TOKEN="<token_from_login>"
# Créer une entrée
curl -s -X POST http://localhost:3001/api/weight \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weightKg":80.5,"date":"2026-03-31"}' | jq .

# Lister
curl -s http://localhost:3001/api/weight \
  -H "Authorization: Bearer $TOKEN" | jq .
```

- [ ] **Étape 4 : Commit**

```bash
git add server/src/routes/weight.ts server/src/controllers/weight.controller.ts
git commit -m "feat: add weight CRUD endpoints"
```

---

## Task 7 : Routes Nutrition + proxy OpenFoodFacts

**Files:**
- Create: `server/src/controllers/nutrition.controller.ts`
- Create: `server/src/routes/nutrition.ts`
- Create: `server/src/services/openfoodfacts.service.ts`

- [ ] **Étape 1 : Service OpenFoodFacts**

```typescript
// server/src/services/openfoodfacts.service.ts
export interface OFFProduct {
  id: string;
  name: string;
  brand: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export async function searchProducts(query: string): Promise<OFFProduct[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=20&fields=code,product_name,brands,nutriments`;
  const res = await fetch(url);
  const data = (await res.json()) as { products: Record<string, unknown>[] };
  return (data.products || [])
    .filter((p) => p.product_name)
    .map((p) => ({
      id: String(p.code || ''),
      name: String(p.product_name || ''),
      brand: String(p.brands || ''),
      calories: Number((p.nutriments as Record<string, unknown>)?.['energy-kcal_100g'] || 0),
      proteinG: Number((p.nutriments as Record<string, unknown>)?.proteins_100g || 0),
      carbsG: Number((p.nutriments as Record<string, unknown>)?.carbohydrates_100g || 0),
      fatG: Number((p.nutriments as Record<string, unknown>)?.fat_100g || 0),
    }));
}
```

- [ ] **Étape 2 : Créer nutrition.controller.ts**

```typescript
// server/src/controllers/nutrition.controller.ts
import { Response } from 'express';
import { PrismaClient, MealType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { searchProducts } from '../services/openfoodfacts.service';

const prisma = new PrismaClient();

export async function getMeals(req: AuthRequest, res: Response): Promise<void> {
  const { date } = req.query;
  if (!date) { res.status(400).json({ error: 'date required' }); return; }
  const meals = await prisma.meal.findMany({
    where: { userId: req.userId!, date: new Date(date as string) },
    include: { mealItems: true },
    orderBy: { mealType: 'asc' },
  });
  res.json(meals);
}

export async function addMealItem(req: AuthRequest, res: Response): Promise<void> {
  const { date, mealType, name, calories, proteinG, carbsG, fatG, quantity, unit, openFoodFactsId } = req.body;
  if (!date || !mealType || !name) {
    res.status(400).json({ error: 'date, mealType, name are required' });
    return;
  }
  const meal = await prisma.meal.upsert({
    where: { id: `${req.userId}_${date}_${mealType}` },
    update: {},
    create: {
      id: `${req.userId}_${date}_${mealType}`,
      userId: req.userId!,
      date: new Date(date),
      mealType: mealType as MealType,
    },
  });
  const item = await prisma.mealItem.create({
    data: {
      mealId: meal.id,
      name,
      calories: Number(calories),
      proteinG: Number(proteinG || 0),
      carbsG: Number(carbsG || 0),
      fatG: Number(fatG || 0),
      quantity: Number(quantity || 100),
      unit: unit || 'g',
      openFoodFactsId: openFoodFactsId || null,
    },
  });
  res.status(201).json(item);
}

export async function deleteMealItem(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const item = await prisma.mealItem.findFirst({
    where: { id, meal: { userId: req.userId! } },
  });
  if (!item) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.mealItem.delete({ where: { id } });
  res.status(204).send();
}

export async function searchFood(req: AuthRequest, res: Response): Promise<void> {
  const { q } = req.query;
  if (!q) { res.status(400).json({ error: 'q required' }); return; }
  const results = await searchProducts(q as string);
  res.json(results);
}
```

- [ ] **Étape 3 : Créer routes/nutrition.ts**

```typescript
// server/src/routes/nutrition.ts
import { Router } from 'express';
import { getMeals, addMealItem, deleteMealItem, searchFood } from '../controllers/nutrition.controller';

const router = Router();
router.get('/', getMeals);
router.post('/items', addMealItem);
router.delete('/items/:id', deleteMealItem);
router.get('/search', searchFood);
export default router;
```

- [ ] **Étape 4 : Tester la recherche OpenFoodFacts**

```bash
curl -s "http://localhost:3001/api/nutrition/search?q=pomme" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0]'
```
Résultat attendu : objet avec name, calories, etc.

- [ ] **Étape 5 : Commit**

```bash
git add server/src/routes/nutrition.ts server/src/controllers/nutrition.controller.ts server/src/services/openfoodfacts.service.ts
git commit -m "feat: add nutrition endpoints with OpenFoodFacts proxy"
```

---

## Task 8 : Routes Eau (Water)

**Files:**
- Create: `server/src/controllers/water.controller.ts`
- Create: `server/src/routes/water.ts`

- [ ] **Étape 1 : Créer water.controller.ts**

```typescript
// server/src/controllers/water.controller.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function getWaterIntakes(req: AuthRequest, res: Response): Promise<void> {
  const { date } = req.query;
  if (!date) { res.status(400).json({ error: 'date required' }); return; }
  const intakes = await prisma.waterIntake.findMany({
    where: { userId: req.userId!, date: new Date(date as string) },
    orderBy: { createdAt: 'asc' },
  });
  res.json(intakes);
}

export async function getWaterHistory(req: AuthRequest, res: Response): Promise<void> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const intakes = await prisma.waterIntake.findMany({
    where: { userId: req.userId!, date: { gte: sevenDaysAgo } },
    orderBy: { date: 'asc' },
  });
  // Agréger par date
  const byDate = intakes.reduce<Record<string, number>>((acc, intake) => {
    const key = intake.date.toISOString().split('T')[0];
    acc[key] = (acc[key] || 0) + intake.amountMl;
    return acc;
  }, {});
  res.json(byDate);
}

export async function addWaterIntake(req: AuthRequest, res: Response): Promise<void> {
  const { amountMl, date } = req.body;
  if (!amountMl || !date) { res.status(400).json({ error: 'amountMl and date required' }); return; }
  const intake = await prisma.waterIntake.create({
    data: { userId: req.userId!, amountMl: Number(amountMl), date: new Date(date) },
  });
  res.status(201).json(intake);
}

export async function deleteWaterIntake(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const intake = await prisma.waterIntake.findFirst({ where: { id, userId: req.userId! } });
  if (!intake) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.waterIntake.delete({ where: { id } });
  res.status(204).send();
}
```

- [ ] **Étape 2 : Créer routes/water.ts**

```typescript
// server/src/routes/water.ts
import { Router } from 'express';
import { getWaterIntakes, getWaterHistory, addWaterIntake, deleteWaterIntake } from '../controllers/water.controller';

const router = Router();
router.get('/', getWaterIntakes);
router.get('/history', getWaterHistory);
router.post('/', addWaterIntake);
router.delete('/:id', deleteWaterIntake);
export default router;
```

- [ ] **Étape 3 : Tester**

```bash
curl -s -X POST http://localhost:3001/api/water \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountMl":250,"date":"2026-03-31"}' | jq .
```

- [ ] **Étape 4 : Commit**

```bash
git add server/src/routes/water.ts server/src/controllers/water.controller.ts
git commit -m "feat: add water intake endpoints"
```

---

## Task 9 : Routes Photos (upload multer)

**Files:**
- Create: `server/src/middleware/upload.ts`
- Create: `server/src/controllers/photos.controller.ts`
- Create: `server/src/routes/photos.ts`

- [ ] **Étape 1 : Middleware upload multer**

```typescript
// server/src/middleware/upload.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});
```

- [ ] **Étape 2 : Créer photos.controller.ts**

```typescript
// server/src/controllers/photos.controller.ts
import { Response } from 'express';
import { PrismaClient, PhotoCategory } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function getPhotos(req: AuthRequest, res: Response): Promise<void> {
  const { category } = req.query;
  const photos = await prisma.progressPhoto.findMany({
    where: {
      userId: req.userId!,
      ...(category ? { category: category as PhotoCategory } : {}),
    },
    orderBy: { date: 'desc' },
  });
  res.json(photos);
}

export async function uploadPhoto(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const { date, category, notes } = req.body;
  if (!date || !category) { res.status(400).json({ error: 'date and category required' }); return; }
  const photo = await prisma.progressPhoto.create({
    data: {
      userId: req.userId!,
      date: new Date(date),
      category: category as PhotoCategory,
      imagePath: req.file.filename,
      notes: notes || null,
    },
  });
  res.status(201).json(photo);
}

export async function deletePhoto(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const photo = await prisma.progressPhoto.findFirst({ where: { id, userId: req.userId! } });
  if (!photo) { res.status(404).json({ error: 'Not found' }); return; }
  const filePath = path.join(__dirname, '..', '..', 'uploads', photo.imagePath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  await prisma.progressPhoto.delete({ where: { id } });
  res.status(204).send();
}
```

- [ ] **Étape 3 : Créer routes/photos.ts**

```typescript
// server/src/routes/photos.ts
import { Router } from 'express';
import { getPhotos, uploadPhoto, deletePhoto } from '../controllers/photos.controller';
import { upload } from '../middleware/upload';

const router = Router();
router.get('/', getPhotos);
router.post('/', upload.single('photo'), uploadPhoto);
router.delete('/:id', deletePhoto);
export default router;
```

- [ ] **Étape 4 : Commit**

```bash
git add server/src/middleware/upload.ts server/src/routes/photos.ts server/src/controllers/photos.controller.ts
git commit -m "feat: add progress photos upload and retrieval endpoints"
```

---

## Task 10 : Routes Calendrier

**Files:**
- Create: `server/src/controllers/calendar.controller.ts`
- Create: `server/src/routes/calendar.ts`

- [ ] **Étape 1 : Créer calendar.controller.ts**

```typescript
// server/src/controllers/calendar.controller.ts
import { Response } from 'express';
import { PrismaClient, EventType } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function getEvents(req: AuthRequest, res: Response): Promise<void> {
  const { from, to } = req.query;
  const events = await prisma.calendarEvent.findMany({
    where: {
      userId: req.userId!,
      date: {
        ...(from ? { gte: new Date(from as string) } : {}),
        ...(to ? { lte: new Date(to as string) } : {}),
      },
    },
    orderBy: { date: 'asc' },
  });
  res.json(events);
}

export async function createEvent(req: AuthRequest, res: Response): Promise<void> {
  const { title, description, date, endDate, eventType, sportType, isRecurring, recurrenceRule } = req.body;
  if (!title || !date || !eventType) {
    res.status(400).json({ error: 'title, date and eventType are required' });
    return;
  }
  const event = await prisma.calendarEvent.create({
    data: {
      userId: req.userId!,
      title,
      description: description || null,
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : null,
      eventType: eventType as EventType,
      sportType: sportType || null,
      isRecurring: isRecurring ?? false,
      recurrenceRule: recurrenceRule || null,
    },
  });
  res.status(201).json(event);
}

export async function updateEvent(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const event = await prisma.calendarEvent.findFirst({ where: { id, userId: req.userId! } });
  if (!event) { res.status(404).json({ error: 'Not found' }); return; }
  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      title: req.body.title ?? event.title,
      description: req.body.description ?? event.description,
      date: req.body.date ? new Date(req.body.date) : event.date,
      endDate: req.body.endDate ? new Date(req.body.endDate) : event.endDate,
      eventType: (req.body.eventType as EventType) ?? event.eventType,
      sportType: req.body.sportType ?? event.sportType,
      isRecurring: req.body.isRecurring ?? event.isRecurring,
      recurrenceRule: req.body.recurrenceRule ?? event.recurrenceRule,
      completed: req.body.completed ?? event.completed,
    },
  });
  res.json(updated);
}

export async function deleteEvent(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const event = await prisma.calendarEvent.findFirst({ where: { id, userId: req.userId! } });
  if (!event) { res.status(404).json({ error: 'Not found' }); return; }
  await prisma.calendarEvent.delete({ where: { id } });
  res.status(204).send();
}
```

- [ ] **Étape 2 : Créer routes/calendar.ts**

```typescript
// server/src/routes/calendar.ts
import { Router } from 'express';
import { getEvents, createEvent, updateEvent, deleteEvent } from '../controllers/calendar.controller';

const router = Router();
router.get('/', getEvents);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
export default router;
```

- [ ] **Étape 3 : Commit**

```bash
git add server/src/routes/calendar.ts server/src/controllers/calendar.controller.ts
git commit -m "feat: add calendar events CRUD endpoints"
```

---

## Task 11 : Routes Profil / Settings

**Files:**
- Create: `server/src/controllers/settings.controller.ts`
- Create: `server/src/routes/settings.ts`

- [ ] **Étape 1 : Créer settings.controller.ts**

```typescript
// server/src/controllers/settings.controller.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: {
      id: true, email: true, name: true, heightCm: true, targetWeightKg: true,
      calorieGoal: true, proteinGoalPct: true, carbsGoalPct: true, fatGoalPct: true,
      waterGoalMl: true, wakeHour: true, sleepHour: true,
      notificationSettings: true,
    },
  });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json(user);
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const { name, email, heightCm, targetWeightKg, calorieGoal, proteinGoalPct, carbsGoalPct, fatGoalPct, waterGoalMl, wakeHour, sleepHour } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(heightCm !== undefined && { heightCm: Number(heightCm) }),
      ...(targetWeightKg !== undefined && { targetWeightKg: Number(targetWeightKg) }),
      ...(calorieGoal !== undefined && { calorieGoal: Number(calorieGoal) }),
      ...(proteinGoalPct !== undefined && { proteinGoalPct: Number(proteinGoalPct) }),
      ...(carbsGoalPct !== undefined && { carbsGoalPct: Number(carbsGoalPct) }),
      ...(fatGoalPct !== undefined && { fatGoalPct: Number(fatGoalPct) }),
      ...(waterGoalMl !== undefined && { waterGoalMl: Number(waterGoalMl) }),
      ...(wakeHour !== undefined && { wakeHour: Number(wakeHour) }),
      ...(sleepHour !== undefined && { sleepHour: Number(sleepHour) }),
    },
    select: { id: true, email: true, name: true, heightCm: true, targetWeightKg: true,
      calorieGoal: true, proteinGoalPct: true, carbsGoalPct: true, fatGoalPct: true,
      waterGoalMl: true, wakeHour: true, sleepHour: true },
  });
  res.json(user);
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword required' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) { res.status(401).json({ error: 'Invalid current password' }); return; }
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.userId! }, data: { password: hashed } });
  res.json({ ok: true });
}

export async function updateNotificationSettings(req: AuthRequest, res: Response): Promise<void> {
  const settings = await prisma.notificationSettings.update({
    where: { userId: req.userId! },
    data: {
      ...(req.body.waterReminderEnabled !== undefined && { waterReminderEnabled: req.body.waterReminderEnabled }),
      ...(req.body.waterReminderIntervalMinutes !== undefined && { waterReminderIntervalMinutes: Number(req.body.waterReminderIntervalMinutes) }),
      ...(req.body.photoReminderEnabled !== undefined && { photoReminderEnabled: req.body.photoReminderEnabled }),
      ...(req.body.photoReminderIntervalDays !== undefined && { photoReminderIntervalDays: Number(req.body.photoReminderIntervalDays) }),
      ...(req.body.eventReminderEnabled !== undefined && { eventReminderEnabled: req.body.eventReminderEnabled }),
      ...(req.body.eventReminderMinutesBefore !== undefined && { eventReminderMinutesBefore: Number(req.body.eventReminderMinutesBefore) }),
    },
  });
  res.json(settings);
}
```

- [ ] **Étape 2 : Créer routes/settings.ts**

```typescript
// server/src/routes/settings.ts
import { Router } from 'express';
import { getProfile, updateProfile, changePassword, updateNotificationSettings } from '../controllers/settings.controller';

const router = Router();
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.put('/notifications', updateNotificationSettings);
export default router;
```

- [ ] **Étape 3 : Commit**

```bash
git add server/src/routes/settings.ts server/src/controllers/settings.controller.ts
git commit -m "feat: add profile and notification settings endpoints"
```

---

## Task 12 : Push Notifications + Cron Jobs

**Files:**
- Create: `server/src/controllers/push.controller.ts`
- Create: `server/src/routes/push.ts`
- Create: `server/src/services/push.service.ts`

- [ ] **Étape 1 : Générer les clés VAPID et les ajouter au .env**

```bash
cd healthpath/server
node -e "const wp = require('web-push'); const keys = wp.generateVAPIDKeys(); console.log('PUBLIC:', keys.publicKey); console.log('PRIVATE:', keys.privateKey);"
```

Copier les deux valeurs dans `server/.env` :
```
VAPID_PUBLIC_KEY="BxxxxxxxxxVAPID_PUBLIC_KEYxxxxxxxxx"
VAPID_PRIVATE_KEY="xxxxxxxxVAPID_PRIVATE_KEYxxxxxxxx"
```

- [ ] **Étape 2 : Créer push.service.ts**

```typescript
// server/src/services/push.service.ts
import webpush from 'web-push';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body }),
      ).catch(async (err) => {
        // Subscription expirée → supprimer
        if (err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }),
    ),
  );
}

export function startCronJobs(): void {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.log('VAPID keys not configured — push notifications disabled');
    return;
  }

  // Rappels hydratation : toutes les minutes, on vérifie qui a besoin d'un rappel
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const users = await prisma.user.findMany({
      where: {
        notificationSettings: {
          waterReminderEnabled: true,
        },
        wakeHour: { lte: currentHour },
        sleepHour: { gt: currentHour },
      },
      include: { notificationSettings: true },
    });

    for (const user of users) {
      if (!user.notificationSettings) continue;
      const interval = user.notificationSettings.waterReminderIntervalMinutes;
      // Envoyer seulement si les minutes actuelles sont un multiple de l'intervalle
      if (now.getMinutes() % interval === 0 && now.getSeconds() < 30) {
        await sendPushToUser(user.id, '💧 Hydratation', 'N\'oublie pas de boire de l\'eau !');
      }
    }
  });

  // Rappels photos : tous les jours à 9h
  cron.schedule('0 9 * * *', async () => {
    const users = await prisma.user.findMany({
      where: { notificationSettings: { photoReminderEnabled: true } },
      include: { notificationSettings: true, progressPhotos: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    for (const user of users) {
      if (!user.notificationSettings) continue;
      const lastPhoto = user.progressPhotos[0];
      const daysSinceLast = lastPhoto
        ? Math.floor((Date.now() - lastPhoto.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      if (daysSinceLast >= user.notificationSettings.photoReminderIntervalDays) {
        await sendPushToUser(user.id, '📸 Photos de progression', 'C\'est le moment de prendre tes photos !');
      }
    }
  });

  // Rappels événements : toutes les minutes
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const users = await prisma.user.findMany({
      where: { notificationSettings: { eventReminderEnabled: true } },
      include: { notificationSettings: true },
    });

    for (const user of users) {
      if (!user.notificationSettings) continue;
      const minutesBefore = user.notificationSettings.eventReminderMinutesBefore;
      const targetTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 30 * 1000);
      const windowEnd = new Date(targetTime.getTime() + 30 * 1000);

      const events = await prisma.calendarEvent.findMany({
        where: {
          userId: user.id,
          completed: false,
          date: { gte: windowStart, lte: windowEnd },
        },
      });

      for (const event of events) {
        await sendPushToUser(user.id, `📅 ${event.title}`, `Commence dans ${minutesBefore} minutes`);
      }
    }
  });

  console.log('Cron jobs started');
}
```

- [ ] **Étape 3 : Créer push.controller.ts**

```typescript
// server/src/controllers/push.controller.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export async function getVapidPublicKey(_req: AuthRequest, res: Response): Promise<void> {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
}

export async function subscribe(req: AuthRequest, res: Response): Promise<void> {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Invalid subscription object' });
    return;
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: req.userId!, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
  res.status(201).json({ ok: true });
}

export async function unsubscribe(req: AuthRequest, res: Response): Promise<void> {
  const { endpoint } = req.body;
  if (!endpoint) { res.status(400).json({ error: 'endpoint required' }); return; }
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: req.userId! } });
  res.json({ ok: true });
}
```

- [ ] **Étape 4 : Créer routes/push.ts**

```typescript
// server/src/routes/push.ts
import { Router } from 'express';
import { getVapidPublicKey, subscribe, unsubscribe } from '../controllers/push.controller';

const router = Router();
router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
export default router;
```

- [ ] **Étape 5 : Vérifier que le serveur démarre avec les cron jobs**

```bash
npm run dev
```
Résultat attendu : `Cron jobs started` dans la console.

- [ ] **Étape 6 : Commit final**

```bash
git add server/src/routes/push.ts server/src/controllers/push.controller.ts server/src/services/push.service.ts
git commit -m "feat: add push notifications with VAPID, subscriptions, and cron job reminders"
```

---

## Résumé des endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/auth/register | Inscription |
| POST | /api/auth/login | Connexion |
| GET | /api/settings/profile | Profil utilisateur |
| PUT | /api/settings/profile | Modifier profil |
| PUT | /api/settings/password | Changer mot de passe |
| PUT | /api/settings/notifications | Modifier paramètres notifs |
| GET | /api/weight?from=&to= | Entrées de poids |
| POST | /api/weight | Ajouter/remplacer entrée |
| PUT | /api/weight/:id | Modifier entrée |
| DELETE | /api/weight/:id | Supprimer entrée |
| GET | /api/nutrition?date= | Repas du jour |
| POST | /api/nutrition/items | Ajouter aliment |
| DELETE | /api/nutrition/items/:id | Supprimer aliment |
| GET | /api/nutrition/search?q= | Recherche OpenFoodFacts |
| GET | /api/water?date= | Prises d'eau du jour |
| GET | /api/water/history | 7 derniers jours agrégés |
| POST | /api/water | Ajouter prise |
| DELETE | /api/water/:id | Supprimer prise |
| GET | /api/photos | Photos (filtrable par category) |
| POST | /api/photos | Upload photo |
| DELETE | /api/photos/:id | Supprimer photo |
| GET | /api/uploads/:filename | Servir image (protégé) |
| GET | /api/calendar?from=&to= | Événements calendrier |
| POST | /api/calendar | Créer événement |
| PUT | /api/calendar/:id | Modifier événement |
| DELETE | /api/calendar/:id | Supprimer événement |
| GET | /api/push/vapid-public-key | Clé publique VAPID |
| POST | /api/push/subscribe | Enregistrer subscription push |
| POST | /api/push/unsubscribe | Supprimer subscription push |
