// client/src/components/JournalEntry.tsx
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import type { WeightEntry, Meal, WaterIntake, WorkoutSession } from '../services/api';

type EntryType =
  | { kind: 'weight';  data: WeightEntry;    heightCm: number | null; targetWeightKg: number | null; onDelete: (id: string) => void }
  | { kind: 'meal';    data: Meal;            onDelete: (id: string) => void; onPress: (meal: Meal) => void }
  | { kind: 'water';   data: WaterIntake;     totalMl: number; goalMl: number; onDelete: (id: string) => void }
  | { kind: 'workout'; data: WorkoutSession;  onDelete: (id: string) => void }
  | { kind: 'pending'; label: string };

const MEAL_LABELS = {
  BREAKFAST: 'Petit-déjeuner',
  LUNCH: 'Déjeuner',
  DINNER: 'Dîner',
  SNACK: 'Collation',
} as const;

const WORKOUT_LABELS: Record<string, string> = {
  RUNNING: 'Course',
  CYCLING: 'Vélo',
  SWIMMING: 'Natation',
  STRENGTH: 'Muscu',
  HIIT: 'HIIT',
  YOGA: 'Yoga',
  ELLIPTICAL: 'Vélo elliptique',
  PADEL: 'Padel',
  WALKING: 'Marche',
  OTHER: 'Sport',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function DotLine({ color, hasLine }: { color: string; hasLine: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, flexShrink: 0, width: 16, marginBottom: hasLine ? -10 : 0, paddingBottom: hasLine ? 10 : 0 }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}99` }} />
      {hasLine && <div style={{ width: 1, background: '#383838', flex: 1, marginTop: 4, minHeight: 24 }} />}
    </div>
  );
}

function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onDelete(); }}
      style={{ color: '#666', fontSize: 20, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
      aria-label="Supprimer"
    >
      ×
    </button>
  );
}

const cardBase: React.CSSProperties = {
  flex: 1,
  background: '#1c1c1c',
  borderRadius: 14,
  padding: '11px 14px',
  border: '1px solid #2e2e2e',
};

function WeightCard({ entry, heightCm, targetWeightKg, onDelete }: {
  entry: WeightEntry; heightCm: number | null; targetWeightKg: number | null; onDelete: () => void;
}) {
  const bmi = heightCm ? entry.weightKg / Math.pow(heightCm / 100, 2) : null;
  const diff = targetWeightKg !== null ? entry.weightKg - targetWeightKg : null;
  return (
    <div style={{ ...cardBase, borderLeft: '3px solid #4ade80' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pesée</span>
        <DeleteBtn onDelete={onDelete} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginTop: 2 }}>
        {entry.weightKg} kg
      </div>
      {(bmi !== null || diff !== null) && (
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>
          {bmi !== null && `IMC ${bmi.toFixed(1)}`}
          {diff !== null && ` · ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} kg vs objectif`}
        </div>
      )}
    </div>
  );
}

function MealCard({ meal, onDelete, onPress }: { meal: Meal; onDelete: () => void; onPress: () => void }) {
  const photos = meal.photos ?? [];
  const legacyUrl = meal.imageUrl;
  const allPhotos = photos.length > 0 ? photos.map(p => p.imageUrl) : (legacyUrl ? [legacyUrl] : []);

  return (
    <div
      onClick={onPress}
      style={{ ...cardBase, borderLeft: '3px solid #f59e0b', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{MEAL_LABELS[meal.mealType]}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: '#444' }}>›</span>
          <DeleteBtn onDelete={onDelete} />
        </div>
      </div>
      {allPhotos.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flexShrink: 0, maxWidth: '45%' }}>
            {allPhotos.map((url, i) => (
              <img key={i} src={url} alt="Repas" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            ))}
          </div>
          {meal.itemsJson && meal.itemsJson.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, justifyContent: 'center', minHeight: 64 }}>
              {meal.itemsJson.map((item, i) => (
                <span key={i} style={{ fontSize: 11, color: '#666', lineHeight: 1.3 }}>· {item.name}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {meal.estimatedKcal !== null ? (
        <>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 900, color: '#d4a843' }}>
            {meal.estimatedKcal} kcal
            {meal.description && (
              <span style={{ fontSize: 12, color: '#aaa', fontWeight: 400, marginLeft: 8 }}>{meal.description}</span>
            )}
          </div>
          {(meal.proteinG !== null || meal.carbsG !== null || meal.fatG !== null) && (
            <div style={{ display: 'flex', gap: 10, marginTop: 5 }}>
              {meal.proteinG !== null && (
                <span style={{ fontSize: 11, color: '#4ade80' }}><strong>{meal.proteinG}g</strong> <span style={{ color: '#555' }}>P</span></span>
              )}
              {meal.carbsG !== null && (
                <span style={{ fontSize: 11, color: '#f59e0b' }}><strong>{meal.carbsG}g</strong> <span style={{ color: '#555' }}>G</span></span>
              )}
              {meal.fatG !== null && (
                <span style={{ fontSize: 11, color: '#f87171' }}><strong>{meal.fatG}g</strong> <span style={{ color: '#555' }}>L</span></span>
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
          {meal.description || 'Repas enregistré'}
        </div>
      )}
    </div>
  );
}

function WaterCard({ entry, totalMl, goalMl, onDelete }: {
  entry: WaterIntake; totalMl: number; goalMl: number; onDelete: () => void;
}) {
  const pct = goalMl > 0 ? Math.min(1, totalMl / goalMl) : 0;
  return (
    <div style={{ ...cardBase, borderLeft: '3px solid #0ea5e9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Eau</span>
        <DeleteBtn onDelete={onDelete} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginTop: 2 }}>
        +{entry.amountMl} ml
      </div>
      <div style={{ height: 4, background: '#333', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, background: '#0ea5e9', width: `${pct * 100}%` }} />
      </div>
      <div style={{ fontSize: 12, color: '#7cc8e8', marginTop: 4 }}>{totalMl} ml / {goalMl} ml</div>
    </div>
  );
}

function WorkoutCard({ session, onDelete }: { session: WorkoutSession; onDelete: () => void }) {
  return (
    <div style={{ ...cardBase, borderLeft: '3px solid #a78bfa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {WORKOUT_LABELS[session.type] ?? session.type}
        </span>
        <DeleteBtn onDelete={onDelete} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginTop: 2 }}>
        {session.durationMinutes} min
      </div>
      <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>
        {session.caloriesBurned !== null && `${session.caloriesBurned} kcal`}
        {session.caloriesBurned !== null && session.notes && ' · '}
        {session.notes}
      </div>
    </div>
  );
}

function PendingCard({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, background: 'transparent', borderRadius: 14, padding: '10px 13px', border: '1px dashed #3a3a3a' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888' }}>{label}</div>
    </div>
  );
}

export function JournalEntry({ entry, hasLine, index = 0 }: { entry: EntryType; hasLine: boolean; index?: number }) {
  if (entry.kind === 'pending') {
    return (
      <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 10, color: '#666', width: 34, paddingTop: 12, flexShrink: 0 }}>—</div>
        <DotLine color="#444" hasLine={false} />
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
    card = <MealCard meal={entry.data} onDelete={() => entry.onDelete(entry.data.id)} onPress={() => entry.onPress(entry.data)} />;
  } else if (entry.kind === 'water') {
    time = entry.data.time ?? formatTime(entry.data.createdAt);
    color = '#0ea5e9';
    card = <WaterCard entry={entry.data} totalMl={entry.totalMl} goalMl={entry.goalMl} onDelete={() => entry.onDelete(entry.data.id)} />;
  } else if (entry.kind === 'workout') {
    time = entry.data.time ?? formatTime(entry.data.createdAt);
    color = '#a78bfa';
    card = <WorkoutCard session={entry.data} onDelete={() => entry.onDelete(entry.data.id)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05, ease: 'easeOut' }}
      style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}
    >
      <div style={{ fontSize: 11, color: '#aaa', width: 34, paddingTop: 12, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {time}
      </div>
      <DotLine color={color} hasLine={hasLine} />
      {card}
    </motion.div>
  );
}
