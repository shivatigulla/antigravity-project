import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Repeat,
  Trash2,
  Edit2,
  Calendar,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { BillModal } from '../components/BillModal';
import type { RecurringBill, CreateBillInput } from '@shared/schema';

export const BillsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'Pending' | 'Paid' | 'Overdue'>('ALL');

  // Queries
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => api.getBills(),
  });

  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => api.getProfile(),
  });

  // Mutations
  const createBillMutation = useMutation({
    mutationFn: (data: CreateBillInput) => api.createBill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const updateBillStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'Pending' | 'Paid' | 'Overdue' }) =>
      api.updateBillStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (id: string) => api.deleteBill(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSummary'] });
    },
  });

  const handleBillSubmit = async (data: CreateBillInput) => {
    await createBillMutation.mutateAsync(data);
    setEditingBill(null);
  };

  const currency = profile?.currency || 'USD';

  // Calculations
  const now = new Date();
  const filteredBills = bills.filter((b) => {
    if (activeTab === 'ALL') return true;
    return b.status === activeTab;
  });

  const totalMonthlyCommitment = bills.reduce((sum, b) => {
    let monthlyEquiv = b.amount;
    if (b.frequency === 'Weekly') monthlyEquiv = b.amount * 4.33;
    if (b.frequency === 'Quarterly') monthlyEquiv = b.amount / 3;
    if (b.frequency === 'Yearly') monthlyEquiv = b.amount / 12;
    return sum + monthlyEquiv;
  }, 0);

  const pendingBills = bills.filter((b) => b.status === 'Pending');
  const paidBills = bills.filter((b) => b.status === 'Paid');
  const overdueBills = bills.filter((b) => {
    if (b.status === 'Paid') return false;
    const due = new Date(b.due_date);
    return due < now;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-cyanBrand-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recurring Payables
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Upcoming Bills & Subscriptions
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track due dates, auto-pay debits, and prevent late fees across household utilities and streams
          </p>
        </div>

        <button
          id="bills-add-btn"
          onClick={() => {
            setEditingBill(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-glow-cyan transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Recurring Bill</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Monthly Commitment</span>
          <div className="text-xl font-bold text-white font-sans">
            {formatCurrency(totalMonthlyCommitment, currency)}/mo
          </div>
          <span className="text-[11px] text-slate-500">{bills.length} active recurring items</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Pending Due</span>
          <div className="text-xl font-bold text-amber-400 font-sans">
            {pendingBills.length} Bill{pendingBills.length !== 1 ? 's' : ''}
          </div>
          <span className="text-[11px] text-slate-500">
            Totaling {formatCurrency(pendingBills.reduce((s, b) => s + b.amount, 0), currency)}
          </span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Auto-Pay Active</span>
          <div className="text-xl font-bold text-cyanBrand-400 font-sans">
            {bills.filter((b) => b.auto_pay).length} Subscriptions
          </div>
          <span className="text-[11px] text-slate-500">Automated bank deduction</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Settled This Period</span>
          <div className="text-xl font-bold text-brand-400 font-sans">
            {paidBills.length} Completed
          </div>
          <span className="text-[11px] text-slate-500">
            {formatCurrency(paidBills.reduce((s, b) => s + b.amount, 0), currency)} paid
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        {(['ALL', 'Pending', 'Paid', 'Overdue'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'ALL' ? 'All Payables' : tab}
          </button>
        ))}
      </div>

      {/* Bills Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBills.map((bill) => {
          const isOverdue = bill.status === 'Overdue' || (bill.status === 'Pending' && new Date(bill.due_date) < now);
          const isPaid = bill.status === 'Paid';

          return (
            <div
              key={bill.id}
              className={`glass-card p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                isPaid
                  ? 'border-brand-500/20 bg-brand-500/[0.02]'
                  : isOverdue
                  ? 'border-rose-500/30 bg-rose-500/[0.02]'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight">{bill.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400 font-medium">{bill.frequency}</span>
                      {bill.auto_pay && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          <Zap className="w-2.5 h-2.5" /> Auto-Pay
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-bold text-white font-sans">
                      {formatCurrency(bill.amount, currency)}
                    </span>
                  </div>
                </div>

                {/* Due Date & Badge */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Due {formatDate(bill.due_date)}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      isPaid
                        ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                        : isOverdue
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <button
                  onClick={() =>
                    updateBillStatusMutation.mutate({
                      id: bill.id,
                      status: isPaid ? 'Pending' : 'Paid',
                    })
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isPaid
                      ? 'bg-white/5 hover:bg-white/10 text-slate-400'
                      : 'bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (confirm(`Delete recurring bill "${bill.title}"?`)) {
                        deleteBillMutation.mutate(bill.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bill Modal */}
      <BillModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBill(null);
        }}
        onSubmit={handleBillSubmit}
        initialData={editingBill}
        currency={currency}
      />
    </div>
  );
};
