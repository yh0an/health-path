# Back-office Admin Panel — Design Spec
_Date: 2026-04-06_

## Contexte

Health-path est une app de suivi de santé personnelle (poids, nutrition, eau, sport, photos). L'objectif est d'ajouter une page `/admin` permettant au propriétaire de l'app de monitorer l'utilisation : métriques globales, activité quotidienne, liste des utilisateurs.

Usage strictement personnel — un seul admin identifié par un flag en base.

---

## 1. Modèle de données

### Changement Prisma

Ajout du champ `isAdmin` sur le modèle `User` :

```prisma
isAdmin Boolean @default(false)
```

### Migration data

La migration SQL seed met `isAdmin = true` pour `yoan.pons@gmail.com` :

```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'yoan.pons@gmail.com';
```

### JWT & profil

Le champ `isAdmin` est inclus dans :
- La réponse de `/api/auth/login` (objet `user`)
- La réponse de `/api/settings/profile`
- Le type `UserProfile` côté client

---

## 2. API serveur

### Middleware `requireAdmin`

Fichier : `server/src/middleware/adminAuth.ts`

S'exécute après `authMiddleware`. Charge l'utilisateur depuis la base et vérifie `isAdmin === true`. Retourne 403 sinon.

### Endpoints

Tous préfixés `/api/admin`, protégés par `authMiddleware + requireAdmin`.

#### `GET /api/admin/stats`

Retourne :
```json
{
  "totals": {
    "users": 12,
    "meals": 340,
    "workouts": 89,
    "weightEntries": 45,
    "waterIntakes": 210
  },
  "last7Days": {
    "meals": 18,
    "workouts": 5,
    "weightEntries": 3,
    "avgWaterMl": 1850
  },
  "activityLast30Days": [
    { "date": "2026-03-08", "count": 7 },
    ...
  ]
}
```

`activityLast30Days` est le nombre total d'entrées créées par jour (meals + workouts + weightEntries + waterIntakes combinés).

#### `GET /api/admin/users`

Retourne la liste des utilisateurs :
```json
[
  {
    "id": "...",
    "name": "Yoan",
    "email": "yoan.pons@gmail.com",
    "createdAt": "2025-01-15T...",
    "isAdmin": true,
    "counts": { "meals": 120, "workouts": 34, "weightEntries": 18 },
    "lastActivityAt": "2026-04-06T..."
  }
]
```

`lastActivityAt` = max(createdAt) parmi toutes les entrées de l'utilisateur.

### Fichiers serveur

- `server/src/middleware/adminAuth.ts` — middleware requireAdmin
- `server/src/controllers/admin.controller.ts` — logique stats + users
- `server/src/routes/admin.ts` — router Express
- Enregistrement dans `server/src/index.ts` sous `/api/admin`

---

## 3. Client

### Routing

Ajout d'une route `/admin` dans `client/src/App.tsx`. Si `user.isAdmin` est false (ou utilisateur non connecté), redirection vers `/`.

Pas de lien dans la nav — accès direct par URL.

### Page `AdminPage.tsx`

Fichier : `client/src/pages/AdminPage.tsx`

**Structure :**

```
┌─────────────────────────────────────────┐
│  Back-office          dimanche 6 avril  │
├─────────────────────────────────────────┤
│  [Users] [Repas 7j] [Séances] [Pesées] [Eau moy.]  │
│         KPI cards (5 tuiles)            │
├─────────────────────────────────────────┤
│  Activité — 30 derniers jours           │
│  [Graphique courbe Recharts]            │
├─────────────────────────────────────────┤
│  Utilisateurs                           │
│  Nom · Email · Inscrit · Repas ·       │
│  Séances · Pesées · Dernière activité   │
└─────────────────────────────────────────┘
```

**KPI cards** — 5 tuiles avec valeur + label + icône colorée :
- Total users (blanc)
- Repas cette semaine (orange `#d4a843`)
- Séances cette semaine (violet `#a78bfa`)
- Pesées cette semaine (vert `#4ade80`)
- Eau moyenne 7j en ml (bleu `#0ea5e9`)

**Graphique activité** — `LineChart` Recharts, axe X = date (format `dd/MM`), axe Y = nombre d'entrées. Couleur `#d4a843`, pas de tooltip cursor, fond `#111`.

**Table utilisateurs** — colonnes triées par date d'inscription desc :
| Nom | Email | Inscrit le | Repas | Séances | Pesées | Dernière activité |

Style : fond `#111`, lignes séparées par `border-bottom: 1px solid #1e1e1e`, texte `#aaa`, header `#555`.

### API client

Ajout dans `client/src/services/api.ts` :
```ts
export const adminApi = {
  getStats: () => request<AdminStats>('/admin/stats'),
  getUsers: () => request<AdminUser[]>('/admin/users'),
};
```

Avec interfaces `AdminStats` et `AdminUser` typées.

---

## 4. Design & style

- Fond global `#0a0a0a`, cartes `#111`, bordures `#1e1e1e` — cohérent avec l'app
- Padding `16px`, border-radius `14px` sur les cards
- Pas de librairie UI externe — inline styles comme le reste du projet
- Recharts déjà installé dans le client

---

## 5. Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `server/prisma/schema.prisma` | Ajout `isAdmin` |
| `server/prisma/migrations/…` | Migration + seed data |
| `server/src/middleware/adminAuth.ts` | Nouveau |
| `server/src/controllers/admin.controller.ts` | Nouveau |
| `server/src/routes/admin.ts` | Nouveau |
| `server/src/index.ts` | Enregistrement route admin |
| `server/src/controllers/auth.controller.ts` | Inclure `isAdmin` dans réponse login |
| `server/src/controllers/settings.controller.ts` | Inclure `isAdmin` dans profil |
| `client/src/services/api.ts` | Ajout `adminApi` + types |
| `client/src/pages/AdminPage.tsx` | Nouveau |
| `client/src/App.tsx` | Route `/admin` |
