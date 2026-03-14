import React from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function TopBar() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-[60px] bg-white/40 backdrop-blur-xl border-b border-white/50 z-50 md:left-[220px] transition-all duration-300">
      <div className="h-full px-4 flex items-center justify-between">
        
        <div className="flex items-center space-x-2 md:hidden">
          <img src="/amuki-logo.png" alt="AMUKI" className="w-8 h-8 rounded-lg" />
          <span className="text-royal font-bold text-[20px]">AMUKI</span>
        </div>
        
        {/* Empty placeholder to keep flex-between spacing valid on desktop */}
        <span className="hidden md:block"></span>
        
        <div className="flex items-center space-x-3 ml-auto">
          <button 
            onClick={handleLogout} 
            className="p-2 md:hidden text-muted hover:text-navyDark transition-colors"
            title="Log out"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>

      </div>
    </div>
  );
}
