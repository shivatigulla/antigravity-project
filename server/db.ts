import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { DEFAULT_CATEGORIES } from '../shared/schema.js';

const { Pool } = pg;

export interface DBClient {
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
}

let dbClient: DBClient;

export async function initDB(): Promise<DBClient> {
  if (dbClient) return dbClient;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !databaseUrl.includes('localhost:5432/household_finance_db')) {
    try {
      console.log('[DB] Attempting PostgreSQL connection via DATABASE_URL...');
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' && !databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : undefined,
      });
      // Test query
      await pool.query('SELECT 1');
      console.log('[DB] Connected successfully to external PostgreSQL database.');
      dbClient = {
        query: async <T = any>(text: string, params?: any[]) => {
          const res = await pool.query(text, params);
          return { rows: res.rows as T[] };
        }
      };
    } catch (err: any) {
      console.warn(`[DB] External PostgreSQL connection failed (${err.message}). Falling back to embedded PGlite.`);
    }
  }

  if (!dbClient) {
    const dataDir = path.resolve(process.cwd(), './data/postgres');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    console.log(`[DB] Initializing embedded persistent PostgreSQL (PGlite) at: ${dataDir}`);
    const pglite = new PGlite(dataDir);
    dbClient = {
      query: async (text: string, params?: any[]) => {
        const res = await pglite.query(text, params);
        return { rows: res.rows as any[] };
      }
    };
    console.log('[DB] Embedded PostgreSQL ready.');
  }

  await runMigrationsAndSeed(dbClient);
  return dbClient;
}

export async function getDB(): Promise<DBClient> {
  if (!dbClient) {
    return initDB();
  }
  return dbClient;
}

export const DEFAULT_USER_ID = 'a0000000-0000-0000-0000-000000000001';

async function runMigrationsAndSeed(db: DBClient) {
  console.log('[DB] Running database migrations...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      monthly_income NUMERIC(12, 2) DEFAULT 5400.00,
      family_size INT DEFAULT 3,
      savings_target_pct NUMERIC(5, 2) DEFAULT 25.00,
      primary_goal VARCHAR(100) DEFAULT 'Emergency Fund Build',
      gemini_api_key TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      budget_limit NUMERIC(12, 2) DEFAULT 0.00,
      color_code VARCHAR(7) DEFAULT '#10B981',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      transaction_type VARCHAR(20) NOT NULL DEFAULT 'Expense' CHECK (transaction_type IN ('Expense', 'Income')),
      payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI / Digital Wallet')),
      transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
      merchant VARCHAR(255),
      notes TEXT,
      is_recurring BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS recurring_bills (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      due_date TIMESTAMP WITH TIME ZONE NOT NULL,
      frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('Weekly', 'Monthly', 'Quarterly', 'Yearly')),
      auto_pay BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_financial_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      summary TEXT NOT NULL,
      report_payload JSONB NOT NULL
    );
  `);

  // Ensure default user exists
  const existingUser = await db.query('SELECT id FROM users WHERE id = $1', [DEFAULT_USER_ID]);
  if (existingUser.rows.length === 0) {
    console.log('[DB] Seeding default household profile...');
    await db.query(`
      INSERT INTO users (id, email, full_name, currency, monthly_income, family_size, savings_target_pct, primary_goal)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      DEFAULT_USER_ID,
      'household.lead@advisor.local',
      'The Henderson Household',
      'USD',
      5800.00,
      3,
      25.00,
      'Emergency Fund Build & Subscription Pruning'
    ]);
  }

  // Ensure default categories exist for default user
  const existingCats = await db.query('SELECT count(*) as count FROM categories WHERE user_id = $1', [DEFAULT_USER_ID]);
  if (parseInt(existingCats.rows[0].count, 10) === 0) {
    console.log('[DB] Seeding default expense categories...');
    for (const cat of DEFAULT_CATEGORIES) {
      await db.query(`
        INSERT INTO categories (user_id, name, budget_limit, color_code)
        VALUES ($1, $2, $3, $4)
      `, [DEFAULT_USER_ID, cat.name, cat.budget_limit, cat.color_code]);
    }
  }

  // Check if we need initial seed transactions
  const txCount = await db.query('SELECT count(*) as count FROM transactions WHERE user_id = $1', [DEFAULT_USER_ID]);
  if (parseInt(txCount.rows[0].count, 10) === 0) {
    console.log('[DB] Seeding sample transactions and recurring bills for realistic display...');
    await seedSampleData(db, DEFAULT_USER_ID);
  }

  console.log('[DB] Database initialization and migrations finished successfully.');
}

