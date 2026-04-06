// client/src/components/sheets/MealDetailSheet.tsx
import { useState } from 'react';
import type { Meal } from '../../services/api';

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Petit-déjeuner',
  LUNCH: 'Déjeuner',
  DINNER: 'Dîner',
  SNACK: 'Collation',
};

interface MealDetailSheetProps {
  meal: Meal;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function MealDetailSheet({ meal, onClose, onDelete }: MealDetailSheetProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = meal.photos?.length > 0
    ? meal.photos.map(p => p.imageUrl)
    : meal.imageUrl ? [meal.imageUrl] : [];

  const hasMacros = meal.proteinG !== null || meal.carbsG !== null || meal.fatG !== null;

  const macros = [
    { label: 'Protéines', value: meal.proteinG, color: '#4ade80' },
    { label: 'Glucides',  value: meal.carbsG,   color: '#f59e0b' },
    { label: 'Lipides',   value: meal.fatG,      color: '#f87171' },
  ];

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0' }}>
            {MEAL_LABELS[meal.mealType] ?? meal.mealType}
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
            {meal.time ?? formatTime(meal.createdAt)}
          </div>
        </div>
        {meal.estimatedKcal !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#d4a843', letterSpacing: -1 }}>
              {meal.estimatedKcal}
            </div>
            <div style={{ fontSize: 10, color: '#8a6a2a' }}>kcal</div>
          </div>
        )}
      </div>

      {/* Photo slider */}
      {photos.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <img
            src={photos[photoIndex]}
            alt="Repas"
            style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }}
          />
          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >‹</button>
              <button
                onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >›</button>
              {/* Dots */}
              <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                {photos.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    style={{ width: i === photoIndex ? 16 : 6, height: 6, borderRadius: 99, background: i === photoIndex ? '#fff' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all 0.2s' }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        {/* Macros totaux */}
        {hasMacros && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {macros.map(({ label, value, color }) => value !== null && (
              <div key={label} style={{ flex: 1, background: '#1a1a1a', borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: '1px solid #222' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}g</div>
                <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Ingrédients */}
        {meal.itemsJson && meal.itemsJson.length > 0 && (
          <div style={{ background: '#1a1a1a', borderRadius: 14, padding: '12px 14px', marginBottom: 16, border: '1px solid #222' }}>
            <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Ingrédients</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {meal.itemsJson.map((item, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#ccc', flex: 1, paddingRight: 8 }}>{item.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#d4a843', flexShrink: 0 }}>{item.kcal} kcal</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#4ade80', background: '#0d2010', padding: '2px 7px', borderRadius: 99 }}>{item.proteinG}g P</span>
                    <span style={{ fontSize: 10, color: '#f59e0b', background: '#1a1200', padding: '2px 7px', borderRadius: 99 }}>{item.carbsG}g G</span>
                    <span style={{ fontSize: 10, color: '#f87171', background: '#1a0808', padding: '2px 7px', borderRadius: 99 }}>{item.fatG}g L</span>
                  </div>
                  {i < meal.itemsJson!.length - 1 && (
                    <div style={{ height: 1, background: '#222', marginTop: 10 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {meal.description && (
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '10px 14px', marginBottom: 16, border: '1px solid #222' }}>
            <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Note</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>{meal.description}</div>
          </div>
        )}

        {/* Delete */}
        <button
          onClick={() => { onDelete(meal.id); onClose(); }}
          style={{ width: '100%', padding: 13, background: 'none', border: '1px solid #2a1a1a', borderRadius: 12, color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Supprimer ce repas
        </button>
      </div>
    </div>
  );
}
