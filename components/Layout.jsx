// components/Layout.jsx
import React, { useState } from 'react';
import Link from 'next/link';

export default function Layout({ children, userType = 'submissive' }) {
  const [activeView, setActiveView] = useState('dashboard');
  
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-black p-4 border-b border-purple-900">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-purple-500 font-bold text-2xl mr-2">RITUALWARE</div>
            <div className="text-xs bg-purple-900 px-2 py-1 rounded">BETA</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center">
            <span className="text-xs">MH</span>
          </div>
        </div>
      </header>
      
      {/* Sidebar and Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 p-4">
          <nav className="space-y-2">
            <Link href="/dashboard">
              <a className={`block px-4 py-2 rounded ${activeView === 'dashboard' ? 'bg-purple-800' : 'hover:bg-gray-700'}`}>
                Dashboard
              </a>
            </Link>
            <Link href="/rituals">
              <a className={`block px-4 py-2 rounded ${activeView === 'rituals' ? 'bg-purple-800' : 'hover:bg-gray-700'}`}>
                Rituals
              </a>
            </Link>
            <Link href="/contracts">
              <a className={`block px-4 py-2 rounded ${activeView === 'contracts' ? 'bg-purple-800' : 'hover:bg-gray-700'}`}>
                Contracts
              </a>
            </Link>
            <Link href="/trophies">
              <a className={`block px-4 py-2 rounded ${activeView === 'trophies' ? 'bg-purple-800' : 'hover:bg-gray-700'}`}>
                Trophies
              </a>
            </Link>
            <Link href="/tokens">
              <a className={`block px-4 py-2 rounded ${activeView === 'tokens' ? 'bg-purple-800' : 'hover:bg-gray-700'}`}>
                Tokens
              </a>
            </Link>
          </nav>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}