export async function seedSampleData(db: DBClient, userId: string) {
  // Fetch categories
  const catRes = await db.query('SELECT id, name FROM categories WHERE user_id = $1', [userId]);
  const catMap = new Map<string, string>();
  for (const row of catRes.rows) {
    catMap.set(row.name, row.id);
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const transactions = [
    // Income
    {
      title: 'Primary Salary - Household Monthly',
      amount: 5800.00,
      type: 'Income',
      method: 'Bank Transfer',
      cat: null,
      date: new Date(year, month, 1).toISOString(),
      merchant: 'Acme Global Corp',
      notes: 'Direct deposit monthly payout',
      recurring: true
    },
    // Groceries
    {
      title: 'Weekly Organic Grocery Run',
      amount: 178.40,
      type: 'Expense',
      method: 'Credit Card',
      cat: catMap.get('Groceries'),
      date: new Date(year, month, 2).toISOString(),
      merchant: 'Whole Foods Market',
      notes: 'Fresh produce, milk, eggs, pantry staples',
      recurring: false
    },
    {
      title: 'Mid-week Supermarket Restock',
      amount: 86.20,
      type: 'Expense',
      method: 'Debit Card',
      cat: catMap.get('Groceries'),
      date: new Date(year, month, 7).toISOString(),
      merchant: "Trader Joe's",
      notes: 'Snacks, bakery, household items',
      recurring: false
    },
    {
      title: 'Bulk Household Goods & Meats',
      amount: 245.50,
      type: 'Expense',
      method: 'Credit Card',
      cat: catMap.get('Groceries'),
      date: new Date(year, month, 12).toISOString(),
      merchant: 'Costco Wholesale',
      notes: 'Paper towels, poultry, detergents',
      recurring: false
    },
    // Housing
    {
      title: 'Monthly Apartment Rent',
      amount: 1500.00,
      type: 'Expense',
      method: 'Bank Transfer',
      cat: catMap.get('Rent & Housing'),
      date: new Date(year, month, 1).toISOString(),
      merchant: 'Skyline Residential LLC',
      notes: 'Primary 3-bedroom lease payment',
      recurring: true
    },
    // Utilities
    {
      title: 'City Electric & Power Grid',
      amount: 142.30,
      type: 'Expense',
      method: 'Bank Transfer',
      cat: catMap.get('Electricity & Utilities'),
      date: new Date(year, month, 5).toISOString(),
      merchant: 'ConEd Power & Light',
      notes: 'AC and winter heating bill',
      recurring: true
    },
    {
      title: 'High-Speed Fiber Internet',
      amount: 79.99,
      type: 'Expense',
      method: 'Credit Card',
      cat: catMap.get('Electricity & Utilities'),
      date: new Date(year, month, 4).toISOString(),
      merchant: 'Verizon Fios',
      notes: '1 Gbps symmetrical internet',
      recurring: true
    },
    // Transportation
    {
      title: 'Family SUV Monthly Fuel Refill',
      amount: 68.00,
      type: 'Expense',
      method: 'Credit Card',
      cat: catMap.get('Transportation'),
      date: new Date(year, month, 6).toISOString(),
      merchant: 'Shell Gas Station',
      notes: 'Regular unleaded',
      recurring: false
    },
    {
      title: 'Metro Transit Passes',
      amount: 120.00,
      type: 'Expense',
      method: 'Debit Card',
      cat: catMap.get('Transportation'),
      date: new Date(year, month, 3).toISOString(),
      merchant: 'MTA Transit Authority',
      notes: 'Monthly commuter card',
      recurring: true
    },
    // Subscriptions
    {
      title: 'Netflix Premium 4K Family',
      amount: 22.99,
      type: 'Expense',
      method: 'Credit Card',
      cat: catMap.get('Subscriptions & Entertainment'),
      date: new Date(year, month, 8).toISOString(),
      merchant: 'Netflix Inc',
      notes: 'Family 4-stream subscription',
      recurring: true
    },
    {
      title: 'Spotify Family Audio Stream',
      amount: 19.99,
      type: 'Expense',
      method: 'Credit Card',
      cat: catMap.get('Subscriptions & Entertainment'),
      date: new Date(year, month, 10).toISOString(),
      merchant: 'Spotify USA',
      notes: '6 accounts family plan',
      recurring: true
    },
    {
      title: 'Gym & Fitness Center Membership',
      amount: 85.00,
      type: 'Expense',
      method: 'Debit Card',
      cat: catMap.get('Subscriptions & Entertainment'),
      date: new Date(year, month, 2).toISOString(),
      merchant: 'Equinox Health Club',
      notes: 'Household dual pass',
      recurring: true
    },
    // Medical & Healthcare
    {
      title: 'Prescription Refills & Supplements',
      amount: 64.30,
      type: 'Expense',
      method: 'UPI / Digital Wallet',
      cat: catMap.get('Medical & Healthcare'),
      date: new Date(year, month, 9).toISOString(),
      merchant: 'CVS Pharmacy',
      notes: 'Monthly allergy medication & multivitamins',
      recurring: false
    },
    // Education
    {
      title: 'Kids STEM Afterschool Academy',
      amount: 250.00,
      type: 'Expense',
      method: 'Bank Transfer',
      cat: catMap.get('Education'),
      date: new Date(year, month, 3).toISOString(),
      merchant: 'Robotics & Coding Camp',
      notes: 'Weekly evening module',
      recurring: true
    },
    // Shopping
    {
      title: 'Kids Winter Apparel & Boots',
      amount: 189.50,
      type: 'Expense',
      method: 'Credit Card',
      cat: catMap.get('Shopping'),
      date: new Date(year, month, 11).toISOString(),
      merchant: 'Target Stores',
      notes: 'Thermal coats and shoes',
      recurring: false
    },
    // Dining / Miscellaneous
    {
      title: 'Family Weekend Dinner Celebration',
      amount: 115.80,
      type: 'Expense',
      method: 'Credit Card',
      cat: catMap.get('Miscellaneous'),
      date: new Date(year, month, 13).toISOString(),
      merchant: 'Olive Garden Bistro',
      notes: 'Weekend dinner treat',
      recurring: false
    }
  ];

  for (const t of transactions) {
    await db.query(`
      INSERT INTO transactions (user_id, category_id, title, amount, transaction_type, payment_method, transaction_date, merchant, notes, is_recurring)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [userId, t.cat, t.title, t.amount, t.type, t.method, t.date, t.merchant, t.notes, t.recurring]);
  }

  // Seed Recurring Bills
  const recurringBills = [
    {
      title: 'Skyline Residential Rent',
      amount: 1500.00,
      due_date: new Date(year, month + 1, 1).toISOString(),
      frequency: 'Monthly',
      auto_pay: true,
      status: 'Pending'
    },
    {
      title: 'Electric & Gas Utility Bill',
      amount: 145.00,
      due_date: new Date(year, month, 22).toISOString(),
      frequency: 'Monthly',
      auto_pay: true,
      status: 'Pending'
    },
    {
      title: 'Municipal Water & Sewer',
      amount: 62.50,
      due_date: new Date(year, month, 25).toISOString(),
      frequency: 'Monthly',
      auto_pay: false,
      status: 'Pending'
    },
    {
      title: 'High Speed Fiber Broadband',
      amount: 79.99,
      due_date: new Date(year, month, 28).toISOString(),
      frequency: 'Monthly',
      auto_pay: true,
      status: 'Pending'
    },
    {
      title: 'Family Medical Insurance Premium',
      amount: 320.00,
      due_date: new Date(year, month + 1, 5).toISOString(),
      frequency: 'Monthly',
      auto_pay: true,
      status: 'Pending'
    },
    {
      title: 'Automobile Insurance Policy',
      amount: 165.00,
      due_date: new Date(year, month, 18).toISOString(),
      frequency: 'Monthly',
      auto_pay: false,
      status: 'Pending'
    },
    {
      title: 'Disney+ / Hulu Streaming Bundle',
      amount: 24.99,
      due_date: new Date(year, month, 15).toISOString(),
      frequency: 'Monthly',
      auto_pay: true,
      status: 'Paid'
    }
  ];

  for (const b of recurringBills) {
    await db.query(`
      INSERT INTO recurring_bills (user_id, title, amount, due_date, frequency, auto_pay, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, b.title, b.amount, b.due_date, b.frequency, b.auto_pay, b.status]);
  }
}
