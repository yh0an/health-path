# Kamal Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déployer health-path sur `health-path.fr` via Kamal 2, en image unique (Express sert l'API + le client React compilé), avec PostgreSQL comme accessory et SSL Let's Encrypt automatique.

**Architecture:** Un seul container Node.js expose le port 4800. Express sert les routes `/api/*` et les fichiers statiques du client React compilé. Kamal's proxy gère le SSL et le routing. PostgreSQL tourne comme accessory Kamal sur le même serveur (port `127.0.0.1:5436:5432`), accessible depuis le container app via le réseau Docker `health-path`.

**Tech Stack:** Kamal 2, Docker multi-stage, Express, React/Vite, Prisma, PostgreSQL 15, ghcr.io registry.

---

## File Map

- **Modify:** `server/package.json` — déplacer `prisma` de devDependencies → dependencies
- **Create:** `Dockerfile` (racine) — multi-stage build (client + server → image prod)
- **Modify:** `server/src/index.ts` — servir les static files en production
- **Create:** `config/deploy.yml` — configuration Kamal
- **Create:** `.kamal/secrets` — secrets locaux (gitignored)
- **Modify:** `.gitignore` — ignorer `.kamal/secrets`

---

### Task 1 : Déplacer `prisma` dans les dependencies

**Files:**
- Modify: `server/package.json`

`prisma` CLI est nécessaire à runtime pour exécuter `prisma migrate deploy` au démarrage du container. Il doit être dans `dependencies`, pas `devDependencies`.

- [ ] **Step 1 : Déplacer `prisma` dans dependencies**

Dans `server/package.json`, retirer `"prisma": "^7.6.0"` de `devDependencies` et l'ajouter dans `dependencies` :

```json
"dependencies": {
  "@aws-sdk/client-s3": "^3.1021.0",
  "@prisma/adapter-pg": "^7.6.0",
  "@prisma/client": "^7.6.0",
  "@types/pg": "^8.20.0",
  "bcryptjs": "^3.0.3",
  "cors": "^2.8.6",
  "dotenv": "^17.3.1",
  "express": "^5.2.1",
  "jsonwebtoken": "^9.0.3",
  "multer": "^2.1.1",
  "node-cron": "^4.2.1",
  "pg": "^8.20.0",
  "prisma": "^7.6.0",
  "web-push": "^3.6.7",
  "zod": "^4.3.6"
}
```

- [ ] **Step 2 : Commit**

```bash
cd /Users/yoan.pons/Projects/health-path
git add server/package.json
git commit -m "chore: move prisma to dependencies for production runtime"
```

---

### Task 2 : Modifier `server/src/index.ts` pour servir les static files en prod

**Files:**
- Modify: `server/src/index.ts`

En production, Express sert le client React compilé depuis `/app/public`. Le catch-all renvoie `index.html` pour le React Router. Ce bloc doit être **après** toutes les routes `/api/*`.

- [ ] **Step 1 : Ajouter le serving des static files**

Ajouter ces lignes à la fin de `server/src/index.ts`, juste avant l'appel à `app.listen` :

```typescript
// Serve client in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}
```

Le fichier complet doit ressembler à :

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import weightRoutes from './routes/weight';
import nutritionRoutes from './routes/nutrition';
import waterRoutes from './routes/water';
import photosRoutes from './routes/photos';
import calendarRoutes from './routes/calendar';
import settingsRoutes from './routes/settings';
import pushRoutes from './routes/push';
import { authMiddleware } from './middleware/auth';
import { initWebPush, startCronJobs } from './services/push.service';

const app = express();
const PORT = process.env.PORT || 4800;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/weight', authMiddleware, weightRoutes);
app.use('/api/nutrition', authMiddleware, nutritionRoutes);
app.use('/api/water', authMiddleware, waterRoutes);
app.use('/api/photos', authMiddleware, photosRoutes);
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/push', authMiddleware, pushRoutes);

app.use('/api/uploads', authMiddleware, express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Serve client in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initWebPush();
  startCronJobs();
});

