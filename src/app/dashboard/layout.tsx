'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [headerStatusText, setHeaderStatusText] = useState('Voice AI < 120ms | RAG Ready');
  const [headerDotColor, setHeaderDotColor] = useState('bg-emerald-400');

  const navItems = [
    { id: 'nav-overview', label: 'Overview', path: '/dashboard', icon: 'dashboard' },
    { id: 'nav-ai-agent', label: 'AI Agent & RAG', path: '/dashboard/ai-agent', icon: 'smart_toy' },
    { id: 'nav-customers', label: 'Leads & CRM', path: '/dashboard/leads', icon: 'groups' },
    { id: 'nav-pipelines', label: 'Sales Pipeline', path: '/dashboard/pipelines', icon: 'view_kanban' },
    { id: 'nav-chat', label: 'WhatsApp & Voice', path: '/dashboard/inbox', icon: 'chat' },
    { id: 'nav-broadcast', label: 'Broadcasting & Dialer', path: '/dashboard/broadcast', icon: 'campaign' },
    { id: 'nav-templates', label: 'Scripts & Templates', path: '/dashboard/templates', icon: 'dashboard_customize' },
    { id: 'nav-marketing', label: 'Campaign Engine', path: '/dashboard/marketing', icon: 'post_add' },
    { id: 'nav-preferences', label: 'System Settings', path: '/dashboard/settings', icon: 'settings' },
  ];

  const currentTabName = navItems.find((n) => pathname === n.path || (n.path !== '/dashboard' && pathname.startsWith(n.path)))?.label || 'Overview';

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/bot/status');
        const data = await res.json();
        if (data.success && data.status === 'connected') {
          setHeaderDotColor('bg-emerald-400');
          setHeaderStatusText(data.phoneNumber ? `WhatsApp Live (+${data.phoneNumber})` : 'Voice & WhatsApp AI Live');
        } else {
          setHeaderDotColor('bg-cyan-400');
          setHeaderStatusText('Voice AI < 120ms | RAG Ready');
        }
      } catch (e) {
        setHeaderDotColor('bg-purple-400');
        setHeaderStatusText('AI Workforce Standby');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen bg-[#fafafa] text-zinc-900 font-sans overflow-hidden relative selection:bg-zinc-900 selection:text-white">
      {/* Side Navigation Bar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-zinc-200 flex flex-col py-5 z-50 transition-all duration-300 shadow-sm ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {/* Top Logo Container */}
        <div className={`px-4 mb-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <Link href="/" className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-black text-xs tracking-tight shadow-sm hover:scale-105 transition-transform" title="Go to Home">
                MS
              </Link>
              <div>
                <Link href="/" className="group">
                  <h1 className="font-extrabold text-sm text-zinc-900 tracking-wide uppercase transition-opacity group-hover:opacity-80">
                    MOTIONSITES
                  </h1>
                  <p className="text-zinc-400 text-[10px] uppercase tracking-wider font-sans font-semibold">
                    AI Sales Platform
                  </p>
                </Link>
              </div>
            </div>
          ) : (
            <Link href="/" className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-white font-black text-xs shadow-sm hover:scale-105 transition-transform" title="MotionSites Home">
              MS
            </Link>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-3 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
            return (
              <Link
                key={item.id}
                id={item.id}
                href={item.path}
                title={collapsed ? item.label : ''}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group cursor-pointer ${
                  collapsed ? 'justify-center' : 'justify-start'
                } ${
                  isActive
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 font-medium'
                }`}
              >
                <span
                  className="material-symbols-outlined text-lg shrink-0"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="text-xs truncate tracking-tight font-sans">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Collapse Toggle */}
        <div className="px-3 pt-3 border-t border-zinc-200">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center gap-2 p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all text-xs font-medium cursor-pointer ${
              collapsed ? 'justify-center' : 'justify-start'
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-symbols-outlined text-lg">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
            {!collapsed && <span className="font-sans">Collapse Sidebar</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className={`h-screen flex-1 flex flex-col min-w-0 z-10 relative transition-all duration-300 ${collapsed ? 'ml-[72px]' : 'ml-[260px]'}`}>
        {/* Top Header Bar */}
        <header className="h-16 flex justify-between items-center px-6 bg-white border-b border-zinc-200 z-40 shrink-0 shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold block">Portal Workspace</span>
              <h2 className="text-sm font-extrabold text-zinc-900 tracking-tight flex items-center gap-2">
                <span>{currentTabName}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live AI Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 text-xs font-semibold text-emerald-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] tracking-tight font-medium">{headerStatusText}</span>
            </div>

            {/* Floating Logout Button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="px-3.5 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Inner Page Content */}
        <div className="flex-1 overflow-y-auto relative min-h-0 custom-scrollbar text-zinc-900 p-6 md:p-8 bg-[#fafafa]">
          {children}
        </div>
      </div>
    </div>
  );
}



