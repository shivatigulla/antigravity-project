import { z } from 'zod';

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'UPI / Digital Wallet',
] as const;

export const TRANSACTION_TYPES = ['Expense', 'Income'] as const;

export const RECURRING_FREQUENCIES = [
  'Weekly',
  'Monthly',
  'Quarterly',
  'Yearly',
] as const;

export const BILL_STATUSES = ['Pending', 'Paid', 'Overdue'] as const;

export const DEFAULT_CATEGORIES = [
  { name: 'Groceries', color_code: '#10B981', budget_limit: 600 },
  { name: 'Electricity & Utilities', color_code: '#06B6D4', budget_limit: 250 },
  { name: 'Rent & Housing', color_code: '#6366F1', budget_limit: 1500 },
  { name: 'Transportation', color_code: '#F59E0B', budget_limit: 300 },
  { name: 'Education', color_code: '#8B5CF6', budget_limit: 400 },
  { name: 'Medical & Healthcare', color_code: '#EC4899', budget_limit: 250 },
  { name: 'Subscriptions & Entertainment', color_code: '#3B82F6', budget_limit: 150 },
  { name: 'Shopping', color_code: '#F43F5E', budget_limit: 350 },
  { name: 'Miscellaneous', color_code: '#64748B', budget_limit: 200 },
] as const;

// Transaction validation schemas
export const TransactionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  category_id: z.string().uuid('Invalid category identifier').optional().nullable(),
  transaction_type: z.enum(TRANSACTION_TYPES).default('Expense'),
  payment_method: z.enum(PAYMENT_METHODS),
  transaction_date: z.string().min(1, 'Transaction date is required'),
  merchant: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_recurring: z.boolean().default(false),
});

export type CreateTransactionInput = z.infer<typeof TransactionSchema>;

export interface Transaction extends CreateTransactionInput {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_color?: string;
}

// Category validation schemas
export const CategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  budget_limit: z.coerce.number().min(0, 'Budget limit cannot be negative').default(0),
  color_code: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Color code must be a valid hex color (#RRGGBB)').default('#10B981'),
});

export type CreateCategoryInput = z.infer<typeof CategorySchema>;

export interface Category extends CreateCategoryInput {
  id: string;
  user_id: string;
  created_at: string;
  current_month_spent?: number;
  spent_percentage?: number;
}

// Budget configuration schema
export const BudgetSchema = z.object({
  category_id: z.string().uuid('Invalid category identifier'),
  budget_limit: z.coerce.number().min(0, 'Budget limit cannot be negative'),
});

export type UpdateBudgetInput = z.infer<typeof BudgetSchema>;

// Recurring bill schema
export const RecurringBillSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  due_date: z.string().min(1, 'Due date is required'),
  frequency: z.enum(RECURRING_FREQUENCIES).default('Monthly'),
  auto_pay: z.boolean().default(false),
  status: z.enum(BILL_STATUSES).default('Pending'),
});

export type CreateBillInput = z.infer<typeof RecurringBillSchema>;

export interface RecurringBill extends CreateBillInput {
  id: string;
  user_id: string;
  created_at: string;
}

// User Profile schema
export const UserProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(255),
  email: z.string().email('Invalid email address'),
  currency: z.string().min(1).max(10).default('USD'),
  monthly_income: z.coerce.number().min(0, 'Monthly income cannot be negative').default(5000),
  family_size: z.coerce.number().int().min(1, 'Family size must be at least 1').default(2),
  savings_target_pct: z.coerce.number().min(0).max(100).default(20),
  primary_goal: z.string().default('Emergency Fund Build'),
  gemini_api_key: z.string().optional(),
});

export type UserProfileInput = z.infer<typeof UserProfileSchema>;

export interface UserProfile extends UserProfileInput {
  id: string;
  created_at: string;
}

// AI Financial Audit Input & Output Schemas
export const AIAuditRequestSchema = z.object({
  targetMonthlySavingsPct: z.number().min(0).max(100).optional(),
  familySize: z.number().int().min(1).optional(),
  primaryFinancialGoal: z.string().optional(),
});

export type AIAuditRequest = z.infer<typeof AIAuditRequestSchema>;

export interface AIFinancialReportPayload {
  healthScore: number; // 0 to 100 rating
  executiveSummary: string;
  identifiedLeakage: Array<{
    category: string;
    issue: string;
    estimatedMonthlySavings: number;
  }>;
  actionableSteps: string[];
  budgetAdjustments: Array<{
    category: string;
    recommendedLimit: number;
  }>;
}

export interface AIFinancialReport {
  id: string;
  user_id: string;
  generated_at: string;
  summary: string;
  report_payload: AIFinancialReportPayload;
}
