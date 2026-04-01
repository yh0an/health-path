// client/src/pages/TodayPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { weightApi, nutritionApi, waterApi } from '../services/api';
import type { WeightEntry, Meal, WaterIntake } from '../services/api';
import { ObjectivesBar } from '../components/ObjectivesBar';
import { JournalEntry } from '../components/JournalEntry';
import { FAB } from '../components/FAB';
import { BottomSheet } from '../components/sheets/BottomSheet';
import { QuickAddSheet } from '../components/sheets/QuickAddSheet';
import { WaterAddSheet } from '../components/sheets/WaterAddSheet';
import { WeightAddSheet } from '../components/sheets/WeightAddSheet';
import { MealAddSheet } from '../components/sheets/MealAddSheet';

function todayStr() { return new Date().toISOString().slice(0, 10); }

function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

type Sheet = 'quick' | 'water' | 'weight' | 'meal' | null;

type Toast = { id: number; msg: string; type: 'success' | 'error' };

function isWeighDay(weighDay: number): boolean {
  return new Date().getDay() === weighDay;
}

export function TodayPage() {
  const { user } = useAuth();

  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterIntakes, setWaterIntakes] = useState<WaterIntake[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const today = todayStr();
  const todayLabel = capitalize(
    new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  );

  function addToast(msg: string, type: 'success' | 'error') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }

  const fetchAll = useCallback(async () => {
    const [wRes, mRes, wIntRes] = await Promise.allSettled([
      weightApi.getEntries(),
      nutritionApi.getMeals(today),
      waterApi.getIntakes(today),
    ]);
    if (wRes.status === 'fulfilled') setWeightEntries(wRes.value ?? []);
    if (mRes.status === 'fulfilled') setMeals(mRes.value ?? []);
    if (wIntRes.status === 'fulfilled') setWaterIntakes(wIntRes.value ?? []);
  }, [today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const todayWeight = weightEntries.find(e => new Date(e.date).toISOString().split('T')[0] === today) ?? null;
  const totalWaterMl = waterIntakes.reduce((s, w) => s + w.amountMl, 0);
  const totalCalories = meals.reduce((s, m) => s + (m.estimatedKcal ?? 0), 0);
  const waterGoal = user?.waterGoalMl ?? 2000;
  const calorieGoal = user?.calorieGoal ?? 2000;
  const weighDay = user?.weighDay ?? 1;
  const showWeighRing = isWeighDay(weighDay);

  // Build journal entries sorted by time
  type JournalItem =
    | { kind: 'weight'; time: number; data: WeightEntry }
    | { kind: 'meal';   time: number; data: Meal }
    | { kind: 'water';  time: number; data: WaterIntake; runningTotal: number };

  const items: JournalItem[] = [];

  if (todayWeight) {
    items.push({ kind: 'weight', time: new Date(todayWeight.createdAt).getTime(), data: todayWeight });
  }
  meals.forEach(m => {
    items.push({ kind: 'meal', time: new Date(m.createdAt).getTime(), data: m });
  });

  // Build running totals for water
  const sortedWater = [...waterIntakes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let runningWater = 0;
  sortedWater.forEach(w => {
    runningWater += w.amountMl;
    items.push({ kind: 'water', time: new Date(w.createdAt).getTime(), data: w, runningTotal: runningWater });
  });

  items.sort((a, b) => a.time - b.time);

  async function deleteWeight(id: string) {
    try {
      await weightApi.delete(id);
      setWeightEntries(p => p.filter(e => e.id !== id));
      addToast('Entrée supprimée', 'success');
    } catch { addToast('Erreur', 'error'); }
  }

  async function deleteMeal(id: string) {
    try {
      await nutritionApi.delete(id);
      setMeals(p => p.filter(m => m.id !== id));
      addToast('Repas supprimé', 'success');
    } catch { addToast('Erreur', 'error'); }
  }

  async function deleteWater(id: string) {
    try {
      await waterApi.delete(id);
      await fetchAll();
      addToast('Entrée supprimée', 'success');
    } catch { addToast('Erreur', 'error'); }
  }

  const todayMealTypes = meals.map(m => m.mealType);

  // Pending hints
  const pendingItems: string[] = [];
  if (showWeighRing && !todayWeight) pendingItems.push('Pesée non réalisée');
  const h = new Date().getHours();
  if (h >= 10 && !todayMealTypes.includes('BREAKFAST')) pendingItems.push('Petit-déjeuner non loggé');
  if (h >= 14 && !todayMealTypes.includes('LUNCH')) pendingItems.push('Déjeuner non loggé');

  const userName = user?.name ?? '';

  return (
    <>
      {/* Toast notifications */}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'success' ? '#1a2a1a' : '#2a1a1a',
            border: `1px solid ${t.type === 'success' ? '#4ade80' : '#f87171'}`,
            color: t.type === 'success' ? '#4ade80' : '#f87171',
            borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap',
          }}>{t.msg}</div>
        ))}
      </div>

      <ObjectivesBar
        waterMl={totalWaterMl}
        waterGoalMl={waterGoal}
        caloriesKcal={totalCalories}
        calorieGoal={calorieGoal}
        showWeighRing={showWeighRing}
        weighed={!!todayWeight}
      />

      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -0.5, lineHeight: 1.1 }}>
          Bonjour,<br />
          <span style={{ color: '#d4a843' }}>{userName}</span>
        </div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{todayLabel}</div>
      </div>

      <div style={{ padding: '24px 16px 120px' }}>
        {items.map((item, i) => {
          const hasLine = i < items.length - 1 || pendingItems.length > 0;
          if (item.kind === 'weight') {
            return (
              <JournalEntry key={item.data.id} hasLine={hasLine} entry={{
                kind: 'weight', data: item.data,
                heightCm: user?.heightCm ?? null,
                targetWeightKg: user?.targetWeightKg ?? null,
                onDelete: deleteWeight,
              }} />
            );
          }
          if (item.kind === 'meal') {
            return <JournalEntry key={item.data.id} hasLine={hasLine} entry={{ kind: 'meal', data: item.data, onDelete: deleteMeal }} />;
          }
          if (item.kind === 'water') {
            return (
              <JournalEntry key={item.data.id} hasLine={hasLine} entry={{
                kind: 'water', data: item.data, totalMl: item.runningTotal, goalMl: waterGoal, onDelete: deleteWater,
              }} />
            );
          }
          return null;
        })}

        {items.length === 0 && pendingItems.length === 0 && (
          <div style={{ textAlign: 'center', color: '#2a2a2a', padding: '40px 0', fontSize: 13 }}>
            Rien encore aujourd'hui — appuie sur + pour commencer
          </div>
        )}

        {pendingItems.map((label, i) => (
          <JournalEntry key={label} hasLine={i < pendingItems.length - 1} entry={{ kind: 'pending', label }} />
        ))}
      </div>

      <FAB onClick={() => setSheet('quick')} />

      <BottomSheet open={sheet === 'quick'} onClose={() => setSheet(null)}>
        <QuickAddSheet
          onSelect={action => setSheet(action)}
          onClose={() => setSheet(null)}
          isWeighDay={showWeighRing}
          waterMl={totalWaterMl}
          waterGoalMl={waterGoal}
          todayMeals={todayMealTypes}
        />
      </BottomSheet>

      <BottomSheet open={sheet === 'water'} onClose={() => setSheet(null)}>
        <WaterAddSheet onClose={() => setSheet(null)} onAdded={fetchAll} onToast={addToast} />
      </BottomSheet>

      <BottomSheet open={sheet === 'weight'} onClose={() => setSheet(null)}>
        <WeightAddSheet
          lastWeight={weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weightKg : null}
          onClose={() => setSheet(null)}
          onAdded={fetchAll}
          onToast={addToast}
        />
      </BottomSheet>

      <BottomSheet open={sheet === 'meal'} onClose={() => setSheet(null)}>
        <MealAddSheet onClose={() => setSheet(null)} onAdded={fetchAll} onToast={addToast} />
      </BottomSheet>
    </>
  );
}
