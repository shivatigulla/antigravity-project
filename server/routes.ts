import { Router, Request, Response } from 'express';
import { getDB, DEFAULT_USER_ID, seedSampleData } from './db.js';
import {
  TransactionSchema,
  CategorySchema,
  BudgetSchema,
  RecurringBillSchema,
  UserProfileSchema,
  AIAuditRequestSchema,
} from '../shared/schema.js';
import { generateFinancialAudit, AuditContext } from './lib/gemini.js';

export const apiRouter = Router();

// Middleware helper to ensure user_id
const getUserId = (req: Request): string => {
  // In a multi-tenant / auth setup, extract from session/JWT. For current context, use active user.
  return (req.headers['x-user-id'] as string) || DEFAULT_USER_ID;
};

// ==========================================
// USER PROFILE ENDPOINTS
// ==========================================
apiRouter.get('/user/profile', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    // Mask gemini_api_key for client security
    const maskedKey = user.gemini_api_key ? `••••••••${user.gemini_api_key.slice(-4)}` : '';
    res.json({ ...user, has_api_key: Boolean(user.gemini_api_key), masked_api_key: maskedKey });
  } catch (err: any) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/user/profile', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const parsed = UserProfileSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const { full_name, email, currency, monthly_income, family_size, savings_target_pct, primary_goal, gemini_api_key } = parsed.data;

    let query = `
      UPDATE users SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        currency = COALESCE($3, currency),
        monthly_income = COALESCE($4, monthly_income),
        family_size = COALESCE($5, family_size),
        savings_target_pct = COALESCE($6, savings_target_pct),
        primary_goal = COALESCE($7, primary_goal)
    `;
    const params: any[] = [
      full_name ?? null,
      email ?? null,
      currency ?? null,
      monthly_income ?? null,
      family_size ?? null,
      savings_target_pct ?? null,
      primary_goal ?? null
    ];

    if (gemini_api_key !== undefined) {
      query += `, gemini_api_key = $8 WHERE id = $9 RETURNING *`;
      params.push(gemini_api_key, userId);
    } else {
      query += ` WHERE id = $8 RETURNING *`;
      params.push(userId);
    }

    const result = await db.query(query, params);
    const user = result.rows[0];
    const maskedKey = user.gemini_api_key ? `••••••••${user.gemini_api_key.slice(-4)}` : '';
    res.json({ ...user, has_api_key: Boolean(user.gemini_api_key), masked_api_key: maskedKey });
  } catch (err: any) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CATEGORIES & BUDGETS ENDPOINTS
