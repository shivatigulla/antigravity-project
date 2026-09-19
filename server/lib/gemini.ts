import { GoogleGenAI, Type, type Schema } from '@google/genai';
import type { AIFinancialReportPayload } from '../../shared/schema.js';

export const financialAuditSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    healthScore: { type: Type.NUMBER },
    executiveSummary: { type: Type.STRING },
    identifiedLeakage: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          issue: { type: Type.STRING },
          estimatedMonthlySavings: { type: Type.NUMBER }
        },
        required: ['category', 'issue', 'estimatedMonthlySavings']
      }
    },
    actionableSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    budgetAdjustments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          recommendedLimit: { type: Type.NUMBER }
        },
        required: ['category', 'recommendedLimit']
      }
    }
  },
  required: ['healthScore', 'executiveSummary', 'identifiedLeakage', 'actionableSteps', 'budgetAdjustments']
};

export interface AuditContext {
  userProfile: {
    fullName: string;
    monthlyIncome: number;
    currency: string;
    familySize: number;
    savingsTargetPct: number;
    primaryGoal: string;
  };
  categories: Array<{
    name: string;
    budgetLimit: number;
    currentSpent: number;
  }>;
  transactionsSummary: {
    totalExpenses: number;
    totalIncome: number;
    recentTransactions: Array<{
      title: string;
      amount: number;
      category: string;
      date: string;
      paymentMethod: string;
    }>;
  };
  recurringBills: Array<{
    title: string;
    amount: number;
    frequency: string;
    autoPay: boolean;
    status: string;
  }>;
}

export async function generateFinancialAudit(
  context: AuditContext,
  customApiKey?: string
): Promise<AIFinancialReportPayload> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 0 && !apiKey.includes('your_gemini_api_key_here')) {
    try {
      console.log('[AI] Initializing Google GenAI client with gemini-2.5-flash...');
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

      const systemPrompt = `You are a Principal Household Financial Advisor and Budget Optimization Specialist. Your purpose is to evaluate raw household expense records, monthly income, recurring bills, and user financial goals to construct a precise, actionable, and leakage-reducing financial report. Focus on identifying non-essential spending, subscription bloat, and utility optimization. Respond ONLY with valid, unformatted raw JSON matching the required target schema.`;

      const prompt = `
Household Financial Audit Request:
- Household Lead: ${context.userProfile.fullName}
- Monthly Income: ${context.userProfile.currency} ${context.userProfile.monthlyIncome}
- Family Size: ${context.userProfile.familySize} members
- Target Monthly Savings: ${context.userProfile.savingsTargetPct}%
- Primary Financial Goal: ${context.userProfile.primaryGoal}

Current Category Budget Allocations & Spending This Month:
${JSON.stringify(context.categories, null, 2)}

Active Recurring Bills & Subscriptions:
${JSON.stringify(context.recurringBills, null, 2)}

Recent Expense Transactions:
${JSON.stringify(context.transactionsSummary.recentTransactions, null, 2)}

Total Month Spending: ${context.userProfile.currency} ${context.transactionsSummary.totalExpenses}
Total Month Income: ${context.userProfile.currency} ${context.transactionsSummary.totalIncome}

Analyze spending leaks, recommend realistic category limit adjustments, and calculate a Financial Health Score (0-100). Output structured JSON adhering strictly to the schema.
`;

      let response: any;
      const modelNames = ['gemini-2.5-flash', 'gemini-1.5-flash'];
      
      for (const model of modelNames) {
        try {
          console.log(`[AI] Attempting generation with model ${model}...`);
          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: financialAuditSchema,
              temperature: 0.2,
            },
          });
          if (response?.text) {
            console.log(`[AI] Successfully received response from ${model}.`);
            break;
          }
        } catch (modelErr: any) {
          console.warn(`[AI] Model ${model} returned error: ${modelErr.message}`);
        }
      }

      const responseText = response?.text;
      if (responseText) {
        const parsed = JSON.parse(responseText) as AIFinancialReportPayload;
        console.log('[AI] Successfully received and parsed audit from Gemini 2.5 Flash.');
        return parsed;
      }
    } catch (err: any) {
      console.error('[AI] Error calling Gemini API:', err.message);
      console.log('[AI] Falling back to intelligent heuristic analysis engine...');
    }
  } else {
    console.log('[AI] No GEMINI_API_KEY detected. Running intelligent local heuristic financial auditor...');
  }

  // Fallback intelligent heuristic auditor based on actual user transactions
  return generateHeuristicAudit(context);
}

