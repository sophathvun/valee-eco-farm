// 1. Setup IndexedDB using Dexie.js
const firebaseConfig = {
  apiKey: "AIzaSyBwBK74uWvtm_CPlxX88Pz-5A9avMtELXs",
  authDomain: "valee-eco-farm.firebaseapp.com",
  projectId: "valee-eco-farm",
  storageBucket: "valee-eco-farm.firebasestorage.app",
  messagingSenderId: "204722767845",
  appId: "1:204722767845:web:b132ee57cd0e5c7123110c",
  measurementId: "G-QFQK6VSKTP"
};
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();
firestore.enablePersistence({synchronizeTabs:true}).catch(console.error);

class FirebaseQuery {
    constructor(query) { this.query = query; }
    reverse() { this.shouldReverse = true; return this; }
    async toArray() {
        const snap = await this.query.get();
        let arr = snap.docs.map(d => d.data());
        if(this.shouldReverse) arr.reverse();
        return arr;
    }
    async last() {
        const arr = await this.toArray();
        return arr[arr.length - 1];
    }
    async first() {
        const snap = await this.query.limit(1).get();
        return snap.empty ? null : snap.docs[0].data();
    }
    async count() {
        const snap = await this.query.get();
        return snap.size;
    }
}

class FirebaseStore {
    constructor(collectionName) {
        this.col = firestore.collection(collectionName);
    }
    async count() { const snap = await this.col.get(); return snap.size; }
    async add(obj) { 
        if(!obj.id) obj.id = Date.now() + Math.floor(Math.random() * 10000);
        await this.col.doc(obj.id.toString()).set(obj); 
        return obj.id; 
    }
    async bulkAdd(arr) { 
        const batch = firestore.batch();
        arr.forEach(obj => {
            if(!obj.id) obj.id = Date.now() + Math.floor(Math.random() * 10000);
            batch.set(this.col.doc(obj.id.toString()), obj);
        });
        await batch.commit();
    }
    async get(id) { 
        if(!id) return null;
        const doc = await this.col.doc(id.toString()).get(); 
        return doc.exists ? doc.data() : null; 
    }
    async update(id, obj) { 
        if(!id) return;
        await this.col.doc(id.toString()).update(obj); 
    }
    async delete(id) { 
        if(!id) return;
        await this.col.doc(id.toString()).delete(); 
    }
    async toArray() { 
        const snap = await this.col.get(); 
        return snap.docs.map(d => d.data()); 
    }
    orderBy(field) { return new FirebaseQuery(this.col.orderBy(field)); }
    where(field) {
        const col = this.col;
        return {
            equals: (val) => new FirebaseQuery(col.where(field, '==', val)),
            equalsIgnoreCase: (val) => new FirebaseQuery(col.where(field, '==', val)),
            anyOf: (arr) => new FirebaseQuery(col.where(field, 'in', arr))
        };
    }
}

const db = {
    transactions: new FirebaseStore('transactions'),
    categories: new FirebaseStore('categories'),
    invoices: new FirebaseStore('invoices'),
    preparers: new FirebaseStore('preparers'),
    users: new FirebaseStore('users')
};

let myChart = null;
let reportChartInstance = null;
let incReportChartInstance = null;
let expReportChartInstance = null;
let currentReportTab = 'summary';

Chart.defaults.font.family = "'Kantumruy Pro', 'Khmer OS Battambang', sans-serif";

document.getElementById('inc-date').valueAsDate = new Date();
document.getElementById('exp-date').valueAsDate = new Date();
document.getElementById('inv-date').valueAsDate = new Date();

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ======= AUTHENTICATION LOGIC =======
let currentUser = null;

