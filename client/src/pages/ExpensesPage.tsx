import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Receipt, ArrowUpDown, Filter, Download } from 'lucide-react';
import { api } from '../lib/api';
import { ExpenseTable } from '../components/ExpenseTable';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import type { CreateTransactionInput, Transaction } from '@shared/schema';
import { formatCurrency } from '../lib/utils';

export const ExpensesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Queries
  const { data: txData, isLoading: isTxLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.getTransactions({ limit: 200 }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => api.getProfile(),
  });

  // Mutations
  const createTxMutation = useMutation({
    mutationFn: (data: CreateTransactionInput) => api.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const updateTxMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTransactionInput }) =>
      api.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const deleteTxMutation = useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkDeleteTransactions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recentTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
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

  const transactions = txData?.transactions || [];
  const currency = profile?.currency || 'USD';

  // Aggregate stats
  const totalExpenses = transactions
    .filter((t) => t.transaction_type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.transaction_type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Household Ledger
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Transactions Master List
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit, filter, and log all daily grocery, utility, and discretionary expenses
          </p>
        </div>

        <button
          id="expenses-add-new-btn"
          onClick={() => {
            setEditingTx(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-glow-emerald transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Log Transaction</span>
        </button>
      </div>

      {/* Ledger Summary Pill Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4 rounded-xl border border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Logged Records</span>
          <span className="text-base font-bold text-white">{transactions.length} entries</span>
        </div>
        <div className="glass-card p-4 rounded-xl border border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Total Expenses Filtered</span>
          <span className="text-base font-bold text-white font-sans">
            {formatCurrency(totalExpenses, currency)}
          </span>
        </div>
        <div className="glass-card p-4 rounded-xl border border-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Total Recorded Income</span>
          <span className="text-base font-bold text-brand-400 font-sans">
            {formatCurrency(totalIncome, currency)}
          </span>
        </div>
      </div>

      {/* Transactions Data Table */}
      <ExpenseTable
        transactions={transactions}
        categories={categories}
        currency={currency}
        isLoading={isTxLoading}
        onEdit={(tx) => {
          setEditingTx(tx);
          setIsModalOpen(true);
        }}
        onDelete={(id) => deleteTxMutation.mutate(id)}
        onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
        onAddNew={() => {
          setEditingTx(null);
          setIsModalOpen(true);
        }}
      />

      {/* Transaction Modal */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
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