function generateHeuristicAudit(context: AuditContext): AIFinancialReportPayload {
  const { userProfile, categories, transactionsSummary, recurringBills } = context;
  const income = userProfile.monthlyIncome || 5000;
  const totalSpend = transactionsSummary.totalExpenses;
  const savingsTargetAmount = (income * userProfile.savingsTargetPct) / 100;
  const netSavings = income - totalSpend;

  // Calculate Health Score
  let score = 75;
  if (totalSpend > income) {
    score = Math.max(25, Math.round(50 - ((totalSpend - income) / income) * 50));
  } else if (netSavings >= savingsTargetAmount) {
    score = Math.min(95, Math.round(75 + (netSavings / income) * 25));
  } else {
    score = Math.max(40, Math.round(55 + (netSavings / savingsTargetAmount) * 20));
  }

  // Identify category overspends or near limits
  const overspentCategories = categories.filter(c => c.budgetLimit > 0 && c.currentSpent > c.budgetLimit);
  const nearLimitCategories = categories.filter(c => c.budgetLimit > 0 && c.currentSpent >= c.budgetLimit * 0.8 && c.currentSpent <= c.budgetLimit);

  const leakages: Array<{ category: string; issue: string; estimatedMonthlySavings: number }> = [];

  // Check subscriptions
  const subs = recurringBills.filter(b => b.title.toLowerCase().includes('stream') || b.title.toLowerCase().includes('netflix') || b.title.toLowerCase().includes('disney') || b.title.toLowerCase().includes('spotify'));
  if (subs.length > 1) {
    const totalSubs = subs.reduce((acc, s) => acc + s.amount, 0);
    leakages.push({
      category: 'Subscriptions & Entertainment',
      issue: `Multiple streaming & audio services detected (${subs.map(s => s.title).join(', ')} totaling ${userProfile.currency}${totalSubs.toFixed(2)}/mo). Consider alternating streaming platforms monthly.`,
      estimatedMonthlySavings: Math.round(totalSubs * 0.4)
    });
  }

  // Check Dining / Miscellaneous
  const misc = categories.find(c => c.name.toLowerCase().includes('misc') || c.name.toLowerCase().includes('shopping'));
  if (misc && misc.currentSpent > 150) {
    leakages.push({
      category: misc.name,
      issue: `Discretionary purchases in ${misc.name} are trending higher than optimal for a family of ${userProfile.familySize}. Implementing a 48-hour cool-off rule for non-essential buys can capture direct savings.`,
      estimatedMonthlySavings: Math.round(misc.currentSpent * 0.3)
    });
  }

  // Check Utilities
  const util = categories.find(c => c.name.toLowerCase().includes('util'));
  if (util && util.currentSpent > 200) {
    leakages.push({
      category: util.name,
      issue: `Utility expenses currently represent a significant operational cost. Programmable thermostat scheduling and peak-rate shifting could yield 12-15% monthly efficiency.`,
      estimatedMonthlySavings: Math.round(util.currentSpent * 0.15)
    });
  }

  if (leakages.length === 0) {
    leakages.push({
      category: 'Groceries',
      issue: 'Bulk club store meal prepping can cut per-meal costs by 18% without sacrificing quality for a household of this size.',
      estimatedMonthlySavings: 90
    });
  }

  const budgetAdjustments = categories.map(cat => {
    let rec = cat.budgetLimit;
    if (cat.currentSpent > cat.budgetLimit) {
      rec = Math.round(cat.budgetLimit * 1.1); // suggest realistic buffer
    } else if (cat.currentSpent < cat.budgetLimit * 0.6 && cat.budgetLimit > 200) {
      rec = Math.round(cat.budgetLimit * 0.85); // trim excess
    }
    return {
      category: cat.name,
      recommendedLimit: rec
    };
  });

  const totalPotentialSavings = leakages.reduce((sum, l) => sum + l.estimatedMonthlySavings, 0);

  const executiveSummary = `The household's current spending stands at ${userProfile.currency} ${totalSpend.toFixed(2)} against a monthly income of ${userProfile.currency} ${income.toFixed(2)}. ${
    netSavings >= savingsTargetAmount
      ? `You are on track toward your target savings of ${userProfile.savingsTargetPct}%!`
      : `You are currently saving ${netSavings > 0 ? userProfile.currency + ' ' + netSavings.toFixed(2) : 'nothing (deficit)'}, falling short of your ${userProfile.savingsTargetPct}% (${userProfile.currency} ${savingsTargetAmount.toFixed(2)}) target.`
  } By addressing ${leakages.length} identified leakages, you can recover an estimated ${userProfile.currency} ${totalPotentialSavings.toFixed(2)} monthly to accelerate your goal of "${userProfile.primaryGoal}".`;

  const actionableSteps = [
    `Consolidate entertainment subscriptions: prioritize 1 primary streaming service and pause secondary bundles for an immediate ${userProfile.currency} ${Math.round(totalPotentialSavings * 0.3)}/mo reduction.`,
    `Cap discretionary shopping with automated envelope allocation to safeguard the remaining ${userProfile.currency} ${Math.max(0, netSavings).toFixed(2)} balance.`,
    `Review upcoming auto-pay recurring bills (${recurringBills.filter(b => b.autoPay).length} automated) to ensure no forgotten trials renew.`,
    `Align category limits with recommended adjustments to buffer against unexpected utility or grocery spikes.`
  ];

  return {
    healthScore: score,
    executiveSummary,
    identifiedLeakage: leakages,
    actionableSteps,
    budgetAdjustments
  };
}
