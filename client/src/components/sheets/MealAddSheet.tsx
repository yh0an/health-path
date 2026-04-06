// client/src/components/sheets/MealAddSheet.tsx
import { useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import { nutritionApi } from '../../services/api';
import type { MealItem } from '../../services/api';

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Petit-déjeuner',
  LUNCH: 'Déjeuner',
  DINNER: 'Dîner',
  SNACK: 'Collation',
};
const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function nowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}
function guessType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'BREAKFAST';
  if (h < 15) return 'LUNCH';
  if (h < 21) return 'DINNER';
  return 'SNACK';
}

interface MealAddSheetProps {
  onClose: () => void;
  onAdded: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
  defaultDate?: string;
}

type Step = 'type' | 'photos' | 'analyzing' | 'confirm';

export function MealAddSheet({ onClose, onAdded, onToast, defaultDate }: MealAddSheetProps) {
  const [step, setStep] = useState<Step>('type');
  const [mealType, setMealType] = useState<MealType>(guessType());
  const [date, setDate] = useState(defaultDate ?? todayStr());
  const [time, setTime] = useState(nowTime());
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [mealItems, setMealItems] = useState<MealItem[]>([]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files);
    const newPreviews = newFiles.map(f => URL.createObjectURL(f));
    setPhotos(prev => [...prev, ...newFiles]);
    setPreviews(prev => [...prev, ...newPreviews]);
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(previews[i]);
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function analyze() {
    if (photos.length === 0) return;
    setStep('analyzing');
    try {
      const fd = new FormData();
      photos.forEach(f => fd.append('images', f));
      if (notes.trim()) fd.append('notes', notes.trim());
      const result = await nutritionApi.analyze(fd);
      setMealItems(result.items ?? []);
      setStep('confirm');
    } catch {
      onToast("Erreur lors de l'analyse", 'error');
      setStep('photos');
    }
  }

  const totalKcal = mealItems.reduce((s, it) => s + it.kcal, 0);
  const totalProtein = mealItems.reduce((s, it) => s + it.proteinG, 0);
  const totalCarbs = mealItems.reduce((s, it) => s + it.carbsG, 0);
  const totalFat = mealItems.reduce((s, it) => s + it.fatG, 0);

  function removeItem(i: number) {
    setMealItems(prev => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const fd = new FormData();
      photos.forEach(f => fd.append('images', f));
      fd.append('mealType', mealType);
      fd.append('date', date);
      fd.append('time', time);
      if (description.trim()) fd.append('description', description.trim());
      if (mealItems.length > 0) {
        fd.append('estimatedKcal', String(totalKcal));
        fd.append('proteinG', String(totalProtein));
        fd.append('carbsG', String(totalCarbs));
        fd.append('fatG', String(totalFat));
        fd.append('itemsJson', JSON.stringify(mealItems));
      }
      await nutritionApi.upload(fd);
      previews.forEach(p => URL.revokeObjectURL(p));
      onAdded();
      onClose();
      onToast('Repas enregistré', 'success');
    } catch {
      onToast("Erreur lors de l'enregistrement", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const btnStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: '10px 8px',
    borderRadius: 10,
    border: `1px solid ${active ? '#d4a843' : '#2a2a2a'}`,
    background: active ? '#1a150a' : '#1a1a1a',
    color: active ? '#d4a843' : '#555',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const inputStyle: CSSProperties = {
    flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10,
    padding: '10px 12px', color: '#f0f0f0', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
    colorScheme: 'dark',
  };

  if (step === 'type') return (
    <div style={{ padding: '0 16px 16px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', marginBottom: 16 }}>Quel repas ?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {MEAL_TYPES.map(t => (
          <button key={t} onClick={() => setMealType(t)} style={btnStyle(mealType === t)}>
            {MEAL_LABELS[t]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle, flex: '0 0 auto', width: 100 }} />
      </div>
      <button
        onClick={() => setStep('photos')}
        style={{ width: '100%', padding: 14, background: '#d4a843', border: 'none', borderRadius: 12, color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
      >
        Continuer →
      </button>
    </div>
  );

  if (step === 'photos') return (
    <div style={{ padding: '0 16px 16px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', marginBottom: 4 }}>{MEAL_LABELS[mealType]}</h2>
      <p style={{ fontSize: 12, color: '#444', marginBottom: 16 }}>Prends une ou plusieurs photos</p>
      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
          {previews.map((src, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              <img src={src} alt="Aperçu" style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover' }} />
              <button
                onClick={() => removePhoto(i)}
                style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>
          ))}
          <button
            onClick={() => fileRef.current?.click()}
            style={{ width: 80, height: 80, borderRadius: 10, border: '1px dashed #2a2a2a', background: 'none', color: '#444', fontSize: 24, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >+</button>
        </div>
      )}
      {previews.length === 0 && (
        <button
          onClick={() => fileRef.current?.click()}
          style={{ width: '100%', height: 120, border: '1px dashed #2a2a2a', borderRadius: 14, background: 'none', color: '#333', fontSize: 13, cursor: 'pointer', marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 32 }}>📷</span>
          <span>Ajouter une photo</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(e.target.files)} style={{ display: 'none' }} />
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Note pour l'IA : ingrédients, quantités, mode de cuisson… (optionnel)"
        rows={2}
        style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', color: '#f0f0f0', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 12, colorScheme: 'dark' }}
      />
      <button
        disabled={photos.length === 0}
        onClick={analyze}
        style={{ width: '100%', padding: 14, background: '#d4a843', border: 'none', borderRadius: 12, color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: photos.length === 0 ? 0.4 : 1 }}
      >
        Analyser →
      </button>
    </div>
  );

  if (step === 'analyzing') return (
    <div style={{ padding: '0 16px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontWeight: 700 }}>Analyse de ton assiette…</div>
      <div style={{ fontSize: 12, color: '#444' }}>Identification des aliments et estimation des calories</div>
      <div style={{ marginTop: 24, width: 32, height: 32, borderRadius: '50%', border: '3px solid #222', borderTopColor: '#d4a843', animation: 'spin 0.8s linear infinite', margin: '24px auto 0' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // step === 'confirm'
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0', marginBottom: 12 }}>{MEAL_LABELS[mealType]}</h2>
      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
          {previews.map((src, i) => (
            <img key={i} src={src} alt="Repas" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          ))}
        </div>
      )}
      <div style={{ background: '#1a150a', border: '1px solid #3a2e0a', borderRadius: 14, padding: 14, marginBottom: 12 }}>
        {/* Totaux calculés */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: mealItems.length > 0 ? 10 : 0 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: '#d4a843', letterSpacing: -1 }}>{totalKcal}</span>
          <span style={{ fontSize: 14, color: '#8a6a2a' }}>kcal</span>
          <span style={{ fontSize: 9, color: '#5a4a1a', marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: 1 }}>Total</span>
        </div>
        {mealItems.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'Protéines', value: totalProtein, color: '#4ade80' },
              { label: 'Glucides', value: totalCarbs, color: '#f59e0b' },
              { label: 'Lipides', value: totalFat, color: '#f87171' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ flex: 1, background: '#141414', borderRadius: 10, padding: '7px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}g</div>
                <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
        {/* Ingrédients supprimables */}
        {mealItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {mealItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#141414', borderRadius: 8, padding: '5px 8px' }}>
                <span style={{ flex: 1, fontSize: 11, color: '#888' }}>{item.name}</span>
                <span style={{ fontSize: 10, color: '#6a6a6a', minWidth: 50, textAlign: 'right' }}>{item.kcal} kcal</span>
                <button
                  onClick={() => removeItem(i)}
                  style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Note optionnelle…"
        style={{ width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', color: '#f0f0f0', fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }}
      />
      <button
        disabled={submitting}
        onClick={submit}
        style={{ width: '100%', padding: 14, background: '#d4a843', border: 'none', borderRadius: 12, color: '#000', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
      >
        {submitting ? 'Enregistrement…' : 'Enregistrer le repas →'}
      </button>
    </div>
  );
}
