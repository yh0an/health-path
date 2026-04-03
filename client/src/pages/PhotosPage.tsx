import { useState, useEffect, useCallback } from 'react';
import { PhotoEvolutionView } from '../components/PhotoEvolutionView';
import { photosApi } from '../services/api';
import type { ProgressPhoto } from '../services/api';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

type Category = 'FRONT' | 'SIDE' | 'BACK';

const CATEGORY_LABELS: Record<Category, string> = {
  FRONT: 'Face',
  SIDE: 'Profil',
  BACK: 'Dos',
};

const TABS: { label: string; value: Category | undefined }[] = [
  { label: 'Toutes', value: undefined },
  { label: 'Face', value: 'FRONT' },
  { label: 'Profil', value: 'SIDE' },
  { label: 'Dos', value: 'BACK' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR');
}


export function PhotosPage() {
  const [activeCategory, setActiveCategory] = useState<Category | undefined>(undefined);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mode, setMode] = useState<'gallery' | 'evolution'>('gallery');
  const { toasts, addToast } = useToast();

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await photosApi.getPhotos(mode === 'gallery' ? activeCategory : undefined);
      setPhotos(data);
    } catch {
      addToast('Erreur lors du chargement des photos', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, mode]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  function handleTabClick(value: Category | undefined) {
    setActiveCategory(value);
  }

  async function handleDelete() {
    if (!selectedPhoto) return;
    setDeleting(true);
    try {
      await photosApi.delete(selectedPhoto.id);
      setSelectedPhoto(null);
      await fetchPhotos();
      addToast('Photo supprimée', 'success');
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="pt-6 pb-28 px-4">
      <ToastContainer toasts={toasts} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-label">Photos</h1>
        <div className="flex bg-surface rounded-full p-0.5 gap-0.5">
          <button
            onClick={() => setMode('gallery')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              mode === 'gallery' ? 'bg-white text-label shadow-sm' : 'text-secondary'
            }`}
          >
            Galerie
          </button>
          <button
            onClick={() => setMode('evolution')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              mode === 'evolution' ? 'bg-white text-label shadow-sm' : 'text-secondary'
            }`}
          >
            Évolution
          </button>
        </div>
      </div>

      {mode === 'gallery' ? (
        <>
          {/* Category filter tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            {TABS.map((tab) => {
              const isActive = activeCategory === tab.value;
              return (
                <button
                  key={tab.label}
                  onClick={() => handleTabClick(tab.value)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-b-2 border-accent text-accent'
                      : 'text-secondary'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Photo grid */}
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: 13 }}>Aucune photo</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  className="aspect-square rounded-lg overflow-hidden focus:outline-none"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photosApi.getImageUrl(photo.imagePath)}
                    alt={CATEGORY_LABELS[photo.category]}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <PhotoEvolutionView photos={photos} />
      )}

      {/* Detail modal */}
      {selectedPhoto && (
        <Modal
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          title={CATEGORY_LABELS[selectedPhoto.category]}
        >
          <div className="space-y-4">
            <img
              src={photosApi.getImageUrl(selectedPhoto.imagePath)}
              alt={CATEGORY_LABELS[selectedPhoto.category]}
              className="w-full rounded-lg object-contain max-h-80"
            />
            <div className="space-y-1">
              <p className="text-sm text-secondary">
                {formatDate(selectedPhoto.date)} · {CATEGORY_LABELS[selectedPhoto.category]}
              </p>
              {selectedPhoto.notes && (
                <p className="text-sm text-label">{selectedPhoto.notes}</p>
              )}
            </div>
            <Button
              variant="danger"
              className="w-full"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
