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
