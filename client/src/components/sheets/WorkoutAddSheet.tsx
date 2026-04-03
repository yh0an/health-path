// client/src/components/sheets/WorkoutAddSheet.tsx
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { workoutApi } from '../../services/api';
import type { WorkoutType } from '../../services/api';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

const WORKOUT_TYPES: { value: WorkoutType; label: string; icon: string }[] = [
  { value: 'RUNNING',  label: 'Course',    icon: '🏃' },
  { value: 'CYCLING',  label: 'Vélo',      icon: '🚴' },
  { value: 'SWIMMING', label: 'Natation',  icon: '🏊' },
  { value: 'STRENGTH', label: 'Muscu',     icon: '🏋️' },
  { value: 'HIIT',     label: 'HIIT',      icon: '⚡' },
  { value: 'YOGA',     label: 'Yoga',      icon: '🧘' },
  { value: 'ELLIPTICAL', label: 'Elliptique', icon: '🔄' },
  { value: 'PADEL',    label: 'Padel',     icon: '🎾' },
  { value: 'WALKING',  label: 'Marche',    icon: '🚶' },
  { value: 'OTHER',    label: 'Autre',     icon: '🎯' },
];

interface WorkoutAddSheetProps {
  onClose: () => void;
  onAdded: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export function WorkoutAddSheet({ onClose, onAdded, onToast }: WorkoutAddSheetProps) {
  const [type, setType] = useState<WorkoutType>('RUNNING');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(nowTime());
  const [submitting, setSubmitting] = useState(false);

  const inputStyle: CSSProperties = {
    width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10,
    padding: '10px 12px', color: '#f0f0f0', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', colorScheme: 'dark',
  };

  async function handleSubmit() {
    if (!duration || isNaN(parseInt(duration))) return;
    setSubmitting(true);
    try {
      await workoutApi.create({
        date,
        time,
        type,
        durationMinutes: parseInt(duration),
        caloriesBurned: calories ? parseInt(calories) : undefined,
        notes: notes.trim() || undefined,
      });
      onAdded();
      onClose();
      onToast('Séance enregistrée', 'success');
    } catch {
      onToast("Erreur lors de l'enregistrement", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const btnStyle = (active: boolean): CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '10px 6px', borderRadius: 12,
    border: `1px solid ${active ? '#a78bfa' : '#2a2a2a'}`,
    background: active ? '#1a1228' : '#1a1a1a',
    color: active ? '#a78bfa' : '#555',
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
  });

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', marginBottom: 16 }}>Séance de sport</h2>

      {/* Type selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {WORKOUT_TYPES.map(w => (
          <button key={w.value} onClick={() => setType(w.value)} style={btnStyle(type === w.value)}>
            <span style={{ fontSize: 20 }}>{w.icon}</span>
            {w.label}
          </button>
        ))}
      </div>

      {/* Date / time */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, width: 100, flex: 'none' }} />
      </div>

      {/* Duration + calories */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="number" min={1} value={duration} onChange={e => setDuration(e.target.value)}
            placeholder="Durée (min)"
            style={{ ...inputStyle }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <input
            type="number" min={0} value={calories} onChange={e => setCalories(e.target.value)}
            placeholder="Calories (optionnel)"
            style={{ ...inputStyle }}
          />
        </div>
      </div>

      {/* Notes */}
      <input
        type="text" value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Note optionnelle…"
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      <button
        disabled={submitting || !duration}
        onClick={handleSubmit}
        style={{
          width: '100%', padding: 14, borderRadius: 14,
          background: '#a78bfa', border: 'none', color: '#000',
          fontSize: 14, fontWeight: 800, cursor: !duration ? 'default' : 'pointer',
          opacity: !duration ? 0.4 : 1,
        }}
      >
        {submitting ? 'Enregistrement…' : 'Enregistrer la séance →'}
      </button>
    </div>
  );
}
