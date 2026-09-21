// ====== PRINT LIST REPORTS ======
async function printListReport(type) {
    let allTx = await db.transactions.toArray();
    allTx.sort((a, b) => {
        let dateA = a.date || '';
        let dateB = b.date || '';
        return dateA.localeCompare(dateB);
    });
    let filtered = allTx.filter(tx => tx.type === type);
    
    let fromDate, toDate, title;
    
    if (type === 'income') {
        fromDate = document.getElementById('filter-inc-from').value;
        toDate = document.getElementById('filter-inc-to').value;
        title = 'របាយការណ៍ចំណូល';
    } else {
        fromDate = document.getElementById('filter-exp-from').value;
        toDate = document.getElementById('filter-exp-to').value;
        title = 'របាយការណ៍ចំណាយ';
    }

    if (fromDate) filtered = filtered.filter(tx => tx.date >= fromDate);
    if (toDate) filtered = filtered.filter(tx => tx.date <= toDate);

    document.getElementById('p-rep-title').textContent = title;
    
    let dateRangeStr = '';
    if (fromDate && toDate) dateRangeStr = `ចាប់ពីថ្ងៃទី ${formatKhmerDate(fromDate)} ដល់ថ្ងៃទី ${formatKhmerDate(toDate)}`;
    else if (fromDate) dateRangeStr = `ចាប់ពីថ្ងៃទី ${formatKhmerDate(fromDate)} ជាបន្តបន្ទាប់`;
    else if (toDate) dateRangeStr = `រហូតដល់ថ្ងៃទី ${formatKhmerDate(toDate)}`;
    else dateRangeStr = `របាយការណ៍សរុបទាំងអស់`;
    
    document.getElementById('p-rep-date').textContent = dateRangeStr;

    const tbody = document.getElementById('p-rep-items');
    tbody.innerHTML = '';
    
    let totalKHR = 0;
    let totalUSD = 0;

    filtered.forEach((tx, index) => {
        const cur = tx.currency || 'KHR';
        if (cur === 'USD') totalUSD += tx.amount;
        else totalKHR += tx.amount;

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${formatKhmerDate(tx.date)}</td>
                <td>${tx.category}</td>
                <td>${tx.note}</td>
                <td class="text-end fw-bold ${type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(tx.amount, cur)}</td>
            </tr>
        `;
    });

    document.getElementById('p-rep-total-khr').textContent = formatCurrency(totalKHR, 'KHR');
    document.getElementById('p-rep-total-usd').textContent = formatCurrency(totalUSD, 'USD');

    printElement('print-area-report');
}


function updateChart(chartData) {
    const ctx = document.getElementById('myChart');
    if(!ctx) return;
    
    const labels = Object.keys(chartData);
    const incomeData = labels.map(date => chartData[date].income);
    const expenseData = labels.map(date => chartData[date].expense);

    if (myChart) myChart.destroy();
    myChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'ចំណូល (រៀល)', data: incomeData, backgroundColor: 'rgba(40, 167, 69, 0.6)' },
                { label: 'ចំណាយ (រៀល)', data: expenseData, backgroundColor: 'rgba(220, 53, 69, 0.6)' }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// ====== REPORTS (WITH TABS) ======
function switchReportTab(tabId) {
    currentReportTab = tabId;
    
    // Manage Sidebar Submenu Active State
    document.querySelectorAll('#reportsSubmenu .nav-link').forEach(el => {
        el.classList.remove('active');
    });
    const parentNav = document.getElementById('nav-reports');
    if (parentNav) parentNav.classList.add('active');
    
    const activeSubmenu = document.getElementById('nav-reports-' + tabId);
    if (activeSubmenu) {
        activeSubmenu.classList.add('active');
    }
    
    // Update card header title
    const cardTitle = document.getElementById('report-card-title');
    if (cardTitle) {
        if (tabId === 'summary') cardTitle.textContent = 'របាយការណ៍ចំណូលចំណាយ';
        else if (tabId === 'income') cardTitle.textContent = 'របាយការណ៍ចំណូល';
        else if (tabId === 'expense') cardTitle.textContent = 'របាយការណ៍ចំណាយ';
    }
    
    // Manage Main Content visibility
    document.getElementById('rep-tab-summary').classList.add('d-none');
    document.getElementById('rep-tab-income').classList.add('d-none');
    document.getElementById('rep-tab-expense').classList.add('d-none');
    
    const targetDiv = document.getElementById('rep-tab-' + tabId);
    if (targetDiv) targetDiv.classList.remove('d-none');
    
    generateReport();
}

async function populateYearFilter() {
    const allTx = await db.transactions.toArray();
    const years = new Set();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    allTx.forEach(tx => years.add(tx.date.substring(0, 4)));
    
    const yearSelect = document.getElementById('filterYear');
    if(!yearSelect) return;
    yearSelect.innerHTML = '';
    
    Array.from(years).sort().reverse().forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        const toKhmer = (numStr) => String(numStr).replace(/[0-9]/g, w => ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'][w]);
        opt.textContent = 'ឆ្នាំ ' + toKhmer(year);
        yearSelect.appendChild(opt);
    });
}

async function generateReport() {
    const year = document.getElementById('filterYear').value;
    const month = document.getElementById('filterMonth').value;
    const day = document.getElementById('filterDay').value;
    
    let prefix = year;
    let summaryText = `របាយការណ៍ប្រចាំឆ្នាំ ${year}`;
    
    if (month !== 'all') {
        const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
        const monthName = khmerMonths[parseInt(month, 10) - 1];
        
        if (day !== 'all') {
            prefix = `${year}-${month}-${day}`;
            summaryText = `របាយការណ៍ថ្ងៃទី ${day} ខែ ${monthName} ឆ្នាំ ${year}`;
        } else {
            prefix = `${year}-${month}`;
            summaryText = `របាយការណ៍ខែ ${monthName} ឆ្នាំ ${year}`;
        }
    } else {
        document.getElementById('filterDay').value = 'all';
    }
    
    document.getElementById('reportSummaryText').textContent = summaryText;

    const allTx = await db.transactions.toArray();
    const filtered = allTx.filter(tx => tx.date && tx.date.startsWith(prefix));

    let incKHR = 0, incUSD = 0, expKHR = 0, expUSD = 0;
    
    const chartData = {}; // Summary
    const incData = {};   // Income specific
    const expData = {};   // Expense specific
    const summaryBreakdown = {};

    filtered.forEach(tx => {
        const cur = tx.currency || 'KHR';
        let amountKHR = cur === 'USD' ? tx.amount * 4000 : tx.amount;

        // Breakdown logic
        let key = '', label = '';
        if (month === 'all') {
            key = tx.date.substring(0, 7); // YYYY-MM
            const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
            label = `ខែ ${khmerMonths[parseInt(key.split('-')[1], 10) - 1]}`;
        } else if (day === 'all') {
            key = tx.date; // YYYY-MM-DD
            label = `ថ្ងៃទី ${key.split('-')[2]}`;
        } else {
            key = tx.category + '_' + tx.type;
            label = `${tx.category} ${tx.type === 'income' ? '(ចំណូល)' : '(ចំណាយ)'}`;
        }
        if (!summaryBreakdown[key]) summaryBreakdown[key] = { label, incKHR: 0, incUSD: 0, expKHR: 0, expUSD: 0 };

        if (!chartData[tx.category]) chartData[tx.category] = { income: 0, expense: 0 };

        if (tx.type === 'income') {
            cur === 'USD' ? incUSD += tx.amount : incKHR += tx.amount;
            cur === 'USD' ? summaryBreakdown[key].incUSD += tx.amount : summaryBreakdown[key].incKHR += tx.amount;
            chartData[tx.category].income += amountKHR;
            
            if (!incData[tx.category]) incData[tx.category] = { khr: 0, usd: 0 };
            cur === 'USD' ? incData[tx.category].usd += tx.amount : incData[tx.category].khr += tx.amount;
        } else {
            cur === 'USD' ? expUSD += tx.amount : expKHR += tx.amount;
            cur === 'USD' ? summaryBreakdown[key].expUSD += tx.amount : summaryBreakdown[key].expKHR += tx.amount;
            chartData[tx.category].expense += amountKHR;
            
            if (!expData[tx.category]) expData[tx.category] = { khr: 0, usd: 0 };
            cur === 'USD' ? expData[tx.category].usd += tx.amount : expData[tx.category].khr += tx.amount;
        }
    });

    if (currentReportTab === 'summary') {
        const thCol = document.getElementById('rep-summary-first-col');
        if (thCol) {
            thCol.textContent = (month !== 'all' && day !== 'all') ? 'ប្រភេទ (ចំណូល/ចំណាយ)' : 'កាលបរិច្ឆេទ';
        }
        
        const tbody = document.getElementById('rep-summary-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            const isDaily = (month !== 'all' && day !== 'all');
            let index = 1;

            if (isDaily) {
                // Render Income Group
                const incKeys = Object.keys(summaryBreakdown).filter(k => k.endsWith('_income')).sort();
                if (incKeys.length > 0) {
                    tbody.innerHTML += `<tr><td colspan="8" class="text-start fw-bold bg-light text-success">ក្រុមចំណូល (Income)</td></tr>`;
                    incKeys.forEach(k => {
                        const b = summaryBreakdown[k];
                        tbody.innerHTML += `<tr>
                            <td>${index++}</td>
                            <td class="text-start fw-bold">${b.label}</td>
                            <td class="text-success">${formatCurrency(b.incKHR, 'KHR')}</td>
                            <td class="text-success">${formatCurrency(b.incUSD, 'USD')}</td>
                            <td class="text-danger">-</td>
                            <td class="text-danger">-</td>
                            <td class="text-primary">${formatCurrency(b.incKHR, 'KHR')}</td>
                            <td class="text-primary">${formatCurrency(b.incUSD, 'USD')}</td>
                        </tr>`;
                    });
                }
                // Render Expense Group
                const expKeys = Object.keys(summaryBreakdown).filter(k => k.endsWith('_expense')).sort();
                if (expKeys.length > 0) {
                    tbody.innerHTML += `<tr><td colspan="8" class="text-start fw-bold bg-light text-danger">ក្រុមចំណាយ (Expense)</td></tr>`;
                    expKeys.forEach(k => {
                        const b = summaryBreakdown[k];
                        tbody.innerHTML += `<tr>
                            <td>${index++}</td>
                            <td class="text-start fw-bold">${b.label}</td>
                            <td class="text-success">-</td>
                            <td class="text-success">-</td>
                            <td class="text-danger">${formatCurrency(b.expKHR, 'KHR')}</td>
                            <td class="text-danger">${formatCurrency(b.expUSD, 'USD')}</td>
                            <td class="text-primary">${formatCurrency(-b.expKHR, 'KHR')}</td>
                            <td class="text-primary">${formatCurrency(-b.expUSD, 'USD')}</td>
                        </tr>`;
                    });
                }
            } else {
                Object.keys(summaryBreakdown).sort().forEach(k => {
                    const b = summaryBreakdown[k];
                    tbody.innerHTML += `<tr>
                        <td>${index++}</td>
                        <td class="text-start fw-bold">${b.label}</td>
                        <td class="text-success">${formatCurrency(b.incKHR, 'KHR')}</td>
                        <td class="text-success">${formatCurrency(b.incUSD, 'USD')}</td>
                        <td class="text-danger">${formatCurrency(b.expKHR, 'KHR')}</td>
                        <td class="text-danger">${formatCurrency(b.expUSD, 'USD')}</td>
                        <td class="text-primary">${formatCurrency(b.incKHR - b.expKHR, 'KHR')}</td>
                        <td class="text-primary">${formatCurrency(b.incUSD - b.expUSD, 'USD')}</td>
                    </tr>`;
                });
            }
        }
        document.getElementById('repIncKHR').textContent = formatCurrency(incKHR, 'KHR');
        document.getElementById('repIncUSD').textContent = formatCurrency(incUSD, 'USD');
        document.getElementById('repExpKHR').textContent = formatCurrency(expKHR, 'KHR');
        document.getElementById('repExpUSD').textContent = formatCurrency(expUSD, 'USD');
        document.getElementById('repBalKHR').textContent = formatCurrency(incKHR - expKHR, 'KHR');
        document.getElementById('repBalUSD').textContent = formatCurrency(incUSD - expUSD, 'USD');
        updateReportChart(chartData);
    } 
    else if (currentReportTab === 'income') {
        const tbody = document.getElementById('rep-inc-tbody');
        tbody.innerHTML = '';
        
        // Group by period (month/day) and then by category
        const groups = {};
        const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
        
        filtered.filter(tx => tx.type === 'income').forEach(tx => {
            let gKey = '', gLabel = '';
            if (month === 'all') {
                gKey = tx.date.substring(0, 7);
                gLabel = `ខែ ${khmerMonths[parseInt(gKey.split('-')[1], 10) - 1]}`;
            } else if (day === 'all') {
                gKey = tx.date;
                gLabel = `ថ្ងៃទី ${gKey.split('-')[2]}`;
            } else {
                gKey = 'all';
                gLabel = `ប្រចាំថ្ងៃទី ${day}`;
            }
            if (!groups[gKey]) groups[gKey] = { label: gLabel, cats: {} };
            if (!groups[gKey].cats[tx.category]) groups[gKey].cats[tx.category] = { khr: 0, usd: 0 };
            tx.currency === 'USD' ? groups[gKey].cats[tx.category].usd += tx.amount : groups[gKey].cats[tx.category].khr += tx.amount;
        });

        const thLabel = document.querySelector('#rep-tab-income thead th:nth-child(2)');
        if (thLabel) {
            if (month === 'all') thLabel.textContent = 'ខែ';
            else if (day === 'all') thLabel.textContent = 'កាលបរិច្ឆេទ';
            else thLabel.textContent = 'ប្រភេទចំណូល';
        }

        let index = 1;
        Object.keys(groups).sort().forEach(gKey => {
            const grp = groups[gKey];
            if (month === 'all' || day === 'all') {
                let totKhr = 0, totUsd = 0;
                Object.values(grp.cats).forEach(c => { totKhr += c.khr; totUsd += c.usd; });
                tbody.innerHTML += `<tr><td>${index++}</td><td class="text-start">${grp.label}</td><td class="text-success">${formatCurrency(totKhr, 'KHR')}</td><td class="text-success">${formatCurrency(totUsd, 'USD')}</td></tr>`;
            } else {
                Object.keys(grp.cats).sort().forEach(cat => {
                    tbody.innerHTML += `<tr><td>${index++}</td><td class="text-start">${cat}</td><td class="text-success">${formatCurrency(grp.cats[cat].khr, 'KHR')}</td><td class="text-success">${formatCurrency(grp.cats[cat].usd, 'USD')}</td></tr>`;
                });
            }
        });

        document.getElementById('rep-inc-grand-khr-tbl').textContent = formatCurrency(incKHR, 'KHR');
        document.getElementById('rep-inc-grand-usd-tbl').textContent = formatCurrency(incUSD, 'USD');
        updateSpecificChart('incReportChart', incData, 'ចំណូល', 'rgba(40, 167, 69, 0.7)');
    }
    else if (currentReportTab === 'expense') {
        const tbody = document.getElementById('rep-exp-tbody');
        tbody.innerHTML = '';
        
        const groups = {};
        const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
        
        filtered.filter(tx => tx.type === 'expense').forEach(tx => {
            let gKey = '', gLabel = '';
            if (month === 'all') {
                gKey = tx.date.substring(0, 7);
                gLabel = `ខែ ${khmerMonths[parseInt(gKey.split('-')[1], 10) - 1]}`;
            } else if (day === 'all') {
                gKey = tx.date;
                gLabel = `ថ្ងៃទី ${gKey.split('-')[2]}`;
            } else {
                gKey = 'all';
                gLabel = `ប្រចាំថ្ងៃទី ${day}`;
            }
            if (!groups[gKey]) groups[gKey] = { label: gLabel, cats: {} };
            if (!groups[gKey].cats[tx.category]) groups[gKey].cats[tx.category] = { khr: 0, usd: 0 };
            tx.currency === 'USD' ? groups[gKey].cats[tx.category].usd += tx.amount : groups[gKey].cats[tx.category].khr += tx.amount;
        });

        const thLabel = document.querySelector('#rep-tab-expense thead th:nth-child(2)');
        if (thLabel) {
            if (month === 'all') thLabel.textContent = 'ខែ';
            else if (day === 'all') thLabel.textContent = 'កាលបរិច្ឆេទ';
            else thLabel.textContent = 'ប្រភេទចំណាយ';
        }

        let index = 1;
        Object.keys(groups).sort().forEach(gKey => {
            const grp = groups[gKey];
            if (month === 'all' || day === 'all') {
                let totKhr = 0, totUsd = 0;
                Object.values(grp.cats).forEach(c => { totKhr += c.khr; totUsd += c.usd; });
                tbody.innerHTML += `<tr><td>${index++}</td><td class="text-start">${grp.label}</td><td class="text-danger">${formatCurrency(totKhr, 'KHR')}</td><td class="text-danger">${formatCurrency(totUsd, 'USD')}</td></tr>`;
            } else {
                Object.keys(grp.cats).sort().forEach(cat => {
                    tbody.innerHTML += `<tr><td>${index++}</td><td class="text-start">${cat}</td><td class="text-danger">${formatCurrency(grp.cats[cat].khr, 'KHR')}</td><td class="text-danger">${formatCurrency(grp.cats[cat].usd, 'USD')}</td></tr>`;
                });
            }
        });

        document.getElementById('rep-exp-grand-khr-tbl').textContent = formatCurrency(expKHR, 'KHR');
        document.getElementById('rep-exp-grand-usd-tbl').textContent = formatCurrency(expUSD, 'USD');
        updateSpecificChart('expReportChart', expData, 'ចំណាយ', 'rgba(220, 53, 69, 0.7)');
    }
}

function updateReportChart(chartData) {
    const ctx = document.getElementById('reportChart');
    if(!ctx) return;
    
    const categories = Object.keys(chartData);
    const incomeData = categories.map(cat => chartData[cat].income);
    const expenseData = categories.map(cat => chartData[cat].expense);

    if (reportChartInstance) reportChartInstance.destroy();
    reportChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [
                { label: 'ចំណូល (រៀល)', data: incomeData, backgroundColor: 'rgba(40, 167, 69, 0.7)' },
                { label: 'ចំណាយ (រៀល)', data: expenseData, backgroundColor: 'rgba(220, 53, 69, 0.7)' }
            ]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'ចំណូលចំណាយតាមប្រភេទនីមួយៗ' } } }
    });
}

function updateSpecificChart(canvasId, dataObj, label, color) {
    const ctx = document.getElementById(canvasId);
    if(!ctx) return;
    
    const categories = Object.keys(dataObj);
    const dataValues = categories.map(cat => dataObj[cat].khr + (dataObj[cat].usd * 4000));
    
    let instance = canvasId === 'incReportChart' ? incReportChartInstance : expReportChartInstance;
    if (instance) instance.destroy();
    
    instance = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{ label: `${label}សរុបប៉ាន់ស្មានជារៀល`, data: dataValues, backgroundColor: color }]
        },
        options: { responsive: true, plugins: { title: { display: true, text: `ក្រាហ្វបង្ហាញ${label}តាមប្រភេទ` } } }
    });
    
    if (canvasId === 'incReportChart') incReportChartInstance = instance;
    else expReportChartInstance = instance;
}

async function printAnalyticsReport(printType = 'summary') {
    const titleEl = document.getElementById('pa-title');
    const dateEl = document.getElementById('pa-date');
    const contentEl = document.getElementById('pa-content');
    
    dateEl.textContent = document.getElementById('reportSummaryText').textContent;

    if (printType === 'detail') {
        const year = document.getElementById('filterYear').value;
        const month = document.getElementById('filterMonth').value;
        const day = document.getElementById('filterDay').value;
        
        let prefix = year;
        if (month !== 'all') {
            prefix = `${year}-${month}`;
            if (day !== 'all') {
                prefix = `${year}-${month}-${day}`;
            }
        }
        
        const allTx = await db.transactions.toArray();
        let filtered = allTx.filter(tx => tx.date.startsWith(prefix));
        
        let suffix = 'ប្រចាំថ្ងៃ';
        if (month === 'all') suffix = 'ប្រចាំឆ្នាំ';
        else if (day === 'all') suffix = 'ប្រចាំខែ';
        
        // Filter by current report tab type (Income or Expense)
        if (currentReportTab === 'income') {
            filtered = filtered.filter(tx => tx.type === 'income');
            titleEl.textContent = 'របាយការណ៍ប្រតិបត្តិការចំណូល' + suffix;
        } else if (currentReportTab === 'expense') {
            filtered = filtered.filter(tx => tx.type === 'expense');
            titleEl.textContent = 'របាយការណ៍ប្រតិបត្តិការចំណាយ' + suffix;
        } else {
            titleEl.textContent = 'របាយការណ៍ប្រតិបត្តិការចំណូលចំណាយសរុប' + suffix;
        }

        let tableHTML = `
            <table class="table table-bordered text-center mt-3" style="font-size:14px;">
                <thead class="table-success">
                    <tr>
                        <th>ល.រ</th>
                        <th>ប្រភេទ</th>
                        ${currentReportTab === 'summary' ? `
                            <th>ចំណូល (៛)</th>
                            <th>ចំណូល ($)</th>
                            <th>ចំណាយ (៛)</th>
                            <th>ចំណាយ ($)</th>
                        ` : `
                            <th>ទឹកប្រាក់ (៛)</th>
                            <th>ទឹកប្រាក់ ($)</th>
                        `}
                    </tr>
                </thead>
                <tbody>
        `;
        let totalIncKhr = 0, totalIncUsd = 0;
        let totalExpKhr = 0, totalExpUsd = 0;
        
        const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
        const groupedByPeriod = {};
        filtered.forEach(tx => {
            const gKey = month === 'all' ? tx.date.substring(0, 7) : tx.date;
            if (!groupedByPeriod[gKey]) groupedByPeriod[gKey] = [];
            groupedByPeriod[gKey].push(tx);
        });

        let globalIndex = 1;
        const mainColspan = currentReportTab === 'summary' ? 6 : 4;

        Object.keys(groupedByPeriod).sort().forEach(gKey => {
            let groupName = '';
            if (month === 'all') {
                const mParts = gKey.split('-');
                groupName = `ខែ ${khmerMonths[parseInt(mParts[1], 10) - 1]} ${mParts[0]}`;
            } else {
                const dParts = gKey.split('-');
                groupName = `ថ្ងៃទី ${dParts[2]} ខែ ${khmerMonths[parseInt(dParts[1], 10) - 1]} ${dParts[0]}`;
            }
            
            tableHTML += `<tr><td colspan="${mainColspan}" class="text-start fw-bold bg-light text-primary" style="font-size: 16px;">${groupName}</td></tr>`;
            
            const periodTxs = groupedByPeriod[gKey];
            const groupedByCat = {};
            let pIncKhr = 0, pIncUsd = 0, pExpKhr = 0, pExpUsd = 0;
            
            periodTxs.forEach(tx => {
                const isUSD = tx.currency === 'USD';
                if (tx.type === 'income') {
                    if (isUSD) { totalIncUsd += tx.amount; pIncUsd += tx.amount; }
                    else { totalIncKhr += tx.amount; pIncKhr += tx.amount; }
                } else {
                    if (isUSD) { totalExpUsd += tx.amount; pExpUsd += tx.amount; }
                    else { totalExpKhr += tx.amount; pExpKhr += tx.amount; }
                }
                
                if (!groupedByCat[tx.category]) groupedByCat[tx.category] = { txs: [], incKhr: 0, incUsd: 0, expKhr: 0, expUsd: 0 };
                groupedByCat[tx.category].txs.push(tx);
                if (tx.type === 'income') {
                    if (isUSD) groupedByCat[tx.category].incUsd += tx.amount; else groupedByCat[tx.category].incKhr += tx.amount;
                } else {
                    if (isUSD) groupedByCat[tx.category].expUsd += tx.amount; else groupedByCat[tx.category].expKhr += tx.amount;
                }
            });

            Object.keys(groupedByCat).sort().forEach(cat => {
                const ct = groupedByCat[cat];
                const txType = ct.txs[0].type;
                const tKhr = txType === 'income' ? ct.incKhr : ct.expKhr;
                const tUsd = txType === 'income' ? ct.incUsd : ct.expUsd;
                const cClass = txType === 'income' ? 'text-success' : 'text-danger';
                
                tableHTML += `
                    <tr>
                        <td>${globalIndex++}</td>
                        <td class="text-start">${cat}</td>
                        ${currentReportTab === 'summary' ? `
                            <td class="text-success">${txType === 'income' ? formatCurrency(ct.incKhr, 'KHR') : '-'}</td>
                            <td class="text-success">${txType === 'income' ? formatCurrency(ct.incUsd, 'USD') : '-'}</td>
                            <td class="text-danger">${txType === 'expense' ? formatCurrency(ct.expKhr, 'KHR') : '-'}</td>
                            <td class="text-danger">${txType === 'expense' ? formatCurrency(ct.expUsd, 'USD') : '-'}</td>
                        ` : `
                            <td class="${cClass}">${formatCurrency(tKhr, 'KHR')}</td>
                            <td class="${cClass}">${formatCurrency(tUsd, 'USD')}</td>
                        `}
                    </tr>
                `;
            });
            
            // Subtotal row for this period
            if (currentReportTab === 'summary') {
                tableHTML += `
                    <tr class="table-light fw-bold" style="font-size: 15px;">
                        <td colspan="2" class="text-end">សរុបប្រចាំ${groupName}:</td>
                        <td class="text-success">${formatCurrency(pIncKhr, 'KHR')}</td>
                        <td class="text-success">${formatCurrency(pIncUsd, 'USD')}</td>
                        <td class="text-danger">${formatCurrency(pExpKhr, 'KHR')}</td>
                        <td class="text-danger">${formatCurrency(pExpUsd, 'USD')}</td>
                    </tr>
                `;
            } else {
                const pKhr = currentReportTab === 'income' ? pIncKhr : pExpKhr;
                const pUsd = currentReportTab === 'income' ? pIncUsd : pExpUsd;
                const cClass = currentReportTab === 'income' ? 'text-success' : 'text-danger';
                tableHTML += `
                    <tr class="table-light fw-bold" style="font-size: 15px;">
                        <td colspan="2" class="text-end">សរុបប្រចាំ${groupName}:</td>
                        <td class="${cClass}">${formatCurrency(pKhr, 'KHR')}</td>
                        <td class="${cClass}">${formatCurrency(pUsd, 'USD')}</td>
                    </tr>
                `;
            }
        });
        
        let periodStr = 'សរុបរួមប្រចាំរយៈពេលនេះ:';
        if (month === 'all') periodStr = `សរុបរួមប្រចាំឆ្នាំ ${year}:`;
        else if (day === 'all') periodStr = `សរុបរួមប្រចាំខែ ${khmerMonths[parseInt(month, 10) - 1]} ${year}:`;
        else periodStr = `សរុបរួមប្រចាំថ្ងៃទី ${day} ខែ ${khmerMonths[parseInt(month, 10) - 1]} ${year}:`;
        
        if (currentReportTab === 'summary') {
            tableHTML += `</tbody><tfoot class="table-success fw-bold" style="font-size: 16px;">
                <tr>
                    <td colspan="2" class="text-end">${periodStr}</td>
                    <td class="text-success">${formatCurrency(totalIncKhr, 'KHR')}</td>
                    <td class="text-success">${formatCurrency(totalIncUsd, 'USD')}</td>
                    <td class="text-danger">${formatCurrency(totalExpKhr, 'KHR')}</td>
                    <td class="text-danger">${formatCurrency(totalExpUsd, 'USD')}</td>
                </tr>
                <tr>
                    <td colspan="2" class="text-end">ប្រាក់ចំណេញ (ចំណូល - ចំណាយ):</td>
                    <td colspan="4" class="text-primary text-center">${formatCurrency(totalIncKhr - totalExpKhr, 'KHR')} | ${formatCurrency(totalIncUsd - totalExpUsd, 'USD')}</td>
                </tr>
            </tfoot></table>`;
        } else {
            const isInc = currentReportTab === 'income';
            const totKhr = isInc ? totalIncKhr : totalExpKhr;
            const totUsd = isInc ? totalIncUsd : totalExpUsd;
            const cClass = isInc ? 'text-success' : 'text-danger';
            tableHTML += `</tbody><tfoot class="table-success fw-bold" style="font-size: 16px;">
                <tr>
                    <td colspan="2" class="text-end">${periodStr}</td>
                    <td class="${cClass}">${formatCurrency(totKhr, 'KHR')}</td>
                    <td class="${cClass}">${formatCurrency(totUsd, 'USD')}</td>
                </tr>
            </tfoot></table>`;
        }
        contentEl.innerHTML = tableHTML;

    } else {
        const month = document.getElementById('filterMonth').value;
        const day = document.getElementById('filterDay').value;
        let suffix = 'ប្រចាំថ្ងៃ';
        if (month === 'all') suffix = 'ប្រចាំឆ្នាំ';
        else if (day === 'all') suffix = 'ប្រចាំខែ';

        if (currentReportTab === 'summary') {
            titleEl.textContent = 'របាយការណ៍ចំណូលចំណាយសរុប' + suffix;
            const tableHTML = document.querySelector('#rep-tab-summary .table-responsive').innerHTML;
            contentEl.innerHTML = tableHTML;
        } else if (currentReportTab === 'income') {
            titleEl.textContent = 'របាយការណ៍ចំណូល' + suffix;
            const tableHTML = document.querySelector('#rep-tab-income .table-responsive').innerHTML;
            contentEl.innerHTML = tableHTML;
        } else if (currentReportTab === 'expense') {
            titleEl.textContent = 'របាយការណ៍ចំណាយ' + suffix;
            const tableHTML = document.querySelector('#rep-tab-expense .table-responsive').innerHTML;
            contentEl.innerHTML = tableHTML;
        }
    }
    
    printElement('print-area-analytics');
}

async function exportData() {
    const allTx = await db.transactions.toArray();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allTx));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pig_farm_backup_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Initial Load
checkLogin().then((isLoggedIn) => {
    loadCategories();
    loadPreparers();
    if(typeof loadUsersAndRoles === 'function') loadUsersAndRoles();
    addInvoiceRow();
    generateInvoiceNumber();
    loadInvoices();
    loadData();
    if(typeof loadEmployees === 'function') loadEmployees();
    if(typeof loadDepartmentsForEmp === 'function') loadDepartmentsForEmp();
    if(typeof loadPositionsForEmp === 'function') loadPositionsForEmp();
});

// Auto-update PWA logic
let refreshing = false;
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}
// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) {
        installBtn.style.display = 'block';
        installBtn.addEventListener('click', async () => {
            installBtn.style.display = 'none';
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
        });
    }
});
window.addEventListener('appinstalled', (evt) => {
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.style.display = 'none';
});
let editingIncomeId = null;
let editingExpenseId = null;

async function editTransaction(id, type) {
    const tx = await db.transactions.get(id);
    if (!tx) return;
    
    if (tx.note && tx.note.includes('\u179c\u17b7\u1780\u17d0\u1799\u1794\u17d0\u178f\u17d2\u179a')) {
        Swal.fire({icon: 'info', text: '\u1794\u17d2\u179a\u178f\u17b7\u1794\u178f\u17d2\u178f\u17b7\u1780\u17b6\u179a\u1793\u17c1\u17c7\u1794\u1784\u17d2\u1780\u17be\u178f\u1796\u17b8\u179c\u17b7\u1780\u17d0\u1799\u1794\u17d0\u178f\u17d2\u179a\u17d4 \u179f\u17bc\u1798\u1791\u17c5\u1780\u17c2\u1794\u17d2\u179a\u17c2\u1780\u17d2\u1793\u17bb\u1784\u1795\u17d2\u1791\u17b6\u17c6\u1784\u1794\u1789\u17d2\u1787\u17b8\u179c\u17b7\u1780\u17d0\u1799\u1794\u17d0\u178f\u17d2\u179a\u179c\u17b7\u1789!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
        return;
    }
    if (type === 'income') {
        editingIncomeId = id;
        document.getElementById('inc-date').value = tx.date;
        document.getElementById('inc-category').value = tx.category;
        document.getElementById('inc-amount').value = tx.amount;
        document.getElementById('inc-currency').value = tx.currency || 'KHR';
        document.getElementById('inc-note').value = tx.note;
        
        const btn = document.querySelector('#incomeForm button[type="submit"]');
        if (btn) btn.innerHTML = '\u179a\u1780\u17d2\u179f\u17b6\u1791\u17bb\u1780\u1785\u17c6\u178e\u17bc\u179b (Update)';
        
        showTab('income');
    } else if (type === 'expense') {
        editingExpenseId = id;
        document.getElementById('exp-date').value = tx.date;
        document.getElementById('exp-category').value = tx.category;
        document.getElementById('exp-amount').value = tx.amount;
        document.getElementById('exp-currency').value = tx.currency || 'KHR';
        document.getElementById('exp-note').value = tx.note;
        
        const btn = document.querySelector('#expenseForm button[type="submit"]');
        if (btn) btn.innerHTML = '\u179a\u1780\u17d2\u179f\u17b6\u1791\u17bb\u1780\u1785\u17c6\u178e\u17b6\u1799 (Update)';
        
        showTab('expense');
    }
}



