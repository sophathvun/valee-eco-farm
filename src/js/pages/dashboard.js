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
    
    let totalIncomeKHR = 0, totalExpenseKHR = 0;
    let totalIncomeUSD = 0, totalExpenseUSD = 0;
    
    let listIncTotalKHR = 0, listIncTotalUSD = 0;
    let listExpTotalKHR = 0, listExpTotalUSD = 0;
    
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
            tr.innerHTML = `
                <td>${formatKhmerDate(tx.date)}</td>
                <td><span class="badge ${tx.type === 'income' ? 'bg-success' : 'bg-danger'}">${tx.type === 'income' ? 'ចំណូល' : 'ចំណាយ'}</span></td>
                <td>${tx.category}</td>
                <td class="${tx.type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(tx.amount, cur)}</td>
                <td>${tx.note}</td>
            `;
            tbody.appendChild(tr);
        }

        // Income List
        if (tx.type === 'income' && incBody) {
            let match = true;
            if (incFrom && tx.date < incFrom) match = false;
            if (incTo && tx.date > incTo) match = false;
            
            if (match) {
                cur === 'USD' ? listIncTotalUSD += tx.amount : listIncTotalKHR += tx.amount;
                const limit = incHasFilter ? 99999 : 20; // Show all if filtered, else 20
                if (incCount < limit) {
                    incCount++;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${formatKhmerDate(tx.date)}</td><td>${tx.category}</td><td class="text-success fw-bold">${formatCurrency(tx.amount, cur)}</td><td>${tx.note}</td><td class="text-end">${hasPermission('income') ? `<div class="d-flex justify-content-end gap-1"><button class="btn btn-sm btn-warning btn-edit" onclick="editTransaction(${tx.id}, 'income')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button><button class="btn btn-sm btn-danger btn-delete" onclick="deleteTransaction(${tx.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></div>` : ''}</td>`;
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
                cur === 'USD' ? listExpTotalUSD += tx.amount : listExpTotalKHR += tx.amount;
                const limit = expHasFilter ? 99999 : 20; // Show all if filtered, else 20
                if (expCount < limit) {
                    expCount++;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${formatKhmerDate(tx.date)}</td><td>${tx.category}</td><td class="text-danger fw-bold">${formatCurrency(tx.amount, cur)}</td><td>${tx.note}</td><td class="text-end">${hasPermission('expense') ? `<div class="d-flex justify-content-end gap-1"><button class="btn btn-sm btn-warning btn-edit" onclick="editTransaction(${tx.id}, 'expense')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button><button class="btn btn-sm btn-danger btn-delete" onclick="deleteTransaction(${tx.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></div>` : ''}</td>`;
                    expBody.appendChild(tr);
                }
            }
        }

        if (tx.date && tx.date.startsWith(currentMonthPrefix)) {
            if (tx.type === 'income') cur === 'USD' ? totalIncomeUSD += tx.amount : totalIncomeKHR += tx.amount;
            else cur === 'USD' ? totalExpenseUSD += tx.amount : totalExpenseKHR += tx.amount;
        }

        if (chartData[tx.date] !== undefined) {
            let amountInChart = cur === 'USD' ? tx.amount * 4000 : tx.amount;
            chartData[tx.date][tx.type] += amountInChart;
        }
    });

    if(document.getElementById('totalIncomeKHR')) {
        document.getElementById('totalIncomeKHR').textContent = formatCurrency(totalIncomeKHR, 'KHR');
        document.getElementById('totalIncomeUSD').textContent = formatCurrency(totalIncomeUSD, 'USD');
        document.getElementById('totalExpenseKHR').textContent = formatCurrency(totalExpenseKHR, 'KHR');
        document.getElementById('totalExpenseUSD').textContent = formatCurrency(totalExpenseUSD, 'USD');
        document.getElementById('totalBalanceKHR').textContent = formatCurrency(totalIncomeKHR - totalExpenseKHR, 'KHR');
        document.getElementById('totalBalanceUSD').textContent = formatCurrency(totalIncomeUSD - totalExpenseUSD, 'USD');
    }
    
    if(document.getElementById('list-inc-total-khr')) {
        document.getElementById('list-inc-total-khr').textContent = formatCurrency(listIncTotalKHR, 'KHR');
        document.getElementById('list-inc-total-usd').textContent = formatCurrency(listIncTotalUSD, 'USD');
        document.getElementById('list-exp-total-khr').textContent = formatCurrency(listExpTotalKHR, 'KHR');
        document.getElementById('list-exp-total-usd').textContent = formatCurrency(listExpTotalUSD, 'USD');
    }

    updateChart(chartData);
}

