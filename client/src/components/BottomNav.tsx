// client/src/components/BottomNav.tsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/',         label: 'Aujourd\'hui', icon: TodayIcon },
  { to: '/trends',   label: 'Tendances',    icon: TrendsIcon },
  { to: '/settings', label: 'Réglages',     icon: SettingsIcon },
];

function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="16" height="16" rx="3" stroke={active ? '#d4a843' : '#444'} strokeWidth="1.8"/>
      <circle cx="11" cy="11" r="3" fill={active ? '#d4a843' : '#444'}/>
    </svg>
  );
}

function TrendsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <polyline points="3,17 8,10 13,13 19,5" stroke={active ? '#d4a843' : '#444'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="3" stroke={active ? '#d4a843' : '#444'} strokeWidth="1.8"/>
      <path d="M11 2v2M11 18v2M2 11h2M18 11h2M4.9 4.9l1.4 1.4M15.7 15.7l1.4 1.4M4.9 17.1l1.4-1.4M15.7 6.3l1.4-1.4" stroke={active ? '#d4a843' : '#444'} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg border-t border-surface safe-bottom z-40" style={{ height: 64 }}>
      <div className="flex h-16 w-full max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className="flex-1 flex flex-col items-center justify-center gap-1"
          >
            {({ isActive }) => (
              <>
                <tab.icon active={isActive} />
                <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: isActive ? '#d4a843' : '#444' }}>
                  {tab.label}
                </span>
                {isActive && <div className="w-1 h-1 rounded-full bg-accent" />}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
