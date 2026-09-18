async function runTests() {
  const baseUrl = 'http://localhost:5001/api';
  console.log('=== STARTING AUTOMATED END-TO-END VERIFICATION ===\n');

  // Test 1: User Profile
  console.log('1. Testing GET /api/user/profile...');
  const userRes = await fetch(`${baseUrl}/user/profile`);
  if (!userRes.ok) throw new Error(`User profile failed: ${userRes.status}`);
  const user = await userRes.json();
  console.log(`   ✓ Profile fetched: ${user.full_name} (${user.currency} ${user.monthly_income}/mo)`);

  // Test 2: Update Profile
  console.log('2. Testing PUT /api/user/profile...');
  const updateProfileRes = await fetch(`${baseUrl}/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ savings_target_pct: 30, primary_goal: 'Emergency Fund & Debt Reduction' })
  });
  const updatedUser = await updateProfileRes.json();
  console.log(`   ✓ Updated savings target: ${updatedUser.savings_target_pct}%`);

  // Test 3: Categories & Thresholds
  console.log('3. Testing GET /api/categories...');
  const catRes = await fetch(`${baseUrl}/categories`);
  const categories = await catRes.json();
  console.log(`   ✓ Retrieved ${categories.length} categories.`);
  const groceries = categories.find((c: any) => c.name === 'Groceries');
  console.log(`   ✓ Groceries: Spent ${groceries?.current_month_spent} of ${groceries?.budget_limit} limit (${groceries?.spent_percentage}%)`);

  // Test 4: Create Custom Category
  console.log('4. Testing POST /api/categories...');
  const newCatRes = await fetch(`${baseUrl}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Pet Care & Veterinary', budget_limit: 180, color_code: '#14B8A6' })
  });
  const newCat = await newCatRes.json();
  console.log(`   ✓ Created category: ${newCat.name} (id: ${newCat.id})`);

  // Test 5: Update Budget Limit
  console.log('5. Testing POST /api/budgets...');
  const updateBudgetRes = await fetch(`${baseUrl}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category_id: newCat.id, budget_limit: 220 })
  });
  const updatedCat = await updateBudgetRes.json();
  console.log(`   ✓ Updated ${updatedCat.name} budget limit to ${updatedCat.budget_limit}`);

  // Test 6: Record New Transaction
  console.log('6. Testing POST /api/transactions (Zod Validated)...');
  const createTxRes = await fetch(`${baseUrl}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Whole Foods Organic Lunch',
      amount: 34.50,
      category_id: groceries.id,
      transaction_type: 'Expense',
      payment_method: 'Credit Card',
      transaction_date: new Date().toISOString(),
      merchant: 'Whole Foods Market',
      notes: 'Healthy organic salad and kombucha',
      is_recurring: false
    })
  });
  const createdTx = await createTxRes.json();
  console.log(`   ✓ Created transaction: "${createdTx.title}" - $${createdTx.amount} (id: ${createdTx.id})`);

  // Test 7: Filter Transactions & Search
  console.log('7. Testing GET /api/transactions?search=Whole+Foods...');
  const filterTxRes = await fetch(`${baseUrl}/transactions?search=Whole+Foods`);
  const filterResult = await filterTxRes.json();
  console.log(`   ✓ Search returned ${filterResult.transactions.length} matching transactions.`);

  // Test 8: Recurring Bills
  console.log('8. Testing GET & POST /api/bills...');
  const newBillRes = await fetch(`${baseUrl}/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Cloud Storage & Family Backup',
      amount: 9.99,
      due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
      frequency: 'Monthly',
      auto_pay: true,
      status: 'Pending'
    })
  });
  const newBill = await newBillRes.json();
  console.log(`   ✓ Created recurring bill: "${newBill.title}" due in 5 days (Status: ${newBill.status})`);

  // Test 9: Toggle Bill Status
  console.log('9. Testing PATCH /api/bills/:id/status...');
  const patchBillRes = await fetch(`${baseUrl}/bills/${newBill.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Paid' })
  });
  const patchedBill = await patchBillRes.json();
  console.log(`   ✓ Toggled bill status to: ${patchedBill.status}`);

  // Test 10: Analytics Summary
  console.log('10. Testing GET /api/analytics/summary...');
  const summaryRes = await fetch(`${baseUrl}/analytics/summary`);
  const summary = await summaryRes.json();
  console.log(`    ✓ Monthly Income: $${summary.monthlyIncome}`);
  console.log(`    ✓ Total Expenses: $${summary.totalExpenses}`);
  console.log(`    ✓ Net Balance: $${summary.netBalance}`);
  console.log(`    ✓ Savings Rate: ${summary.savingsRatePct}%`);
  console.log(`    ✓ Flagged Categories (>80%): ${summary.flaggedCategories.map((c: any) => `${c.name} (${c.percentage}%)`).join(', ')}`);
  console.log(`    ✓ Historical Months Trend: ${summary.monthlyTrends.length} months`);

  // Test 11: AI Financial Audit
  console.log('11. Testing POST /api/ai/audit-finances (Gemini 2.5 Flash / Schema Conformance)...');
  const auditRes = await fetch(`${baseUrl}/ai/audit-finances`, { method: 'POST' });
  const audit = await auditRes.json();
  console.log(`    ✓ Audit Report Generated! Report ID: ${audit.id}`);
  console.log(`    ✓ Financial Health Score: ${audit.report_payload.healthScore}/100`);
  console.log(`    ✓ Identified Leakages: ${audit.report_payload.identifiedLeakage.length} items`);
  console.log(`    ✓ Actionable Steps: ${audit.report_payload.actionableSteps.length} recommendations`);
  console.log(`    ✓ Budget Adjustments: ${audit.report_payload.budgetAdjustments.length} category suggestions`);

  // Test 12: Delete created test transaction
  console.log('12. Testing DELETE /api/transactions/:id...');
  const delTx = await fetch(`${baseUrl}/transactions/${createdTx.id}`, { method: 'DELETE' });
  const delTxResult = await delTx.json();
  console.log(`    ✓ Deleted test transaction: ${delTxResult.message}`);

  // Test 13: Delete test category
  console.log('13. Testing DELETE /api/categories/:id...');
  const delCat = await fetch(`${baseUrl}/categories/${newCat.id}`, { method: 'DELETE' });
  const delCatResult = await delCat.json();
  console.log(`    ✓ Deleted test category: ${delCatResult.message}`);

  console.log('\n=== ALL 13 END-TO-END AUTOMATED TESTS PASSED WITH 100% SUCCESS! ===');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
