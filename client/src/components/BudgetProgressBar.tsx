import React from 'react';
import { AlertTriangle, CheckCircle2, AlertOctagon, Edit3 } from 'lucide-react';
import { formatCurrency, getBudgetThresholdInfo } from '../lib/utils';

interface BudgetProgressBarProps {
  categoryName: string;
  colorCode?: string;
  spent: number;
  limit: number;
  currency?: string;
  onEditLimit?: () => void;
  compact?: boolean;
}

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({
  categoryName,
  colorCode = '#10B981',
  spent,
  limit,
  currency = 'USD',
  onEditLimit,
  compact = false,
}) => {
  const threshold = getBudgetThresholdInfo(spent, limit);
  const remaining = Math.max(0, limit - spent);
  const overspent = Math.max(0, spent - limit);
  const percentageDisplay = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const clampedWidth = Math.min(100, Math.max(0, percentageDisplay));

  // Determine bar fill color based on threshold alert
  let barGradient = 'from-brand-500 to-emerald-400';
  let glowStyle = 'shadow-glow-emerald';
  let alertBadge = null;

  if (threshold.status === 'breached') {
    barGradient = 'from-rose-600 to-rose-400';
    glowStyle = 'shadow-glow-rose';
    alertBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <AlertOctagon className="w-3 h-3" />
        Breached +{formatCurrency(overspent, currency)}
      </span>
    );
  } else if (threshold.status === 'warning') {
    barGradient = 'from-amber-500 to-yellow-400';
    glowStyle = 'shadow-glow-amber';
    alertBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <AlertTriangle className="w-3 h-3" />
        80%+ Warning
      </span>
    );
  } else {
    alertBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-400 border border-brand-500/30">
        <CheckCircle2 className="w-3 h-3" />
        Safe
      </span>
    );
  }

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colorCode }}
            />
            <span className="text-slate-300 font-medium truncate max-w-[120px]">{categoryName}</span>
          </div>
          <span className="font-semibold text-slate-200">
            {formatCurrency(spent, currency)} / <span className="text-slate-400">{formatCurrency(limit, currency)}</span>
          </span>
        </div>
        <div className="w-full h-2 bg-dark-750 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${barGradient} transition-all duration-500 rounded-full`}
            style={{ width: `${clampedWidth}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl bg-dark-850/80 border transition-all duration-200 ${
      threshold.status === 'breached'
        ? 'border-rose-500/30 hover:border-rose-500/50'
        : threshold.status === 'warning'
        ? 'border-amber-500/30 hover:border-amber-500/50'
        : 'border-white/5 hover:border-white/10'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-3.5 h-3.5 rounded-md shadow-sm"
            style={{ backgroundColor: colorCode }}
          />
          <h4 className="text-sm font-semibold text-white tracking-tight">{categoryName}</h4>
        </div>

        <div className="flex items-center gap-2">
          {alertBadge}
          {onEditLimit && (
            <button
              onClick={onEditLimit}
              title="Edit Budget Limit"
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2.5 bg-dark-750 rounded-full overflow-hidden mb-2.5">
        <div
          className={`h-full bg-gradient-to-r ${barGradient} transition-all duration-500 rounded-full ${
            threshold.status === 'breached' ? 'animate-pulse' : ''
          }`}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>

      {/* Numerical Details */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-white font-sans">
            {formatCurrency(spent, currency)}
          </span>
          <span className="text-slate-400 font-medium">
            of {formatCurrency(limit, currency)} limit
          </span>
        </div>

        <div className="text-right">
          <span className={`font-semibold ${
            threshold.status === 'breached'
              ? 'text-rose-400'
              : threshold.status === 'warning'
              ? 'text-amber-400'
              : 'text-brand-400'
          }`}>
            {percentageDisplay}%
          </span>
          <span className="text-slate-500 text-[11px] block">
            {threshold.status === 'breached'
              ? `Deficit: ${formatCurrency(overspent, currency)}`
              : `${formatCurrency(remaining, currency)} remaining`}
          </span>
        </div>
      </div>
    </div>
  );
};
