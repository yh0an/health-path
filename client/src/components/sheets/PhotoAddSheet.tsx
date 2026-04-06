// client/src/components/sheets/PhotoAddSheet.tsx
import { useRef, useState } from 'react';
import { photosApi } from '../../services/api';

type Category = 'FRONT' | 'SIDE' | 'BACK';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'FRONT', label: 'Face' },
  { value: 'SIDE', label: 'Profil' },
  { value: 'BACK', label: 'Dos' },
];

interface PhotoAddSheetProps {
  onClose: () => void;
  onAdded: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
  defaultDate?: string;
}

export function PhotoAddSheet({ onClose, onAdded, onToast, defaultDate }: PhotoAddSheetProps) {
  const [category, setCategory] = useState<Category>('FRONT');
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().split('T')[0]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('category', category);
    fd.append('date', date);
    setUploading(true);
    try {
      await photosApi.upload(fd);
      onToast('Photo ajoutée', 'success');
      onAdded();
      onClose();
    } catch {
      onToast("Erreur lors de l'upload", 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#f0f0f0', marginBottom: 16 }}>Photo d'évolution</div>

      <input
        type="date" value={date} onChange={e => setDate(e.target.value)}
        style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', color: '#f0f0f0', fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' as const, colorScheme: 'dark' as const }}
      />

      {/* Category selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 12,
              border: `1px solid ${category === c.value ? '#d4a843' : '#2a2a2a'}`,
              background: category === c.value ? '#1a150a' : '#1a1a1a',
              color: category === c.value ? '#d4a843' : '#888',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 14,
          border: '1px dashed #3a3a3a',
          background: '#141414',
          color: uploading ? '#555' : '#aaa',
          fontSize: 14,
          fontWeight: 600,
          cursor: uploading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {uploading ? 'Envoi en cours...' : 'Choisir une photo'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}