async function checkLogin() {
    let userCount = await db.users.count();
    if (userCount === 0) {
        // Create default admin if DB is fresh
        await db.users.add({
            username: 'admin',
            password: '123456',
            permissions: ['dashboard', 'invoice_add', 'invoice_list', 'income_add', 'expense_add', 'reports', 'settings']
        });
    }

    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('main-wrapper').style.display = 'flex';
        applyPermissions();
        loadSystemSettings(); // Wait, let's just apply permissions
        return true;
    } else {
        document.getElementById('login-view').style.display = 'flex';
        document.getElementById('main-wrapper').style.display = 'none';
        return false;
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    
    // Check in DB
    const allUsers = await db.users.toArray();
    const user = allUsers.find(x => x.username === u && x.password === p);
    if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        currentUser = user;
        document.getElementById('loginForm').reset();
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('main-wrapper').style.display = 'flex';
        applyPermissions();
        
        // Auto-navigate to first available tab
        if (hasPermission('dashboard')) showTab('dashboard');
        else if (hasPermission('invoice_add')) showTab('invoice');
        else if (hasPermission('invoice_list')) showTab('invoice-list');
        else if (hasPermission('income')) showTab('income');
        else if (hasPermission('expense')) showTab('expense');
        else if (hasPermission('reports')) showTab('reports');
        else if (hasPermission('settings')) showTab('settings');
        
    } else {
        alert('ឈ្មោះគណនី ឬ លេខសម្ងាត់មិនត្រឹមត្រូវទេ!');
    }
});

function logoutUser() {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    document.getElementById('login-view').style.display = 'flex';
    document.getElementById('main-wrapper').style.display = 'none';
}

function hasPermission(perm) {
    if (!currentUser) return false;
    if (currentUser.username === 'admin') return true;
    return currentUser.permissions && currentUser.permissions.includes(perm);
}

// Helper function for RBAC
function hasPermission(perm) {
    if (!currentUser) return false;
    if (currentUser.username === 'admin') return true;
    return currentUser.permissions && currentUser.permissions.includes(perm);
}

// Override applyPermissions to hide elements
window.applyPermissions = function() {
    if (!currentUser) return;
    const perms = currentUser.permissions || [];
    
    // Hide menus
    document.querySelectorAll('.sys-menu-item').forEach(el => {
        const p = el.getAttribute('data-perm');
        if (p && !perms.includes(p) && currentUser.username !== 'admin') {
            el.style.display = 'none';
        } else {
            el.style.display = 'block';
        }
    });

    if (currentUser.username !== 'admin' && !perms.includes('write')) {
        document.body.classList.add('readonly-mode');
    } else {
        document.body.classList.remove('readonly-mode');
    }
};

