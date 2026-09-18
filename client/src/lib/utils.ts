import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const num = isNaN(amount) ? 0 : amount;
  
  const symbolMap: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'A$',
  };

  const symbol = symbolMap[currency] || `${currency} `;

  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getBudgetThresholdInfo(spent: number, limit: number) {
  if (!limit || limit <= 0) {
    return {
      percentage: 0,
      status: 'safe',
      color: 'emerald',
      label: 'No Limit',
      textClass: 'text-brand-400',
      bgClass: 'bg-brand-500',
      badgeClass: 'bg-brand-500/10 text-brand-400 border-brand-500/30',
    };
  }

  const percentage = Math.round((spent / limit) * 100);

  if (percentage >= 100) {
    return {
      percentage,
      status: 'breached',
      color: 'rose',
      label: 'Over Budget',
      textClass: 'text-rose-400',
      bgClass: 'bg-rose-500',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    };
  }

  if (percentage >= 80) {
    return {
      percentage,
      status: 'warning',
      color: 'amber',
      label: 'Near Limit (80%+)',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-500',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    };
  }

  return {
    percentage,
    status: 'safe',
    color: 'emerald',
    label: 'On Track',
    textClass: 'text-brand-400',
    bgClass: 'bg-brand-500',
    badgeClass: 'bg-brand-500/10 text-brand-400 border-brand-500/30',
  };
}
