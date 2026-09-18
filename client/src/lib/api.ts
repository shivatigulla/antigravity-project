import type {
  Transaction,
  CreateTransactionInput,
  Category,
  CreateCategoryInput,
  RecurringBill,
  CreateBillInput,
  UserProfile,
  UserProfileInput,
  AIFinancialReport,
} from '@shared/schema';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // User Profile
  async getProfile(): Promise<UserProfile & { has_api_key: boolean; masked_api_key: string }> {
    return fetchJSON('/api/user/profile');
  },

  async updateProfile(data: Partial<UserProfileInput>): Promise<UserProfile & { has_api_key: boolean; masked_api_key: string }> {
    return fetchJSON('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Categories & Budgets
  async getCategories(): Promise<Category[]> {
    return fetchJSON('/api/categories');
  },

  async createCategory(data: CreateCategoryInput): Promise<Category> {
    return fetchJSON('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCategory(id: string, data: Partial<CreateCategoryInput>): Promise<Category> {
    return fetchJSON(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    return fetchJSON(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },

  async updateBudget(categoryId: string, budgetLimit: number): Promise<Category> {
    return fetchJSON('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ category_id: categoryId, budget_limit: budgetLimit }),
    });
  },

  // Transactions
  async getTransactions(params?: {
    category_id?: string;
    startDate?: string;
    endDate?: string;
    payment_method?: string;
    transaction_type?: string;
    search?: string;
    sort?: string;
    order?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; total: number }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });
    }
    const qStr = query.toString();
    return fetchJSON(`/api/transactions${qStr ? `?${qStr}` : ''}`);
  },

  async createTransaction(data: CreateTransactionInput): Promise<Transaction> {
    return fetchJSON('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTransaction(id: string, data: Partial<CreateTransactionInput>): Promise<Transaction> {
    return fetchJSON(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTransaction(id: string): Promise<{ message: string }> {
    return fetchJSON(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkDeleteTransactions(ids: string[]): Promise<{ message: string }> {
    return fetchJSON('/api/transactions/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  // Recurring Bills
  async getBills(): Promise<RecurringBill[]> {
    return fetchJSON('/api/bills');
  },

  async createBill(data: CreateBillInput): Promise<RecurringBill> {
    return fetchJSON('/api/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBillStatus(id: string, status: 'Pending' | 'Paid' | 'Overdue'): Promise<RecurringBill> {
    return fetchJSON(`/api/bills/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteBill(id: string): Promise<{ message: string }> {
    return fetchJSON(`/api/bills/${id}`, {
      method: 'DELETE',
    });
  },

  // Analytics & Summary
  async getAnalyticsSummary(): Promise<{
    currency: string;
    monthlyIncome: number;
    totalExpenses: number;
    netBalance: number;
    savingsRatePct: number;
    targetSavingsPct: number;
    totalBudgetAllocated: number;
    categoryBreakdown: Array<{
      id: string;
      name: string;
      color: string;
      budgetLimit: number;
      spent: number;
      percentage: number;
    }>;
    paymentMethods: Array<{
      method: string;
      count: number;
      total: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      expenses: number;
      income: number;
      savings: number;
    }>;
    flaggedCategories: Array<{
      id: string;
      name: string;
      color: string;
      budgetLimit: number;
      spent: number;
      percentage: number;
    }>;
    upcomingBills: RecurringBill[];
  }> {
    return fetchJSON('/api/analytics/summary');
  },

  // AI Financial Advisor
  async auditFinances(): Promise<AIFinancialReport> {
    return fetchJSON('/api/ai/audit-finances', {
      method: 'POST',
    });
  },

  async getAIReports(): Promise<AIFinancialReport[]> {
    return fetchJSON('/api/ai/reports');
  },

  // Demo Seed
  async resetDemoData(): Promise<{ message: string }> {
    return fetchJSON('/api/seed', {
      method: 'POST',
    });
  },
};
