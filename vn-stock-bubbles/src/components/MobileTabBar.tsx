import type { ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { MobileView } from '../store/useAppStore';

const TABS: { key: MobileView; label: string; icon: ReactNode }[] = [
  {
    key: 'chart',
    label: 'Bubbles',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="10" r="5" />
        <circle cx="17" cy="7" r="3" />
        <circle cx="16" cy="17" r="4" />
      </svg>
    ),
  },
  {
    key: 'table',
    label: 'Bảng',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    ),
  },
];

export function MobileTabBar() {
  const mobileView = useAppStore(s => s.mobileView);
  const setMobileView = useAppStore(s => s.setMobileView);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-white/10 bg-[#1e1e1e]/95 backdrop-blur-md">
      {TABS.map(tab => {
        const isActive = mobileView === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMobileView(tab.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#22ec6c]' : 'text-white/40'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
