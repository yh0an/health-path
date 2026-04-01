// client/src/components/FAB.tsx
interface FABProps {
  onClick: () => void;
}

export function FAB({ onClick }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Ajouter une entrée"
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
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
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onPointerDown={e => (e.currentTarget.style.transform = 'translateX(-50%) scale(0.94)')}
      onPointerUp={e => (e.currentTarget.style.transform = 'translateX(-50%) scale(1)')}
    >
      +
    </button>
  );
}
