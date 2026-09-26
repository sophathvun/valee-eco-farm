// ====== INVOICE LOGIC ======
let invoiceItemCount = 0;
let editingInvoiceId = null;
let editingTxId = null;

async function addInvoiceRow() {
    invoiceItemCount++;
    const tbody = document.getElementById('inv-items-body');
    const tr = document.createElement('tr');
    tr.id = `inv-row-${invoiceItemCount}`;
    
    let unitOptions = '<option value="">--</option>';
    try {
        const units = await db.units.toArray();
        units.forEach(u => {
            unitOptions += `<option value="${u.name}">${u.name}</option>`;
        });
    } catch(e) {}
    
    tr.innerHTML = `
        <td><input type="text" class="form-control item-id" placeholder="ID"></td>
        <td><input type="text" class="form-control item-desc" placeholder="បរិយាយ..." required></td>
        <td style="min-width: 150px;">
            <div class="input-group">
                <input type="number" class="form-control item-mass" value="1" min="1" step="0.01" oninput="calculateInvoiceTotal()">
                <select class="form-select item-unit" style="max-width: 80px;">${unitOptions}</select>
            </div>
        </td>
        <td><input type="text" inputmode="decimal" class="form-control item-price" onfocus="this.value = parseCurrencyStr(this.value) || ''" onblur="this.value = formatCurrency(parseCurrencyStr(this.value), document.getElementById('inv-currency').value)" value="0" min="0" step="0.01" oninput="calculateInvoiceTotal()"></td>
        <td><input type="text" class="form-control item-total fw-bold" readonly value="0"></td>
        <td><button type="button" class="btn btn-danger btn-sm" onclick="removeInvoiceRow(${invoiceItemCount})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></td>
    `;
    tbody.appendChild(tr);
}

function removeInvoiceRow(rowId) {
    const row = document.getElementById(`inv-row-${rowId}`);
    if (row) row.remove();
    calculateInvoiceTotal();
}

