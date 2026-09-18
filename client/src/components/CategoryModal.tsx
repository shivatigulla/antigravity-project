import React, { useState, useEffect } from 'react';
import { X, Palette, DollarSign, Tag, Loader2 } from 'lucide-react';
import { CategorySchema, type CreateCategoryInput, type Category } from '@shared/schema';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryInput) => Promise<void>;
  initialData?: Category | null;
  currency?: string;
}

const PRESET_COLORS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#F59E0B', // Amber
  '#14B8A6', // Teal
  '#64748B', // Slate
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  currency = 'USD',
}) => {
  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: '',
    budget_limit: 0,
    color_code: '#10B981',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        budget_limit: initialData.budget_limit,
        color_code: initialData.color_code || '#10B981',
      });
    } else {
      setFormData({
        name: '',
        budget_limit: 500,
        color_code: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
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
      budget_limit: Number(formData.budget_limit),
    };

    const validation = CategorySchema.safeParse(payload);
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
      setErrors({ form: err.message || 'Failed to save category' });
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
              {initialData ? 'Edit Category Budget' : 'Create Custom Category'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Set spending envelopes and alert limits
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

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              id="cat-name-input"
              required
              placeholder="e.g. Pet Care, Hobbies, Gym"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
            />
            {errors.name && <span className="text-[11px] text-rose-400 mt-1 block">{errors.name}</span>}
          </div>

          {/* Budget Limit */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Monthly Budget Limit ({currency}) *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              id="cat-budget-input"
              required
              placeholder="0.00"
              value={formData.budget_limit}
              onChange={(e) => setFormData({ ...formData, budget_limit: e.target.value as any })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-dark-800 border border-white/10 text-white font-semibold text-sm focus:outline-none focus:border-brand-500"
            />
            {errors.budget_limit && (
              <span className="text-[11px] text-rose-400 mt-1 block">{errors.budget_limit}</span>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Alerts trigger when spending reaches 80% and 100% of this limit.
            </p>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Color Accent
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_COLORS.map((hex) => (
                <button
                  type="button"
                  key={hex}
                  onClick={() => setFormData({ ...formData, color_code: hex })}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    formData.color_code === hex ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-dark-900' : 'opacity-80 hover:opacity-100 hover:scale-110'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
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
              id="cat-submit-button"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-emerald-400 text-white font-semibold text-sm shadow-glow-emerald disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialData ? 'Update Category' : 'Create Category'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
