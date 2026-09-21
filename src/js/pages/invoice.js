// ====== INVOICE LOGIC ======
let invoiceItemCount = 0;
let editingInvoiceId = null;
let editingTxId = null;

function addInvoiceRow() {
    invoiceItemCount++;
    const tbody = document.getElementById('inv-items-body');
    const tr = document.createElement('tr');
    tr.id = `inv-row-${invoiceItemCount}`;
    tr.innerHTML = `
        <td><input type="text" class="form-control item-id" placeholder="ID"></td>
        <td><input type="text" class="form-control item-desc" placeholder="បរិយាយ..." required></td>
        <td><input type="number" class="form-control item-mass" value="1" min="1" step="0.01" oninput="calculateInvoiceTotal()"></td>
        <td><input type="number" class="form-control item-price" value="0" min="0" step="0.01" oninput="calculateInvoiceTotal()"></td>
        <td><input type="number" class="form-control item-total fw-bold" readonly value="0"></td>
        <td><button type="button" class="btn btn-danger btn-sm" onclick="removeInvoiceRow(${invoiceItemCount})">លុប</button></td>
    `;
    tbody.appendChild(tr);
}

function removeInvoiceRow(rowId) {
    const row = document.getElementById(`inv-row-${rowId}`);
    if (row) row.remove();
    calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
    let subtotal = 0;
    const rows = document.querySelectorAll('#inv-items-body tr');
    rows.forEach(row => {
        const mass = parseFloat(row.querySelector('.item-mass').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const totalInput = row.querySelector('.item-total');
        const rowTotal = mass * price;
        totalInput.value = rowTotal;
        subtotal += rowTotal;
    });

    document.getElementById('inv-subtotal').value = subtotal;
    const delivery = parseFloat(document.getElementById('inv-delivery').value) || 0;
    document.getElementById('inv-grandtotal').value = subtotal + delivery;
}

async function generateInvoiceNumber() {
    const invInput = document.getElementById('inv-no');
    if (!invInput) return;
    
    // Attempt to get last invoice to increment
    const lastInvoice = await db.invoices.orderBy('id').last();
    let nextNum = 1;
    if (lastInvoice && lastInvoice.invNo) {
        const match = lastInvoice.invNo.match(/\d+$/);
        if (match) {
            nextNum = parseInt(match[0], 10) + 1;
        } else {
            nextNum = (await db.invoices.count()) + 1;
        }
    }
    invInput.value = String(nextNum).padStart(6, '0');
}

function resetInvoiceForm() {
    document.getElementById('invoiceForm').reset();
    document.getElementById('inv-date').valueAsDate = new Date();
    document.getElementById('inv-items-body').innerHTML = '';
    invoiceItemCount = 0;
    editingInvoiceId = null;
    editingTxId = null;
    document.getElementById('btn-save-invoice').textContent = 'រក្សាទុកជាចំណូល & ព្រីនវិក្កយបត្រ (Save & Print)';
    addInvoiceRow();
    generateInvoiceNumber();
}

document.getElementById('invoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const subBtn = e.target.querySelector('button[type="submit"]'); if (subBtn) { subBtn.disabled = true; subBtn.dataset.oh = subBtn.innerHTML; subBtn.innerHTML = 'ដំណើរការ...'; }
    try {
    
    const rows = document.querySelectorAll('#inv-items-body tr');
    if (rows.length === 0) {
        Swal.fire({icon: 'info', text: 'សូមបញ្ចូលទំនិញយ៉ាងហោចណាស់មួយ!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'}); return;
    }

    const invNo = document.getElementById('inv-no').value;
    const date = document.getElementById('inv-date').value;
    const customer = document.getElementById('inv-customer').value;
    const address = document.getElementById('inv-address').value;
    const category = document.getElementById('inv-income-category').value;
    const currency = document.getElementById('inv-currency').value;
    const subtotal = parseFloat(document.getElementById('inv-subtotal').value) || 0;
    const delivery = parseFloat(document.getElementById('inv-delivery').value) || 0;
    const grandTotal = parseFloat(document.getElementById('inv-grandtotal').value) || 0;

    let items = [];
    rows.forEach(row => {
        items.push({
            id: row.querySelector('.item-id').value,
            desc: row.querySelector('.item-desc').value,
            mass: parseFloat(row.querySelector('.item-mass').value) || 0,
            price: parseFloat(row.querySelector('.item-price').value) || 0,
            total: parseFloat(row.querySelector('.item-total').value) || 0
        });
    });

    let savedInv = { invNo, date, customer, address, items, subtotal, delivery, grandTotal, currency };

    if (editingInvoiceId) {
        if (editingTxId) {
            await db.transactions.update(editingTxId, { amount: grandTotal, currency: currency, date: date, category: category, note: `វិក្កយបត្រ N°: ${invNo} - ភ្ញៀវ: ${customer}` });
        }
        await db.invoices.update(editingInvoiceId, savedInv);
    } else {
        const txId = await db.transactions.add({ 
            type: 'income', amount: grandTotal, currency: currency, date: date, category: category, note: `វិក្កយបត្រ N°: ${invNo} - ភ្ញៀវ: ${customer}` 
        });
        savedInv.txId = txId;
        await db.invoices.add(savedInv);
    }

    populateAndPrintInvoice(savedInv);
    resetInvoiceForm();
    loadInvoices();
    loadData();
    } finally { if (subBtn) { subBtn.disabled = false; subBtn.innerHTML = subBtn.dataset.oh; } }
});

