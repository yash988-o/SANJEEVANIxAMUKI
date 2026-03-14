import React from 'react';
import { NavLink } from 'react-router-dom';
import { PenLine, BarChart2, Clock } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { to: '/', icon: PenLine, label: 'Main' },
    { to: '/summary', icon: BarChart2, label: 'Summary' },
    { to: '/history', icon: Clock, label: 'History' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-royal z-40 flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center h-full w-full relative ${
              isActive ? 'text-white' : 'text-white/55'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute top-0 left-1/4 right-1/4 h-[3px] bg-white rounded-b-md" />
              )}
              <item.icon className="w-6 h-6 mb-1" />
              <span className={`text-[11px] ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
