import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SidebarNav } from './components/SidebarNav';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { Dashboard } from './pages/Dashboard';
import { ExpensesPage } from './pages/ExpensesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { BillsPage } from './pages/BillsPage';
import { AIAdvisorPage } from './pages/AIAdvisorPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './lib/api';
import type { CreateTransactionInput } from '@shared/schema';

export const App: React.FC = () => {
  const queryClient = useQueryClient();
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // Global user profile and summary for sidebar
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => api.getProfile(),
  });

  const { data: summary } = useQuery({
    queryKey: ['analyticsSummary'],
    queryFn: () => api.getAnalyticsSummary(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const createTxMutation = useMutation({
    mutationFn: (data: CreateTransactionInput) => api.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const handleQuickAddSubmit = async (data: CreateTransactionInput) => {
    await createTxMutation.mutateAsync(data);
  };

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex flex-col md:flex-row min-h-screen bg-dark-950 text-slate-100">
        {/* Sidebar Nav */}
        <SidebarNav
          householdName={profile?.full_name || 'The Household'}
          monthlyIncome={summary?.monthlyIncome || profile?.monthly_income || 5400}
          totalSpent={summary?.totalExpenses || 0}
          currency={profile?.currency || 'USD'}
          onQuickAddExpense={() => setIsQuickExpenseOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/ai-advisor" element={<AIAdvisorPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        {/* Quick Add Expense Modal */}
        <ExpenseFormModal
          isOpen={isQuickExpenseOpen}
          onClose={() => setIsQuickExpenseOpen(false)}
          onSubmit={handleQuickAddSubmit}
          categories={categories}
          currency={profile?.currency || 'USD'}
        />
      </div>
    </BrowserRouter>
  );
};
