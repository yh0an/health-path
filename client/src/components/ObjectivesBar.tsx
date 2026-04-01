// client/src/components/ObjectivesBar.tsx
import { MiniRing } from './MiniRing';

interface ObjectivesBarProps {
  waterMl: number;
  waterGoalMl: number;
  caloriesKcal: number;
  calorieGoal: number;
  showWeighRing: boolean;
  weighed: boolean;
}

export function ObjectivesBar({
  waterMl,
  waterGoalMl,
  caloriesKcal,
  calorieGoal,
  showWeighRing,
  weighed,
}: ObjectivesBarProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: '#0a0a0a',
        padding: '8px 16px 10px',
        borderBottom: '1px solid #141414',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: '#111',
          borderRadius: 16,
          padding: '10px 16px',
          alignItems: 'center',
          justifyContent: showWeighRing ? 'space-around' : 'space-evenly',
          border: '1px solid #1a1a1a',
        }}
      >
        <MiniRing
          value={waterMl}
          max={waterGoalMl}
          color="#0ea5e9"
          label="Eau"
        />
        <div style={{ width: 1, height: 28, background: '#1e1e1e' }} />
        <MiniRing
          value={caloriesKcal}
          max={calorieGoal}
          color="#d4a843"
          label="Calories"
        />
        {showWeighRing && (
          <>
            <div style={{ width: 1, height: 28, background: '#1e1e1e' }} />
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
    </div>
  );
}
