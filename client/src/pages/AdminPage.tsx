import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { adminApi } from '../services/api';
import type { AdminStats, AdminUser } from '../services/api';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeAgo(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  return `Il y a ${days}j`;
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: '#111', borderRadius: 14, padding: '14px 16px', border: '1px solid #1e1e1e' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function EditableName({ user, onSaved }: { user: AdminUser; onSaved: (id: string, name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() { setEditing(true); setTimeout(() => inputRef.current?.select(), 0); }

  function cancel() { setValue(user.name); setEditing(false); }

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === user.name) { cancel(); return; }
    setSaving(true);
    try {
      await adminApi.updateUser(user.id, trimmed);
      onSaved(user.id, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          disabled={saving}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#f0f0f0', fontSize: 12, fontWeight: 600, padding: '3px 7px', outline: 'none', width: 120 }}
          autoFocus
        />
        <button onClick={save} disabled={saving} style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>✓</button>
        <button onClick={cancel} style={{ background: 'none', border: 'none', color: '#555', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
      </div>
    );
  }

  return (
    <span
      onClick={startEdit}
      title="Cliquer pour modifier"
      style={{ cursor: 'pointer', borderBottom: '1px dashed #333', paddingBottom: 1 }}
    >
      {value}
    </span>
  );
}

export function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getUsers()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#555', fontSize: 13 }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '24px 16px 48px', maxWidth: 768, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#f0f0f0', letterSpacing: -0.5 }}>Back-office</div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{todayCapitalized}</div>
        </div>
        <a href="/" style={{ fontSize: 12, color: '#555', textDecoration: 'none', paddingTop: 4 }}>← App</a>
      </div>

      {/* KPI cards */}
      {stats && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <KpiCard label="Utilisateurs" value={stats.totals.users} color="#f0f0f0" />
            <KpiCard label="Repas 7j" value={stats.last7Days.meals} color="#d4a843" />
            <KpiCard label="Séances 7j" value={stats.last7Days.workouts} color="#a78bfa" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            <KpiCard label="Pesées 7j" value={stats.last7Days.weightEntries} color="#4ade80" />
            <KpiCard label="Eau moy. 7j" value={`${stats.last7Days.avgWaterMl} ml`} color="#0ea5e9" />
          </div>

          {/* Activity chart */}
          <div style={{ background: '#111', borderRadius: 14, padding: '16px', marginBottom: 24, border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
              Activité — 30 derniers jours
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={stats.activityLast30Days} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 9, fill: '#444' }}
                  interval={6}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#444' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#888' }}
                  itemStyle={{ color: '#d4a843' }}
                  labelFormatter={(label) => formatDate(String(label))}
                  cursor={false}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#d4a843"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#d4a843' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Users table */}
      <div style={{ background: '#111', borderRadius: 14, border: '1px solid #1e1e1e', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e1e' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Utilisateurs ({users.length})
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Nom', 'Email', 'Inscrit le', 'Repas', 'Séances', 'Pesées', 'Dernière activité'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid #1e1e1e', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                  <td style={{ padding: '12px 16px', color: '#f0f0f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <EditableName user={u} onSaved={(id, name) => setUsers(prev => prev.map(x => x.id === id ? { ...x, name } : x))} />
                    {u.isAdmin && <span style={{ marginLeft: 6, fontSize: 9, color: '#d4a843', background: '#1a150a', padding: '1px 5px', borderRadius: 99, border: '1px solid #3a2e0a' }}>admin</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#666', whiteSpace: 'nowrap' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px', color: '#555', whiteSpace: 'nowrap' }}>{formatDateLong(u.createdAt)}</td>
                  <td style={{ padding: '12px 16px', color: '#d4a843', textAlign: 'right' }}>{u.counts.meals}</td>
                  <td style={{ padding: '12px 16px', color: '#a78bfa', textAlign: 'right' }}>{u.counts.workouts}</td>
                  <td style={{ padding: '12px 16px', color: '#4ade80', textAlign: 'right' }}>{u.counts.weightEntries}</td>
                  <td style={{ padding: '12px 16px', color: '#555', whiteSpace: 'nowrap' }}>{timeAgo(u.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