window.parseCurrencyStr = function parseCurrencyStr(val) { if(!val) return 0; return parseFloat(val.toString().replace(/[^0-9.-]+/g, '')) || 0; }
function calculateInvoiceTotal() {
    let subtotal = 0;
    const cur = document.getElementById('inv-currency').value;
    const rows = document.querySelectorAll('#inv-items-body tr');
    rows.forEach(row => {
        const mass = parseFloat(row.querySelector('.item-mass').value) || 0;
        const price = parseCurrencyStr(row.querySelector('.item-price').value);
        const totalInput = row.querySelector('.item-total');
        const rowTotal = mass * price;
        totalInput.value = formatCurrency(rowTotal, cur);
        subtotal += rowTotal;
    });

    document.getElementById('inv-subtotal').value = formatCurrency(subtotal, cur);
    const delivery = parseCurrencyStr(document.getElementById('inv-delivery').value);
    document.getElementById('inv-grandtotal').value = formatCurrency(subtotal + delivery, cur);
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
    const phone = document.getElementById('inv-phone').value;
    const address = document.getElementById('inv-address').value;
    const category = document.getElementById('inv-income-category').value;
    const currency = document.getElementById('inv-currency').value;
    const subtotal = parseCurrencyStr(document.getElementById('inv-subtotal').value);
    const delivery = parseCurrencyStr(document.getElementById('inv-delivery').value);
    const grandTotal = parseCurrencyStr(document.getElementById('inv-grandtotal').value);

    let items = [];
    rows.forEach(row => {
        items.push({
            id: row.querySelector('.item-id').value,
            desc: row.querySelector('.item-desc').value,
            mass: parseFloat(row.querySelector('.item-mass').value) || 0,
            unit: row.querySelector('.item-unit') ? row.querySelector('.item-unit').value : '',
            price: parseCurrencyStr(row.querySelector('.item-price').value),
            total: parseCurrencyStr(row.querySelector('.item-total').value)
        });
    });

    let savedInv = { invNo, date, customer, phone, address, items, subtotal, delivery, grandTotal, currency };

    if (editingInvoiceId) {
        if (editingTxId) {
            await db.transactions.update(editingTxId, { amount: grandTotal, currency: currency, date: date, category: category, note: `វិក្កយបត្រ N°: ${invNo} - ភ្ញៀវ: ${customer}` });
        }
        await db.invoices.update(editingInvoiceId, savedInv);
        Swal.fire({icon: 'success', text: 'កែប្រែវិក្កយបត្រជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
    } else {
        const txId = await db.transactions.add({ 
            type: 'income', amount: grandTotal, currency: currency, date: date, category: category, note: `វិក្កយបត្រ N°: ${invNo} - ភ្ញៀវ: ${customer}` 
        });
        savedInv.txId = txId;
        await db.invoices.add(savedInv);
        Swal.fire({icon: 'success', text: 'រក្សាទុកវិក្កយបត្រជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
    }

    populateAndPrintInvoice(savedInv);
    resetInvoiceForm();
    loadInvoices();
    loadData();
    } finally { if (subBtn) { subBtn.disabled = false; subBtn.innerHTML = subBtn.dataset.oh; } }
});

function printElement(elId, orientation = 'portrait') {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = formatKhmerDate(`${y}-${m}-${d}`).split(' ');
    const finalDate = `ធ្វើនៅថ្ងៃទី ${todayStr[0]} ខែ${todayStr[1]} ឆ្នាំ${todayStr[2]}`;
    document.querySelectorAll('.sys-print-date').forEach(el => el.textContent = finalDate);

    let style = document.getElementById('dynamic-print-orientation');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-print-orientation';
        document.head.appendChild(style);
    }
    style.innerHTML = `@media print { @page { size: A4 ${orientation}; margin: 10mm; } }`;

    document.querySelectorAll('.print-container').forEach(el => el.classList.remove('print-template'));
    document.getElementById(elId).classList.add('print-template');
    setTimeout(() => window.print(), 300);
}

async function populateAndPrintInvoice(inv) {
    try {
        const brand = await db.brandSettings.get(1);
        if (brand && brand.reportLogo) {
            document.querySelector('#print-area-invoice .sys-logo').src = brand.reportLogo;
        }
    } catch(e) {}
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
    document.getElementById('p-inv-phone').textContent = inv.phone || '';
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
                <td>${item.mass} ${item.unit || ''}</td>
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
                <td>${inv.phone || ''}</td>
                <td class="fw-bold text-success">${formatCurrency(inv.grandTotal, cur)}</td>
                <td>
                    <button class="btn btn-sm btn-info text-white" onclick="reprintInvoice(${inv.id})">ព្រីន (Print)</button>
                    <button class="btn btn-sm btn-warning btn-edit" onclick="editInvoice(${inv.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                    <button class="btn btn-sm btn-danger btn-delete" onclick="deleteInvoice(${inv.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
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
    document.getElementById('inv-phone').value = inv.phone || '';
    document.getElementById('inv-address').value = inv.address || '';
    document.getElementById('inv-currency').value = inv.currency || 'KHR';
    
    const tbody = document.getElementById('inv-items-body');
    tbody.innerHTML = '';
    invoiceItemCount = 0;
    
    let unitOptionsHtml = '<option value="">--</option>';
    try {
        const units = await db.units.toArray();
        units.forEach(u => {
            unitOptionsHtml += `<option value="${u.name}">${u.name}</option>`;
        });
    } catch(e) {}

    inv.items.forEach(item => {
        invoiceItemCount++;
        const tr = document.createElement('tr');
        tr.id = `inv-row-${invoiceItemCount}`;
        
        let customUnitOptions = unitOptionsHtml;
        if (item.unit) {
            customUnitOptions = customUnitOptions.replace(`value="${item.unit}"`, `value="${item.unit}" selected`);
        }

        tr.innerHTML = `
            <td><input type="text" class="form-control item-id" placeholder="ID" value="${item.id || ''}"></td>
            <td><input type="text" class="form-control item-desc" placeholder="បរិយាយ..." required value="${item.desc}"></td>
            <td style="min-width: 150px;">
                <div class="input-group">
                    <input type="number" class="form-control item-mass" min="1" step="0.01" oninput="calculateInvoiceTotal()" value="${item.mass}">
                    <select class="form-select item-unit" style="max-width: 80px;">${customUnitOptions}</select>
                </div>
            </td>
            <td><input type="text" inputmode="decimal" class="form-control item-price" onfocus="this.value = parseCurrencyStr(this.value) || ''" onblur="this.value = formatCurrency(parseCurrencyStr(this.value), document.getElementById('inv-currency').value)" min="0" step="0.01" oninput="calculateInvoiceTotal()" value="${item.price}"></td>
            <td><input type="text" class="form-control item-total fw-bold" readonly value="${item.total}"></td>
            <td><button type="button" class="btn btn-danger btn-sm" onclick="removeInvoiceRow(${invoiceItemCount})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('inv-subtotal').value = inv.subtotal;
    document.getElementById('inv-delivery').value = inv.delivery || 0;
    document.getElementById('inv-grandtotal').value = inv.grandTotal;
    
    calculateInvoiceTotal();
    document.querySelectorAll('.item-price, #inv-delivery').forEach(el => el.value = formatCurrency(parseCurrencyStr(el.value), inv.currency || 'KHR'));
    
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
        Swal.fire({icon: 'success', text: 'លុបវិក្កយបត្រជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadInvoices();
        loadData();
    }
}











