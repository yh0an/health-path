import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { WeightEntry, Meal, WaterIntake } from '../services/api';
import { weightApi, nutritionApi, waterApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Insuffisance pondérale';
  if (bmi < 25) return 'Poids normal';
  if (bmi < 30) return 'Surpoids';
  return 'Obésité';
}

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface ProgressBarProps {
  value: number;
  max: number;
}

function ProgressBar({ value, max }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-surface overflow-hidden">
      <div
        className="h-full rounded-full bg-accent transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterIntakes, setWaterIntakes] = useState<WaterIntake[]>([]);
  const [loading, setLoading] = useState(true);

  const todayDate = new Date().toISOString().split('T')[0];
  const todayLabel = capitalize(
    new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      weightApi.getEntries(),
      nutritionApi.getMeals(todayDate),
      waterApi.getIntakes(todayDate),
    ]).then(([weightResult, mealsResult, waterResult]) => {
      if (cancelled) return;

      if (weightResult.status === 'fulfilled') {
        setWeightEntries(weightResult.value ?? []);
      }
      if (mealsResult.status === 'fulfilled') {
        setMeals(mealsResult.value ?? []);
      }
      if (waterResult.status === 'fulfilled') {
        setWaterIntakes(waterResult.value ?? []);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [todayDate]);

  // Derived values
  const latestEntry = weightEntries.length > 0
    ? weightEntries.reduce((a, b) => new Date(a.date) >= new Date(b.date) ? a : b)
    : null;

  const latestWeight = latestEntry ? latestEntry.weightKg : null;

  const bmi =
    latestWeight !== null && user?.heightCm
      ? latestWeight / Math.pow(user.heightCm / 100, 2)
      : null;

  const totalMeals = meals.length;

  const totalWaterMl = waterIntakes.reduce((sum, w) => sum + w.amountMl, 0);

  const targetWeight = user?.targetWeightKg ?? null;
  const targetWaterMl = user?.waterGoalMl ?? null;

  const weightDiff =
    latestWeight !== null && targetWeight !== null
      ? latestWeight - targetWeight
      : null;

  if (loading) {
    return (
      <div className="pt-6 px-4">
        <Skeleton className="h-8 w-48 mb-1" />
        <Skeleton className="h-5 w-36 mb-6" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 px-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-label">
            Bonjour{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-secondary text-sm mb-6">{todayLabel}</p>
        </div>
        <Link to="/settings" className="text-2xl leading-none mt-1">⚙️</Link>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">

        {/* Card 1 — Poids */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚖️</span>
            <span className="text-sm font-medium text-secondary">Poids</span>
          </div>
          <p className="text-xl font-bold text-label">
            {latestWeight !== null ? `${latestWeight} kg` : '—'}
          </p>
          {weightDiff !== null && (
            <p className="text-xs text-secondary mt-1">
              {weightDiff >= 0 ? '+' : ''}{weightDiff.toFixed(1)} kg vs objectif
            </p>
          )}
        </Card>

        {/* Card 2 — Repas */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🍽</span>
            <span className="text-sm font-medium text-secondary">Repas</span>
          </div>
          <p className="text-xl font-bold text-label">
            {totalMeals} repas
          </p>
          <p className="text-xs text-secondary mt-1">enregistrés aujourd'hui</p>
        </Card>

        {/* Card 3 — Hydratation */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💧</span>
            <span className="text-sm font-medium text-secondary">Hydratation</span>
          </div>
          <p className="text-xl font-bold text-label">
            {totalWaterMl} ml
          </p>
          {targetWaterMl !== null && targetWaterMl > 0 && (
            <>
              <p className="text-xs text-secondary mt-1">/ {targetWaterMl} ml</p>
              <ProgressBar value={totalWaterMl} max={targetWaterMl} />
            </>
          )}
        </Card>

        {/* Card 4 — IMC */}
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📊</span>
            <span className="text-sm font-medium text-secondary">IMC</span>
          </div>
          <p className="text-xl font-bold text-label">
            {bmi !== null ? bmi.toFixed(1) : '—'}
          </p>
          {bmi !== null && (
            <p className="text-xs text-secondary mt-1">{getBmiCategory(bmi)}</p>
          )}
        </Card>

      </div>
    </div>
  );
}
