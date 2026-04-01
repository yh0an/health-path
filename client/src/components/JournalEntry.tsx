// client/src/components/JournalEntry.tsx
import type { ReactNode } from 'react';
import type { WeightEntry, Meal, WaterIntake } from '../services/api';

type EntryType =
  | { kind: 'weight'; data: WeightEntry; heightCm: number | null; targetWeightKg: number | null; onDelete: (id: string) => void }
  | { kind: 'meal';   data: Meal;        onDelete: (id: string) => void }
  | { kind: 'water';  data: WaterIntake; totalMl: number; goalMl: number; onDelete: (id: string) => void }
  | { kind: 'pending'; label: string };

const MEAL_LABELS = {
  BREAKFAST: 'Petit-déjeuner',
  LUNCH: 'Déjeuner',
  DINNER: 'Dîner',
  SNACK: 'Collation',
} as const;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function DotLine({ color, hasLine }: { color: string; hasLine: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, flexShrink: 0, width: 16 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}88` }} />
      {hasLine && <div style={{ width: 1, background: '#2a2a2a', flex: 1, marginTop: 4, minHeight: 24 }} />}
    </div>
  );
}

function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={onDelete}
      style={{ color: '#555', fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
      aria-label="Supprimer"
    >
      ×
    </button>
  );
}

function WeightCard({ entry, heightCm, targetWeightKg, onDelete }: {
  entry: WeightEntry; heightCm: number | null; targetWeightKg: number | null; onDelete: () => void;
}) {
  const bmi = heightCm ? entry.weightKg / Math.pow(heightCm / 100, 2) : null;
  const diff = targetWeightKg !== null ? entry.weightKg - targetWeightKg : null;
  return (
    <div style={{ flex: 1, background: '#141414', borderRadius: 14, padding: '10px 13px', border: '1px solid #252525', borderLeft: '3px solid #4ade80' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pesée</span>
        <DeleteBtn onDelete={onDelete} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginTop: 2 }}>
        {entry.weightKg} kg
      </div>
      <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
        {bmi !== null && `IMC ${bmi.toFixed(1)}`}
        {diff !== null && ` · ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg vs objectif`}
      </div>
    </div>
  );
}

function MealCard({ meal, onDelete }: { meal: Meal; onDelete: () => void }) {
  const photos = meal.photos ?? [];
  const legacyUrl = meal.imageUrl;
  const allPhotos = photos.length > 0 ? photos.map(p => p.imageUrl) : (legacyUrl ? [legacyUrl] : []);

  return (
    <div style={{ flex: 1, background: '#141414', borderRadius: 14, padding: '10px 13px', border: '1px solid #252525', borderLeft: '3px solid #f59e0b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{MEAL_LABELS[meal.mealType]}</span>
        <DeleteBtn onDelete={onDelete} />
      </div>
      {allPhotos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto' }}>
          {allPhotos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt="Repas"
              style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            />
          ))}
        </div>
      )}
      {meal.estimatedKcal !== null && (
        <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900, color: '#d4a843' }}>
          {meal.estimatedKcal} kcal
          {meal.description && (
            <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 6 }}>{meal.description}</span>
          )}
        </div>
      )}
      {meal.estimatedKcal === null && !allPhotos.length && (
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Repas enregistré</div>
      )}
    </div>
  );
}

function WaterCard({ entry, totalMl, goalMl, onDelete }: {
  entry: WaterIntake; totalMl: number; goalMl: number; onDelete: () => void;
}) {
  const pct = goalMl > 0 ? Math.min(1, totalMl / goalMl) : 0;
  return (
    <div style={{ flex: 1, background: '#141414', borderRadius: 14, padding: '10px 13px', border: '1px solid #252525', borderLeft: '3px solid #0ea5e9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Eau</span>
        <DeleteBtn onDelete={onDelete} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginTop: 2 }}>
        +{entry.amountMl} ml
      </div>
      <div style={{ height: 3, background: '#2a2a2a', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, background: '#0ea5e9', width: `${pct * 100}%` }} />
      </div>
      <div style={{ fontSize: 11, color: '#0ea5e9aa', marginTop: 4 }}>{totalMl} ml / {goalMl} ml</div>
    </div>
  );
}

function PendingCard({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, background: 'transparent', borderRadius: 14, padding: '10px 13px', border: '1px dashed #333' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>{label}</div>
    </div>
  );
}

export function JournalEntry({ entry, hasLine }: { entry: EntryType; hasLine: boolean }) {
  if (entry.kind === 'pending') {
    return (
      <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 10, color: '#555', width: 34, paddingTop: 12, flexShrink: 0 }}>—</div>
        <DotLine color="#333" hasLine={false} />
        <PendingCard label={entry.label} />
      </div>
    );
  }

  let time = '';
  let color = '#666';
  let card: ReactNode = null;

  if (entry.kind === 'weight') {
    time = formatTime(entry.data.createdAt);
    color = '#4ade80';
    card = <WeightCard entry={entry.data} heightCm={entry.heightCm} targetWeightKg={entry.targetWeightKg} onDelete={() => entry.onDelete(entry.data.id)} />;
  } else if (entry.kind === 'meal') {
    time = entry.data.time ?? formatTime(entry.data.createdAt);
    color = '#f59e0b';
    card = <MealCard meal={entry.data} onDelete={() => entry.onDelete(entry.data.id)} />;
  } else if (entry.kind === 'water') {
    time = formatTime(entry.data.createdAt);
    color = '#0ea5e9';
    card = <WaterCard entry={entry.data} totalMl={entry.totalMl} goalMl={entry.goalMl} onDelete={() => entry.onDelete(entry.data.id)} />;
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 10, color: '#777', width: 34, paddingTop: 12, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {time}
      </div>
      <DotLine color={color} hasLine={hasLine} />
      {card}
    </div>
  );
}
