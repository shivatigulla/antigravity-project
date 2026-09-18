import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Sliders,
  Target,
  Users,
  Percent,
  TrendingDown,
  History,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import { api } from '../lib/api';
import { AIFinancialReportView } from '../components/AIFinancialReportView';
import type { AIFinancialReport, Category } from '@shared/schema';

const FINANCIAL_GOALS = [
  'Emergency Fund Build',
  'Subscription Pruning',
  'Debt Reduction & Payoff',
  'Home Down Payment Savings',
  'Retirement & Wealth Growth',
  'Discretionary Dining Reduction',
];

export const AIAdvisorPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Queries
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => api.getProfile(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const { data: reports = [], isLoading: isReportsLoading } = useQuery({
    queryKey: ['aiReports'],
    queryFn: () => api.getAIReports(),
  });

  // Local config parameters
  const [familySize, setFamilySize] = useState<number>(profile?.family_size || 3);
  const [savingsTarget, setSavingsTarget] = useState<number>(profile?.savings_target_pct || 25);
  const [primaryGoal, setPrimaryGoal] = useState<string>(
    profile?.primary_goal || 'Emergency Fund Build & Subscription Pruning'
  );
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Sync profile when loaded
  React.useEffect(() => {
    if (profile) {
      setFamilySize(profile.family_size || 3);
      setSavingsTarget(profile.savings_target_pct || 25);
      setPrimaryGoal(profile.primary_goal || 'Emergency Fund Build & Subscription Pruning');
    }
  }, [profile]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });

  const auditMutation = useMutation({
    mutationFn: async () => {
      // Save user parameters first
      await updateProfileMutation.mutateAsync({
        family_size: familySize,
        savings_target_pct: savingsTarget,
        primary_goal: primaryGoal,
      });
      // Run AI audit
      return api.auditFinances();
    },
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['aiReports'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setSelectedReportId(newReport.id);
    },
  });

  const applyBudgetMutation = useMutation({
    mutationFn: async ({ catName, limit }: { catName: string; limit: number }) => {
      const match = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (match) {
        return api.updateBudget(match.id, limit);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const handleApplyBudget = async (catName: string, limit: number) => {
    await applyBudgetMutation.mutateAsync({ catName, limit });
  };

  const currency = profile?.currency || 'USD';
  const activeReport = selectedReportId
    ? reports.find((r) => r.id === selectedReportId) || reports[0]
    : reports[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Powered by @google/genai (Gemini 2.5 Flash)
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            AI Household Financial Auditor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit raw expense entries, eliminate recurring subscription bloat, and generate targeted budget limits
          </p>
        </div>

        {/* Audit Trigger Button */}
        <button
          id="run-ai-audit-btn"
          onClick={() => auditMutation.mutate()}
          disabled={auditMutation.isPending}
          className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-brand-500 to-emerald-400 hover:from-cyan-400 hover:to-brand-400 text-white font-bold text-sm shadow-glow-cyan transition-all disabled:opacity-50 self-start sm:self-auto hover:scale-105 active:scale-95"
        >
          {auditMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Auditing Expenses with Gemini...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Audit Monthly Household Spending</span>
            </>
          )}
        </button>
      </div>

      {/* Advisory Parameters Config Card */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyanBrand-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Advisory Parameters & Household Targets
            </h3>
          </div>
          <span className="text-xs text-slate-500">Fine-tune AI recommendation context</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          {/* Family Size */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" /> Family Size
              </span>
              <span className="text-white font-bold">{familySize} members</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={familySize}
              onChange={(e) => setFamilySize(Number(e.target.value))}
              className="w-full h-2 bg-dark-750 rounded-lg appearance-none cursor-pointer accent-cyanBrand-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Single (1)</span>
              <span>Average (3-4)</span>
              <span>Large (8+)</span>
            </div>
          </div>

          {/* Target Monthly Savings (%) */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-slate-400" /> Target Monthly Savings
              </span>
              <span className="text-brand-400 font-bold">{savingsTarget}% of income</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={savingsTarget}
              onChange={(e) => setSavingsTarget(Number(e.target.value))}
              className="w-full h-2 bg-dark-750 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Modest (10%)</span>
              <span>Balanced (25%)</span>
              <span>Aggressive (50%+)</span>
            </div>
          </div>

          {/* Primary Financial Goal */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" /> Primary Financial Goal
            </label>
            <select
              value={primaryGoal}
              onChange={(e) => setPrimaryGoal(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-cyanBrand-500"
            >
              {FINANCIAL_GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Audit Display or Empty State */}
      {auditMutation.isPending ? (
        <div className="glass-card p-12 rounded-3xl border border-cyan-500/30 text-center space-y-4 shadow-glow-cyan animate-pulse">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Gemini 2.5 Flash is Analyzing Household Records...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Cross-referencing category limits, checking utility patterns, inspecting recurring streaming contracts, and calculating a calibrated financial health score.
          </p>
        </div>
      ) : activeReport ? (
        <div className="space-y-6">
          <AIFinancialReportView
            report={activeReport.report_payload}
            generatedAt={activeReport.generated_at}
            currency={currency}
            onApplyBudgetAdjustment={handleApplyBudget}
          />
        </div>
      ) : (
        <div className="glass-card p-12 rounded-3xl border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            No Household Audits Run Yet
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click "Audit Monthly Household Spending" above to prompt Gemini 2.5 Flash to inspect your recent expenses and deliver actionable cost-reduction strategies.
          </p>
          <button
            onClick={() => auditMutation.mutate()}
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-xs shadow-glow-emerald"
          >
            Run Audit Now
          </button>
        </div>
      )}

      {/* Historical Reports Archive */}
      {reports.length > 1 && (
        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Previous AI Advisory Audits Archive ({reports.length})</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.map((r) => {
              const isCurrent = activeReport?.id === r.id;
              const payload = r.report_payload;

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedReportId(r.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-cyan-500/10 border-cyan-500/40 shadow-glow-cyan'
                      : 'bg-dark-850/80 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">
                      Score: {payload.healthScore}/100
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(r.generated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {r.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
