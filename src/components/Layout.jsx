import React from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-transparent md:pl-[220px]">
      <TopBar />
      <Sidebar />
      <main key={location.pathname} className="animate-fade-in pt-[72px] pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-8 px-4 md:px-8 max-w-[900px] mx-auto min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
