// ====== TRANSACTIONS ======
document.getElementById('incomeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subBtn = e.target.querySelector('button[type="submit"]'); if (subBtn) { subBtn.disabled = true; subBtn.dataset.oh = subBtn.innerHTML; subBtn.innerHTML = 'ដំណើរការ...'; }
    try {
    const currency = document.getElementById('inc-currency').value;
    const amount = parseFloat(document.getElementById('inc-amount').value);
    const date = document.getElementById('inc-date').value;
    const category = document.getElementById('inc-category').value;
    const note = document.getElementById('inc-note').value;
    
    if (editingIncomeId) { await db.transactions.update(editingIncomeId, { amount, currency, date, category, note }); editingIncomeId = null; if(subBtn) subBtn.dataset.oh = '\u179a\u1780\u17d2\u179f\u17b6\u1791\u17bb\u1780\u1785\u17c6\u178e\u17bc\u179b'; } else { await db.transactions.add({ type: 'income', amount, currency, date, category, note }); }
    document.getElementById('inc-amount').value = '';
    document.getElementById('inc-note').value = '';
    Swal.fire({icon: 'info', text: 'រក្សាទុកចំណូលបានជោគជ័យ!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
    loadData();
    } finally { if (subBtn) { subBtn.disabled = false; subBtn.innerHTML = subBtn.dataset.oh; } }
});

document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subBtn = e.target.querySelector('button[type="submit"]'); if (subBtn) { subBtn.disabled = true; subBtn.dataset.oh = subBtn.innerHTML; subBtn.innerHTML = 'ដំណើរការ...'; }
    try {
    const currency = document.getElementById('exp-currency').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const date = document.getElementById('exp-date').value;
    const category = document.getElementById('exp-category').value;
    const note = document.getElementById('exp-note').value;
    
    if (editingExpenseId) { await db.transactions.update(editingExpenseId, { amount, currency, date, category, note }); editingExpenseId = null; if(subBtn) subBtn.dataset.oh = '\u179a\u1780\u17d2\u179f\u17b6\u1791\u17bb\u1780\u1785\u17c6\u178e\u17b6\u1799'; } else { await db.transactions.add({ type: 'expense', amount, currency, date, category, note }); }
    document.getElementById('exp-amount').value = '';
    document.getElementById('exp-note').value = '';
    Swal.fire({icon: 'info', text: 'រក្សាទុកចំណាយបានជោគជ័យ!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
    loadData();
    } finally { if (subBtn) { subBtn.disabled = false; subBtn.innerHTML = subBtn.dataset.oh; } }
});

async function deleteTransaction(id) {
    const res = await Swal.fire({title: '\u1794\u1789\u17d2\u1787\u17b6\u1780\u17cb', text: 'តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798', cancelButtonText: '\u1794\u17c4\u17c7\u1794\u1784\u17cb'});
    if (res.isConfirmed) {
        await db.transactions.delete(id);
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

