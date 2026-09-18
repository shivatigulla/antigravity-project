import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  RECURRING_FREQUENCIES,
  BILL_STATUSES,
  RecurringBillSchema,
  type CreateBillInput,
  type RecurringBill,
} from '@shared/schema';

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBillInput) => Promise<void>;
  initialData?: RecurringBill | null;
  currency?: string;
}

export const BillModal: React.FC<BillModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  currency = 'USD',
}) => {
  const [formData, setFormData] = useState<Partial<CreateBillInput>>({
    title: '',
    amount: '' as any,
    due_date: new Date().toISOString().split('T')[0],
    frequency: 'Monthly',
    auto_pay: false,
    status: 'Pending',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        amount: initialData.amount,
        due_date: initialData.due_date.split('T')[0],
        frequency: initialData.frequency,
        auto_pay: initialData.auto_pay,
        status: initialData.status,
      });
    } else {
      setFormData({
        title: '',
        amount: '' as any,
        due_date: new Date().toISOString().split('T')[0],
        frequency: 'Monthly',
        auto_pay: false,
        status: 'Pending',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      ...formData,
      amount: Number(formData.amount),
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : new Date().toISOString(),
    };

    const validation = RecurringBillSchema.safeParse(payload);
    if (!validation.success) {
      const errMap: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errMap[field] = issue.message;
      });
      setErrors(errMap);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(validation.data);
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save bill' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-dark-900 border border-white/10 rounded-2xl shadow-card-dark overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-dark-850">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {initialData ? 'Edit Recurring Bill' : 'Track Recurring Bill / Subscription'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Set reminders and auto-pay tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.form && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {errors.form}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Bill / Subscription Name *
            </label>
            <input
              type="text"
              id="bill-title-input"
              required
              placeholder="e.g. Electric Utility, Netflix, Rent"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
            />
            {errors.title && <span className="text-[11px] text-rose-400 mt-1 block">{errors.title}</span>}
          </div>

          {/* Amount & Due Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Amount ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                id="bill-amount-input"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-brand-500"
              />
              {errors.amount && <span className="text-[11px] text-rose-400 mt-1 block">{errors.amount}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Next Due Date *
              </label>
              <input
                type="date"
                id="bill-duedate-input"
                required
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
              />
              {errors.due_date && <span className="text-[11px] text-rose-400 mt-1 block">{errors.due_date}</span>}
            </div>
          </div>

          {/* Frequency & Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Frequency *
              </label>
              <select
                id="bill-frequency-select"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                {RECURRING_FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Current Status *
              </label>
              <select
                id="bill-status-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                {BILL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto-pay Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="bill-autopay-checkbox"
              checked={formData.auto_pay}
              onChange={(e) => setFormData({ ...formData, auto_pay: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-dark-800 text-brand-500 focus:ring-brand-500 cursor-pointer"
            />
            <label htmlFor="bill-autopay-checkbox" className="text-sm text-slate-300 cursor-pointer select-none">
              Auto-Pay Enabled (Automatically debited)
            </label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="bill-submit-button"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-glow-emerald disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialData ? 'Update Bill' : 'Add Recurring Bill'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