// ==========================================
apiRouter.get('/categories', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);

    // Calculate start and end of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const sql = `
      SELECT 
        c.*,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Expense' AND t.transaction_date >= $2 AND t.transaction_date <= $3 THEN t.amount ELSE 0 END), 0)::numeric as current_month_spent
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    const result = await db.query(sql, [userId, startOfMonth, endOfMonth]);
    const categories = result.rows.map(cat => {
      const budgetLimit = parseFloat(cat.budget_limit) || 0;
      const spent = parseFloat(cat.current_month_spent) || 0;
      const pct = budgetLimit > 0 ? Math.round((spent / budgetLimit) * 100) : 0;
      return {
        ...cat,
        budget_limit: budgetLimit,
        current_month_spent: spent,
        spent_percentage: pct
      };
    });

    res.json(categories);
  } catch (err: any) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/categories', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const parsed = CategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const { name, budget_limit, color_code } = parsed.data;
    const result = await db.query(`
      INSERT INTO categories (user_id, name, budget_limit, color_code)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, name, budget_limit, color_code]);

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const { id } = req.params;
    const parsed = CategorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const { name, budget_limit, color_code } = parsed.data;
    const result = await db.query(`
      UPDATE categories SET
        name = COALESCE($1, name),
        budget_limit = COALESCE($2, budget_limit),
        color_code = COALESCE($3, color_code)
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [name ?? null, budget_limit ?? null, color_code ?? null, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const { id } = req.params;
    const result = await db.query('DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update budget limit directly
apiRouter.post('/budgets', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const parsed = BudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const { category_id, budget_limit } = parsed.data;
    const result = await db.query(`
      UPDATE categories SET budget_limit = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [budget_limit, category_id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Error updating budget limit:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TRANSACTIONS ENDPOINTS
// ==========================================
apiRouter.get('/transactions', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const {
      category_id,
      startDate,
      endDate,
      payment_method,
      transaction_type,
      search,
      sort = 'transaction_date',
      order = 'DESC',
      limit = '50',
      offset = '0'
    } = req.query;

    let query = `
      SELECT 
        t.*,
        c.name as category_name,
        c.color_code as category_color
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = $1
    `;
    const params: any[] = [userId];

    if (category_id) {
      params.push(category_id);
      query += ` AND t.category_id = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND t.transaction_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND t.transaction_date <= $${params.length}`;
    }

    if (payment_method) {
      params.push(payment_method);
      query += ` AND t.payment_method = $${params.length}`;
    }

    if (transaction_type) {
      params.push(transaction_type);
      query += ` AND t.transaction_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (t.title ILIKE $${params.length} OR t.merchant ILIKE $${params.length} OR t.notes ILIKE $${params.length})`;
    }

    // Sorting
    const allowedSortFields = ['transaction_date', 'amount', 'title', 'created_at'];
    const sortField = allowedSortFields.includes(sort as string) ? (sort as string) : 'transaction_date';
    const sortOrder = (order as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY t.${sortField} ${sortOrder}`;

    // Pagination
    const numLimit = Math.min(parseInt(limit as string, 10) || 50, 200);
    const numOffset = Math.max(parseInt(offset as string, 10) || 0, 0);

    params.push(numLimit, numOffset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    // Get total count for pagination
    const countResult = await db.query('SELECT COUNT(*) as total FROM transactions WHERE user_id = $1', [userId]);

    res.json({
      transactions: result.rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount)
      })),
      total: parseInt(countResult.rows[0].total, 10)
    });
  } catch (err: any) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/transactions', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const parsed = TransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const {
      title,
      amount,
      category_id,
      transaction_type,
      payment_method,
      transaction_date,
      merchant,
      notes,
      is_recurring
    } = parsed.data;

    const result = await db.query(`
      INSERT INTO transactions (
        user_id, category_id, title, amount, transaction_type,
        payment_method, transaction_date, merchant, notes, is_recurring
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      userId,
      category_id || null,
      title,
      amount,
      transaction_type,
      payment_method,
      transaction_date,
      merchant || null,
      notes || null,
      is_recurring
    ]);

    // Fetch joined category details
    const tx = result.rows[0];
    if (tx.category_id) {
      const cat = await db.query('SELECT name, color_code FROM categories WHERE id = $1', [tx.category_id]);
      if (cat.rows.length > 0) {
        tx.category_name = cat.rows[0].name;
        tx.category_color = cat.rows[0].color_code;
      }
    }
    tx.amount = parseFloat(tx.amount);

    res.status(201).json(tx);
  } catch (err: any) {
    console.error('Error creating transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const { id } = req.params;
    const parsed = TransactionSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const {
      title,
      amount,
      category_id,
      transaction_type,
      payment_method,
      transaction_date,
      merchant,
      notes,
      is_recurring
    } = parsed.data;

    const result = await db.query(`
      UPDATE transactions SET
        title = COALESCE($1, title),
        amount = COALESCE($2, amount),
        category_id = COALESCE($3, category_id),
        transaction_type = COALESCE($4, transaction_type),
        payment_method = COALESCE($5, payment_method),
        transaction_date = COALESCE($6, transaction_date),
        merchant = COALESCE($7, merchant),
        notes = COALESCE($8, notes),
        is_recurring = COALESCE($9, is_recurring),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND user_id = $11
      RETURNING *
    `, [
      title ?? null,
      amount ?? null,
      category_id ?? null,
      transaction_type ?? null,
      payment_method ?? null,
      transaction_date ?? null,
      merchant ?? null,
      notes ?? null,
      is_recurring ?? null,
      id,
      userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = result.rows[0];
    tx.amount = parseFloat(tx.amount);
    res.json(tx);
  } catch (err: any) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/transactions/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const { id } = req.params;
    const result = await db.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/transactions/bulk-delete', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No transaction IDs provided' });
    }

    // Parameterized batch delete
    const placeholders = ids.map((_, idx) => `$${idx + 2}`).join(',');
    await db.query(`DELETE FROM transactions WHERE user_id = $1 AND id IN (${placeholders})`, [userId, ...ids]);

    res.json({ message: `Successfully deleted ${ids.length} transactions` });
  } catch (err: any) {
    console.error('Error in bulk delete:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RECURRING BILLS ENDPOINTS
// ==========================================
apiRouter.get('/bills', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);

    const result = await db.query(`
      SELECT * FROM recurring_bills
      WHERE user_id = $1
      ORDER BY due_date ASC
    `, [userId]);

    res.json(result.rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount)
    })));
  } catch (err: any) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/bills', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const parsed = RecurringBillSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const { title, amount, due_date, frequency, auto_pay, status } = parsed.data;
    const result = await db.query(`
      INSERT INTO recurring_bills (user_id, title, amount, due_date, frequency, auto_pay, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [userId, title, amount, due_date, frequency, auto_pay, status]);

    const bill = result.rows[0];
    bill.amount = parseFloat(bill.amount);
    res.status(201).json(bill);
  } catch (err: any) {
    console.error('Error creating recurring bill:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/bills/:id/status', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Paid', 'Overdue'].includes(status)) {
      return res.status(400).json({ error: 'Invalid bill status' });
    }

    const result = await db.query(`
      UPDATE recurring_bills SET status = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [status, id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const bill = result.rows[0];
    bill.amount = parseFloat(bill.amount);
    res.json(bill);
  } catch (err: any) {
    console.error('Error updating bill status:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/bills/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);
    const { id } = req.params;
    const result = await db.query('DELETE FROM recurring_bills WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    res.json({ message: 'Bill deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting bill:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ANALYTICS & DASHBOARD SUMMARY ENDPOINTS
// ==========================================
apiRouter.get('/analytics/summary', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);

    // Current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    // User profile
    const userRes = await db.query('SELECT monthly_income, currency, savings_target_pct FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0] || { monthly_income: 5000, currency: 'USD', savings_target_pct: 20 };
    const monthlyIncome = parseFloat(user.monthly_income);

    // Total expenses this month
    const expenseRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = $1 AND transaction_type = 'Expense'
        AND transaction_date >= $2 AND transaction_date <= $3
    `, [userId, startOfMonth, endOfMonth]);
    const totalExpenses = parseFloat(expenseRes.rows[0].total);

    // Total income recorded this month
    const incomeRes = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE user_id = $1 AND transaction_type = 'Income'
        AND transaction_date >= $2 AND transaction_date <= $3
    `, [userId, startOfMonth, endOfMonth]);
    const recordedIncome = parseFloat(incomeRes.rows[0].total);
    const effectiveIncome = recordedIncome > 0 ? recordedIncome : monthlyIncome;

    // Total budget allocated across all categories
    const budgetRes = await db.query('SELECT COALESCE(SUM(budget_limit), 0) as total FROM categories WHERE user_id = $1', [userId]);
    const totalBudgetAllocated = parseFloat(budgetRes.rows[0].total);

    // Category breakdown for current month
    const catBreakdownRes = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.color_code,
        c.budget_limit,
        COALESCE(SUM(t.amount), 0)::numeric as spent
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id 
        AND t.transaction_type = 'Expense'
        AND t.transaction_date >= $2 AND t.transaction_date <= $3
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY spent DESC
    `, [userId, startOfMonth, endOfMonth]);

    const categoryBreakdown = catBreakdownRes.rows.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color_code,
      budgetLimit: parseFloat(c.budget_limit),
      spent: parseFloat(c.spent),
      percentage: parseFloat(c.budget_limit) > 0 ? Math.round((parseFloat(c.spent) / parseFloat(c.budget_limit)) * 100) : 0
    }));

    // Payment method distribution
    const pmRes = await db.query(`
      SELECT payment_method, COUNT(*) as count, SUM(amount)::numeric as total
      FROM transactions
      WHERE user_id = $1 AND transaction_type = 'Expense'
        AND transaction_date >= $2 AND transaction_date <= $3
      GROUP BY payment_method
      ORDER BY total DESC
    `, [userId, startOfMonth, endOfMonth]);

    const paymentMethods = pmRes.rows.map(pm => ({
      method: pm.payment_method,
      count: parseInt(pm.count, 10),
      total: parseFloat(pm.total)
    }));

    // Month-over-month trend (last 6 months)
    const monthlyTrends: Array<{ month: string; expenses: number; income: number; savings: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      const mLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const mExp = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions
        WHERE user_id = $1 AND transaction_type = 'Expense' AND transaction_date >= $2 AND transaction_date <= $3
      `, [userId, mStart, mEnd]);

      const mInc = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as total FROM transactions
        WHERE user_id = $1 AND transaction_type = 'Income' AND transaction_date >= $2 AND transaction_date <= $3
      `, [userId, mStart, mEnd]);

      const expVal = parseFloat(mExp.rows[0].total);
      const incVal = parseFloat(mInc.rows[0].total) || monthlyIncome;

      monthlyTrends.push({
        month: mLabel,
        expenses: expVal,
        income: incVal,
        savings: Math.max(0, incVal - expVal)
      });
    }

    // Flagged categories exceeding 80%
    const flaggedCategories = categoryBreakdown.filter(c => c.percentage >= 80);

    // Upcoming unpaid bills
    const upcomingBillsRes = await db.query(`
      SELECT * FROM recurring_bills
      WHERE user_id = $1 AND status != 'Paid'
      ORDER BY due_date ASC
      LIMIT 5
    `, [userId]);

    res.json({
      currency: user.currency,
      monthlyIncome: effectiveIncome,
      totalExpenses,
      netBalance: effectiveIncome - totalExpenses,
      savingsRatePct: effectiveIncome > 0 ? Math.max(0, Math.round(((effectiveIncome - totalExpenses) / effectiveIncome) * 100)) : 0,
      targetSavingsPct: parseFloat(user.savings_target_pct),
      totalBudgetAllocated,
      categoryBreakdown,
      paymentMethods,
      monthlyTrends,
      flaggedCategories,
      upcomingBills: upcomingBillsRes.rows.map(b => ({ ...b, amount: parseFloat(b.amount) }))
    });
  } catch (err: any) {
    console.error('Error fetching analytics summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// AI ADVISOR ENDPOINTS
// ==========================================
apiRouter.post('/ai/audit-finances', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);

    // Fetch user profile
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    // Fetch categories with limits and current spent
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const catRes = await db.query(`
      SELECT 
        c.name,
        c.budget_limit,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Expense' AND t.transaction_date >= $2 AND t.transaction_date <= $3 THEN t.amount ELSE 0 END), 0)::numeric as current_spent
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id
    `, [userId, startOfMonth, endOfMonth]);

    // Fetch recent transactions
    const txRes = await db.query(`
      SELECT t.title, t.amount, t.payment_method, t.transaction_date, c.name as category_name
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = $1 AND t.transaction_type = 'Expense'
      ORDER BY t.transaction_date DESC
      LIMIT 35
    `, [userId]);

    // Fetch recurring bills
    const billRes = await db.query(`
      SELECT title, amount, frequency, auto_pay, status
      FROM recurring_bills
      WHERE user_id = $1
    `, [userId]);

    // Calculate totals
    const totalExpenses = catRes.rows.reduce((sum, c) => sum + parseFloat(c.current_spent), 0);
    const monthlyIncome = parseFloat(user.monthly_income);

    const context: AuditContext = {
      userProfile: {
        fullName: user.full_name,
        monthlyIncome,
        currency: user.currency || 'USD',
        familySize: user.family_size || 3,
        savingsTargetPct: parseFloat(user.savings_target_pct) || 20,
        primaryGoal: user.primary_goal || 'Emergency Fund Build',
      },
      categories: catRes.rows.map(c => ({
        name: c.name,
        budgetLimit: parseFloat(c.budget_limit),
        currentSpent: parseFloat(c.current_spent)
      })),
      transactionsSummary: {
        totalExpenses,
        totalIncome: monthlyIncome,
        recentTransactions: txRes.rows.map(t => ({
          title: t.title,
          amount: parseFloat(t.amount),
          category: t.category_name || 'Uncategorized',
          date: t.transaction_date,
          paymentMethod: t.payment_method
        }))
      },
      recurringBills: billRes.rows.map(b => ({
        title: b.title,
        amount: parseFloat(b.amount),
        frequency: b.frequency,
        autoPay: b.auto_pay,
        status: b.status
      }))
    };

    // Trigger AI generation
    const reportPayload = await generateFinancialAudit(context, user.gemini_api_key);

    // Save report to database
    const insertRes = await db.query(`
      INSERT INTO ai_financial_reports (user_id, summary, report_payload)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, reportPayload.executiveSummary, JSON.stringify(reportPayload)]);

    res.status(200).json(insertRes.rows[0]);
  } catch (err: any) {
    console.error('Error generating AI audit:', err);
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/ai/reports', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);

    const result = await db.query(`
      SELECT * FROM ai_financial_reports
      WHERE user_id = $1
      ORDER BY generated_at DESC
      LIMIT 10
    `, [userId]);

    res.json(result.rows.map(r => ({
      ...r,
      report_payload: typeof r.report_payload === 'string' ? JSON.parse(r.report_payload) : r.report_payload
    })));
  } catch (err: any) {
    console.error('Error fetching AI reports:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SEED / RESET DEMO DATA
// ==========================================
apiRouter.post('/seed', async (req: Request, res: Response) => {
  try {
    const db = await getDB();
    const userId = getUserId(req);

    // Clear existing user data
    await db.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM recurring_bills WHERE user_id = $1', [userId]);
    await db.query('DELETE FROM ai_financial_reports WHERE user_id = $1', [userId]);

    // Reseed
    await seedSampleData(db, userId);

    res.json({ message: 'Household sample data seeded successfully' });
  } catch (err: any) {
    console.error('Error resetting demo data:', err);
    res.status(500).json({ error: err.message });
  }
});