function printElement(elId) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = formatKhmerDate(`${y}-${m}-${d}`).split(' ');
    const finalDate = `ធ្វើនៅថ្ងៃទី ${todayStr[0]} ខែ${todayStr[1]} ឆ្នាំ${todayStr[2]}`;
    document.querySelectorAll('.sys-print-date').forEach(el => el.textContent = finalDate);

    document.querySelectorAll('.print-container').forEach(el => el.classList.remove('print-template'));
    document.getElementById(elId).classList.add('print-template');
    window.print();
}

function populateAndPrintInvoice(inv) {
    let formattedDate = inv.date;
    if (formattedDate && formattedDate.length === 10) {
        const parts = formattedDate.split('-');
        if (parts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const year = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10).toString().padStart(2, '0');
            formattedDate = `${day}-${months[monthIndex]}-${year}`;
        }
    }
    document.getElementById('p-inv-date').textContent = formattedDate;
    document.getElementById('p-inv-no').textContent = inv.invNo;
    document.getElementById('p-inv-customer').textContent = inv.customer;
    document.getElementById('p-inv-address').textContent = inv.address || '';

    const pTbody = document.getElementById('p-inv-items');
    pTbody.innerHTML = '';
    
    const cur = inv.currency || 'USD';
    
    inv.items.forEach((item, index) => {
        pTbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.id}</td>
                <td>${item.desc}</td>
                <td>${item.mass}</td>
                <td>${formatCurrency(item.price, cur)}</td>
                <td>${formatCurrency(item.total, cur)}</td>
            </tr>
        `;
    });

    const emptyRowsNeeded = 10 - inv.items.length;
    for(let i=0; i<emptyRowsNeeded; i++) {
        pTbody.innerHTML += `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    document.getElementById('p-inv-subtotal').textContent = formatCurrency(inv.subtotal, cur);
    document.getElementById('p-inv-delivery').textContent = formatCurrency(inv.delivery || 0, cur);
    document.getElementById('p-inv-grandtotal').textContent = formatCurrency(inv.grandTotal, cur);

    printElement('print-area-invoice');
}

function clearInvoiceFilters() {
    document.getElementById('search-inv-no').value = '';
    document.getElementById('search-inv-from').value = '';
    document.getElementById('search-inv-to').value = '';
    loadInvoices();
}

