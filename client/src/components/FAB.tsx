// client/src/components/FAB.tsx
import { motion } from 'motion/react';

interface FABProps {
  onClick: () => void;
}

export function FAB({ onClick }: FABProps) {
  return (
    <motion.button
      onClick={onClick}
      aria-label="Ajouter une entrée"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', damping: 18, stiffness: 400 }}
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        x: '-50%',
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: '#d4a843',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        fontWeight: 300,
        color: '#000',
        boxShadow: '0 8px 30px rgba(212,168,67,0.45)',
        cursor: 'pointer',
        zIndex: 30,
        lineHeight: 1,
      }}
    >
      +
    </motion.button>
  );
}
