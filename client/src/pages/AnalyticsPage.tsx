import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  CreditCard,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../lib/api';
import { formatCurrency } from '../lib/utils';

export const AnalyticsPage: React.FC = () => {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['analyticsSummary'],
    queryFn: () => api.getAnalyticsSummary(),
  });

  const currency = summary?.currency || 'USD';
  const categoryData = summary?.categoryBreakdown || [];
  const monthlyTrends = summary?.monthlyTrends || [];
  const paymentMethods = summary?.paymentMethods || [];

  // Filter categories that have spending > 0 for pie chart
  const activePieCategories = categoryData.filter((c) => c.spent > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-dark-900 border border-white/15 rounded-xl shadow-2xl text-xs space-y-1">
          <p className="font-bold text-white mb-1">{label || payload[0]?.name}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold text-white font-sans">
                {formatCurrency(entry.value, currency)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Financial Intelligence
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
          Visual Analytics & Spending Patterns
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Interactive breakdowns of cash outflows, multi-month trends, and payment channel distribution
        </p>
      </div>

      {/* Top Chart Row: Category Breakdown Donut & Payment Method Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Donut (2 cols) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-brand-400" />
                <span>Current Month Expense Allocation by Category</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Relative share of household expenditure across envelopes
              </p>
            </div>
          </div>

          <div className="h-80 w-full pt-4">
            {activePieCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieCategories}
                    dataKey="spent"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={115}
                    paddingAngle={3}
                  >
                    {activePieCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#10B981'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No expense transactions logged this month yet.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown (1 col) */}
        <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-cyanBrand-400" />
              <span>Payment Channels</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Outflow by instrument</p>
          </div>

          <div className="space-y-3 pt-2">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((pm, idx) => {
                const total = paymentMethods.reduce((s, p) => s + p.total, 0);
                const pct = total > 0 ? Math.round((pm.total / total) * 100) : 0;

                return (
                  <div key={idx} className="p-3 rounded-xl bg-dark-850 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{pm.method}</span>
                      <span className="text-brand-400 font-bold font-sans">
                        {formatCurrency(pm.total, currency)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-dark-750 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyanBrand-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {pm.count} transaction{pm.count > 1 ? 's' : ''} recorded
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No payment data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Chart: Month-over-Month Historical Trends (Income vs Expenses) */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              <span>Month-over-Month Cashflow Trend (Last 6 Months)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Household Income vs Total Expenses with Net Surplus area
            </p>
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          {monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis
                  dataKey="month"
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(val) => `${currency === 'USD' ? '$' : ''}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                />
                <Bar dataKey="income" name="Monthly Income" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Total Expenses" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No historical trends data recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Category Spend vs Budget Limit Comparison Table */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white tracking-tight">
          Category Utilization Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-dark-850 text-slate-400 font-semibold uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Budget Limit</th>
                <th className="p-3 text-right">Actual Spent</th>
                <th className="p-3 text-right">Variance</th>
                <th className="p-3 text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {categoryData.map((cat) => {
                const variance = cat.budgetLimit - cat.spent;
                const isOver = variance < 0;

                return (
                  <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </td>
                    <td className="p-3 text-right font-sans">{formatCurrency(cat.budgetLimit, currency)}</td>
                    <td className="p-3 text-right font-sans font-bold text-white">
                      {formatCurrency(cat.spent, currency)}
                    </td>
                    <td className={`p-3 text-right font-sans font-bold ${isOver ? 'text-rose-400' : 'text-brand-400'}`}>
                      {isOver ? '-' : '+'}
                      {formatCurrency(Math.abs(variance), currency)}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          cat.percentage >= 100
                            ? 'bg-rose-500/15 text-rose-400'
                            : cat.percentage >= 80
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-brand-500/15 text-brand-400'
                        }`}
                      >
                        {cat.percentage}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
