import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  CalendarClock,
  Sparkles,
  BarChart3,
  Settings,
  Menu,
  X,
  Wallet,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface SidebarNavProps {
  householdName?: string;
  monthlyIncome?: number;
  totalSpent?: number;
  currency?: string;
  onQuickAddExpense?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  householdName = 'Household Overview',
  monthlyIncome = 5800,
  totalSpent = 3120,
  currency = 'USD',
  onQuickAddExpense,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Expenses', path: '/expenses', icon: Receipt },
    { label: 'Budgets', path: '/budgets', icon: PieChart },
    { label: 'Bills & Subs', path: '/bills', icon: CalendarClock },
    {
      label: 'AI Advisor',
      path: '/ai-advisor',
      icon: Sparkles,
      highlight: true,
      badge: 'Gemini 2.5',
    },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const spentPct = monthlyIncome > 0 ? Math.min(100, Math.round((totalSpent / monthlyIncome) * 100)) : 0;

  const NavContent = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-3 py-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-cyanBrand-400 p-[1px] shadow-glow-emerald flex items-center justify-center">
            <div className="w-full h-full bg-dark-900 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-brand-400" />
            </div>
          </div>
          <div>
            <span className="font-bold tracking-tight text-white flex items-center gap-1.5 text-base">
              SmartAdvisor <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">AI</span>
            </span>
            <p className="text-xs text-slate-400 font-medium truncate max-w-[140px]">
              {householdName}
            </p>
          </div>
        </div>

        {/* Quick Action Button */}
        {onQuickAddExpense && (
          <div className="px-3 pt-4 pb-2">
            <button
              id="sidebar-quick-add-btn"
              onClick={() => {
                onQuickAddExpense();
                setMobileOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-glow-emerald transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-lg leading-none">+</span>
              <span>Log Transaction</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="mt-3 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                id={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? item.highlight
                      ? 'bg-gradient-to-r from-brand-500/20 to-cyanBrand-500/20 text-brand-300 border border-brand-500/30 shadow-glow-emerald'
                      : 'bg-white/10 text-white shadow-sm border border-white/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? item.highlight
                          ? 'text-cyanBrand-400'
                          : 'text-brand-400'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Household Financial Health Progress Widget */}
      <div className="p-3 border-t border-white/5">
        <div className="p-3 rounded-xl bg-dark-850 border border-white/5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Month Spending</span>
            <span className="text-white font-semibold">{spentPct}%</span>
          </div>
          <div className="w-full h-1.5 bg-dark-750 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                spentPct > 90 ? 'bg-rose-500' : spentPct > 75 ? 'bg-amber-500' : 'bg-brand-500'
              }`}
              style={{ width: `${spentPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>{formatCurrency(totalSpent, currency)}</span>
            <span className="text-slate-500">of {formatCurrency(monthlyIncome, currency)}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-400" /> RLS Secure
          </span>
          <span>v1.0 Pro</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Navbar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-dark-900/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-glow-emerald">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">SmartAdvisor</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-white/5 text-slate-300 hover:text-white"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm">
          <div className="w-72 h-full bg-dark-900 border-r border-white/10 p-2 shadow-2xl">
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-dark-900/95 backdrop-blur-xl border-r border-white/5 z-20">
        <NavContent />
      </aside>
    </>
  );
};
