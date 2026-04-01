// client/src/components/MiniRing.tsx
interface MiniRingProps {
  value: number;   // current value
  max: number;     // target value
  size?: number;   // diameter in px, default 36
  color: string;   // stroke color
  label: string;
  displayText?: string; // override center text (e.g. "✓")
}

export function MiniRing({ value, max, size = 36, color, label, displayText }: MiniRingProps) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const offset = circumference * (1 - pct);
  const center = size / 2;
  const text = displayText ?? (pct >= 1 ? '✓' : `${Math.round(pct * 100)}%`);

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={center} cy={center} r={r} fill="none" stroke="#1e1e1e" strokeWidth="4" />
          <circle
            cx={center} cy={center} r={r}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{text}</span>
        </div>
      </div>
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#444' }}>{label}</span>
    </div>
  );
}
