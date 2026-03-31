export interface ToastItem { id: number; message: string; type: 'success' | 'error' | 'info'; }

interface ToastContainerProps { toasts: ToastItem[]; }

export function ToastContainer({ toasts }: ToastContainerProps) {
  const colors: Record<ToastItem['type'], string> = {
    success: 'bg-accent',
    error: 'bg-danger',
    info: 'bg-blue',
  };
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div key={t.id} className={`${colors[t.type]} text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
