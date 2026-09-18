import React, { useState } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Repeat,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Transaction, Category } from '@shared/schema';
import { PAYMENT_METHODS } from '@shared/schema';
import { formatCurrency, formatDate } from '../lib/utils';

interface ExpenseTableProps {
  transactions: Transaction[];
  categories: Category[];
  currency?: string;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onAddNew?: () => void;
  isLoading?: boolean;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  transactions,
  categories,
  currency = 'USD',
  onEdit,
  onDelete,
  onBulkDelete,
  onAddNew,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    // Search match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = tx.title.toLowerCase().includes(q);
      const matchMerchant = tx.merchant?.toLowerCase().includes(q);
      const matchNotes = tx.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchMerchant && !matchNotes) return false;
    }

    // Category match
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'UNCATEGORIZED') {
        if (tx.category_id) return false;
      } else if (tx.category_id !== selectedCategory) {
        return false;
      }
    }

    // Payment method match
    if (selectedPaymentMethod !== 'ALL' && tx.payment_method !== selectedPaymentMethod) {
      return false;
    }

    // Type match
    if (selectedType !== 'ALL' && tx.transaction_type !== selectedType) {
      return false;
    }

    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'amount') {
      return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    } else {
      const dateA = new Date(a.transaction_date).getTime();
      const dateB = new Date(b.transaction_date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginated.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginated.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Title', 'Category', 'Amount', 'Payment Method', 'Merchant', 'Recurring', 'Notes'];
    const rows = sorted.map((t) => [
      t.transaction_date.split('T')[0],
      t.transaction_type,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.category_name || 'Uncategorized'}"`,
      t.amount,
      t.payment_method,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.is_recurring ? 'Yes' : 'No',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `household_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="expenses-search-input"
            placeholder="Search by title, merchant, or notes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-dark-800 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            id="filter-category-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-dark-800 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Categories</option>
            <option value="UNCATEGORIZED">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            id="filter-payment-select"
            value={selectedPaymentMethod}
            onChange={(e) => {
              setSelectedPaymentMethod(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-dark-800 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            id="filter-type-select"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-dark-800 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Types</option>
            <option value="Expense">Expenses Only</option>
            <option value="Income">Income Only</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            title="Export to CSV"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Bulk Delete Bar (Appears when items are selected) */}
      {selectedIds.length > 0 && onBulkDelete && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in slide-in-from-top-1">
          <span className="font-semibold">
            {selectedIds.length} transaction{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <button
            id="bulk-delete-btn"
            onClick={() => {
              if (confirm(`Delete ${selectedIds.length} transactions?`)) {
                onBulkDelete(selectedIds);
                setSelectedIds([]);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors shadow-glow-rose"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected</span>
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-card-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-dark-850/90 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && selectedIds.length === paginated.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 bg-dark-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'date') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('date');
                      setSortOrder('desc');
                    }
                  }}
                  className="p-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4">Transaction / Merchant</th>
                <th className="p-4">Category</th>
                <th className="p-4">Payment Method</th>
                <th
                  onClick={() => {
                    if (sortField === 'amount') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('amount');
                      setSortOrder('desc');
                    }
                  }}
                  className="p-4 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-12 text-slate-400">
                    <div className="max-w-xs mx-auto space-y-3">
                      <Layers className="w-10 h-10 mx-auto text-slate-600" />
                      <p className="font-medium text-slate-300">No transactions found</p>
                      <p className="text-xs text-slate-500">
                        Try changing your search terms or filters, or log a new transaction.
                      </p>
                      {onAddNew && (
                        <button
                          onClick={onAddNew}
                          className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold shadow-glow-emerald"
                        >
                          + Record Transaction
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((tx) => {
                  const isSelected = selectedIds.includes(tx.id);
                  const isExpense = tx.transaction_type === 'Expense';

                  return (
                    <tr
                      key={tx.id}
                      className={`group hover:bg-white/[0.02] transition-colors ${
                        isSelected ? 'bg-brand-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(tx.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-dark-800 text-brand-500 focus:ring-brand-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="p-4 text-xs font-medium text-slate-400 whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </td>

                      {/* Title & Merchant */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white tracking-tight">
                            {tx.title}
                          </span>
                          {tx.is_recurring && (
                            <span
                              title="Recurring Monthly"
                              className="p-1 rounded bg-dark-750 text-cyanBrand-400"
                            >
                              <Repeat className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        {tx.merchant && (
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {tx.merchant}
                          </span>
                        )}
                        {tx.notes && (
                          <span className="text-[11px] text-slate-500 italic block mt-0.5 truncate max-w-xs">
                            {tx.notes}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-dark-800 border border-white/10 text-slate-200">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tx.category_color || '#64748B' }}
                          />
                          <span>{tx.category_name || 'Uncategorized'}</span>
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="p-4 whitespace-nowrap text-xs text-slate-400">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300">
                          {tx.payment_method}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <span
                          className={`font-bold font-sans ${
                            isExpense ? 'text-white' : 'text-brand-400'
                          }`}
                        >
                          {isExpense ? '-' : '+'}
                          {formatCurrency(tx.amount, currency)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(tx)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${tx.title}"?`)) {
                                onDelete(tx.id);
                              }
                            }}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-dark-850/80 border-t border-white/10 text-xs text-slate-400">
          <div>
            Showing <span className="text-white font-semibold">{paginated.length}</span> of{' '}
            <span className="text-white font-semibold">{sorted.length}</span> recorded entries
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-dark-800 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-dark-800 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
