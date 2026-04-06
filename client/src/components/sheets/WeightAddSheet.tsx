// client/src/components/sheets/WeightAddSheet.tsx
import { useState } from 'react';
import { weightApi } from '../../services/api';

interface WeightAddSheetProps {
  lastWeight: number | null;
  onClose: () => void;
  onAdded: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
  defaultDate?: string;
}

export function WeightAddSheet({ lastWeight, onClose, onAdded, onToast, defaultDate }: WeightAddSheetProps) {
  const [value, setValue] = useState(lastWeight !== null ? String(lastWeight) : '');
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!value || isNaN(parseFloat(value))) return;
    setSubmitting(true);
    try {
      await weightApi.create({ weightKg: parseFloat(value), date });
      onAdded();
      onClose();
      onToast('Pesée enregistrée', 'success');
    } catch {
      onToast("Erreur lors de l'enregistrement", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', marginBottom: 16 }}>Pesée</h2>
      <input
        type="date" value={date} onChange={e => setDate(e.target.value)}
        style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', color: '#f0f0f0', fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box', colorScheme: 'dark' }}
      />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, background: '#1a1a1a', borderRadius: 14, padding: '16px', marginBottom: 16, border: '1px solid #2a2a2a' }}>
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="72.5"
          autoFocus
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            fontSize: 36,
            fontWeight: 900,
            color: '#4ade80',
            letterSpacing: -1,
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 18, color: '#444', fontWeight: 600 }}>kg</span>
      </div>
      <button
        disabled={submitting || !value}
        onClick={handleSubmit}
        style={{
          width: '100%',
          padding: '14px',
          background: '#4ade80',
          border: 'none',
          borderRadius: 12,
          color: '#000',
          fontSize: 14,
          fontWeight: 800,
          cursor: 'pointer',
          opacity: !value ? 0.4 : 1,
        }}
      >
        {submitting ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}
