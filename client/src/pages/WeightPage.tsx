import { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { WeightEntry } from '../services/api';
import { weightApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

// Prisma peut renvoyer date comme objet Date ou string selon le contexte
function toISODate(date: string | Date): string {
  if (date instanceof Date) return date.toISOString().split('T')[0];
  return date.split('T')[0];
}

// ─── Chart ───────────────────────────────────────────────────────────────────

function WeightChart({ entries }: { entries: WeightEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-center h-44">
          <span className="text-secondary text-sm">Aucune donnée</span>
        </div>
      </Card>
    );
  }

  const data = [...entries]
    .sort((a, b) => toISODate(a.date).localeCompare(toISODate(b.date)))
    .slice(-30)
    .map(e => ({
      date: new Date(toISODate(e.date) + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      poids: e.weightKg,
    }));

  const weights = data.map(d => d.poids);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);

  return (
    <Card>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34C759" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#86868B' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[minW, maxW]} tick={{ fontSize: 10, fill: '#86868B' }} tickLine={false} axisLine={false} tickCount={4} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: 13 }}
            formatter={(v: unknown) => [`${v} kg`, 'Poids']}
          />
          <Area type="monotone" dataKey="poids" stroke="#34C759" strokeWidth={2.5} fill="url(#weightGrad)" dot={{ r: 3, fill: '#34C759', strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ─── Stats row ────────────────────────────────────────────────────────────────

interface StatsRowProps {
  latest: WeightEntry | null;
  targetWeightKg: number | null;
  heightCm: number | null;
}

function StatsRow({ latest, targetWeightKg, heightCm }: StatsRowProps) {
  const bmi =
    latest && heightCm
      ? latest.weightKg / Math.pow(heightCm / 100, 2)
      : null;

  const items = [
    { label: 'Actuel', value: latest ? `${latest.weightKg} kg` : '—' },
    { label: 'Objectif', value: targetWeightKg ? `${targetWeightKg} kg` : '—' },
    { label: 'IMC', value: bmi !== null ? bmi.toFixed(1) : '—' },
  ];

  return (
    <Card>
      <div className="flex divide-x divide-surface">
        {items.map(({ label, value }) => (
          <div key={label} className="flex-1 flex flex-col items-center py-1">
            <span className="text-secondary text-xs">{label}</span>
            <span className="font-bold text-lg text-label">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── History list ─────────────────────────────────────────────────────────────

interface HistoryListProps {
  entries: WeightEntry[];
  heightCm: number | null;
  onDelete: (id: string) => void;
}

function HistoryList({ entries, heightCm, onDelete }: HistoryListProps) {
  const sorted = [...entries].sort((a, b) => toISODate(b.date).localeCompare(toISODate(a.date)));

  return (
    <div>
      <h2 className="text-base font-semibold text-label mb-3">Historique</h2>
      {sorted.length === 0 ? (
        <p className="text-secondary text-sm text-center py-4">Aucune entrée</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((entry) => {
            const bmi =
              heightCm
                ? entry.weightKg / Math.pow(heightCm / 100, 2)
                : null;
            const dateLabel = new Date(toISODate(entry.date) + 'T12:00:00').toLocaleDateString('fr-FR');
            return (
              <Card key={entry.id} className="!p-3">
                <div className="flex items-center gap-2">
                  <span className="text-secondary text-sm w-24 shrink-0">{dateLabel}</span>
                  <span className="font-bold text-label flex-1 text-center">
                    {entry.weightKg} kg
                  </span>
                  <span className="text-secondary text-sm w-16 text-right">
                    {bmi !== null ? `IMC ${bmi.toFixed(1)}` : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="!px-2 !py-1 text-secondary"
                    onClick={() => onDelete(entry.id)}
                    aria-label="Supprimer"
                  >
                    ×
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Add modal ────────────────────────────────────────────────────────────────

interface AddWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

function AddWeightModal({ isOpen, onClose, onAdded, onToast }: AddWeightModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [weightKg, setWeightKg] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setWeightKg('');
      setDate(today);
      setNotes('');
    }
  }, [isOpen, today]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weightKg || !date) return;
    setSubmitting(true);
    try {
      await weightApi.create({
        weightKg: parseFloat(weightKg),
        date,
        notes: notes || undefined,
      });
      onAdded();
      onClose();
      onToast('Poids ajouté !', 'success');
    } catch {
      onToast('Erreur lors de l\'ajout', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un poids">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-label" htmlFor="weight-input">
            Poids (kg)
          </label>
          <input
            id="weight-input"
            type="number"
            step="0.1"
            required
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="Ex : 72.5"
            className="border border-surface rounded-xl px-3 py-2.5 text-label text-base focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-label" htmlFor="date-input">
            Date
          </label>
          <input
            id="date-input"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-surface rounded-xl px-3 py-2.5 text-label text-base focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-label" htmlFor="notes-input">
            Notes (optionnel)
          </label>
          <input
            id="notes-input"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex : après sport"
            className="border border-surface rounded-xl px-3 py-2.5 text-label text-base focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <Button type="submit" variant="primary" disabled={submitting} className="w-full mt-1">
          {submitting ? 'Ajout…' : 'Ajouter'}
        </Button>
      </form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function WeightPage() {
  const { user } = useAuth();
  const { toasts, addToast } = useToast();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function fetchEntries() {
    try {
      const data = await weightApi.getEntries();
      setEntries(data ?? []);
    } catch {
      addToast('Impossible de charger les données', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    try {
      await weightApi.delete(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      addToast('Entrée supprimée', 'success');
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    }
  }

  const latestEntry =
    entries.length > 0
      ? entries.reduce((a, b) => (toISODate(a.date) >= toISODate(b.date) ? a : b))
      : null;

  if (loading) {
    return (
      <div className="pt-6 px-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <Skeleton className="h-[180px] rounded-card" />
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-6 w-28" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 rounded-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="pt-6 px-4 pb-24 flex flex-col gap-4">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-label">Poids</h1>
        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          +
        </Button>
      </div>

      {/* Chart */}
      <WeightChart entries={entries} />

      {/* Stats */}
      <StatsRow
        latest={latestEntry}
        targetWeightKg={user?.targetWeightKg ?? null}
        heightCm={user?.heightCm ?? null}
      />

      {/* History */}
      <HistoryList
        entries={entries}
        heightCm={user?.heightCm ?? null}
        onDelete={handleDelete}
      />

      {/* Add modal */}
      <AddWeightModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={fetchEntries}
        onToast={addToast}
      />
    </div>
  );
}
