interface CircularGaugeProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export function CircularGauge({
  value, max, size = 180, strokeWidth = 14,
  color = '#34C759', label, sublabel,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#F5F5F7" strokeWidth={strokeWidth} />
      <circle
        cx={center} cy={center} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={center} y={center - (sublabel ? 8 : 0)}
        textAnchor="middle" dominantBaseline="middle"
        fill="#1D1D1F" fontSize={size * 0.18} fontWeight="700"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${center}px ${center}px` }}
      >
        {label ?? `${Math.round(pct * 100)}%`}
      </text>
      {sublabel && (
        <text
          x={center} y={center + 18}
          textAnchor="middle"
          fill="#86868B" fontSize={size * 0.09}
          style={{ transform: `rotate(90deg)`, transformOrigin: `${center}px ${center}px` }}
        >
          {sublabel}
        </text>
      )}
    </svg>
  );
}