async function loadInvoices() {
    let allInvoices = await db.invoices.toArray();
    allInvoices.sort((a, b) => {
        let dateA = a.date || '';
        let dateB = b.date || '';
        return dateB.localeCompare(dateA);
    });
    
    const searchNo = document.getElementById('search-inv-no') ? document.getElementById('search-inv-no').value.trim().toLowerCase() : '';
    const fromDate = document.getElementById('search-inv-from') ? document.getElementById('search-inv-from').value : '';
    const toDate = document.getElementById('search-inv-to') ? document.getElementById('search-inv-to').value : '';
    
    if (searchNo) allInvoices = allInvoices.filter(inv => (inv.invNo || '').toLowerCase().includes(searchNo));
    if (fromDate) allInvoices = allInvoices.filter(inv => inv.date >= fromDate);
    if (toDate) allInvoices = allInvoices.filter(inv => inv.date <= toDate);

    const tbody = document.getElementById('invoiceListBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    allInvoices.forEach(inv => {
        const cur = inv.currency || 'USD';
        tbody.innerHTML += `
            <tr>
                <td>${formatKhmerDate(inv.date)}</td>
                <td>${inv.invNo}</td>
                <td>${inv.customer}</td>
                <td class="fw-bold text-success">${formatCurrency(inv.grandTotal, cur)}</td>
                <td>
                    <button class="btn btn-sm btn-info text-white" onclick="reprintInvoice(${inv.id})">ព្រីន (Print)</button>
                    <button class="btn btn-sm btn-warning btn-edit" onclick="editInvoice(${inv.id})">កែប្រែ (Edit)</button>
                    <button class="btn btn-sm btn-danger btn-delete" onclick="deleteInvoice(${inv.id})">លុប (Delete)</button>
                </td>
            </tr>
        `;
    });
}

async function reprintInvoice(id) {
    const inv = await db.invoices.get(id);
    if(inv) populateAndPrintInvoice(inv);
}

async function editInvoice(id) {
    const inv = await db.invoices.get(id);
    if(!inv) return;
    
    editingInvoiceId = inv.id;
    editingTxId = inv.txId || null;

    document.getElementById('inv-no').value = inv.invNo;
    document.getElementById('inv-date').value = inv.date;
    document.getElementById('inv-customer').value = inv.customer;
    document.getElementById('inv-address').value = inv.address || '';
    document.getElementById('inv-currency').value = inv.currency || 'KHR';
    
    const tbody = document.getElementById('inv-items-body');
    tbody.innerHTML = '';
    invoiceItemCount = 0;
    
    inv.items.forEach(item => {
        invoiceItemCount++;
        const tr = document.createElement('tr');
        tr.id = `inv-row-${invoiceItemCount}`;
        tr.innerHTML = `
            <td><input type="text" class="form-control item-id" placeholder="ID" value="${item.id || ''}"></td>
            <td><input type="text" class="form-control item-desc" placeholder="បរិយាយ..." required value="${item.desc}"></td>
            <td><input type="number" class="form-control item-mass" min="1" step="0.01" oninput="calculateInvoiceTotal()" value="${item.mass}"></td>
            <td><input type="number" class="form-control item-price" min="0" step="0.01" oninput="calculateInvoiceTotal()" value="${item.price}"></td>
            <td><input type="number" class="form-control item-total fw-bold" readonly value="${item.total}"></td>
            <td><button type="button" class="btn btn-danger btn-sm" onclick="removeInvoiceRow(${invoiceItemCount})">លុប</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('inv-subtotal').value = inv.subtotal;
    document.getElementById('inv-delivery').value = inv.delivery || 0;
    document.getElementById('inv-grandtotal').value = inv.grandTotal;
    
    document.getElementById('btn-save-invoice').textContent = 'កែប្រែ & ព្រីនវិក្កយបត្រ (Update & Print)';
    showTab('invoice');
}

async function deleteInvoice(id) {
    const res = await Swal.fire({title: '\u1794\u1789\u17d2\u1787\u17b6\u1780\u17cb', text: 'តើអ្នកពិតជាចង់លុបវិក្កយបត្រនេះមែនទេ? (ទិន្នន័យចំណូលដែលពាក់ព័ន្ធវានឹងត្រូវលុបចោលដូចគ្នា)', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798', cancelButtonText: '\u1794\u17c4\u17c7\u1794\u1784\u17cb'});
    if (res.isConfirmed) {
        const inv = await db.invoices.get(id);
        if (inv && inv.txId) {
            await db.transactions.delete(inv.txId);
        }
        await db.invoices.delete(id);
        loadInvoices();
        loadData();
    }
}


