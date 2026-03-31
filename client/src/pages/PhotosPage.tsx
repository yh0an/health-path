import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';
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
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toasts, addToast } = useToast();

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await photosApi.getPhotos(activeCategory);
      setPhotos(data);
    } catch {
      addToast('Erreur lors du chargement des photos', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  function handleTabClick(value: Category | undefined) {
    setActiveCategory(value);
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', activeCategory ?? 'FRONT');
    formData.append('date', new Date().toISOString().split('T')[0]);

    setUploading(true);
    try {
      await photosApi.upload(formData);
      await fetchPhotos();
      addToast('Photo ajoutée', 'success');
    } catch {
      addToast('Erreur lors de l\'upload', 'error');
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
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

      <h1 className="text-2xl font-bold text-label mb-4">Photos</h1>

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
        <div className="flex items-center justify-center h-48">
          <p className="text-secondary text-sm">Aucune photo</p>
        </div>
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload FAB */}
      <button
        onClick={handleUploadClick}
        disabled={uploading}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-blue text-white text-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        aria-label="Ajouter une photo"
      >
        {uploading ? (
          <span className="text-sm font-medium">...</span>
        ) : (
          '📷'
        )}
      </button>

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
