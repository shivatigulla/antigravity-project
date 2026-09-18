import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  PieChart,
  AlertTriangle,
  Sparkles,
  CalendarClock,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate, getBudgetThresholdInfo } from '../lib/utils';
import { MetricCard } from '../components/MetricCard';
import { BudgetProgressBar } from '../components/BudgetProgressBar';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import type { CreateTransactionInput, Transaction } from '@shared/schema';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Fetch summary data
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['analyticsSummary'],
    queryFn: () => api.getAnalyticsSummary(),
  });

  // Fetch recent transactions
  const { data: txData, isLoading: isTxLoading } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: () => api.getTransactions({ limit: 6, sort: 'transaction_date', order: 'DESC' }),
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  // Fetch latest AI report
  const { data: aiReports = [] } = useQuery({
    queryKey: ['aiReports'],
    queryFn: () => api.getAIReports(),
  });

  // Mutations
  const createTxMutation = useMutation({
    mutationFn: (data: CreateTransactionInput) => api.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const updateTxMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTransactionInput }) => api.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const deleteTxMutation = useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const toggleBillMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Pending' | 'Paid' | 'Overdue' }) =>
      api.updateBillStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
  });

  const handleTxSubmit = async (data: CreateTransactionInput) => {
    if (editingTx) {
      await updateTxMutation.mutateAsync({ id: editingTx.id, data });
    } else {
      await createTxMutation.mutateAsync(data);
    }
    setEditingTx(null);
  };

  const currency = summary?.currency || 'USD';
  const monthlyIncome = summary?.monthlyIncome || 5400;
  const totalExpenses = summary?.totalExpenses || 0;
  const netBalance = summary?.netBalance || 0;
  const savingsRate = summary?.savingsRatePct || 0;
  const targetSavings = summary?.targetSavingsPct || 25;
  const flagged = summary?.flaggedCategories || [];
  const upcomingBills = summary?.upcomingBills || [];
  const latestAudit = aiReports[0];

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {currentMonthName}
            </span>
            <span className="text-xs text-slate-500">• Live Household Accounting</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Financial Command Center
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/ai-advisor"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold text-xs border border-cyan-500/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Spending Audit</span>
          </Link>

          <button
            id="dashboard-log-tx-btn"
            onClick={() => {
              setEditingTx(null);
              setIsExpenseModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-glow-emerald transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Transaction</span>
          </button>
        </div>
      </div>

      {/* Threshold Alerts Banner (if any category exceeds 80%) */}
      {flagged.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-glow-amber">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                Threshold Alert: {flagged.length} Categor{flagged.length > 1 ? 'ies' : 'y'} Near or Over Budget Limit!
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                {flagged.map((f) => `${f.name} (${f.percentage}%)`).join(', ')}
              </p>
            </div>
          </div>
          <Link
            to="/budgets"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/30 self-start sm:self-auto shrink-0 transition-colors"
          >
            Adjust Limits →
          </Link>
        </div>
      )}

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Spending"
          value={formatCurrency(totalExpenses, currency)}
          subtitle={`${Math.round((totalExpenses / monthlyIncome) * 100)}% of monthly income`}
          icon={Wallet}
          glowColor={totalExpenses > monthlyIncome ? 'rose' : 'emerald'}
          trend={{
            value: `${Math.round((totalExpenses / monthlyIncome) * 100)}%`,
            isPositive: totalExpenses <= monthlyIncome,
            label: 'velocity',
          }}
        />

        <MetricCard
          title="Monthly Income"
          value={formatCurrency(monthlyIncome, currency)}
          subtitle="Household targeted cashflow"
          icon={TrendingUp}
          glowColor="cyan"
          badge="Verified"
        />

        <MetricCard
          title="Remaining Balance"
          value={formatCurrency(netBalance, currency)}
          subtitle={netBalance >= 0 ? 'Surplus available for saving' : 'Budget deficit this month'}
          icon={DollarSign}
          glowColor={netBalance >= 0 ? 'emerald' : 'rose'}
          badge={netBalance >= 0 ? 'Surplus' : 'Deficit'}
        />

        <MetricCard
          title="Household Savings Rate"
          value={`${savingsRate}%`}
          subtitle={`Target is ${targetSavings}% of total income`}
          icon={PieChart}
          glowColor={savingsRate >= targetSavings ? 'emerald' : 'amber'}
          trend={{
            value: `${savingsRate}%`,
            isPositive: savingsRate >= targetSavings,
            label: `(Target ${targetSavings}%)`,
          }}
        />
      </div>

      {/* Main Grid: Category Budget Highlights & AI Advisor Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Budget Overview (2 cols) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <PieChart className="w-4 h-4 text-brand-400" />
                <span>Active Category Budgets</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time envelope tracking against threshold limits
              </p>
            </div>
            <Link
              to="/budgets"
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>Manage Budgets</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {categories.slice(0, 6).map((cat) => (
              <BudgetProgressBar
                key={cat.id}
                categoryName={cat.name}
                colorCode={cat.color_code}
                spent={cat.current_month_spent || 0}
                limit={cat.budget_limit || 0}
                currency={currency}
              />
            ))}
          </div>
        </div>

        {/* AI Financial Advisor Quick Card (1 col) */}
        <div className="glass-card p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-4 relative overflow-hidden bg-gradient-to-br from-dark-900 via-dark-850 to-dark-900">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Gemini 2.5 Flash
              </span>
              {latestAudit && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  Score: {latestAudit.report_payload.healthScore}/100
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight">
              AI Household Spending Audit
            </h3>

            {latestAudit ? (
              <div className="space-y-2 text-xs text-slate-300">
                <p className="line-clamp-3 leading-relaxed">
                  {latestAudit.report_payload.executiveSummary}
                </p>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-[11px] font-semibold text-amber-400 block">
                    Top Leakage Found:
                  </span>
                  <p className="text-[11px] text-slate-300 line-clamp-2">
                    {latestAudit.report_payload.identifiedLeakage[0]?.issue || 'Review subscriptions'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Run an intelligent multi-category audit of your daily expenses, recurring subscriptions, and savings targets to uncover hidden financial leaks.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-white/10">
            <Link
              to="/ai-advisor"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-glow-cyan transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{latestAudit ? 'View Full Audit Report' : 'Run First Household Audit'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Transactions & Upcoming Recurring Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List (2 cols) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Recent Transactions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Latest logged expenses and income records
              </p>
            </div>
            <Link
              to="/expenses"
              className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              <span>View All Transactions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-white/5">
            {txData?.transactions && txData.transactions.length > 0 ? (
              txData.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-3 group hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tx.category_color || '#10B981' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{tx.title}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{formatDate(tx.transaction_date)}</span>
                        <span>•</span>
                        <span className="truncate">{tx.category_name || 'General'}</span>
                        <span>•</span>
                        <span>{tx.payment_method}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-bold font-sans ${
                        tx.transaction_type === 'Expense' ? 'text-white' : 'text-brand-400'
                      }`}
                    >
                      {tx.transaction_type === 'Expense' ? '-' : '+'}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No recent transactions. Click "Log Transaction" above to start!
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Recurring Bills (1 col) */}
        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-cyanBrand-400" />
                <span>Upcoming Bills</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Payment due reminders</p>
            </div>
            <Link
              to="/bills"
              className="text-xs font-semibold text-cyanBrand-400 hover:text-cyanBrand-300 flex items-center gap-1"
            >
              <span>All Bills</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {upcomingBills.length > 0 ? (
              upcomingBills.slice(0, 4).map((bill) => (
                <div
                  key={bill.id}
                  className="p-3 rounded-xl bg-dark-850 border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate block">
                        {bill.title}
                      </span>
                      {bill.auto_pay && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 font-semibold">
                          Auto
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Due {formatDate(bill.due_date)}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-white block">
                      {formatCurrency(bill.amount, currency)}
                    </span>
                    <button
                      onClick={() =>
                        toggleBillMutation.mutate({
                          id: bill.id,
                          status: bill.status === 'Paid' ? 'Pending' : 'Paid',
                        })
                      }
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 transition-colors ${
                        bill.status === 'Paid'
                          ? 'bg-brand-500/20 text-brand-400'
                          : 'bg-white/10 hover:bg-white/20 text-slate-300'
                      }`}
                    >
                      {bill.status === 'Paid' ? 'Paid ✓' : 'Mark Paid'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                All bills paid for this period!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingTx(null);
        }}
        onSubmit={handleTxSubmit}
        categories={categories}
        initialData={editingTx}
        currency={currency}
      />
    </div>
  );
};
