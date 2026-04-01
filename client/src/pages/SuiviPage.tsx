import { useState } from 'react';
import { WeightPage } from './WeightPage';
import { PhotosPage } from './PhotosPage';

const tabs = [
  { id: 'weight', label: '⚖️ Poids' },
  { id: 'photos', label: '📷 Photos' },
] as const;

type Tab = typeof tabs[number]['id'];

export function SuiviPage() {
  const [active, setActive] = useState<Tab>('weight');

  return (
    <div>
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
      {active === 'weight' ? <WeightPage /> : <PhotosPage />}
    </div>
  );
}