window.importData = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async event => {
            try {
                const data = JSON.parse(event.target.result);
                if(data && Array.isArray(data)) {
                    await db.transactions.bulkAdd(data);
                    alert("✅ ទាញទិន្នន័យចូលជោគជ័យ! សូម Refresh វេបសាយ។");
                    loadData();
                } else {
                    alert("❌ ឯកសារមិនត្រឹមត្រូវ!");
                }
            } catch(err) {
                alert("❌ បរាជ័យក្នុងការទាញទិន្នន័យ៖ " + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
};


function updateOnlineStatus() {
    const offlineBadge = document.getElementById('offline-status');
    if (!navigator.onLine) offlineBadge.style.display = 'block';
    else offlineBadge.style.display = 'none';
}
updateOnlineStatus();

function loadSystemSettings() {
    const sysPhone = localStorage.getItem('sysPhone') || '095 989 708';
    const sysAddrKh = localStorage.getItem('sysAddrKh') || 'ភូមិព្រីង ឃុំយាយម៉ៅ\nស្រុកភ្នំស្រួច ខេត្តកំពង់ស្ពឺ';
    const sysAddrEn = localStorage.getItem('sysAddrEn') || 'Phoum Pring, Khum Yeay Moa\nSrok Phnom Srouch, Kampong Speu';
    const sysPreparer = localStorage.getItem('sysPreparer') || '';
    const sysLogo = localStorage.getItem('sysLogo'); // Base64 if exists

    // Populate Settings Form
    const pInput = document.getElementById('setSysPhone');
    const khInput = document.getElementById('setSysAddrKh');
    const enInput = document.getElementById('setSysAddrEn');
    const prepInput = document.getElementById('setSysPreparer');
    if (pInput) pInput.value = sysPhone;
    if (khInput) khInput.value = sysAddrKh;
    if (enInput) enInput.value = sysAddrEn;
    if (prepInput) prepInput.value = sysPreparer;

    // Apply to UI (Invoice & System)
    const uiPhone = document.getElementById('sys-phone');
    if (uiPhone) uiPhone.innerHTML = sysPhone.replace(/\n/g, '<br>');
    
    const uiAddrKh = document.getElementById('sys-addr-kh');
    if (uiAddrKh) uiAddrKh.innerHTML = sysAddrKh.replace(/\n/g, '<br>');
    
    const uiAddrEn = document.getElementById('sys-addr-en');
    if (uiAddrEn) uiAddrEn.innerHTML = sysAddrEn.replace(/\n/g, '<br>');

    // Apply Preparer
    document.querySelectorAll('.sys-preparer').forEach(el => el.textContent = sysPreparer);

    // Apply Logo if custom logo is set
    if (sysLogo) {
        document.querySelectorAll('.sys-logo').forEach(img => img.src = sysLogo);
    }
}
loadSystemSettings();

window.previewLogo = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('previewSysLogo').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

function showTab(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar .nav-link').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId + '-view').classList.add('active');
    document.getElementById('nav-' + tabId).classList.add('active');
    
    // Close mobile sidebar if open
    document.querySelector('.sidebar').classList.remove('mobile-open');
    
    const titles = {
        'dashboard': 'ទំព័រដើម',
        'invoice': 'បង្កើតវិក្កយបត្រ (Invoice)',
        'invoice-list': 'ប្រវត្តិវិក្កយបត្រ',
        'income': 'បញ្ចូលទិន្នន័យចំណូលផ្ទាល់',
        'expense': 'បញ្ចូលទិន្នន័យចំណាយ',
        'reports': 'របាយការណ៍',
        'settings': 'ការកំណត់ប្រព័ន្ធទូទៅ'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = titles[tabId];

    if (tabId === 'reports') {
        populateYearFilter();
        switchReportTab(currentReportTab);
    }
}

function formatCurrency(amount, currency) {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
    const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    return `៛${formatted}`;
}

function formatKhmerDate(dateStr) {
    if (!dateStr || dateStr.length !== 10) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    const toKhmer = (numStr) => String(numStr).replace(/[0-9]/g, w => khmerDigits[w]);
    const year = toKhmer(parts[0]);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = toKhmer(parseInt(parts[2], 10).toString());
    const khmerMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    return `${day} ${khmerMonths[monthIndex]} ${year}`;
}

// ====== CATEGORY MANAGEMENT ======
async function loadCategories() {
    let allCats = await db.categories.toArray();
    let hasGarbled = allCats.some(c => c.name && c.name.includes('áž'));
    if (hasGarbled) {
        for (let c of allCats) {
            if (c.name.includes('áž')) await db.categories.delete(c.id);
        }
    }
    let catCount = await db.categories.count();
    if (catCount === 0) {
        const defaults = [
            { type: 'income', name: 'លក់ជ្រូកសាច់' }, { type: 'income', name: 'លក់កូនជ្រូក' },
            { type: 'income', name: 'លក់ជី (លាមកជ្រូក)' }, { type: 'income', name: 'ផ្សេងៗ' },
            { type: 'expense', name: 'ចំណីជ្រូក' }, { type: 'expense', name: 'ថ្នាំសង្កូវ និងវ៉ាក់សាំង' },
            { type: 'expense', name: 'ប្រាក់ខែបុគ្គលិក' }, { type: 'expense', name: 'ថ្លៃទឹក និងភ្លើង' },
            { type: 'expense', name: 'ថ្លៃដឹកជញ្ជូន' }, { type: 'expense', name: 'ទិញកូនជ្រូក' },
            { type: 'expense', name: 'ផ្សេងៗ' }
        ];
        await db.categories.bulkAdd(defaults);
    }
    
    const allCategories = await db.categories.toArray();
    const incomeCats = allCategories.filter(c => c.type === 'income');
    const expenseCats = allCategories.filter(c => c.type === 'expense');

    const incSelect = document.getElementById('inc-category');
    const invIncSelect = document.getElementById('inv-income-category');
    incSelect.innerHTML = '';
    invIncSelect.innerHTML = '';
    incomeCats.forEach(c => {
        incSelect.appendChild(new Option(c.name, c.name));
        invIncSelect.appendChild(new Option(c.name, c.name));
    });

    const expSelect = document.getElementById('exp-category');
    expSelect.innerHTML = '';
    expenseCats.forEach(c => {
        expSelect.appendChild(new Option(c.name, c.name));
    });

    const incList = document.getElementById('incCatList');
    incList.innerHTML = '';
    incomeCats.forEach(c => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${c.name}</span><div><button class="btn btn-sm btn-outline-primary me-1" onclick="editCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')">កែប្រែ</button><button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${c.id})">លុប</button></div>`;
        incList.appendChild(li);
    });

    const expList = document.getElementById('expCatList');
    expList.innerHTML = '';
    expenseCats.forEach(c => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${c.name}</span><div><button class="btn btn-sm btn-outline-primary me-1" onclick="editCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')">កែប្រែ</button><button class="btn btn-sm btn-outline-danger" onclick="deleteCategory(${c.id})">លុប</button></div>`;
        expList.appendChild(li);
    });
}

// ====== PREPARER MANAGEMENT ======
async function loadPreparers() {
    let allPrep = await db.preparers.toArray();
    let hasGarbled = allPrep.some(p => p.name && p.name.includes('áž'));
    if (hasGarbled) {
        for (let p of allPrep) {
            if (p.name.includes('áž')) await db.preparers.delete(p.id);
        }
    }
    let pCount = await db.preparers.count();
    if (pCount === 0) {
        await db.preparers.bulkAdd([{name: 'សុខ សាន្ត'}]);
    }
    const all = await db.preparers.toArray();
    
    // Populate list in Settings
    const list = document.getElementById('preparerList');
    if (list) {
        list.innerHTML = '';
        all.forEach(p => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `<span>${p.name}</span><div><button class="btn btn-sm btn-outline-primary me-1" onclick="editPreparer(${p.id}, '${p.name.replace(/'/g, "\\'")}')">កែប្រែ</button><button class="btn btn-sm btn-outline-danger" onclick="deletePreparer(${p.id})">លុប</button></div>`;
            list.appendChild(li);
        });
    }

    // Populate Dropdown in Reports
    const select = document.getElementById('filterPreparer');
    if (select) {
        const currentVal = select.value || localStorage.getItem('sysPreparer') || all[0]?.name; 
        select.innerHTML = all.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
        if (currentVal && all.some(p => p.name === currentVal)) {
            select.value = currentVal;
        } else if (all.length > 0) {
            select.value = all[0].name;
        }
        updatePreparerName();
    }
}

