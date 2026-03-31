import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/weight', label: 'Poids', icon: '⚖️' },
  { to: '/nutrition', label: 'Nutrition', icon: '🍽' },
  { to: '/water', label: 'Eau', icon: '💧' },
  { to: '/calendar', label: 'Agenda', icon: '📅' },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-40"
      style={{ height: '64px' }}
    >
      <div className="flex h-16 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-200 ${
                isActive ? 'text-accent' : 'text-secondary'
              }`
            }
          >
            <span className="text-2xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