export default app;
```

- [ ] **Step 2 : Vérifier que ça compile**

```bash
cd /Users/yoan.pons/Projects/health-path/server && npx tsc --noEmit 2>&1
```

Attendu : aucune erreur

- [ ] **Step 3 : Commit**

```bash
cd /Users/yoan.pons/Projects/health-path
git add server/src/index.ts
git commit -m "feat: serve static client files in production"
```

---

### Task 3 : Créer le Dockerfile racine multi-stage

**Files:**
- Create: `Dockerfile` (à la racine du projet)

Ce Dockerfile remplace les Dockerfiles séparés (`server/Dockerfile` et `client/Dockerfile`) pour la production Kamal. Les Dockerfiles existants restent pour le docker-compose local.

- [ ] **Step 1 : Créer `Dockerfile` à la racine**

```dockerfile
# Stage 1 : dépendances server
FROM node:20-alpine AS server-deps
WORKDIR /app
COPY server/package*.json ./
RUN npm ci

# Stage 2 : dépendances client
FROM node:20-alpine AS client-deps
WORKDIR /app
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps

# Stage 3 : build client
FROM node:20-alpine AS client-builder
WORKDIR /app
COPY --from=client-deps /app/node_modules ./node_modules
COPY client/ .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 4 : build server
FROM node:20-alpine AS server-builder
WORKDIR /app
COPY --from=server-deps /app/node_modules ./node_modules
COPY server/prisma ./prisma
COPY server/prisma.config.ts ./prisma.config.ts
COPY server/tsconfig.json ./tsconfig.json
COPY server/src ./src
RUN npx prisma generate
RUN npx tsc

# Stage 5 : production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=server-builder /app/dist ./dist
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/prisma ./prisma
COPY server/package.json ./package.json
COPY --from=client-builder /app/dist ./public
EXPOSE 4800
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

- [ ] **Step 2 : Tester le build Docker localement**

```bash
cd /Users/yoan.pons/Projects/health-path
docker build -t health-path-test .
```

Attendu : build réussi sans erreur. Les 5 stages doivent se terminer.

Si une erreur apparaît au stage server-builder sur `prisma.config.ts` non trouvé, vérifier que le fichier existe bien dans `server/` :
```bash
ls server/prisma.config.ts
```

- [ ] **Step 3 : Vérifier que l'image démarre (sans DB)**

```bash
docker run --rm -e NODE_ENV=production -e PORT=4800 -e DATABASE_URL=postgresql://x:x@localhost/x -e JWT_SECRET=testsecret health-path-test node dist/index.js 2>&1 | head -5
```

