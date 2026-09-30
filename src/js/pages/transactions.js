// ====== TRANSACTIONS ======
if(document.getElementById('inc-exchange-rate')) document.getElementById('inc-exchange-rate').value = window.sysExchangeRate || 4100;
if(document.getElementById('exp-exchange-rate')) document.getElementById('exp-exchange-rate').value = window.sysExchangeRate || 4100;
document.getElementById('incomeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subBtn = e.target.querySelector('button[type="submit"]'); if (subBtn) { subBtn.disabled = true; subBtn.dataset.oh = subBtn.innerHTML; subBtn.innerHTML = 'ដំណើរការ...'; }
    try {
    const currency = document.getElementById('inc-currency').value;
    const paymentMethod = document.getElementById('inc-method').value;
    const exchangeRate = parseFloat(document.getElementById('inc-exchange-rate').value) || window.sysExchangeRate || 4100;
    const amount = parseFloat(document.getElementById('inc-amount').value);
    const date = document.getElementById('inc-date').value;
    const category = document.getElementById('inc-category').value;
    const note = document.getElementById('inc-note').value;
    
    if (window.editingIncomeId) { await db.transactions.update(window.editingIncomeId, { amount, currency, paymentMethod, exchangeRate, date, category, note }); window.editingIncomeId = null; if(subBtn) subBtn.dataset.oh = '\u179a\u1780\u17d2\u179f\u17b6\u1791\u17bb\u1780\u1785\u17c6\u178e\u17bc\u179b'; } else { await db.transactions.add({ type: 'income', amount, currency, paymentMethod, exchangeRate, date, category, note }); }
    document.getElementById('inc-amount').value = '';
if(document.getElementById('inc-converted-amount')) document.getElementById('inc-converted-amount').textContent = '';
document.getElementById('inc-note').value = '';
document.getElementById('inc-exchange-rate').value = window.sysExchangeRate || 4100;
    Swal.fire({icon: 'info', text: 'រក្សាទុកចំណូលបានជោគជ័យ!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
    loadData();
    } finally { if (subBtn) { subBtn.disabled = false; subBtn.innerHTML = subBtn.dataset.oh; } }
});

document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subBtn = e.target.querySelector('button[type="submit"]'); if (subBtn) { subBtn.disabled = true; subBtn.dataset.oh = subBtn.innerHTML; subBtn.innerHTML = 'ដំណើរការ...'; }
    try {
    const currency = document.getElementById('exp-currency').value;
    const paymentMethod = document.getElementById('exp-method').value;
    const exchangeRate = parseFloat(document.getElementById('exp-exchange-rate').value) || window.sysExchangeRate || 4100;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const date = document.getElementById('exp-date').value;
    const category = document.getElementById('exp-category').value;
    const note = document.getElementById('exp-note').value;
    
    if (window.editingExpenseId) { await db.transactions.update(window.editingExpenseId, { amount, currency, paymentMethod, exchangeRate, date, category, note }); window.editingExpenseId = null; if(subBtn) subBtn.dataset.oh = '\u179a\u1780\u17d2\u179f\u17b6\u1791\u17bb\u1780\u1785\u17c6\u178e\u17b6\u1799'; } else { await db.transactions.add({ type: 'expense', amount, currency, paymentMethod, exchangeRate, date, category, note }); }
    document.getElementById('exp-amount').value = '';
if(document.getElementById('exp-converted-amount')) document.getElementById('exp-converted-amount').textContent = '';
document.getElementById('exp-note').value = '';
document.getElementById('exp-exchange-rate').value = window.sysExchangeRate || 4100;
    Swal.fire({icon: 'info', text: 'រក្សាទុកចំណាយបានជោគជ័យ!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
    loadData();
    } finally { if (subBtn) { subBtn.disabled = false; subBtn.innerHTML = subBtn.dataset.oh; } }
});

async function deleteTransaction(id) {
    const res = await Swal.fire({title: '\u1794\u1789\u17d2\u1787\u17b6\u1780\u17cb', text: 'តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798', cancelButtonText: '\u1794\u17c4\u17c7\u1794\u1784\u17cb'});
    if (res.isConfirmed) {
        await db.transactions.delete(id);
        Swal.fire({icon: 'success', text: 'លុបប្រតិបត្តិការជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadData();
    }
}

// ====== CLEAR FILTERS FOR LISTS ======
function clearIncFilter() {
    if(document.getElementById('filter-inc-from')) document.getElementById('filter-inc-from').value = '';
    if(document.getElementById('filter-inc-to')) document.getElementById('filter-inc-to').value = '';
    loadData();
}

function clearExpFilter() {
    if(document.getElementById('filter-exp-from')) document.getElementById('filter-exp-from').value = '';
    if(document.getElementById('filter-exp-to')) document.getElementById('filter-exp-to').value = '';
    loadData();
}





// Real-time conversion display
function attachConversionListeners(prefix) {
    const amountEl = document.getElementById(prefix + '-amount');
    const currencyEl = document.getElementById(prefix + '-currency');
    const rateEl = document.getElementById(prefix + '-exchange-rate');
    const convertedEl = document.getElementById(prefix + '-converted-amount');

    if (!amountEl || !currencyEl || !rateEl || !convertedEl) return;

    function updateConversion() {
        const amount = parseFloat(amountEl.value) || 0;
        if (amount === 0) {
            convertedEl.textContent = '';
            return;
        }
        const currency = currencyEl.value;
        const rate = parseFloat(rateEl.value) || window.sysExchangeRate || 4100;

        if (currency === 'KHR') {
            const usd = amount / rate;
            convertedEl.textContent = '= ' + formatCurrency(usd, 'USD');
        } else {
            const khr = amount * rate;
            convertedEl.textContent = '= ' + formatCurrency(khr, 'KHR');
        }
    }

    amountEl.addEventListener('input', updateConversion);
    currencyEl.addEventListener('change', updateConversion);
    rateEl.addEventListener('input', updateConversion);
    amountEl.addEventListener('change', updateConversion); // for programmatic triggers
}

attachConversionListeners('inc');
attachConversionListeners('exp');
