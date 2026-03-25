import React from 'react';
import { NavLink } from 'react-router-dom';
import { PenLine, BarChart2, Clock, LogOut, CalendarSearch, FileText } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Sidebar() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { to: '/', icon: PenLine, label: 'Main' },
    { to: '/summary', icon: BarChart2, label: 'Summary' },
    { to: '/history', icon: Clock, label: 'History' },
    { to: '/range-search', icon: CalendarSearch, label: 'Range Search' },
  ];

  return (
    <div className="hidden md:flex flex-col w-[220px] bg-navyMid h-screen fixed top-0 left-0 z-40">
      <div className="p-6 flex items-center space-x-3">
        <img src="/amuki-logo.png" alt="AMUKI" className="w-9 h-9 rounded-lg" />
        <h1 className="text-white font-bold text-[22px] leading-none">AMUKI</h1>
      </div>
      
      <nav className="flex-1 px-3 mt-4 flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 h-12 px-3 rounded-[10px] transition-colors ${
                isActive
                  ? 'bg-white text-royal font-bold'
                  : 'text-white/70 hover:bg-white/10'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-royal' : 'text-white'}`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mb-4">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 h-12 px-3 w-full rounded-[10px] text-white/70 hover:text-give hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
