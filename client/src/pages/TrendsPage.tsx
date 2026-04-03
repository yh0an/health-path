// client/src/pages/TrendsPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { weightApi, waterApi, nutritionApi, streaksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';

type Period = '7d' | '30d' | '3m';

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const tooltipStyle: React.CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
  fontSize: 12,
  color: '#f0f0f0',
  padding: '6px 10px',
};

function BarTooltip({ active, payload, unit }: { active?: boolean; payload?: { value: number; payload: { date: string } }[]; unit: string }) {
  if (!active || !payload?.length) return null;
  const d = new Date(payload[0].payload.date + 'T12:00:00');
  const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <div style={tooltipStyle}>
      <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{payload[0].value} {unit}</div>
    </div>
  );
}

export function TrendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const [weightData, setWeightData] = useState<{ date: string; poids: number }[]>([]);
  const [waterData, setWaterData] = useState<{ label: string; ml: number; date: string }[]>([]);
  const [calorieData, setCalorieData] = useState<{ label: string; kcal: number; date: string }[]>([]);
  const [streaks, setStreaks] = useState({ waterStreak: 0, weightStreak: 0, calorieStreak: 0 });

  const waterGoal = user?.waterGoalMl ?? 2000;
  const calorieGoal = user?.calorieGoal ?? 2000;

  useEffect(() => {
    setLoading(true);
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const from = isoDate(daysAgo(days));
    const to = isoDate(new Date());

    Promise.allSettled([
      weightApi.getEntries({ from, to }),
      waterApi.getHistory(),
      streaksApi.get(),
    ]).then(async ([wRes, waterRes, streakRes]) => {
      // Weight
      if (wRes.status === 'fulfilled') {
        const sorted = [...(wRes.value ?? [])].sort((a, b) => a.date.localeCompare(b.date));
        setWeightData(sorted.map(e => ({
          date: new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          poids: e.weightKg,
        })));
      }

      // Water (7 days always)
      if (waterRes.status === 'fulfilled') {
        const history = waterRes.value as Record<string, number>;
        const bars = Array.from({ length: 7 }, (_, i) => {
          const d = daysAgo(6 - i);
          const key = isoDate(d);
          return {
            date: key,
            label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3),
            ml: history[key] ?? 0,
          };
        });
        setWaterData(bars);
      }

      // Calories (from meals)
      const mealsByDay: Record<string, number> = {};
      const mealFetches = Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const d = daysAgo(i);
        const key = isoDate(d);
        return nutritionApi.getMeals(key).then(meals => {
          mealsByDay[key] = meals.reduce((sum, m) => sum + (m.estimatedKcal ?? 0), 0);
        }).catch(() => {});
      });
      await Promise.all(mealFetches);
      const calBars = Array.from({ length: 7 }, (_, i) => {
        const d = daysAgo(6 - i);
        const key = isoDate(d);
        return {
          date: key,
          label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 1).toUpperCase(),
          kcal: mealsByDay[key] ?? 0,
        };
      });
      setCalorieData(calBars);

      if (streakRes.status === 'fulfilled') {
        setStreaks(streakRes.value);
      }

      setLoading(false);
    });
  }, [period]);

  const periodBtnStyle = (p: Period): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: period === p ? '#d4a843' : '#1a1a1a',
    color: period === p ? '#000' : '#555',
  });

  const cardStyle: React.CSSProperties = {
    background: '#111',
    borderRadius: 16,
    padding: 16,
    border: '1px solid #1a1a1a',
    marginBottom: 16,
  };

  return (
    <div style={{ padding: '20px 16px 100px' }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 4 }}>Tendances</div>
      <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>Ton évolution</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['7d', '30d', '3m'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={periodBtnStyle(p)}>
            {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '3 mois'}
          </button>
        ))}
      </div>

      {/* Streaks */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Série eau', val: streaks.waterStreak, unit: 'j' },
          { label: 'Série cal.', val: streaks.calorieStreak, unit: 'j' },
          { label: 'Série pesées', val: streaks.weightStreak, unit: 'sem.' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#111', borderRadius: 14, padding: '12px 8px', border: '1px solid #1a1a1a', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>
              {s.val}<span style={{ fontSize: 13, color: '#444', fontWeight: 600 }}> {s.unit}</span>
            </div>
            <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Weight chart */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#d4a843', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Poids</div>
        {loading ? <Skeleton className="h-32 w-full" /> : weightData.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#2a2a2a', padding: '24px 0', fontSize: 12 }}>Aucune donnée</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={weightData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d4a843" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d4a843" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#333' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#333' }} tickLine={false} axisLine={false} tickCount={4} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ fontSize: 10, color: '#555', marginBottom: 2 }}
                formatter={(v: unknown) => [`${v} kg`, '']}
                cursor={{ stroke: '#2a2a2a', strokeWidth: 1 }}
              />
              <Area type="monotone" dataKey="poids" stroke="#d4a843" strokeWidth={2.5} fill="url(#wGrad)" dot={false} activeDot={{ r: 4, fill: '#d4a843' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        {weightData.length > 0 && !loading && (() => {
          const first = weightData[0].poids;
          const last = weightData[weightData.length - 1].poids;
          const diff = last - first;
          return (
            <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: 12, borderTop: '1px solid #1a1a1a', marginTop: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#d4a843' }}>{last}</div>
                <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 0.8 }}>Actuel</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: diff < 0 ? '#4ade80' : '#f87171' }}>
                  {diff >= 0 ? '+' : ''}{diff.toFixed(1)} kg
                </div>
                <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 0.8 }}>Période</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{user?.targetWeightKg ?? '—'}</div>
                <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 0.8 }}>Objectif</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Water chart */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Hydratation — 7 jours</div>
        {loading ? <Skeleton className="h-24 w-full" /> : (
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={waterData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#333' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#333' }} tickLine={false} axisLine={false} tickCount={3} />
              <Tooltip content={<BarTooltip unit="ml" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="ml" fill="#0ea5e9" radius={[4, 4, 0, 0]} label={false} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ fontSize: 11, color: '#2a2a2a', marginTop: 8 }}>
          Objectif : {waterGoal} ml/j · {waterData.filter(d => d.ml >= waterGoal).length}/7 jours atteints
        </div>
      </div>

      {/* Calorie chart */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#d4a843', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Calories — 7 jours</div>
        {loading ? <Skeleton className="h-24 w-full" /> : (
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={calorieData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#333' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#333' }} tickLine={false} axisLine={false} tickCount={3} />
              <Tooltip content={<BarTooltip unit="kcal" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
                {calorieData.map((entry, index) => (
                  <Cell key={index} fill={entry.kcal === 0 ? '#2a2a2a' : entry.kcal > calorieGoal ? '#f87171' : '#4ade80'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ fontSize: 11, color: '#2a2a2a', marginTop: 8 }}>
          Plafond : {calorieGoal} kcal/j
        </div>
      </div>

      {/* Photos d'évolution */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Photos d'évolution</div>
        </div>
        <button
          onClick={() => navigate('/photos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            padding: '14px 16px',
            color: '#f0f0f0',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 700,
            width: '100%',
            cursor: 'pointer',
          }}
        >
          <span>Voir mes photos de progression</span>
          <span style={{ color: '#444', fontSize: 16 }}>→</span>
        </button>
      </div>
    </div>
  );
}
