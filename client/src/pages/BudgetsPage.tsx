import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PieChart,
  PlusCircle,
  AlertTriangle,
  Sliders,
  DollarSign,
  Edit2,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, getBudgetThresholdInfo } from '../lib/utils';
import { BudgetProgressBar } from '../components/BudgetProgressBar';
import { CategoryModal } from '../components/CategoryModal';
import type { Category, CreateCategoryInput } from '@shared/schema';

export const BudgetsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Quick edit budget limit inline state
  const [quickEditCat, setQuickEditCat] = useState<Category | null>(null);
  const [newLimitInput, setNewLimitInput] = useState<string>('');

  // Queries
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => api.getProfile(),
  });

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: CreateCategoryInput) => api.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryInput> }) =>
      api.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const updateBudgetLimitMutation = useMutation({
    mutationFn: ({ categoryId, limit }: { categoryId: string; limit: number }) =>
      api.updateBudget(categoryId, limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
      setQuickEditCat(null);
    },
  });

  const handleCategorySubmit = async (data: CreateCategoryInput) => {
    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({ id: editingCategory.id, data });
    } else {
      await createCategoryMutation.mutateAsync(data);
    }
    setEditingCategory(null);
  };

  const handleQuickLimitSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditCat) return;
    const num = parseFloat(newLimitInput);
    if (!isNaN(num) && num >= 0) {
      updateBudgetLimitMutation.mutate({ categoryId: quickEditCat.id, limit: num });
    }
  };

  const currency = profile?.currency || 'USD';
  const monthlyIncome = profile?.monthly_income || 5400;

  const totalAllocatedBudget = categories.reduce((sum, c) => sum + (c.budget_limit || 0), 0);
  const totalSpentThisMonth = categories.reduce((sum, c) => sum + (c.current_month_spent || 0), 0);
  const unallocatedIncome = Math.max(0, monthlyIncome - totalAllocatedBudget);

  const breachedCategories = categories.filter((c) => (c.current_month_spent || 0) > (c.budget_limit || 0));
  const warningCategories = categories.filter(
    (c) =>
      (c.budget_limit || 0) > 0 &&
      (c.current_month_spent || 0) >= (c.budget_limit || 0) * 0.8 &&
      (c.current_month_spent || 0) <= (c.budget_limit || 0)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-4 h-4 text-cyanBrand-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Envelope Budgeting
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Category Budget Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure monthly category thresholds, track real-time utilization, and prevent budget leaks
          </p>
        </div>

        <button
          id="budgets-add-category-btn"
          onClick={() => {
            setEditingCategory(null);
            setIsCategoryModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-glow-emerald transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Total Budget Allocated</span>
          <div className="text-2xl font-bold text-white font-sans">
            {formatCurrency(totalAllocatedBudget, currency)}
          </div>
          <span className="text-[11px] text-slate-500">
            {Math.round((totalAllocatedBudget / monthlyIncome) * 100)}% of household income
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Current Month Spending</span>
          <div className="text-2xl font-bold text-brand-400 font-sans">
            {formatCurrency(totalSpentThisMonth, currency)}
          </div>
          <span className="text-[11px] text-slate-500">
            {totalAllocatedBudget > 0
              ? `${Math.round((totalSpentThisMonth / totalAllocatedBudget) * 100)}% of total budget used`
              : 'No budget set'}
          </span>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Threshold Breaches</span>
          <div className="text-2xl font-bold font-sans">
            {breachedCategories.length > 0 ? (
              <span className="text-rose-400">{breachedCategories.length} Over Limit</span>
            ) : warningCategories.length > 0 ? (
              <span className="text-amber-400">{warningCategories.length} Approaching (80%+)</span>
            ) : (
              <span className="text-brand-400">100% In Bounds</span>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            Unallocated buffer: {formatCurrency(unallocatedIncome, currency)}
          </span>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Configured Household Envelopes ({categories.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const threshold = getBudgetThresholdInfo(cat.current_month_spent || 0, cat.budget_limit || 0);

            return (
              <div
                key={cat.id}
                className="glass-card p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all space-y-4 relative"
              >
                {/* Header with quick edit/delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-lg shadow-sm shrink-0"
                      style={{ backgroundColor: cat.color_code }}
                    />
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight">{cat.name}</h4>
                      <span className="text-[11px] text-slate-400">
                        Limit: {formatCurrency(cat.budget_limit, currency)}/mo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setQuickEditCat(cat);
                        setNewLimitInput(String(cat.budget_limit));
                      }}
                      title="Quick Adjust Limit"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setIsCategoryModalOpen(true);
                      }}
                      title="Edit Category Details"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete category "${cat.name}"? Transactions will become uncategorized.`)) {
                          deleteCategoryMutation.mutate(cat.id);
                        }
                      }}
                      title="Delete Category"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar Component */}
                <BudgetProgressBar
                  categoryName={cat.name}
                  colorCode={cat.color_code}
                  spent={cat.current_month_spent || 0}
                  limit={cat.budget_limit || 0}
                  currency={currency}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Limit Adjustment Modal */}
      {quickEditCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-sm bg-dark-900 border border-white/10 rounded-2xl p-6 shadow-card-dark space-y-4">
            <h3 className="text-base font-bold text-white">
              Adjust Limit: {quickEditCat.name}
            </h3>
            <p className="text-xs text-slate-400">
              Current monthly spending in this category is{' '}
              <strong className="text-white">
                {formatCurrency(quickEditCat.current_month_spent || 0, currency)}
              </strong>
            </p>

            <form onSubmit={handleQuickLimitSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Budget Limit ({currency})
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={newLimitInput}
                  onChange={(e) => setNewLimitInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-800 border border-white/10 text-white font-bold text-base focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickEditCat(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold shadow-glow-emerald"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Category Create / Edit Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleCategorySubmit}
        initialData={editingCategory}
        currency={currency}
      />
    </div>
  );
};
