# Photos Évolution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un mode "Évolution" dans la page Photos avec toggle Galerie/Évolution, un bloc de comparaison plus ancienne → plus récente photo par catégorie, et une timeline horizontale scrollable.

**Architecture:** Frontend uniquement — pas de nouvel endpoint. Le composant `PhotoEvolutionView` reçoit les photos déjà chargées depuis `PhotosPage` et calcule localement oldest/newest. `PhotosPage` gère le state `mode` et passe les données au composant.

**Tech Stack:** React, TypeScript, Tailwind CSS. Données via `photosApi.getPhotos(category)` existant.

---

## File Map

- **Modify:** `client/src/pages/PhotosPage.tsx` — ajout state `mode`, toggle UI, rendu conditionnel
- **Create:** `client/src/components/PhotoEvolutionView.tsx` — sélecteur catégorie, bloc avant/après, timeline

---

### Task 1 : Créer `PhotoEvolutionView.tsx`

**Files:**
- Create: `client/src/components/PhotoEvolutionView.tsx`

- [ ] **Step 1 : Créer le composant avec sélecteur de catégorie**

```tsx
// client/src/components/PhotoEvolutionView.tsx
import { useState } from 'react';
import { photosApi } from '../services/api';
import type { ProgressPhoto } from '../services/api';

type Category = 'FRONT' | 'SIDE' | 'BACK';

const CATEGORY_LABELS: Record<Category, string> = {
  FRONT: 'Face',
  SIDE: 'Profil',
  BACK: 'Dos',
};

const CATEGORIES: Category[] = ['FRONT', 'SIDE', 'BACK'];

interface Props {
  photos: ProgressPhoto[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

function diffDays(a: string, b: string): number {
  const msA = new Date(a + 'T12:00:00').getTime();
  const msB = new Date(b + 'T12:00:00').getTime();
  return Math.round(Math.abs(msB - msA) / (1000 * 60 * 60 * 24));
}

export function PhotoEvolutionView({ photos }: Props) {
  const [category, setCategory] = useState<Category>('FRONT');

  const filtered = photos
    .filter((p) => p.category === category)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const oldest = filtered[0] ?? null;
  const newest = filtered[filtered.length - 1] ?? null;
  const days = oldest && newest && oldest.id !== newest.id
    ? diffDays(oldest.date, newest.date)
    : null;

  return (
    <div className="space-y-5">
      {/* Sélecteur de catégorie */}
      <div className="flex gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-accent text-white'
                : 'bg-surface text-secondary'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Bloc avant / après */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-40 rounded-xl bg-surface">
          <p className="text-secondary text-sm">Aucune photo pour cette catégorie</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Avant → Après
          </p>
          <div className="flex items-center gap-3">
            {/* Photo la plus ancienne */}
            <div className="flex-1 space-y-1">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img
                  src={photosApi.getImageUrl(oldest!.imagePath)}
                  alt="Avant"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-secondary text-center">{formatDate(oldest!.date)}</p>
            </div>

            <span className="text-accent text-xl">→</span>

            {/* Photo la plus récente */}
            <div className="flex-1 space-y-1">
              <div className="aspect-square rounded-lg overflow-hidden">
                <img
                  src={photosApi.getImageUrl(newest!.imagePath)}
                  alt="Après"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-secondary text-center">{formatDate(newest!.date)}</p>
            </div>
          </div>

          {days !== null && days > 0 && (
            <p className="text-xs font-semibold text-accent text-center">
              {days} jour{days > 1 ? 's' : ''} de progression
            </p>
          )}
        </div>
      )}

      {/* Timeline */}
      {filtered.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">
            Timeline
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {filtered.map((photo, i) => {
              const isNewest = i === filtered.length - 1;
              return (
                <div key={photo.id} className="flex-none text-center space-y-1">
                  <div
                    className={`w-16 h-16 rounded-lg overflow-hidden ${
                      isNewest ? 'ring-2 ring-accent' : ''
                    }`}
                  >
                    <img
                      src={photosApi.getImageUrl(photo.imagePath)}
                      alt={formatDateShort(photo.date)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className={`text-xs ${isNewest ? 'text-accent font-semibold' : 'text-secondary'}`}>
                    {formatDateShort(photo.date)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier visuellement que le fichier compile**

```bash
cd /Users/yoan.pons/Projects/health-path/client && npx tsc --noEmit 2>&1 | head -20
```

Attendu : aucune erreur dans `PhotoEvolutionView.tsx`

---

### Task 2 : Modifier `PhotosPage.tsx` pour intégrer le toggle et le nouveau composant

**Files:**
- Modify: `client/src/pages/PhotosPage.tsx`

- [ ] **Step 1 : Ajouter l'import et le state `mode`**

En haut du fichier, ajouter l'import :
```tsx
import { PhotoEvolutionView } from '../components/PhotoEvolutionView';
```

Dans `PhotosPage()`, ajouter le state après les states existants :
```tsx
const [mode, setMode] = useState<'gallery' | 'evolution'>('gallery');
```

- [ ] **Step 2 : Remplacer le titre par le titre + toggle**

Remplacer :
```tsx
<h1 className="text-2xl font-bold text-label mb-4">Photos</h1>
```

Par :
```tsx
<div className="flex items-center justify-between mb-4">
  <h1 className="text-2xl font-bold text-label">Photos</h1>
  <div className="flex bg-surface rounded-full p-0.5 gap-0.5">
    <button
      onClick={() => setMode('gallery')}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        mode === 'gallery' ? 'bg-white text-label shadow-sm' : 'text-secondary'
      }`}
    >
      Galerie
    </button>
    <button
      onClick={() => setMode('evolution')}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        mode === 'evolution' ? 'bg-white text-label shadow-sm' : 'text-secondary'
      }`}
    >
      Évolution
    </button>
  </div>
