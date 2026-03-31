# HealthPath — Plan 3/3 : PWA & Push Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre HealthPath installable sur mobile (PWA) avec manifest, icônes, service worker Workbox, et activer les push notifications côté client (souscription VAPID, affichage des notifications en background).

**Architecture:** Le service worker est géré par Workbox via `vite-plugin-pwa`. Il met en cache les assets statiques (cache-first) et les appels API (network-first). Le flow push : client demande la permission → s'abonne avec la clé VAPID publique → envoie la subscription au serveur → le serveur envoie via web-push → le SW intercepte et affiche la notification.

**Tech Stack:** vite-plugin-pwa, Workbox, Web Push API (navigator.serviceWorker, PushManager)

**Prérequis:** Plans 1 et 2 complétés. Clés VAPID générées (Task 12 du Plan 1).

---

## Fichiers créés/modifiés

```
client/
├── vite.config.ts                        ← ajouter VitePWA plugin
├── public/
│   ├── manifest.json                     ← remplacer le placeholder
│   └── icons/
│       ├── icon-192.png                  ← icône PNG 192×192
│       └── icon-512.png                  ← icône PNG 512×512
└── src/
    ├── sw.ts                             ← service worker custom
    └── hooks/
        └── usePushNotifications.ts       ← hook d'abonnement push
```

---

## Task 1 : Icônes PWA

- [ ] **Étape 1 : Générer les icônes**

Créer deux icônes SVG converties en PNG. La plus simple : utiliser un script Node pour générer des PNG basiques avec sharp, ou créer les icônes manuellement.

```bash
cd healthpath/client
npm install -D sharp
```

Créer `client/scripts/generate-icons.mjs` :

```javascript
// client/scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#34C759"/>
  <text x="50" y="68" text-anchor="middle" font-size="60" fill="white">❤️</text>
</svg>
`;

const svgBuffer = Buffer.from(svgIcon);

await sharp(svgBuffer).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(svgBuffer).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(svgBuffer).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');

console.log('Icons generated');
```

```bash
node scripts/generate-icons.mjs
```

Résultat attendu : fichiers `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` créés.

- [ ] **Étape 2 : Commit**

```bash
git add client/public/icons/ client/scripts/
git commit -m "feat: add PWA app icons"
```

---

## Task 2 : Manifest + VitePWA plugin

- [ ] **Étape 1 : Installer vite-plugin-pwa**

```bash
cd healthpath/client
npm install -D vite-plugin-pwa
```

- [ ] **Étape 2 : Mettre à jour vite.config.ts**

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:3001\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      manifest: {
        name: 'HealthPath',
        short_name: 'HealthPath',
        description: 'Ton suivi santé personnel',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#34C759',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
});
```

- [ ] **Étape 3 : Mettre à jour index.html pour les meta PWA**

