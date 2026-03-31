import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { waterApi } from '../services/api';
import type { WaterIntake } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CircularGauge } from '../components/CircularGauge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

const QUICK_AMOUNTS = [150, 250, 330, 500];
const DAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

interface WeeklyBar {
  date: string;
  label: string;
  totalMl: number;
}

export function WaterPage() {
  const { user } = useAuth();
  const { toasts, addToast } = useToast();

  const targetMl = user?.waterGoalMl ?? 2000;

  const [entries, setEntries] = useState<WaterIntake[]>([]);
  const [totalMl, setTotalMl] = useState(0);
  const [weeklyBars, setWeeklyBars] = useState<WeeklyBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const fetchToday = useCallback(async () => {
    const data = await waterApi.getIntakes(todayStr());
    setEntries(data);
    setTotalMl(data.reduce((sum, e) => sum + e.amountMl, 0));
  }, []);

  const fetchWeekly = useCallback(async () => {
    const history = await waterApi.getHistory();
    const bars: WeeklyBar[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      bars.push({
        date: dateKey,
        label: DAY_INITIALS[d.getDay()],
        totalMl: history[dateKey] ?? 0,
      });
    }
    setWeeklyBars(bars);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchToday(), fetchWeekly()]);
  }, [fetchToday, fetchWeekly]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function handleQuickAdd(amount: number) {
    if (adding) return;
    setAdding(true);
    try {
      await waterApi.add({ amountMl: amount, date: todayStr() });
      await refresh();
      addToast(`+${amount} ml ajouté`, 'success');
    } catch {
      addToast('Erreur lors de l\'ajout', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleCustomAdd(e: FormEvent) {
    e.preventDefault();
    const amount = parseInt(customAmount, 10);
    if (!amount || amount < 1 || amount > 2000) return;
    if (adding) return;
    setAdding(true);
    try {
      await waterApi.add({ amountMl: amount, date: todayStr() });
      await refresh();
      setCustomAmount('');
      addToast(`+${amount} ml ajouté`, 'success');
    } catch {
      addToast('Erreur lors de l\'ajout', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await waterApi.delete(id);
      await refresh();
      addToast('Entrée supprimée', 'info');
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    }
  }

  // Weekly SVG chart
  const chartHeight = 80;
  const barWidth = 28;
  const chartGap = 14;
  const maxBarMl = Math.max(...weeklyBars.map((b) => b.totalMl), targetMl, 1);
  const svgWidth = weeklyBars.length * (barWidth + chartGap) - chartGap;

  return (
    <div className="pt-6 pb-24 px-4 max-w-lg mx-auto space-y-6">
      <ToastContainer toasts={toasts} />

      <h1 className="text-2xl font-bold text-label">Hydratation</h1>

      {/* Circular gauge */}
      {loading ? (
        <div className="flex justify-center">
          <Skeleton className="w-[200px] h-[200px] rounded-full" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <CircularGauge value={totalMl} max={targetMl} size={200} color="#007AFF" />
          <p className="text-secondary text-sm font-medium">
            {totalMl} ml / {targetMl} ml
          </p>
        </div>
      )}

      {/* Quick-add buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {QUICK_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            variant="secondary"
            size="sm"
            disabled={adding}
            onClick={() => handleQuickAdd(amount)}
          >
            +{amount} ml
          </Button>
        ))}
      </div>

      {/* Custom amount form */}
      <Card>
        <form onSubmit={handleCustomAdd} className="flex gap-2 items-center">
          <input
            type="number"
            min={1}
            max={2000}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Quantité (ml)"
            className="flex-1 bg-surface rounded-xl px-3 py-2 text-label text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Button type="submit" variant="primary" size="sm" disabled={adding || !customAmount}>
            Ajouter
          </Button>
        </form>
      </Card>

      {/* Weekly bar chart */}
      <Card>
        <h2 className="text-label font-semibold mb-3">7 derniers jours</h2>
        {loading ? (
          <Skeleton className="h-[120px] w-full" />
        ) : (
          <div className="overflow-x-auto">
            <svg
              width={svgWidth}
              height={120}
              className="mx-auto"
              style={{ display: 'block' }}
            >
              {weeklyBars.map((bar, i) => {
                const x = i * (barWidth + chartGap);
                const barH = Math.max((bar.totalMl / maxBarMl) * chartHeight, bar.totalMl > 0 ? 4 : 0);
                const barY = chartHeight - barH;
                const metTarget = bar.totalMl >= targetMl;
                const barColor = metTarget ? '#007AFF' : '#86868B';
                return (
                  <g key={bar.date}>
                    {/* ml label above bar */}
                    {bar.totalMl > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={barY - 3}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#86868B"
                      >
                        {bar.totalMl}
                      </text>
                    )}
                    {/* bar */}
                    <rect
                      x={x}
                      y={barY}
                      width={barWidth}
                      height={barH || 0}
                      rx={4}
                      fill={barColor}
                    />
                    {/* day initial */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight + 16}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#86868B"
                    >
                      {bar.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </Card>

      {/* Today's entries */}
      <Card>
        <h2 className="text-label font-semibold mb-3">Aujourd'hui</h2>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-secondary text-sm text-center py-4">Aucune entrée pour aujourd'hui</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between bg-surface rounded-xl px-3 py-2"
              >
                <span className="text-secondary text-sm">{formatTime(entry.createdAt)}</span>
                <span className="text-label font-medium">{entry.amountMl} ml</span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-secondary hover:text-red-500 transition-colors text-lg leading-none px-1"
                  aria-label="Supprimer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