Attendu : le process démarre (même s'il échoue sur la DB, le binaire est correct)

- [ ] **Step 4 : Commit**

```bash
cd /Users/yoan.pons/Projects/health-path
git add Dockerfile
git commit -m "chore: add production Dockerfile for Kamal deployment"
```

---

### Task 4 : Créer la configuration Kamal

**Files:**
- Create: `config/deploy.yml`
- Modify: `.gitignore`
- Create: `.kamal/secrets` (valeurs réelles — ne pas committer)

- [ ] **Step 1 : Créer `config/deploy.yml`**

```yaml
service: health-path
image: yh0an/health-path

servers:
  web:
    hosts:
      - 88.223.94.148
    labels:
      traefik.http.routers.health_path.entrypoints: websecure
      traefik.http.routers.health_path.rule: Host(`health-path.fr`) || Host(`www.health-path.fr`)
      traefik.http.routers.health_path.tls.certresolver: letsencrypt
    options:
      network: health-path

proxy:
  ssl: true
  hosts:
    - health-path.fr
    - www.health-path.fr
  app_port: 4800
  healthcheck:
    path: /api/health

builder:
  arch: amd64

registry:
  server: ghcr.io
  username: yh0an
  password:
    - GITHUB_REGISTRY_TOKEN

env:
  clear:
    PORT: 4800
    NODE_ENV: production
    CLIENT_URL: https://health-path.fr
    JWT_EXPIRES_IN: 7d
    VAPID_EMAIL: mailto:admin@healthpath.fr
  secret:
    - DATABASE_URL
    - JWT_SECRET
    - VAPID_PUBLIC_KEY
    - VAPID_PRIVATE_KEY
    - R2_ACCOUNT_ID
    - R2_ACCESS_KEY_ID
    - R2_SECRET_ACCESS_KEY
    - R2_BUCKET_NAME
    - R2_PUBLIC_URL

accessories:
  postgres:
    image: postgres:15-alpine
    host: 88.223.94.148
    port: "127.0.0.1:5436:5432"
    options:
      network: health-path
    env:
      clear:
        POSTGRES_USER: healthpath
        POSTGRES_DB: healthpath_production
      secret:
        - POSTGRES_PASSWORD
    volumes:
      - health_path_postgres:/var/lib/postgresql/data
```

- [ ] **Step 2 : Ajouter `.kamal/secrets` au .gitignore**

Ajouter à `.gitignore` :

```
# Kamal secrets (never commit)
.kamal/secrets
```

- [ ] **Step 3 : Créer `.kamal/secrets` avec les vraies valeurs**

Créer le fichier `.kamal/secrets` (jamais committer) :

```bash
mkdir -p .kamal
```

Puis créer `.kamal/secrets` avec le contenu suivant (remplacer les valeurs `<...>` par les vraies) :

```
GITHUB_REGISTRY_TOKEN=<ton_token_github_avec_write:packages>
POSTGRES_PASSWORD=<mot_de_passe_postgres_prod>
DATABASE_URL=postgresql://healthpath:<POSTGRES_PASSWORD>@health-path-postgres/healthpath_production
JWT_SECRET=<secret_64_chars_minimum>
VAPID_PUBLIC_KEY=BI-8cfMZb_2Aiudiy-LqPuvKlOiQcAkFzKn8GsKvNBWMIbqMbJV7y-HIWTMp1AnNC0Tqd9tq2MrPu1CKxuGh0RE
VAPID_PRIVATE_KEY=W7XF7WSJALCNPEXGJSbXZzYFopj_WUROw5kHkjzOEIc
R2_ACCOUNT_ID=42590cef27185d44499ca43731cbfa48
R2_ACCESS_KEY_ID=762f01d3204a878555ea270d40300b18
R2_SECRET_ACCESS_KEY=f1358eebfed6ffbb9e7c4fdc783380255f2d231f5328fddb3debbc516cfc2321
R2_BUCKET_NAME=health-path-dev
R2_PUBLIC_URL=https://pub-6b4305f28e2140e8a44c6a61abc583cd.r2.dev
```

**Note sur DATABASE_URL :** Le container postgres Kamal est accessible depuis le container app via le réseau Docker `health-path` sous le hostname `health-path-postgres`. Pas de port dans l'URL (port par défaut 5432).

**Note sur les clés VAPID et R2 :** Les valeurs ci-dessus sont celles du `.env` de dev. Pour la prod, utilise les mêmes ou crée de nouvelles clés si tu veux un bucket R2 séparé.

- [ ] **Step 4 : Vérifier la config Kamal**

```bash
cd /Users/yoan.pons/Projects/health-path && kamal config
```

Attendu : affiche la configuration résolue sans erreur

- [ ] **Step 5 : Commit config (pas les secrets)**

```bash
cd /Users/yoan.pons/Projects/health-path
git add config/deploy.yml .gitignore
git commit -m "chore: add Kamal deployment configuration"
```

---

### Task 5 : Premier déploiement

**Prérequis :**
- SSH configuré vers `88.223.94.148` (clé SSH dans `~/.ssh/`)
- Docker installé localement
- `kamal` installé (`gem install kamal` ou `brew install kamal`)
- Le token GitHub `GITHUB_REGISTRY_TOKEN` a les permissions `write:packages` et `read:packages`
- Les DNS `health-path.fr` et `www.health-path.fr` pointent vers `88.223.94.148`

- [ ] **Step 1 : Setup du serveur (première fois uniquement)**

```bash
cd /Users/yoan.pons/Projects/health-path && kamal setup
```

Cette commande :
- Installe Docker sur le serveur
- Configure Traefik comme reverse proxy
- Démarre le container postgres (accessory)
- Build et push l'image sur ghcr.io
- Démarre le container app

Attendu : `Finished all in X seconds` sans erreur

- [ ] **Step 2 : Vérifier que l'app répond**

```bash
curl -s https://health-path.fr/api/health
```

Attendu : `{"ok":true}`

Si le SSL n'est pas encore prêt (Let's Encrypt prend quelques secondes) :

```bash
curl -sk https://health-path.fr/api/health
```

- [ ] **Step 3 : Vérifier les logs si problème**

```bash
kamal app logs
```

Les erreurs courantes et solutions :
- `prisma migrate deploy` échoue → vérifier que DATABASE_URL dans `.kamal/secrets` est correct et que le container postgres est démarré (`kamal accessory logs postgres`)
- `Cannot find module` → le build Docker a échoué, relancer `kamal build push`
- Port 4800 déjà utilisé → vérifier `kamal app details`

---

## Déploiements suivants

Pour redéployer après un changement de code :

```bash
cd /Users/yoan.pons/Projects/health-path && kamal deploy
```

Pour voir les logs en temps réel :

```bash
kamal app logs -f
```

Pour redémarrer sans rebuild :

```bash
kamal app restart
```