```html
<!-- Dans client/index.html, dans <head> : -->
<meta name="theme-color" content="#34C759" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="HealthPath" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

- [ ] **Étape 4 : Vérifier le manifest**

```bash
npm run build
npm run preview
```

Ouvrir Chrome DevTools → Application → Manifest. Vérifier que les icônes s'affichent et que le manifest est bien détecté.

- [ ] **Étape 5 : Commit**

```bash
git add client/vite.config.ts client/index.html
git commit -m "feat: configure VitePWA with Workbox and app manifest"
```

---

## Task 3 : Service Worker custom (push notifications)

Le service worker généré par Workbox gère le cache. On y ajoute la gestion des push notifications via un fichier custom importé.

- [ ] **Étape 1 : Créer src/sw.ts**

```typescript
// client/src/sw.ts
// Ce fichier est importé par le service worker généré par VitePWA
// via la propriété `additionalManifestEntries` ou `importScripts`

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title: string; body: string } | null;
  if (!data) return;

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url: string })?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
```

- [ ] **Étape 2 : Référencer le fichier custom dans vite.config.ts**

Modifier la section `VitePWA` dans `vite.config.ts` pour ajouter `strategies: 'injectManifest'` et pointer vers le SW custom :

```typescript
// client/vite.config.ts — section VitePWA modifiée
VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^http:\/\/localhost:3001\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
  manifest: { /* identique à la Task 2 */ },
  devOptions: { enabled: true, type: 'module' },
}),
```

Le fichier `src/sw.ts` doit aussi importer le manifest Workbox injecté. Remplacer le contenu de `src/sw.ts` par :

```typescript
// client/src/sw.ts
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[];
};

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title: string; body: string } | null;
  if (!data) return;
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url: string })?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
```

- [ ] **Étape 3 : Installer workbox-precaching**

```bash
npm install workbox-precaching
npm install -D @types/service-worker
```

- [ ] **Étape 4 : Vérifier que le build ne produit pas d'erreurs**

```bash
npm run build 2>&1 | tail -20
```
Résultat attendu : build sans erreurs, `dist/sw.js` généré.

- [ ] **Étape 5 : Commit**

```bash
git add client/src/sw.ts client/vite.config.ts
git commit -m "feat: add custom service worker with Workbox precache and push notification handler"
```

---

## Task 4 : Hook usePushNotifications

- [ ] **Étape 1 : Créer hooks/usePushNotifications.ts**

```typescript
// client/src/hooks/usePushNotifications.ts
import { useState, useEffect } from 'react';
import { pushApi } from '../services/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading';

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) { setSubscription(sub); setStatus('subscribed'); }
      else setStatus('unsubscribed');
    });
  }, []);

  const subscribe = async () => {
    setStatus('loading');
    try {
      const { publicKey } = await pushApi.getVapidKey();
      if (!publicKey) throw new Error('No VAPID key');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus('denied'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await pushApi.subscribe(sub.toJSON() as PushSubscriptionJSON);
      setSubscription(sub);
      setStatus('subscribed');
    } catch (err) {
      console.error('Push subscribe error:', err);
      setStatus('unsubscribed');
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    setStatus('loading');
    await pushApi.unsubscribe(subscription.endpoint);
    await subscription.unsubscribe();
    setSubscription(null);
    setStatus('unsubscribed');
  };

  return { status, subscribe, unsubscribe };
}
```

- [ ] **Étape 2 : Intégrer dans SettingsPage**

Ajouter la section notifications push dans `client/src/pages/SettingsPage.tsx`. Ajouter ces imports en haut :

```typescript
import { usePushNotifications } from '../hooks/usePushNotifications';
```

Ajouter après `const [msg, setMsg] = useState('')` :

```typescript
const { status: pushStatus, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();
```

Ajouter ce bloc JSX avant le bouton de déconnexion dans le return :

```tsx
{/* Notifications Push */}
<Card>
  <p className="font-semibold text-label mb-3">Notifications Push</p>
  {pushStatus === 'unsupported' && (
    <p className="text-secondary text-sm">Notifications non supportées sur cet appareil</p>
  )}
  {pushStatus === 'denied' && (
    <p className="text-secondary text-sm">Notifications bloquées — active-les dans les réglages du navigateur</p>
  )}
  {(pushStatus === 'unsubscribed' || pushStatus === 'loading') && pushStatus !== 'denied' && (
    <Button onClick={pushSubscribe} disabled={pushStatus === 'loading'} variant="secondary" className="w-full">
      {pushStatus === 'loading' ? 'Chargement...' : '🔔 Activer les notifications'}
    </Button>
  )}
  {pushStatus === 'subscribed' && (
    <div className="flex flex-col gap-2">
      <p className="text-accent text-sm font-medium">✓ Notifications activées</p>
      {user?.notificationSettings && (
        <div className="flex flex-col gap-2 mt-1">
          {[
            { key: 'waterReminderEnabled', label: 'Rappels hydratation' },
            { key: 'photoReminderEnabled', label: 'Rappels photos' },
            { key: 'eventReminderEnabled', label: 'Rappels événements' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between">
              <span className="text-sm text-label">{label}</span>
              <input type="checkbox"
                checked={Boolean(user.notificationSettings![key as keyof typeof user.notificationSettings])}
                onChange={async (e) => {
                  await settingsApi.updateNotifications({ [key]: e.target.checked });
                  await refreshProfile();
                }}
                className="w-5 h-5 accent-accent" />
            </label>
          ))}
          <Button onClick={saveNotif} size="sm" variant="secondary" className="w-full mt-1">
            Enregistrer les préférences
          </Button>
        </div>
      )}
      <Button onClick={pushUnsubscribe} variant="ghost" size="sm" className="w-full">
        Désactiver les notifications
      </Button>
    </div>
  )}
</Card>
```

- [ ] **Étape 3 : Commit**

```bash
git add client/src/hooks/usePushNotifications.ts client/src/pages/SettingsPage.tsx
git commit -m "feat: add push notification subscription flow in settings page"
```

---

## Task 5 : Test end-to-end PWA + Push

- [ ] **Étape 1 : Build de production**

```bash
cd healthpath/client
npm run build
npm run preview
```

- [ ] **Étape 2 : Vérifier l'installation PWA**

Ouvrir Chrome sur http://localhost:4173.
DevTools → Application → Manifest → vérifier que tout est vert.
DevTools → Application → Service Workers → vérifier que le SW est actif.
Barre d'adresse → clic sur l'icône d'installation → installer l'app.

- [ ] **Étape 3 : Tester les push notifications**

1. Ouvrir les Réglages dans l'app installée
2. Cliquer "Activer les notifications" → accepter la permission
3. Vérifier dans la base de données qu'une PushSubscription est créée :
```bash
cd healthpath/server
npx prisma studio
# Table PushSubscription → vérifier l'entrée
```

4. Tester l'envoi manuel depuis le serveur :
```typescript
// test temporaire dans server/src/index.ts, supprimer après
// Ajouter après startCronJobs() :
// import { sendPushToUser } from './services/push.service';
// setTimeout(() => sendPushToUser('USER_ID', 'Test', 'Ça marche !'), 5000);
```

- [ ] **Étape 4 : Vérifier les notifications en arrière-plan**

1. Réduire l'app (passer à une autre app)
2. Déclencher une notification depuis le serveur
3. Vérifier qu'elle apparaît dans le centre de notifications

- [ ] **Étape 5 : Commit final**

```bash
cd healthpath
git add -A
git commit -m "feat: PWA fully configured with manifest, service worker, and push notifications"
```

---

## Résumé PWA

| Feature | Fichier | Status |
|---------|---------|--------|
| Manifest | vite.config.ts (injecté) | ✓ |
| Icônes 192/512 | public/icons/ | ✓ |
| Service Worker | src/sw.ts (via Workbox) | ✓ |
| Cache statique | SW Workbox precache | ✓ |
| Cache API | SW runtime (NetworkFirst) | ✓ |
| Push subscription | hooks/usePushNotifications.ts | ✓ |
| Affichage notifications | SW push event | ✓ |
| Notification click → open app | SW notificationclick | ✓ |
| Cron rappels eau/photos/events | server/src/services/push.service.ts | ✓ (Plan 1) |
