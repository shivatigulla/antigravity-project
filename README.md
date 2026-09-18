# 💰 Smart Household Expense & Financial Advisor

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-white.svg)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4.svg)](https://ai.google.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Embedded_PGlite-336791.svg)](https://github.com/electric-sql/pglite)

A complete, production-grade full-stack web application to streamline personal and household financial tracking, eliminate notebook/spreadsheet friction, prevent category budget overruns, and deliver automated AI-driven spending audits and bill reminders.

---

## 🚀 Key Features

- **Multi-Category Expense Logging**: Full CRUD operations for daily expenses with payment methods, recurring indicators, and store/merchant tagging.
- **Dynamic Threshold Alerts**: Real-time envelope budget utilization with automated visual breach indicators (**Green** `<80%`, **Amber** `80–100%`, **Red** `>100%`).
- **Recurring Bills & Subscription Tracker**: Scheduled payables management with due dates, frequency cycles (Weekly, Monthly, Quarterly, Yearly), and Auto-Pay tags.
- **AI Financial Advisor & Expense Auditor**: Server-side `@google/genai` integration with `gemini-2.5-flash` / `gemini-3.6-flash` delivering structured Health Scores (0–100), identified spending leakage with estimated dollar savings, actionable roadmap checklists, and one-click category limit adjustments.
- **Visual Analytics**: Interactive Recharts dashboards including Expense Allocation Donut Charts, 6-Month Income vs Expense Bar Charts, and Payment Instrument splits.
- **Zero-Friction Dual Database Engine**: Supports both standard external PostgreSQL (`DATABASE_URL`) and zero-dependency embedded persistent PostgreSQL (`@electric-sql/pglite` in `./data/postgres`).
- **Multi-Currency & Household Settings**: Configurable operating currencies (USD, EUR, GBP, INR, CAD, AUD, JPY), income targets, and 1-click demo data re-seeder.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, TanStack Query v5, Recharts |
| **Backend** | Node.js, Express.js (TypeScript), Helmet, CORS, tsx |
| **Database** | PostgreSQL / PGlite (WASM embedded Postgres with local persistence) |
| **AI Integration** | `@google/genai` (Google Gen AI SDK) using `gemini-2.5-flash` / `gemini-3.6-flash` |
| **Validation** | Zod (shared schemas across client & server) |

---

## 📁 Repository Structure

```
├── client/
│   ├── src/
│   │   ├── components/       # MetricCard, BudgetProgressBar, ExpenseTable, Modals
│   │   ├── pages/            # Dashboard, Expenses, Budgets, Bills, AI Advisor, Analytics, Settings
│   │   ├── lib/              # API client, formatting utilities, colors
│   │   ├── App.tsx           # Router and global layout shell
│   │   ├── index.css         # Tailwind directives & glassmorphic styling
│   │   └── main.tsx          # QueryClientProvider & React DOM entry
│   └── index.html
├── server/
│   ├── lib/
│   │   └── gemini.ts         # @google/genai structured prompt & fallback engine
│   ├── db.ts                 # PostgreSQL / PGlite connection & schema migrations
│   ├── routes.ts             # REST API controllers (Zod-validated)
│   └── index.ts              # Express initialization & security middleware
├── shared/
│   └── schema.ts             # Shared Zod schemas, TypeScript types, and enums
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## ⚡ Quick Start

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd smart-household-finance-advisor
npm install
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env
```
Edit `.env` to set your Gemini API key (or enter it via the `/settings` page in the UI):
```env
PORT=5001
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5001/api](http://localhost:5001/api)

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🔒 Security & Best Practices

- **Zero Client Key Leaks**: All AI operations execute strictly on the Express backend; API keys are never exposed in browser bundles.
- **SQL Injection Safeguards**: 100% parameterized SQL statements across all queries and filters.
- **HTTP Security**: Strict security headers enforced via Helmet.
- **Schema Validation**: All inbound mutation payloads validated against shared Zod schemas.