window.updatePreparerName = function() {
    const prepName = document.getElementById('filterPreparer')?.value || '';
    document.querySelectorAll('.sys-preparer').forEach(el => el.textContent = prepName);
    localStorage.setItem('sysPreparer', prepName);
}

document.getElementById('addPreparerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.preparers.add({ name: document.getElementById('newPrepName').value });
    document.getElementById('newPrepName').value = '';
    loadPreparers();
});

async function editPreparer(id, oldName) {
    const newName = prompt('សូមបញ្ចូលឈ្មោះអ្នករៀបចំថ្មី៖', oldName);
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        await db.preparers.update(id, { name: newName.trim() });
        loadPreparers();
    }
}

async function deletePreparer(id) {
    if(confirm('តើអ្នកពិតជាចង់លុបឈ្មោះនេះមែនទេ?')) {
        await db.preparers.delete(id);
        loadPreparers();
    }
}

// ====== USER MANAGEMENT ======
let editingUserId = null;

async function loadUsers() {
    const allUsers = await db.users.toArray();
    const tbody = document.getElementById('userListTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    allUsers.forEach(u => {
        const tr = document.createElement('tr');
        
        let permsKhmer = [];
        if (u.permissions.includes('dashboard')) permsKhmer.push('ទំព័រដើម');
        if (u.permissions.includes('invoice_add')) permsKhmer.push('បង្កើតវិក្កយបត្រ');
        if (u.permissions.includes('invoice_list')) permsKhmer.push('បញ្ជីវិក្កយបត្រ');
        if (u.permissions.includes('income')) permsKhmer.push('ទំព័រចំណូល');
        if (u.permissions.includes('expense')) permsKhmer.push('ទំព័រចំណាយ');
        if (u.permissions.includes('reports')) permsKhmer.push('របាយការណ៍');
        if (u.permissions.includes('settings')) permsKhmer.push('ការកំណត់');
        if (!u.permissions.includes('write')) permsKhmer.push('(អត់សិទ្ធិកែប្រែ)');
        if (permsKhmer.length >= 7 && u.permissions.includes('write')) permsKhmer = ['មានសិទ្ធិទាំងអស់ (Admin)'];
        
        tr.innerHTML = `
            <td class="fw-bold">${u.username}</td>
            <td><small>${permsKhmer.join(', ')}</small></td>
            <td>
                ${u.username !== 'admin' ? `
                    <button class="btn btn-sm btn-outline-warning" onclick="editUser(${u.id})">កែប្រែ</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">លុប</button>
                ` : '<span class="badge bg-secondary">មិនអាចកែប្រែ/លុបបាន</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editUser = async function(id) {
    const user = await db.users.get(id);
    if (!user) return;
    
    document.getElementById('newUsername').value = user.username;
    document.getElementById('newUserPassword').value = user.password;
    
    document.querySelectorAll('.perm-checkbox').forEach(cb => {
        cb.checked = user.permissions.includes(cb.value);
    });
    
    editingUserId = id;
    const btn = document.querySelector('#addUserForm button[type="submit"]');
    btn.textContent = 'រក្សាទុកការកែប្រែ (Update)';
    btn.classList.replace('btn-dark', 'btn-warning');
};

document.getElementById('addUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newUserPassword').value.trim();
    
    const perms = [];
    document.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
        perms.push(cb.value);
    });
    
    if (perms.length === 0) {
        alert('សូមជ្រើសរើសសិទ្ធិយ៉ាងហោចណាស់មួយ!');
        return;
    }
    
    if (editingUserId) {
        // Update existing user
        const exists = await db.users.where('username').equalsIgnoreCase(username).first();
        if (exists && exists.id !== editingUserId) {
            alert('ឈ្មោះគណនីនេះមានរួចហើយ!');
            return;
        }
        await db.users.update(editingUserId, { username, password, permissions: perms });
        alert('កែប្រែបានជោគជ័យ!');
    } else {
        // Create new user
        const exists = await db.users.where('username').equalsIgnoreCase(username).count();
        if (exists > 0) {
            alert('ឈ្មោះគណនីនេះមានរួចហើយ!');
            return;
        }
        await db.users.add({ username, password, permissions: perms });
        alert('បង្កើតគណនីបានជោគជ័យ!');
    }
    
    // Reset form
    document.getElementById('addUserForm').reset();
    editingUserId = null;
    const btn = document.querySelector('#addUserForm button[type="submit"]');
    btn.textContent = 'បង្កើតគណនី';
    btn.classList.replace('btn-warning', 'btn-dark');
    
    loadUsers();
});

window.deleteUser = async function(id) {
    if(confirm('តើអ្នកពិតជាចង់លុបគណនីនេះមែនទេ?')) {
        await db.users.delete(id);
        loadUsers();
    }
};

document.getElementById('addIncomeCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.categories.add({ type: 'income', name: document.getElementById('newIncCatName').value });
    document.getElementById('newIncCatName').value = '';
    loadCategories();
});

document.getElementById('addExpenseCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.categories.add({ type: 'expense', name: document.getElementById('newExpCatName').value });
    document.getElementById('newExpCatName').value = '';
    loadCategories();
});

document.getElementById('systemSettingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('setSysPhone').value;
    const addrKh = document.getElementById('setSysAddrKh').value;
    const addrEn = document.getElementById('setSysAddrEn').value;
    const fileInput = document.getElementById('setSysLogo');
    
    localStorage.setItem('sysPhone', phone);
    localStorage.setItem('sysAddrKh', addrKh);
    localStorage.setItem('sysAddrEn', addrEn);

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            localStorage.setItem('sysLogo', evt.target.result);
            loadSystemSettings();
            Swal.fire('ជោគជ័យ!', 'ការកំណត់ប្រព័ន្ធត្រូវបានរក្សាទុក។', 'success');
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        loadSystemSettings();
        Swal.fire('ជោគជ័យ!', 'ការកំណត់ប្រព័ន្ធត្រូវបានរក្សាទុក។', 'success');
    }
});

async function editCategory(id, oldName) {
    const newName = prompt('សូមបញ្ចូលឈ្មោះប្រភេទថ្មី៖', oldName);
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        const finalName = newName.trim();
        await db.categories.update(id, { name: finalName });
        const txsToUpdate = await db.transactions.where('category').equals(oldName).toArray();
        for (let tx of txsToUpdate) await db.transactions.update(tx.id, { category: finalName });
        alert('កែប្រែបានជោគជ័យ!');
        loadCategories(); loadData();
    }
}

async function deleteCategory(id) {
    if(confirm('តើអ្នកពិតជាចង់លុបប្រភេទនេះមែនទេ?')) {
        await db.categories.delete(id);
        loadCategories();
    }
}

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
    
    const rows = document.querySelectorAll('#inv-items-body tr');
    if (rows.length === 0) {
        alert('សូមបញ្ចូលទំនិញយ៉ាងហោចណាស់មួយ!'); return;
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
    let allInvoices = await db.invoices.orderBy('date').reverse().toArray();
    
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
                    ${hasPermission('write') ? `<button class="btn btn-sm btn-warning" onclick="editInvoice(${inv.id})">កែប្រែ (Edit)</button>` : ''}
                    ${hasPermission('write') ? `<button class="btn btn-sm btn-danger" onclick="deleteInvoice(${inv.id})">លុប (Delete)</button>` : ''}
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
    document.getElementById('inv-currency').value = inv.currency || 'USD';
    
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
    if(confirm('តើអ្នកពិតជាចង់លុបវិក្កយបត្រនេះមែនទេ? (ទិន្នន័យចំណូលដែលពាក់ព័ន្ធវានឹងត្រូវលុបចោលដូចគ្នា)')) {
        const inv = await db.invoices.get(id);
        if (inv && inv.txId) {
            await db.transactions.delete(inv.txId);
        }
        await db.invoices.delete(id);
        loadInvoices();
        loadData();
    }
}


// ====== TRANSACTIONS ======
document.getElementById('incomeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currency = document.getElementById('inc-currency').value;
    const amount = parseFloat(document.getElementById('inc-amount').value);
    const date = document.getElementById('inc-date').value;
    const category = document.getElementById('inc-category').value;
    const note = document.getElementById('inc-note').value;
    
    await db.transactions.add({ type: 'income', amount, currency, date, category, note });
    document.getElementById('inc-amount').value = '';
    document.getElementById('inc-note').value = '';
    alert('រក្សាទុកចំណូលបានជោគជ័យ!');
    loadData();
});

document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currency = document.getElementById('exp-currency').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const date = document.getElementById('exp-date').value;
    const category = document.getElementById('exp-category').value;
    const note = document.getElementById('exp-note').value;
    
    await db.transactions.add({ type: 'expense', amount, currency, date, category, note });
    document.getElementById('exp-amount').value = '';
    document.getElementById('exp-note').value = '';
    alert('រក្សាទុកចំណាយបានជោគជ័យ!');
    loadData();
});

async function deleteTransaction(id) {
    if(confirm('តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ?')) {
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

// ====== DASHBOARD & LIST DATA ======
async function loadData() {
    const allTx = await db.transactions.orderBy('date').reverse().toArray();
    
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
                <td>${hasPermission('write') ? `<button class="btn btn-sm btn-danger" onclick="deleteTransaction(${tx.id})">លុប</button>` : ''}</td>
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
                    tr.innerHTML = `<td>${formatKhmerDate(tx.date)}</td><td>${tx.category}</td><td class="text-success fw-bold">${formatCurrency(tx.amount, cur)}</td><td>${tx.note}</td>`;
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
                    tr.innerHTML = `<td>${formatKhmerDate(tx.date)}</td><td>${tx.category}</td><td class="text-danger fw-bold">${formatCurrency(tx.amount, cur)}</td><td>${tx.note}</td>`;
                    expBody.appendChild(tr);
                }
            }
        }

        if (tx.date.startsWith(currentMonthPrefix)) {
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

// ====== PRINT LIST REPORTS ======
async function printListReport(type) {
    const allTx = await db.transactions.orderBy('date').toArray();
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
    if (parentNav) parentNav.classList.remove('active');
    
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
    const filtered = allTx.filter(tx => tx.date.startsWith(prefix));

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
    loadUsers();
    addInvoiceRow();
    generateInvoiceNumber();
    loadInvoices();
    loadData();
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