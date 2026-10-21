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
                <td><span class="badge ${tx.type === 'income' ? 'bg-success' : 'bg-danger'}">${tx.type === 'income' ? (typeof t === 'function' ? t('income', 'ចំណូល') : 'ចំណូល') : (typeof t === 'function' ? t('expense', 'ចំណាយ') : 'ចំណាយ')}</span></td>
                <td>${tx.category} <span class="badge bg-secondary ms-1" style="font-size: 0.7rem;">${tx.paymentMethod === "Bank" ? (typeof t === 'function' ? t('bank', 'Bank') : 'Bank') : (typeof t === 'function' ? t('cash', 'Cash') : 'Cash')}</span></td>
                <td class="${tx.type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(tx.amount, cur)}</td>
                <td class="d-none d-md-table-cell">${tx.note || ""}</td>
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
                    tr.innerHTML = `<td>${formatEngDate(tx.date)}</td><td>${tx.category}</td><td class="text-success text-center">${ck}</td><td class="text-success text-center">${cu}</td><td class="text-success text-center">${bk}</td><td class="text-success text-center">${bu}</td><td class="d-none d-md-table-cell">${tx.note || ""}</td><td class="text-end">${hasPermission('income') ? `<div class="d-flex justify-content-end gap-1"><button class="btn btn-sm btn-warning btn-edit" onclick="editTransaction(${tx.id}, 'income')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button><button class="btn btn-sm btn-danger btn-delete" onclick="deleteTransaction(${tx.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></div>` : ''}</td>`;
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
                    tr.innerHTML = `<td>${formatEngDate(tx.date)}</td><td>${tx.category}</td><td class="text-danger text-center">${ck}</td><td class="text-danger text-center">${cu}</td><td class="text-danger text-center">${bk}</td><td class="text-danger text-center">${bu}</td><td class="d-none d-md-table-cell">${tx.note || ""}</td><td class="text-end">${hasPermission('expense') ? `<div class="d-flex justify-content-end gap-1"><button class="btn btn-sm btn-warning btn-edit" onclick="editTransaction(${tx.id}, 'expense')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button><button class="btn btn-sm btn-danger btn-delete" onclick="deleteTransaction(${tx.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></div>` : ''}</td>`;
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
    if(document.getElementById('list-inc-rate-note')) document.getElementById('list-inc-rate-note').textContent = `* អត្រាប្តូរប្រាក់៖ $1 = ៛${formatCurrency(listRate, 'KHR').replace('៛','')}`;

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
    if(document.getElementById('list-exp-rate-note')) document.getElementById('list-exp-rate-note').textContent = `* អត្រាប្តូរប្រាក់៖ $1 = ៛${formatCurrency(listRate, 'KHR').replace('៛','')}`;

    const rateDisplays = document.querySelectorAll('.rate-display');
    rateDisplays.forEach(el => el.textContent = (window.sysExchangeRate || 4100).toLocaleString('en-US'));
    updateChart(chartData);
    
    // Automatically load HR & Employee widgets on dashboard
    if (typeof loadEmployeeDashboardWidgets === 'function') {
        loadEmployeeDashboardWidgets();
    }
}

// ======= PREMIUM HR & EMPLOYEE DASHBOARD WIDGETS =======
let allHrDashboardEmployees = [];
let allHrTodayAttendance = [];

window.loadEmployeeDashboardWidgets = loadEmployeeDashboardWidgets;
async function loadEmployeeDashboardWidgets() {
    const hrSection = document.getElementById('hr-dashboard-section');
    if (!hrSection) return;

    // Check permission - if not admin and not permitted, hide section
    if (typeof hasPermission === 'function' && !hasPermission('employee_manage')) {
        hrSection.style.display = 'none';
        return;
    }
    hrSection.style.display = 'block';

    try {
        if (!db.employees) return;
        const [employees, allAttendance, depts, positions] = await Promise.all([
            db.employees.toArray(),
            (db.attendance ? db.attendance.toArray() : Promise.resolve([])).catch(() => []),
            (db.departments ? db.departments.toArray() : Promise.resolve([])).catch(() => []),
            (db.positions ? db.positions.toArray() : Promise.resolve([])).catch(() => [])
        ]);

        allHrDashboardEmployees = employees || [];
        const totalEmps = allHrDashboardEmployees.length;

        // 1. Total Employees & Gender Breakdown
        let maleCount = 0;
        let femaleCount = 0;
        let fullTimeCount = 0;

        allHrDashboardEmployees.forEach(e => {
            const g = (e.gender || '').trim();
            if (g === 'ស្រី' || g.toLowerCase() === 'female' || g.toLowerCase() === 'f') femaleCount++;
            else maleCount++;

            if ((e.type || 'Full-Time') === 'Full-Time') fullTimeCount++;
        });

        const partTimeCount = totalEmps - fullTimeCount;

        const elTotal = document.getElementById('hr-total-emps');
        if (elTotal) elTotal.textContent = totalEmps;
        const elMale = document.getElementById('hr-male-count');
        if (elMale) elMale.textContent = maleCount;
        const elFemale = document.getElementById('hr-female-count');
        if (elFemale) elFemale.textContent = femaleCount;
        const elFtPill = document.getElementById('hr-fulltime-pill');
        if (elFtPill) elFtPill.textContent = `FT: ${fullTimeCount}${partTimeCount > 0 ? ` | PT: ${partTimeCount}` : ''}`;

        // 2. Today's Attendance
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // Set Khmer date text
        const elTodayKm = document.getElementById('hr-today-date-km');
        if (elTodayKm) {
            const khmerDays = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
            const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
            const dayName = khmerDays[today.getDay()];
            const monthName = khmerMonths[today.getMonth()];
            elTodayKm.textContent = `ថ្ងៃ${dayName} ទី ${dd} ខែ${monthName} ឆ្នាំ ${yyyy}`;
        }

        const todayRecords = (allAttendance || []).filter(r => r.date === todayStr);
        const todayAttMap = {};
        todayRecords.forEach(r => { todayAttMap[r.empId] = r; });

        let countP = 0, countL = 0, countA = 0, countPending = 0;
        allHrTodayAttendance = [];

        allHrDashboardEmployees.forEach(emp => {
            const rec = todayAttMap[emp.id];
            let morning = rec ? (rec.morning || '') : '';
            let afternoon = rec ? (rec.afternoon || '') : '';

            if (morning === 'P' || afternoon === 'P') countP++;
            else if (morning === 'L' || afternoon === 'L') countL++;
            else if (morning === 'A' || afternoon === 'A') countA++;
            else countPending++;

            allHrTodayAttendance.push({
                emp: emp,
                morning: morning,
                afternoon: afternoon,
                note: rec ? rec.note : ''
            });
        });

        const rate = totalEmps > 0 ? Math.round((countP / totalEmps) * 100) : 0;
        const elRate = document.getElementById('hr-present-rate');
        if (elRate) elRate.textContent = `${rate}%`;
        const elFraction = document.getElementById('hr-present-fraction');
        if (elFraction) elFraction.textContent = `(${countP} / ${totalEmps} នាក់)`;
        
        const elP = document.getElementById('hr-att-p');
        if (elP) elP.textContent = `${countP} វត្តមាន`;
        const elL = document.getElementById('hr-att-l');
        if (elL) elL.textContent = `${countL} ច្បាប់`;
        const elA = document.getElementById('hr-att-a');
        if (elA) elA.textContent = `${countA} អវត្តមាន`;
        const elPending = document.getElementById('hr-att-pending');
        if (elPending) elPending.textContent = `? ${countPending} មិនទាន់កត់`;

        // 3. Estimated Monthly Payroll
        const sysRate = window.sysExchangeRate || 4100;
        let payrollUsd = 0;
        let payrollKhr = 0;

        allHrDashboardEmployees.forEach(emp => {
            const sal = parseFloat(emp.salary) || 0;
            const cur = emp.currency || 'USD';
            if (cur === 'KHR') payrollKhr += sal;
            else payrollUsd += sal;
        });

        const unifiedPayrollUsd = payrollUsd + (payrollKhr / sysRate);
        const unifiedPayrollKhr = (payrollUsd * sysRate) + payrollKhr;

        const elPayUnified = document.getElementById('hr-payroll-unified');
        if (elPayUnified) {
            elPayUnified.textContent = (typeof formatCurrency === 'function') 
                ? formatCurrency(unifiedPayrollUsd, 'USD') 
                : `$${unifiedPayrollUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        const elPayKhr = document.getElementById('hr-payroll-khr');
        if (elPayKhr) {
            elPayKhr.textContent = `≈ ${(typeof formatCurrency === 'function') 
                ? formatCurrency(unifiedPayrollKhr, 'KHR') 
                : `៛${Math.round(unifiedPayrollKhr).toLocaleString()}`}`;
        }
        const elPaySplit = document.getElementById('hr-payroll-currency-split');
        if (elPaySplit) {
            elPaySplit.textContent = `USD: $${payrollUsd.toLocaleString()} | KHR: ៛${payrollKhr.toLocaleString()}`;
        }

        // 4. Departments & Positions
        const deptMap = {};
        allHrDashboardEmployees.forEach(emp => {
            const d = (emp.department && emp.department.trim()) ? emp.department.trim() : 'ផ្សេងៗ (Other)';
            deptMap[d] = (deptMap[d] || 0) + 1;
        });

        const deptNames = Object.keys(deptMap);
        const deptCount = deptNames.length || (depts ? depts.length : 0);
        const elDeptCount = document.getElementById('hr-dept-count');
        if (elDeptCount) elDeptCount.textContent = deptCount;
        const elDeptTotalBadge = document.getElementById('hr-dept-total-badge');
        if (elDeptTotalBadge) elDeptTotalBadge.textContent = `${deptCount} ផ្នែក`;

        let topDeptName = '-';
        let maxDeptCount = 0;
        deptNames.forEach(d => {
            if (deptMap[d] > maxDeptCount) {
                maxDeptCount = deptMap[d];
                topDeptName = d;
            }
        });
        const elTopDept = document.getElementById('hr-top-dept');
        if (elTopDept) {
            elTopDept.innerHTML = `<i class="bi bi-star-fill text-warning me-1"></i>ច្រើនជាងគេ: <strong>${topDeptName}</strong> (${maxDeptCount} នាក់)`;
        }

        const elPosCount = document.getElementById('hr-pos-count');
        if (elPosCount) {
            elPosCount.textContent = `${positions ? positions.length : 0} មុខតំណែង`;
        }

        // 5. Render Department Distribution
        renderDepartmentDistribution(deptMap, totalEmps);

        // 6. Render Today's Attendance Table
        renderTodayAttendanceTable(allHrTodayAttendance);

        // 7. Render Birthdays this Month
        renderBirthdaysThisMonth(allHrDashboardEmployees, mm);

    } catch (err) {
        console.error("Error loading HR dashboard widgets:", err);
    }
}

function renderDepartmentDistribution(deptMap, totalEmps) {
    const container = document.getElementById('hr-dept-list-container');
    if (!container) return;

    const entries = Object.entries(deptMap);
    if (entries.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-4"><i class="bi bi-folder2-open fs-3 d-block mb-2"></i>មិនទាន់មានទិន្នន័យផ្នែកបុគ្គលិកនៅឡើយទេ</div>`;
        return;
    }

    // Sort by count descending
    entries.sort((a, b) => b[1] - a[1]);

    const palette = [
        '#10b981', // Emerald
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#f59e0b', // Amber
        '#ec4899', // Pink
        '#06b6d4', // Cyan
        '#64748b'  // Slate
    ];

    let html = '';
    entries.forEach(([dept, count], idx) => {
        const pct = totalEmps > 0 ? Math.round((count / totalEmps) * 100) : 0;
        const color = palette[idx % palette.length];
        html += `
            <div>
                <div class="d-flex justify-content-between align-items-center mb-1" style="font-size: 0.82rem;">
                    <span class="fw-medium text-body text-truncate me-2" style="max-width: 65%;" title="${dept}">
                        <i class="bi bi-building me-1" style="color: ${color};"></i> ${dept}
                    </span>
                    <span class="text-muted text-nowrap">
                        <strong class="text-body">${count}</strong> នាក់ 
                        <span class="badge border ms-1" style="font-size: 0.68rem; background-color: var(--bs-tertiary-bg);">${pct}%</span>
                    </span>
                </div>
                <div class="progress" style="height: 6px; border-radius: 4px; background-color: var(--bs-border-color-translucent, #e9ecef);">
                    <div class="progress-bar" role="progressbar" style="width: ${pct}%; background-color: ${color}; border-radius: 4px;" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderTodayAttendanceTable(items) {
    const tbody = document.getElementById('hr-today-att-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4"><i class="bi bi-people fs-3 d-block mb-2"></i>មិនមានបុគ្គលិកក្នុងប្រព័ន្ធទេ</td></tr>`;
        return;
    }

    const badgeForShift = (val) => {
        const getT = (k, d) => typeof window.t === 'function' ? window.t(k, d) : d;
        if (val === 'P') return `<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><i class="bi bi-check me-1"></i>${getT('status_present', 'វត្តមាន')}</span>`;
        if (val === 'L') return `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1"><i class="bi bi-clock-history me-1"></i>${getT('status_leave', 'ច្បាប់')}</span>`;
        if (val === 'A') return `<span class="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><i class="bi bi-x me-1"></i>${getT('status_absent', 'អវត្តមាន')}</span>`;
        return `<span class="badge bg-light text-secondary border px-2 py-1">-</span>`;
    };

    let html = '';
    items.forEach(it => {
        const emp = it.emp;
        const photo = emp.photo || 'assets/images/default-avatar.svg';
        const dept = emp.department || 'ផ្សេងៗ';
        const pos = emp.position ? ` • ${emp.position}` : '';

        html += `
            <tr class="hr-att-row" data-search="${(emp.name || '').toLowerCase()} ${(emp.latinName || '').toLowerCase()} ${(dept || '').toLowerCase()}">
                <td class="ps-3">
                    <div class="d-flex align-items-center">
                        <img src="${photo}" onerror="this.src='assets/images/default-avatar.svg'" class="rounded-circle me-2 border flex-shrink-0" style="width: 30px; height: 30px; object-fit: cover;">
                        <div class="lh-sm overflow-hidden text-truncate">
                            <div class="fw-bold text-body text-truncate">${emp.name || '-'}</div>
                            <small class="text-muted text-truncate d-block" style="font-size: 0.7rem;">${emp.code || ''} ${emp.latinName ? `(${emp.latinName})` : ''}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="text-truncate text-body" style="max-width: 160px;" title="${dept}${pos}">
                        <span class="fw-medium">${dept}</span>
                        <small class="text-muted d-block" style="font-size: 0.72rem;">${emp.position || '-'}</small>
                    </div>
                </td>
                <td class="text-center">${badgeForShift(it.morning)}</td>
                <td class="text-center pe-3">${badgeForShift(it.afternoon)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

window.filterHrAttendanceList = function() {
    const input = document.getElementById('hr-att-search');
    if (!input) return;
    const query = input.value.trim().toLowerCase();
    const rows = document.querySelectorAll('.hr-att-row');
    rows.forEach(r => {
        const searchData = r.getAttribute('data-search') || '';
        if (!query || searchData.includes(query)) {
            r.style.display = '';
        } else {
            r.style.display = 'none';
        }
    });
};

function renderBirthdaysThisMonth(employees, currentMonthStr) {
    const section = document.getElementById('hr-birthday-section');
    const namesEl = document.getElementById('hr-birthday-names');
    if (!section || !namesEl) return;

    const bdayEmps = (employees || []).filter(e => {
        if (!e.dob || typeof e.dob !== 'string') return false;
        // Format YYYY-MM-DD
        const parts = e.dob.split('-');
        if (parts.length >= 2) {
            return parts[1] === currentMonthStr;
        }
        return false;
    });

    if (bdayEmps.length === 0) {
        section.style.display = 'none';
        return;
    }

    const pills = bdayEmps.map(e => {
        const parts = e.dob.split('-');
        const day = parts[2] ? ` (ថ្ងៃទី ${parts[2]})` : '';
        return `<strong class="text-body">${e.name}</strong>${day}`;
    }).join(' • ');

    namesEl.innerHTML = pills;
    section.style.display = 'block';
}

window.addEventListener('languageChanged', () => {
    const activeTab = localStorage.getItem('activeTab') || 'dashboard';
    if (activeTab === 'dashboard') {
        if (typeof loadData === 'function') loadData();
        if (typeof loadEmployeeDashboardWidgets === 'function') loadEmployeeDashboardWidgets();
    }
});









