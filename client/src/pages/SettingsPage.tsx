import { useState, useEffect } from 'react';
import type { NotificationSettings } from '../services/api';
import { settingsApi, pushApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

// ─── Shared input style ───────────────────────────────────────────────────────
const inputClass =
  'w-full rounded-xl border border-surface2 bg-surface2 px-3 py-2.5 text-label text-base focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60';

// ─── Toggle component ─────────────────────────────────────────────────────────
interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center justify-between cursor-pointer select-none">
      <span className="text-label font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          checked ? 'bg-accent' : 'bg-surface2'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { user, logout, refreshProfile } = useAuth();
  const { toasts, addToast } = useToast();

  // ── Section 1: Profil ──
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Section 2: Objectifs nutritionnels ──
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoalPct, setProteinGoalPct] = useState('');
  const [carbsGoalPct, setCarbsGoalPct] = useState('');
  const [fatGoalPct, setFatGoalPct] = useState('');
  const [waterGoalMl, setWaterGoalMl] = useState('');
  const [weighDay, setWeighDay] = useState(1);
  const [savingGoals, setSavingGoals] = useState(false);

  // ── Section 3: Notifications ──
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(false);
  const [waterReminderIntervalMinutes, setWaterReminderIntervalMinutes] = useState('');
  const [photoReminderEnabled, setPhotoReminderEnabled] = useState(false);
  const [photoReminderIntervalDays, setPhotoReminderIntervalDays] = useState('');
  const [eventReminderEnabled, setEventReminderEnabled] = useState(false);
  const [eventReminderMinutesBefore, setEventReminderMinutesBefore] = useState('');
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);

  // ── Section 4: Sécurité ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // ── Pre-fill from user ──
  useEffect(() => {
    if (!user) return;

    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setHeightCm(user.heightCm != null ? String(user.heightCm) : '');
    setTargetWeightKg(user.targetWeightKg != null ? String(user.targetWeightKg) : '');

    setCalorieGoal(String(user.calorieGoal ?? ''));
    setProteinGoalPct(String(user.proteinGoalPct ?? ''));
    setCarbsGoalPct(String(user.carbsGoalPct ?? ''));
    setFatGoalPct(String(user.fatGoalPct ?? ''));
    setWaterGoalMl(String(user.waterGoalMl ?? ''));
    setWeighDay(user.weighDay ?? 1);

    const ns: NotificationSettings | null = user.notificationSettings;
    if (ns) {
      setWaterReminderEnabled(ns.waterReminderEnabled);
      setWaterReminderIntervalMinutes(String(ns.waterReminderIntervalMinutes));
      setPhotoReminderEnabled(ns.photoReminderEnabled);
      setPhotoReminderIntervalDays(String(ns.photoReminderIntervalDays));
      setEventReminderEnabled(ns.eventReminderEnabled);
      setEventReminderMinutesBefore(String(ns.eventReminderMinutesBefore));
    }
  }, [user]);

  // ── Check push subscription state ──
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    }).catch(() => {});
  }, []);

  // ── Handlers ──
  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await settingsApi.updateProfile({
        name,
        heightCm: heightCm !== '' ? Number(heightCm) : null,
        targetWeightKg: targetWeightKg !== '' ? Number(targetWeightKg) : null,
      });
      await refreshProfile();
      addToast('Profil mis à jour', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveGoals() {
    setSavingGoals(true);
    try {
      await settingsApi.updateProfile({
        calorieGoal: Number(calorieGoal),
        proteinGoalPct: Number(proteinGoalPct),
        carbsGoalPct: Number(carbsGoalPct),
        fatGoalPct: Number(fatGoalPct),
        waterGoalMl: Number(waterGoalMl),
        weighDay,
      });
      await refreshProfile();
      addToast('Objectifs mis à jour', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setSavingGoals(false);
    }
  }

  async function handleSaveNotifications() {
    setSavingNotifications(true);
    try {
      await settingsApi.updateNotifications({
        waterReminderEnabled,
        waterReminderIntervalMinutes: Number(waterReminderIntervalMinutes),
        photoReminderEnabled,
        photoReminderIntervalDays: Number(photoReminderIntervalDays),
        eventReminderEnabled,
        eventReminderMinutesBefore: Number(eventReminderMinutesBefore),
      });
      addToast('Notifications mises à jour', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleEnablePush() {
    setEnablingPush(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        addToast('Permission refusée', 'error');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await pushApi.getVapidKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      await pushApi.subscribe(sub.toJSON() as PushSubscriptionJSON);
      setPushEnabled(true);
      addToast('Notifications push activées', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setEnablingPush(false);
    }
  }

  async function handleChangePassword() {
    setSavingPassword(true);
    try {
      await settingsApi.changePassword({ currentPassword, newPassword });
      addToast('Mot de passe modifié', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  // ── Loading skeleton ──
  if (!user) {
    return (
      <div className="px-4 pt-6 pb-24 space-y-4">
        <Skeleton className="h-7 w-40 mb-6" />
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-10 w-full mb-3" />
            <Skeleton className="h-10 w-full mb-3" />
            <Skeleton className="h-10 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 space-y-4">
      <ToastContainer toasts={toasts} />

      <h1 className="text-2xl font-bold text-label">Réglages</h1>

      {/* ── Section 1: Profil ── */}
      <Card>
        <h2 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Profil</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Email</label>
            <input
              type="text"
              value={email}
              readOnly
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Taille (cm)</label>
            <input
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className={inputClass}
              min={0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Poids objectif (kg)</label>
            <input
              type="number"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              className={inputClass}
              min={0}
              step="0.1"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
            {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </Card>

      {/* ── Section 2: Objectifs nutritionnels ── */}
      <Card>
        <h2 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Objectifs nutritionnels</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Calories</label>
            <input
              type="number"
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(e.target.value)}
              className={inputClass}
              min={0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Protéines %</label>
            <input
              type="number"
              value={proteinGoalPct}
              onChange={(e) => setProteinGoalPct(e.target.value)}
              className={inputClass}
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Glucides %</label>
            <input
              type="number"
              value={carbsGoalPct}
              onChange={(e) => setCarbsGoalPct(e.target.value)}
              className={inputClass}
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Lipides %</label>
            <input
              type="number"
              value={fatGoalPct}
              onChange={(e) => setFatGoalPct(e.target.value)}
              className={inputClass}
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Eau (ml)</label>
            <input
              type="number"
              value={waterGoalMl}
              onChange={(e) => setWaterGoalMl(e.target.value)}
              className={inputClass}
              min={0}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Jour de pesée</label>
            <select
              value={weighDay}
              onChange={(e) => setWeighDay(Number(e.target.value))}
              className={inputClass}
            >
              {[
                { value: 0, label: 'Dimanche' },
                { value: 1, label: 'Lundi' },
                { value: 2, label: 'Mardi' },
                { value: 3, label: 'Mercredi' },
                { value: 4, label: 'Jeudi' },
                { value: 5, label: 'Vendredi' },
                { value: 6, label: 'Samedi' },
              ].map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={handleSaveGoals} disabled={savingGoals} className="w-full">
            {savingGoals ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </Card>

      {/* ── Section 3: Notifications ── */}
      <Card>
        <h2 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Notifications</h2>
        <div className="space-y-5">
          {/* Water reminders */}
          <div className="space-y-2">
            <Toggle
              checked={waterReminderEnabled}
              onChange={setWaterReminderEnabled}
              label="Rappels eau"
            />
            {waterReminderEnabled && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>
                  Intervalle (minutes)
                </label>
                <input
                  type="number"
                  value={waterReminderIntervalMinutes}
                  onChange={(e) => setWaterReminderIntervalMinutes(e.target.value)}
                  className={inputClass}
                  min={1}
                />
              </div>
            )}
          </div>

          <div className="h-px bg-surface2" />

          {/* Photo reminders */}
          <div className="space-y-2">
            <Toggle
              checked={photoReminderEnabled}
              onChange={setPhotoReminderEnabled}
              label="Rappels photos"
            />
            {photoReminderEnabled && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>
                  Intervalle (jours)
                </label>
                <input
                  type="number"
                  value={photoReminderIntervalDays}
                  onChange={(e) => setPhotoReminderIntervalDays(e.target.value)}
                  className={inputClass}
                  min={1}
                />
              </div>
            )}
          </div>

          <div className="h-px bg-surface2" />

          {/* Event reminders */}
          <div className="space-y-2">
            <Toggle
              checked={eventReminderEnabled}
              onChange={setEventReminderEnabled}
              label="Rappels événements"
            />
            {eventReminderEnabled && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>
                  Minutes avant
                </label>
                <input
                  type="number"
                  value={eventReminderMinutesBefore}
                  onChange={(e) => setEventReminderMinutesBefore(e.target.value)}
                  className={inputClass}
                  min={0}
                />
              </div>
            )}
          </div>

          {/* Enable push button */}
          {'serviceWorker' in navigator && !pushEnabled && (
            <>
              <div className="h-px bg-surface2" />
              <Button
                variant="secondary"
                onClick={handleEnablePush}
                disabled={enablingPush}
                className="w-full"
              >
                {enablingPush ? 'Activation…' : 'Activer les notifications'}
              </Button>
            </>
          )}
        </div>

        <div className="mt-4">
          <Button onClick={handleSaveNotifications} disabled={savingNotifications} className="w-full">
            {savingNotifications ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </Card>

      {/* ── Section 4: Sécurité ── */}
      <Card>
        <h2 className="text-sm font-bold text-accent uppercase tracking-widest mb-4">Sécurité</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Mot de passe actuel</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1" style={{ color: '#888' }}>Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="mt-4">
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
            className="w-full"
          >
            {savingPassword ? 'Modification…' : 'Changer le mot de passe'}
          </Button>
        </div>
      </Card>

      {/* ── Logout ── */}
      <Button
        variant="ghost"
        onClick={logout}
        className="w-full text-danger! hover:text-danger!"
      >
        Se déconnecter
      </Button>
    </div>
  );
}
