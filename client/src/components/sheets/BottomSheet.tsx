// client/src/components/sheets/BottomSheet.tsx
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.8 }}
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
              maxHeight: 'calc(100dvh - 96px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ width: 36, height: 3, background: '#2a2a2a', borderRadius: 99, margin: '0 auto 16px', flexShrink: 0 }} />
            <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
