import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  CheckCircle,
  Sliders,
  DollarSign,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';
import type { AIFinancialReportPayload } from '@shared/schema';
import { formatCurrency } from '../lib/utils';

interface AIFinancialReportViewProps {
  report: AIFinancialReportPayload;
  generatedAt?: string;
  currency?: string;
  onApplyBudgetAdjustment?: (categoryName: string, newLimit: number) => Promise<void>;
}

export const AIFinancialReportView: React.FC<AIFinancialReportViewProps> = ({
  report,
  generatedAt,
  currency = 'USD',
  onApplyBudgetAdjustment,
}) => {
  const [appliedCategories, setAppliedCategories] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const toggleStep = (idx: number) => {
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter((i) => i !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  const handleApply = async (catName: string, limit: number) => {
    if (onApplyBudgetAdjustment) {
      await onApplyBudgetAdjustment(catName, limit);
      setAppliedCategories([...appliedCategories, catName]);
    }
  };

  // Health Score status
  const score = report.healthScore || 70;
  let scoreColor = 'emerald';
  let scoreGrade = 'Excellent';
  let scoreBadgeClass = 'text-brand-400 bg-brand-500/10 border-brand-500/30';
  let ringColor = '#10B981';

  if (score < 50) {
    scoreColor = 'rose';
    scoreGrade = 'Critical Attention Needed';
    scoreBadgeClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    ringColor = '#F43F5E';
  } else if (score < 75) {
    scoreColor = 'amber';
    scoreGrade = 'Moderate Health';
    scoreBadgeClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    ringColor = '#F59E0B';
  }

  const totalPotentialMonthlySavings = report.identifiedLeakage.reduce(
    (sum, item) => sum + (item.estimatedMonthlySavings || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner: Score & Executive Summary */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 shadow-card-dark relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Health Score Circular Dial */}
          <div className="flex flex-col items-center justify-center text-center shrink-0">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke={ringColor}
                  strokeWidth="8"
                  strokeDasharray={`${(score / 100) * 264} 264`}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-white tracking-tight">{score}</span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">Score / 100</span>
              </div>
            </div>

            <span className={`mt-2 text-xs font-bold px-3 py-1 rounded-full border ${scoreBadgeClass}`}>
              {scoreGrade}
            </span>
          </div>

          {/* Executive Summary & Key Highlights */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Audited by Gemini 2.5 Flash
              </span>
              {generatedAt && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(generatedAt).toLocaleString()}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight">
              Executive Household Spending Audit
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              {report.executiveSummary}
            </p>

            {totalPotentialMonthlySavings > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold mt-1">
                <TrendingDown className="w-4 h-4 text-brand-400" />
                <span>
                  Identified Monthly Recoverable Leakage:{' '}
                  <strong className="text-white">{formatCurrency(totalPotentialMonthlySavings, currency)}/mo</strong>{' '}
                  ({formatCurrency(totalPotentialMonthlySavings * 12, currency)}/year)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Identified Leakage Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Identified Household Spending Leaks ({report.identifiedLeakage.length})</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.identifiedLeakage.map((leak, idx) => (
            <div
              key={idx}
              className="glass-card p-5 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                    {leak.category}
                  </span>
                  <span className="text-xs font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md border border-brand-500/20">
                    Save +{formatCurrency(leak.estimatedMonthlySavings, currency)}/mo
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-snug">
                  {leak.issue}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <span>Annual recovery potential:</span>
                <span className="text-white font-semibold">
                  {formatCurrency(leak.estimatedMonthlySavings * 12, currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Steps Checklist & Recommended Adjustments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actionable Steps */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-400" />
            <span>Actionable Implementation Roadmap</span>
          </h4>
          <p className="text-xs text-slate-400">
            Check off steps as your household implements these optimizations:
          </p>

          <div className="space-y-2.5 pt-2">
            {report.actionableSteps.map((step, idx) => {
              const isDone = completedSteps.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleStep(idx)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isDone
                      ? 'bg-brand-500/5 border-brand-500/30 text-slate-400 line-through'
                      : 'bg-dark-850/80 border-white/5 hover:border-white/15 text-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-dark-800 text-brand-500 focus:ring-brand-500 cursor-pointer"
                  />
                  <span className="text-xs leading-relaxed font-medium">{step}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommended Budget Adjustments */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyanBrand-400" />
            <span>Recommended Category Limits</span>
          </h4>
          <p className="text-xs text-slate-400">
            AI suggested budget thresholds tailored to your household goals:
          </p>

          <div className="space-y-2.5 pt-2">
            {report.budgetAdjustments.map((adj, idx) => {
              const isApplied = appliedCategories.includes(adj.category);
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-dark-850/80 border border-white/5 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {adj.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      Recommended Limit:{' '}
                      <strong className="text-cyanBrand-300">
                        {formatCurrency(adj.recommendedLimit, currency)}
                      </strong>
                    </span>
                  </div>

                  {onApplyBudgetAdjustment && (
                    <button
                      onClick={() => handleApply(adj.category, adj.recommendedLimit)}
                      disabled={isApplied}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isApplied
                          ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-cyanBrand-500/40'
                      }`}
                    >
                      {isApplied ? 'Applied ✓' : 'Apply Limit'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
