// client/src/components/sheets/QuickAddSheet.tsx
import type { CSSProperties } from 'react';
type ActionType = 'water' | 'meal' | 'weight' | 'photo';

interface QuickAddSheetProps {
  onSelect: (action: ActionType) => void;
  onClose: () => void;
  isWeighDay: boolean;
  waterMl: number;
  waterGoalMl: number;
  todayMeals: string[]; // meal types already logged today e.g. ['BREAKFAST','LUNCH']
}

const ALL_MEALS = [
  { type: 'BREAKFAST' as const, label: 'Petit-déjeuner' },
  { type: 'LUNCH' as const,     label: 'Déjeuner' },
  { type: 'DINNER' as const,    label: 'Dîner' },
  { type: 'SNACK' as const,     label: 'Collation' },
];

function getHourContext(): string {
  const h = new Date().getHours();
  if (h < 10) return 'Bon matin';
  if (h < 14) return 'Midi';
  if (h < 19) return 'Après-midi';
  return 'Ce soir';
}

export function QuickAddSheet({ onSelect, onClose: _onClose, isWeighDay, waterMl, waterGoalMl, todayMeals }: QuickAddSheetProps) {
  const remaining = waterGoalMl - waterMl;
  const missedMeals = ALL_MEALS.filter(m => !todayMeals.includes(m.type));
  const h = new Date().getHours();

  // Build contextual suggestions
  const suggestions: { type: ActionType; label: string; hint: string; highlighted: boolean }[] = [];

  // Weigh day — toujours visible, highlighted si c'est le jour configuré
  suggestions.push({
    type: 'weight',
    label: 'Pesée',
    hint: isWeighDay ? "C'est ton jour de pesée" : 'Logger ton poids',
    highlighted: isWeighDay,
  });

  // Meal suggestions based on hour
  if (h < 10 && missedMeals.some(m => m.type === 'BREAKFAST')) {
    suggestions.push({ type: 'meal', label: 'Petit-déjeuner', hint: 'Non loggé', highlighted: true });
  } else if (h >= 11 && h < 15 && missedMeals.some(m => m.type === 'LUNCH')) {
    suggestions.push({ type: 'meal', label: 'Déjeuner', hint: 'Non loggé', highlighted: true });
  } else if (h >= 18 && missedMeals.some(m => m.type === 'DINNER')) {
    suggestions.push({ type: 'meal', label: 'Dîner', hint: 'Non loggé', highlighted: true });
  }

  // Water if not at goal
  if (remaining > 0) {
    suggestions.push({
      type: 'water',
      label: 'Eau',
      hint: `${remaining} ml restants pour ton objectif`,
      highlighted: remaining <= 500,
    });
  }

  // Other meal if nothing suggested
  if (!suggestions.some(s => s.type === 'meal')) {
    suggestions.push({ type: 'meal', label: 'Repas / Collation', hint: 'Logger un repas', highlighted: false });
  }

  // Photo toujours disponible
  suggestions.push({ type: 'photo', label: "Photo d'évolution", hint: 'Face, profil ou dos', highlighted: false });

  const itemStyle = (highlighted: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: highlighted ? '#1a150a' : '#1a1a1a',
    border: `1px solid ${highlighted ? '#3a2e0a' : '#2a2a2a'}`,
    borderRadius: 14,
    padding: '14px 14px',
    cursor: 'pointer',
    marginBottom: 8,
  });

  const icons: Record<ActionType, string> = { water: '💧', meal: '🍽', weight: '⚖️', photo: '📷' };

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#f0f0f0', marginBottom: 4 }}>Qu'est-ce que tu veux logger ?</div>
      <div style={{ fontSize: 11, color: '#444', marginBottom: 16 }}>{getHourContext()}</div>
      {suggestions.map((s, i) => (
        <button key={i} onClick={() => { onSelect(s.type); }} style={{ ...itemStyle(s.highlighted), width: '100%', textAlign: 'left' }}>
          <span style={{ fontSize: 22 }}>{icons[s.type]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>{s.label}</div>
            <div style={{ fontSize: 11, color: s.highlighted ? '#d4a843' : '#444' }}>{s.hint}</div>
          </div>
          {s.highlighted && <span style={{ fontSize: 9, background: '#d4a843', color: '#000', padding: '3px 8px', borderRadius: 99, fontWeight: 800 }}>Suggéré</span>}
        </button>
      ))}
    </div>
  );
}
