import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean; // positive means good for finances (e.g. higher savings or lower expenses)
    label: string;
  };
  glowColor?: 'emerald' | 'cyan' | 'amber' | 'rose';
  badge?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  glowColor = 'emerald',
  badge,
  onClick,
}) => {
  const glowClasses = {
    emerald: 'border-brand-500/20 hover:border-brand-500/40 hover:shadow-glow-emerald',
    cyan: 'border-cyanBrand-500/20 hover:border-cyanBrand-500/40 hover:shadow-glow-cyan',
    amber: 'border-amber-500/20 hover:border-amber-500/40 hover:shadow-glow-amber',
    rose: 'border-rose-500/20 hover:border-rose-500/40 hover:shadow-glow-rose',
  };

  const iconBgClasses = {
    emerald: 'bg-brand-500/10 text-brand-400 border border-brand-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  };

  return (
    <div
      onClick={onClick}
      className={`glass-card p-5 rounded-2xl transition-all duration-300 ${glowClasses[glowColor]} ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {title}
            </span>
            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                {badge}
              </span>
            )}
          </div>
          <div className="text-2xl lg:text-3xl font-bold text-white mt-1.5 tracking-tight font-sans">
            {value}
          </div>
        </div>

        <div className={`p-3 rounded-xl ${iconBgClasses[glowColor]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 flex items-center justify-between text-xs pt-3 border-t border-white/5">
          {subtitle && <span className="text-slate-400 font-medium">{subtitle}</span>}

          {trend && (
            <div
              className={`flex items-center gap-1 font-semibold ${
                trend.isPositive ? 'text-brand-400' : 'text-rose-400'
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.value}</span>
              <span className="text-slate-500 font-normal">{trend.label}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
