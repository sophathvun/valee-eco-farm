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
                    tr.innerHTML = `<td>${formatKhmerDate(tx.date)}</td><td>${tx.category}</td><td class="text-success fw-bold">${formatCurrency(tx.amount, cur)}</td><td>${tx.note}</td><td>${hasPermission('income') ? `<button class="btn btn-sm btn-warning btn-edit me-1" onclick="editTransaction(${tx.id}, 'income')">\u1780\u17c2\u1794\u17d2\u179a\u17c2</button><button class="btn btn-sm btn-danger btn-delete" onclick="deleteTransaction(${tx.id})">\u179b\u17bb\u1794</button>` : ''}</td>`;
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
                    tr.innerHTML = `<td>${formatKhmerDate(tx.date)}</td><td>${tx.category}</td><td class="text-danger fw-bold">${formatCurrency(tx.amount, cur)}</td><td>${tx.note}</td><td>${hasPermission('expense') ? `<button class="btn btn-sm btn-warning btn-edit me-1" onclick="editTransaction(${tx.id}, 'expense')">\u1780\u17c2\u1794\u17d2\u179a\u17c2</button><button class="btn btn-sm btn-danger btn-delete" onclick="deleteTransaction(${tx.id})">\u179b\u17bb\u1794</button>` : ''}</td>`;
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

