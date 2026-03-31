import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { nutritionApi } from '../services/api';
import type { Meal } from '../services/api';
import { Skeleton } from '../components/Skeleton';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Petit-déj',
  LUNCH: 'Déjeuner',
  DINNER: 'Dîner',
  SNACK: 'Collation',
};

const MEAL_COLORS: Record<MealType, string> = {
  BREAKFAST: '#FF9500',
  LUNCH: '#34C759',
  DINNER: '#007AFF',
  SNACK: '#86868B',
};

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function NutritionPage() {
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mealType, setMealType] = useState<MealType>('BREAKFAST');
  const [formDate, setFormDate] = useState(todayIso());
  const [formTime, setFormTime] = useState(currentTime());
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, addToast } = useToast();

  async function fetchMeals(date: string) {
    setLoading(true);
    try {
      const data = await nutritionApi.getMeals(date);
      setMeals(data);
    } catch {
      addToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMeals(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  function openModal() {
    setModalOpen(true);
    setMealType('BREAKFAST');
    setFormDate(selectedDate);
    setFormTime(currentTime());
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
  }

  function closeModal() {
    setModalOpen(false);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit() {
    if (!imageFile) { addToast('Veuillez sélectionner une photo', 'error'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('mealType', mealType);
      formData.append('date', formDate);
      if (formTime) formData.append('time', formTime);
      if (description.trim()) formData.append('description', description.trim());
      await nutritionApi.upload(formData);
      await fetchMeals(selectedDate);
      addToast('Repas enregistré', 'success');
      closeModal();
    } catch {
      addToast("Erreur lors de l'enregistrement", 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(meal: Meal) {
    try {
      await nutritionApi.delete(meal.id);
      await fetchMeals(selectedDate);
      addToast('Repas supprimé', 'success');
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    }
  }

  const mealsByType = MEAL_TYPES.reduce<Record<MealType, Meal[]>>((acc, type) => {
    acc[type] = meals.filter((m) => m.mealType === type);
    return acc;
  }, { BREAKFAST: [], LUNCH: [], DINNER: [], SNACK: [] });

  const hasAnyMeal = meals.length > 0;

  return (
    <div className="min-h-screen bg-surface pb-28">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="px-4 pt-6 pb-4 bg-white shadow-card">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-label">Mon carnet</h1>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm text-secondary border border-gray-200 rounded-xl px-3 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-card shadow-card p-4 space-y-3">
                <Skeleton className="h-5 w-24" />
                <div className="flex gap-3">
                  <Skeleton className="h-20 w-20 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyMeal ? (
          <div className="flex flex-col items-center justify-center py-20 text-secondary">
            <span className="text-5xl mb-4">🍽️</span>
            <p className="text-base font-medium">Aucun repas enregistré ce jour</p>
            <p className="text-sm mt-1">Appuyez sur le bouton 📷 pour ajouter</p>
          </div>
        ) : (
          MEAL_TYPES.map((type) => {
            const typeMeals = mealsByType[type];
            if (typeMeals.length === 0) return null;
            const color = MEAL_COLORS[type];
            return (
              <div key={type} className="bg-white rounded-card shadow-card overflow-hidden">
                {/* Section header */}
                <div
                  className="px-4 py-2.5 flex items-center gap-2"
                  style={{ backgroundColor: color + '18' }}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold" style={{ color }}>{MEAL_LABELS[type]}</span>
                </div>

                {/* Meals */}
                <ul className="divide-y divide-gray-100">
                  {typeMeals.map((meal) => (
                    <li key={meal.id} className="flex items-center gap-3 px-4 py-3">
                      {/* Thumbnail */}
                      <img
                        src={meal.imageUrl}
                        alt="Repas"
                        className="w-20 h-20 rounded-xl object-cover shrink-0"
                      />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {meal.time && (
                          <p className="text-xs font-medium text-secondary mb-0.5">{meal.time}</p>
                        )}
                        {meal.description ? (
                          <p className="text-sm text-label line-clamp-2">{meal.description}</p>
                        ) : (
                          <p className="text-sm text-secondary italic">Sans description</p>
                        )}
                      </div>
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(meal)}
                        className="text-secondary hover:text-danger text-xl leading-none transition-colors shrink-0 p-1"
                        aria-label="Supprimer"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openModal}
        className="fixed bottom-20 right-4 w-14 h-14 bg-accent rounded-full shadow-lg flex items-center justify-center text-2xl z-30 active:scale-95 transition-transform"
        aria-label="Ajouter un repas"
      >
        📷
      </button>

      {/* Bottom sheet modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[90vh] overflow-y-auto z-10">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="px-4 pb-8 pt-2 space-y-4">
              <h2 className="text-lg font-bold text-label">Ajouter un repas</h2>

              {/* Meal type pills */}
              <div>
                <p className="text-xs text-secondary mb-2">Type de repas</p>
                <div className="flex gap-2 flex-wrap">
                  {MEAL_TYPES.map((type) => {
                    const color = MEAL_COLORS[type];
                    const active = mealType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setMealType(type)}
                        className="px-3 py-1.5 rounded-full text-sm font-medium transition-all border"
                        style={{
                          backgroundColor: active ? color : 'transparent',
                          borderColor: color,
                          color: active ? '#fff' : color,
                        }}
                      >
                        {MEAL_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-secondary mb-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary mb-1">Heure</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-secondary mb-1">Description (optionnel)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décris ton repas..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-xs text-secondary mb-2">Photo *</label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Aperçu"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => {
                        if (imagePreview) URL.revokeObjectURL(imagePreview);
                        setImageFile(null);
                        setImagePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-secondary hover:border-accent hover:text-accent transition-colors"
                  >
                    <span className="text-3xl">📷</span>
                    <span className="text-sm">Prendre une photo ou choisir</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !imageFile}
                className="w-full py-3.5 bg-accent text-white rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
              >
                {submitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
