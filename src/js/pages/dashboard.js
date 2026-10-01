// ====== DASHBOARD & LIST DATA ======
async function loadData() {
    let allTx = await db.transactions.toArray();
    allTx.sort((a, b) => {
        let dateA = a.date || '';
        let dateB = b.date || '';
        return dateB.localeCompare(dateA);
    });
    
    const tbody = document.getElementById('transactionList');
    if (tbody) tbody.innerHTML = '';
    
    const incBody = document.getElementById('recentIncomeList');
    if (incBody) incBody.innerHTML = '';
    const expBody = document.getElementById('recentExpenseList');
    if (expBody) expBody.innerHTML = '';
    
    let incCashKhr = 0, incCashUsd = 0, incBankKhr = 0, incBankUsd = 0;
    let expCashKhr = 0, expCashUsd = 0, expBankKhr = 0, expBankUsd = 0;
    
    const chartData = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        chartData[dateStr] = { income: 0, expense: 0 };
    }

    const currentMonthPrefix = today.toISOString().split('T')[0].substring(0, 7);

    // Get filter values for income list
    const incFrom = document.getElementById('filter-inc-from') ? document.getElementById('filter-inc-from').value : '';
    const incTo = document.getElementById('filter-inc-to') ? document.getElementById('filter-inc-to').value : '';
    let incCount = 0;
    const incHasFilter = incFrom || incTo;

    // Get filter values for expense list
    const expFrom = document.getElementById('filter-exp-from') ? document.getElementById('filter-exp-from').value : '';
    const expTo = document.getElementById('filter-exp-to') ? document.getElementById('filter-exp-to').value : '';
    let expCount = 0;
    const expHasFilter = expFrom || expTo;

    allTx.forEach(tx => {
        const cur = tx.currency || 'KHR';
        
        // Dashboard
        if (tbody && tbody.children.length < 50) {
            const tr = document.createElement('tr');
                    tr.className = tx.type === 'income' ? 'tx-income' : 'tx-expense';
            tr.innerHTML = `
                <td>${formatEngDate(tx.date)}</td>
                <td><span class="badge ${tx.type === 'income' ? 'bg-success' : 'bg-danger'}">${tx.type === 'income' ? 'ចំណូល' : 'ចំណាយ'}</span></td>
                <td>${tx.category} <span class="badge bg-secondary ms-1" style="font-size: 0.7rem;">${tx.paymentMethod === "Bank" ? "Bank" : "Cash"}</span></td>
                <td class="${tx.type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(tx.amount, cur)}</td>
                <td class="d-none d-md-table-cell">${tx.note}</td>
            `;
            tbody.appendChild(tr);
        }

        // Income List
        if (tx.type === 'income' && incBody) {
            let match = true;
            if (incFrom && tx.date < incFrom) match = false;
            if (incTo && tx.date > incTo) match = false;
            
            if (match) {
                const limit = incHasFilter ? 99999 : 20;
                if (incCount < limit) {
                    incCount++;
                    const tr = document.createElement('tr');
                    tr.className = tx.type === 'income' ? 'tx-income' : 'tx-expense';
                    let ck = "-", cu = "-", bk = "-", bu = "-";
                    if (tx.paymentMethod === "Bank") {
                        if (cur === "USD") { bu = formatCurrency(tx.amount, "USD"); incBankUsd += tx.amount; }
                        else { bk = formatCurrency(tx.amount, "KHR"); incBankKhr += tx.amount; }
                    } else {
                        if (cur === "USD") { cu = formatCurrency(tx.amount, "USD"); incCashUsd += tx.amount; }
                        else { ck = formatCurrency(tx.amount, "KHR"); incCashKhr += tx.amount; }
                    }
                    tr.innerHTML = `<td>${formatEngDate(tx.date)}</td><td>${tx.category}</td><td class="text-success text-center">${ck}</td><td class="text-success text-center">${cu}</td><td class="text-success text-center">${bk}</td><td class="text-success text-center">${bu}</td><td class="d-none d-md-table-cell">${tx.note}</td><td class="text-end">${hasPermission('income') ? `<div class="d-flex justify-content-end gap-1"><button class="btn btn-sm btn-warning btn-edit" onclick="editTransaction(${tx.id}, 'income')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button><button class="btn btn-sm btn-danger btn-delete" onclick="deleteTransaction(${tx.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></div>` : ''}</td>`;
                    incBody.appendChild(tr);
                }
            }
        }

        // Expense List
        if (tx.type === 'expense' && expBody) {
            let match = true;
            if (expFrom && tx.date < expFrom) match = false;
            if (expTo && tx.date > expTo) match = false;
            
            if (match) {
                const limit = expHasFilter ? 99999 : 20;
                if (expCount < limit) {
                    expCount++;
                    const tr = document.createElement('tr');
                    tr.className = tx.type === 'income' ? 'tx-income' : 'tx-expense';
                    let ck = "-", cu = "-", bk = "-", bu = "-";
                    if (tx.paymentMethod === "Bank") {
                        if (cur === "USD") { bu = formatCurrency(tx.amount, "USD"); expBankUsd += tx.amount; }
                        else { bk = formatCurrency(tx.amount, "KHR"); expBankKhr += tx.amount; }
                    } else {
                        if (cur === "USD") { cu = formatCurrency(tx.amount, "USD"); expCashUsd += tx.amount; }
                        else { ck = formatCurrency(tx.amount, "KHR"); expCashKhr += tx.amount; }
                    }
                    tr.innerHTML = `<td>${formatEngDate(tx.date)}</td><td>${tx.category}</td><td class="text-danger text-center">${ck}</td><td class="text-danger text-center">${cu}</td><td class="text-danger text-center">${bk}</td><td class="text-danger text-center">${bu}</td><td class="d-none d-md-table-cell">${tx.note}</td><td class="text-end">${hasPermission('expense') ? `<div class="d-flex justify-content-end gap-1"><button class="btn btn-sm btn-warning btn-edit" onclick="editTransaction(${tx.id}, 'expense')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button><button class="btn btn-sm btn-danger btn-delete" onclick="deleteTransaction(${tx.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></div>` : ''}</td>`;
                    expBody.appendChild(tr);
                }
            }
        }

                if (tx.date && tx.date.startsWith(currentMonthPrefix)) {
            const method = tx.paymentMethod || 'Cash';
            if (tx.type === 'income') {
                if (cur === 'USD' && method === 'Cash') incCashUsd += tx.amount;
                if (cur === 'KHR' && method === 'Cash') incCashKhr += tx.amount;
                if (cur === 'USD' && method === 'Bank') incBankUsd += tx.amount;
                if (cur === 'KHR' && method === 'Bank') incBankKhr += tx.amount;
            } else {
                if (cur === 'USD' && method === 'Cash') expCashUsd += tx.amount;
                if (cur === 'KHR' && method === 'Cash') expCashKhr += tx.amount;
                if (cur === 'USD' && method === 'Bank') expBankUsd += tx.amount;
                if (cur === 'KHR' && method === 'Bank') expBankKhr += tx.amount;
            }
        }

        if (chartData[tx.date] !== undefined) {
            let amountInChart = cur === 'USD' ? tx.amount * (tx.exchangeRate || window.sysExchangeRate || 4100) : tx.amount;
            chartData[tx.date][tx.type] += amountInChart;
        }
    });

    if(document.getElementById('totalIncUnified')) {
        const rate = window.sysExchangeRate || 4100;
        
        // Income
        const totalIncCashUnified = incCashUsd + (incCashKhr / rate);
        const totalIncBankUnified = incBankUsd + (incBankKhr / rate);
        const totalIncUSD = totalIncCashUnified + totalIncBankUnified;
        
        document.getElementById('totalIncCash').textContent = formatCurrency(incCashUsd, 'USD') + ' | ' + formatCurrency(incCashKhr, 'KHR');
        document.getElementById('totalIncBank').textContent = formatCurrency(incBankUsd, 'USD') + ' | ' + formatCurrency(incBankKhr, 'KHR');
        document.getElementById('totalIncUnified').textContent = formatCurrency(totalIncUSD, 'USD') + ' | ' + formatCurrency(totalIncUSD * rate, 'KHR');
        
        // Expense
        const totalExpCashUnified = expCashUsd + (expCashKhr / rate);
        const totalExpBankUnified = expBankUsd + (expBankKhr / rate);
        const totalExpUSD = totalExpCashUnified + totalExpBankUnified;
        
        document.getElementById('totalExpCash').textContent = formatCurrency(expCashUsd, 'USD') + ' | ' + formatCurrency(expCashKhr, 'KHR');
        document.getElementById('totalExpBank').textContent = formatCurrency(expBankUsd, 'USD') + ' | ' + formatCurrency(expBankKhr, 'KHR');
        document.getElementById('totalExpUnified').textContent = formatCurrency(totalExpUSD, 'USD') + ' | ' + formatCurrency(totalExpUSD * rate, 'KHR');
        
        // Balance
        const balCashUSD = incCashUsd - expCashUsd;
        const balCashKHR = incCashKhr - expCashKhr;
        const balBankUSD = incBankUsd - expBankUsd;
        const balBankKHR = incBankKhr - expBankKhr;
        const totalBalUSD = totalIncUSD - totalExpUSD;
        
        document.getElementById('totalBalCash').textContent = formatCurrency(balCashUSD, 'USD') + ' | ' + formatCurrency(balCashKHR, 'KHR');
        document.getElementById('totalBalBank').textContent = formatCurrency(balBankUSD, 'USD') + ' | ' + formatCurrency(balBankKHR, 'KHR');
        document.getElementById('totalBalUnified').textContent = formatCurrency(totalBalUSD, 'USD') + ' | ' + formatCurrency(totalBalUSD * rate, 'KHR');
    }
    
    const listRate = window.sysExchangeRate || 4100;

    // ---- Income column totals ----
    if(document.getElementById('list-inc-cash-khr')) document.getElementById('list-inc-cash-khr').textContent = formatCurrency(incCashKhr, 'KHR');
    if(document.getElementById('list-inc-cash-usd')) document.getElementById('list-inc-cash-usd').textContent = formatCurrency(incCashUsd, 'USD');
    if(document.getElementById('list-inc-bank-khr')) document.getElementById('list-inc-bank-khr').textContent = formatCurrency(incBankKhr, 'KHR');
    if(document.getElementById('list-inc-bank-usd')) document.getElementById('list-inc-bank-usd').textContent = formatCurrency(incBankUsd, 'USD');

    // ---- Income subtotals ----
    const incCashTotalUsd = incCashUsd + (incCashKhr / listRate);
    const incBankTotalUsd = incBankUsd + (incBankKhr / listRate);
    const incGrandTotalUsd = incCashTotalUsd + incBankTotalUsd;
    if(document.getElementById('list-inc-cash-subtotal'))
        document.getElementById('list-inc-cash-subtotal').textContent = formatCurrency(incCashTotalUsd, 'USD') + ' = ' + formatCurrency(incCashTotalUsd * listRate, 'KHR');
    if(document.getElementById('list-inc-bank-subtotal'))
        document.getElementById('list-inc-bank-subtotal').textContent = formatCurrency(incBankTotalUsd, 'USD') + ' = ' + formatCurrency(incBankTotalUsd * listRate, 'KHR');
    if(document.getElementById('list-inc-grand-total'))
        document.getElementById('list-inc-grand-total').textContent = formatCurrency(incGrandTotalUsd, 'USD') + ' = ' + formatCurrency(incGrandTotalUsd * listRate, 'KHR');

    // ---- Expense column totals ----
    if(document.getElementById('list-exp-cash-khr')) document.getElementById('list-exp-cash-khr').textContent = formatCurrency(expCashKhr, 'KHR');
    if(document.getElementById('list-exp-cash-usd')) document.getElementById('list-exp-cash-usd').textContent = formatCurrency(expCashUsd, 'USD');
    if(document.getElementById('list-exp-bank-khr')) document.getElementById('list-exp-bank-khr').textContent = formatCurrency(expBankKhr, 'KHR');
    if(document.getElementById('list-exp-bank-usd')) document.getElementById('list-exp-bank-usd').textContent = formatCurrency(expBankUsd, 'USD');

    // ---- Expense subtotals ----
    const expCashTotalUsd = expCashUsd + (expCashKhr / listRate);
    const expBankTotalUsd = expBankUsd + (expBankKhr / listRate);
    const expGrandTotalUsd = expCashTotalUsd + expBankTotalUsd;
    if(document.getElementById('list-exp-cash-subtotal'))
        document.getElementById('list-exp-cash-subtotal').textContent = formatCurrency(expCashTotalUsd, 'USD') + ' = ' + formatCurrency(expCashTotalUsd * listRate, 'KHR');
    if(document.getElementById('list-exp-bank-subtotal'))
        document.getElementById('list-exp-bank-subtotal').textContent = formatCurrency(expBankTotalUsd, 'USD') + ' = ' + formatCurrency(expBankTotalUsd * listRate, 'KHR');
    if(document.getElementById('list-exp-grand-total'))
        document.getElementById('list-exp-grand-total').textContent = formatCurrency(expGrandTotalUsd, 'USD') + ' = ' + formatCurrency(expGrandTotalUsd * listRate, 'KHR');

    const rateDisplays = document.querySelectorAll('.rate-display');
    rateDisplays.forEach(el => el.textContent = (window.sysExchangeRate || 4100).toLocaleString('en-US'));
    updateChart(chartData);
}








