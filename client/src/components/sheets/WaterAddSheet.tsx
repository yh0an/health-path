// client/src/components/sheets/WaterAddSheet.tsx
import { useState } from 'react';
import { waterApi } from '../../services/api';

const QUICK = [150, 250, 330, 500];

interface WaterAddSheetProps {
  onClose: () => void;
  onAdded: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

export function WaterAddSheet({ onClose, onAdded, onToast }: WaterAddSheetProps) {
  const [custom, setCustom] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(nowTime());
  const [adding, setAdding] = useState(false);

  async function add(amount: number) {
    if (adding) return;
    setAdding(true);
    try {
      await waterApi.add({ amountMl: amount, date, time });
      onAdded();
      onClose();
      onToast(`+${amount} ml ajouté`, 'success');
    } catch {
      onToast("Erreur lors de l'ajout", 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', marginBottom: 16 }}>Ajouter de l'eau</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', color: '#f0f0f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, colorScheme: 'dark' as const }}
        />
        <input
          type="time" value={time} onChange={e => setTime(e.target.value)}
          style={{ width: 100, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', color: '#f0f0f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, colorScheme: 'dark' as const }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {QUICK.map(amount => (
          <button
            key={amount}
            disabled={adding}
            onClick={() => add(amount)}
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 12,
              padding: '14px 8px',
              color: '#0ea5e9',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            +{amount} ml
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="number"
          min={1}
          max={2000}
          value={custom}
          onChange={e => setCustom(e.target.value)}
          placeholder="Autre quantité (ml)"
          style={{
            flex: 1,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 10,
            padding: '10px 12px',
            color: '#f0f0f0',
            fontSize: 14,
          }}
        />
        <button
          disabled={adding || !custom}
          onClick={() => custom && add(parseInt(custom, 10))}
          style={{
            background: '#0ea5e9',
            border: 'none',
            borderRadius: 10,
            padding: '10px 16px',
            color: '#000',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            opacity: !custom ? 0.4 : 1,
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
