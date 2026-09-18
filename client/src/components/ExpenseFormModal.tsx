import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Tag, CreditCard, Store, FileText, Repeat, Loader2 } from 'lucide-react';
import {
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  TransactionSchema,
  type CreateTransactionInput,
  type Transaction,
  type Category,
} from '@shared/schema';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  categories: Category[];
  initialData?: Transaction | null;
  currency?: string;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialData,
  currency = 'USD',
}) => {
  const [formData, setFormData] = useState<Partial<CreateTransactionInput>>({
    title: '',
    amount: '' as any,
    category_id: '',
    transaction_type: 'Expense',
    payment_method: 'Credit Card',
    transaction_date: new Date().toISOString().split('T')[0],
    merchant: '',
    notes: '',
    is_recurring: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        amount: initialData.amount,
        category_id: initialData.category_id || '',
        transaction_type: initialData.transaction_type,
        payment_method: initialData.payment_method,
        transaction_date: initialData.transaction_date.split('T')[0],
        merchant: initialData.merchant || '',
        notes: initialData.notes || '',
        is_recurring: initialData.is_recurring,
      });
    } else {
      setFormData({
        title: '',
        amount: '' as any,
        category_id: categories[0]?.id || '',
        transaction_type: 'Expense',
        payment_method: 'Credit Card',
        transaction_date: new Date().toISOString().split('T')[0],
        merchant: '',
        notes: '',
        is_recurring: false,
      });
    }
    setErrors({});
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const submissionPayload = {
      ...formData,
      amount: Number(formData.amount),
      category_id: formData.category_id ? formData.category_id : null,
      transaction_date: formData.transaction_date ? new Date(formData.transaction_date).toISOString() : new Date().toISOString(),
    };

    const validation = TransactionSchema.safeParse(submissionPayload);

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
      setErrors({ form: err.message || 'Failed to record transaction' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-dark-900 border border-white/10 rounded-2xl shadow-card-dark overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-dark-850">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {initialData ? 'Edit Transaction' : 'Log New Transaction'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Record daily household spending or income
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errors.form && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {errors.form}
            </div>
          )}

          {/* Type Toggle (Expense / Income) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-dark-800 rounded-xl border border-white/5">
              {TRANSACTION_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFormData({ ...formData, transaction_type: type })}
                  className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                    formData.transaction_type === type
                      ? type === 'Expense'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type === 'Expense' ? '- Expense' : '+ Income'}
                </button>
              ))}
            </div>
          </div>

          {/* Title & Amount Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Title / Description *
              </label>
              <input
                type="text"
                id="tx-title-input"
                required
                placeholder="e.g. Weekly Groceries"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              {errors.title && <span className="text-[11px] text-rose-400 mt-1 block">{errors.title}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Amount ({currency}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  id="tx-amount-input"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value as any })}
                  className="w-full pl-3 pr-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-slate-500 text-sm font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
              {errors.amount && <span className="text-[11px] text-rose-400 mt-1 block">{errors.amount}</span>}
            </div>
          </div>

          {/* Category & Payment Method Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                id="tx-category-select"
                value={formData.category_id || ''}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Uncategorized / None --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.category_id && <span className="text-[11px] text-rose-400 mt-1 block">{errors.category_id}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Payment Method *
              </label>
              <select
                id="tx-payment-method-select"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              {errors.payment_method && <span className="text-[11px] text-rose-400 mt-1 block">{errors.payment_method}</span>}
            </div>
          </div>

          {/* Date & Merchant Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                id="tx-date-input"
                required
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white text-sm focus:outline-none focus:border-brand-500"
              />
              {errors.transaction_date && <span className="text-[11px] text-rose-400 mt-1 block">{errors.transaction_date}</span>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Merchant / Store
              </label>
              <input
                type="text"
                id="tx-merchant-input"
                placeholder="e.g. Costco, Shell"
                value={formData.merchant || ''}
                onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Notes / Tags
            </label>
            <input
              type="text"
              id="tx-notes-input"
              placeholder="Optional notes or details..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Recurring Checkbox */}
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="tx-recurring-checkbox"
              checked={formData.is_recurring}
              onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-dark-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
            />
            <label htmlFor="tx-recurring-checkbox" className="text-sm text-slate-300 cursor-pointer select-none">
              Mark as Recurring Monthly Expense
            </label>
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="tx-submit-button"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-glow-emerald transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialData ? 'Update Transaction' : 'Record Transaction'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