</div>
```

- [ ] **Step 3 : Rendre le contenu conditionnel selon le mode**

Entourer le contenu existant (onglets + grille) d'un `{mode === 'gallery' && (…)}` et ajouter le rendu du mode évolution.

Remplacer le bloc depuis `{/* Category filter tabs */}` jusqu'à la fin de la grille (avant `{/* Hidden file input */}`) par :

```tsx
{mode === 'gallery' ? (
  <>
    {/* Category filter tabs */}
    <div className="flex border-b border-gray-200 mb-4">
      {TABS.map((tab) => {
        const isActive = activeCategory === tab.value;
        return (
          <button
            key={tab.label}
            onClick={() => handleTabClick(tab.value)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-b-2 border-accent text-accent'
                : 'text-secondary'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>

    {/* Photo grid */}
    {loading ? (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    ) : photos.length === 0 ? (
      <div className="flex items-center justify-center h-48">
        <p className="text-secondary text-sm">Aucune photo</p>
      </div>
    ) : (
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            className="aspect-square rounded-lg overflow-hidden focus:outline-none"
            onClick={() => setSelectedPhoto(photo)}
          >
            <img
              src={photosApi.getImageUrl(photo.imagePath)}
              alt={CATEGORY_LABELS[photo.category]}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    )}
  </>
) : (
  <PhotoEvolutionView photos={photos} />
)}
```

**Note :** En mode évolution, `photos` contient toutes les photos (sans filtre de catégorie actif). S'assurer que `fetchPhotos` est appelé sans filtre quand `mode === 'evolution'`. Modifier `fetchPhotos` pour ignorer `activeCategory` quand on est en mode évolution :

```tsx
const fetchPhotos = useCallback(async () => {
  setLoading(true);
  try {
    const data = await photosApi.getPhotos(mode === 'gallery' ? activeCategory : undefined);
    setPhotos(data);
  } catch {
    addToast('Erreur lors du chargement des photos', 'error');
  } finally {
    setLoading(false);
  }
}, [activeCategory, mode]);
```

Aussi ajouter `mode` dans le `useEffect` de dépendances (déjà inclus via `fetchPhotos`).

- [ ] **Step 4 : Vérifier que ça compile**

```bash
cd /Users/yoan.pons/Projects/health-path/client && npx tsc --noEmit 2>&1
```

Attendu : aucune erreur TypeScript

- [ ] **Step 5 : Tester manuellement dans le navigateur**

1. Ouvrir `http://localhost:5373`
2. Aller sur la page Photos
3. Vérifier que le toggle Galerie / Évolution est visible en haut à droite
4. Cliquer sur "Évolution" : les onglets de catégorie disparaissent, le composant d'évolution apparaît
5. Vérifier que les pills Face / Profil / Dos filtrent bien les photos
6. Vérifier que le bloc Avant → Après affiche les bonnes photos (oldest / newest)
7. Vérifier que la timeline scrolle horizontalement
8. Cliquer sur "Galerie" : la grille réapparaît normalement

- [ ] **Step 6 : Commit**

```bash
cd /Users/yoan.pons/Projects/health-path
git add client/src/pages/PhotosPage.tsx client/src/components/PhotoEvolutionView.tsx
git commit -m "feat(photos): add evolution view with before/after comparison and timeline"
```
