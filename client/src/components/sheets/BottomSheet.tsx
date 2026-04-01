// client/src/components/sheets/BottomSheet.tsx
import type { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 64,
          left: 0,
          right: 0,
          maxWidth: 512,
          margin: '0 auto',
          background: '#111',
          borderRadius: '24px 24px 0 0',
          borderTop: '1px solid #1e1e1e',
          paddingTop: 12,
        }}
      >
        <div style={{ width: 36, height: 3, background: '#2a2a2a', borderRadius: 99, margin: '0 auto 16px' }} />
        {children}
      </div>
    </div>
  );
}
