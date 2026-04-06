// client/src/components/ObjectivesBar.tsx
import { MiniRing } from './MiniRing';

interface ObjectivesBarProps {
  waterMl: number;
  waterGoalMl: number;
  caloriesKcal: number;
  calorieGoal: number;
  showWeighRing: boolean;
  weighed: boolean;
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinGoalPct: number;
  carbsGoalPct: number;
  fatGoalPct: number;
}

export function ObjectivesBar({
  waterMl,
  waterGoalMl,
  caloriesKcal,
  calorieGoal,
  showWeighRing,
  weighed,
  proteinG,
  carbsG,
  fatG,
  proteinGoalPct,
  carbsGoalPct,
  fatGoalPct,
}: ObjectivesBarProps) {
  const proteinGoalG = Math.round((calorieGoal * proteinGoalPct) / 100 / 4);
  const carbsGoalG = Math.round((calorieGoal * carbsGoalPct) / 100 / 4);
  const fatGoalG = Math.round((calorieGoal * fatGoalPct) / 100 / 9);

  const macros = [
    { label: 'Protéines', value: proteinG, goal: proteinGoalG, color: '#4ade80' },
    { label: 'Glucides',  value: carbsG,   goal: carbsGoalG,   color: '#f59e0b' },
    { label: 'Lipides',   value: fatG,     goal: fatGoalG,     color: '#f87171' },
  ];
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: '#0a0a0a',
        padding: '8px 16px 10px',
        borderBottom: '1px solid #1e1e1e',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#111',
          borderRadius: 18,
          padding: '12px 20px',
          alignItems: 'center',
          justifyContent: showWeighRing ? 'space-around' : 'space-evenly',
          border: '1px solid #222',
        }}
      >
        <MiniRing
          value={waterMl}
          max={waterGoalMl}
          color="#0ea5e9"
          label="Eau"
        />
        <div style={{ width: 1, height: 32, background: '#222' }} />
        <MiniRing
          value={caloriesKcal}
          max={calorieGoal}
          color="#d4a843"
          label="Calories"
        />
        {showWeighRing && (
          <>
            <div style={{ width: 1, height: 32, background: '#222' }} />
            <MiniRing
              value={weighed ? 1 : 0}
              max={1}
              color="#4ade80"
              label="Pesée"
              displayText={weighed ? '✓' : '!'}
            />
          </>
        )}
      </div>

      {/* Macros row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {macros.map(({ label, value, goal, color }) => {
          const pct = goal > 0 ? Math.min(1, value / goal) : 0;
          return (
            <div key={label} style={{ flex: 1, background: '#111', borderRadius: 12, padding: '7px 10px', border: '1px solid #1e1e1e' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <span style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color }}>{value}g</span>
              </div>
              <div style={{ height: 3, background: '#252525', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3, boxShadow: pct > 0 ? `0 0 6px ${color}66` : 'none' }} />
              </div>
              <div style={{ fontSize: 9, color: '#383838', marginTop: 3, textAlign: 'right' }}>/ {goal}g</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
