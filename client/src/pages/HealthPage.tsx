import { useState } from 'react';
import { NutritionPage } from './NutritionPage';
import { WaterPage } from './WaterPage';

const tabs = [
  { id: 'nutrition', label: '🍽 Nutrition' },
  { id: 'water', label: '💧 Eau' },
] as const;

type Tab = typeof tabs[number]['id'];

export function HealthPage() {
  const [active, setActive] = useState<Tab>('nutrition');

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              active === tab.id
                ? 'border-b-2 border-accent text-accent'
                : 'text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'nutrition' ? <NutritionPage /> : <WaterPage />}
    </div>
  );
}
