// ======= AUTHENTICATION LOGIC =======
let currentUser = null;

async function checkLogin() {
    let userCount = await db.users.count();
    if (userCount === 0) {
        // Create default admin if DB is fresh
        await db.users.add({
            username: 'admin',
            password: '123456',
            permissions: ['dashboard', 'invoice_add', 'invoice_list', 'income', 'expense', 'reports', 'settings', 'employee_manage', 'perm_add', 'perm_edit', 'perm_delete']
        });
    }

    const sessionUser = localStorage.getItem('currentUser');
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('main-wrapper').style.display = 'flex';
        const topUser = document.getElementById('top-user-name');
        if (topUser) topUser.textContent = currentUser.username.toUpperCase();
        applyPermissions();
        loadSystemSettings(); // Wait, let's just apply permissions
        return true;
    } else {
        document.getElementById('login-view').style.display = 'flex';
        document.getElementById('main-wrapper').style.display = 'none';
        return false;
    }
}

// Removed checkLogin() call because it is correctly called at the bottom of reports.js!

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    
    try {
        const allUsers = await db.users.toArray();
        const user = allUsers.find(x => x.username.toLowerCase() === u.toLowerCase() && x.password === p);
        if (user) {
            if (user.isActive === false) {
                Swal.fire('បដិសេធ', 'គណនីរបស់អ្នកត្រូវបានបិទ (Inactive)។', 'error');
                return;
            }
            if (user.roleId) {
                const role = await db.roles.get(user.roleId);
                if (role) user.permissions = role.permissions || [];
            }
            
            // Set online status
            user.isOnline = true;
            try { await db.users.update(user.id, { isOnline: true }); } catch (e) {}

            localStorage.setItem('currentUser', JSON.stringify(user));
            currentUser = user;
            document.getElementById('loginForm').reset();
            document.getElementById('login-view').style.display = 'none';
            document.getElementById('main-wrapper').style.display = 'flex';
            applyPermissions();
            
            if (hasPermission('dashboard')) showTab('dashboard');
            else if (hasPermission('invoice_add')) showTab('invoice');
            else if (hasPermission('invoice_list')) showTab('invoice-list');
            else if (hasPermission('income')) showTab('income');
            else if (hasPermission('expense')) showTab('expense');
            else if (hasPermission('reports')) showTab('reports');
            else if (hasPermission('settings')) showTab('settings');
            
        } else {
            Swal.fire({icon: 'info', text: 'ឈ្មោះគណនី ឬ លេខសម្ងាត់មិនត្រឹមត្រូវទេ!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
        }
    } catch (err) {
        Swal.fire({icon: 'error', title: 'Database Error', text: err.message, confirmButtonText: 'យល់ព្រម'});
        console.error(err);
    }
});

window.logoutUser = logoutUser;
async function logoutUser() {
    if (currentUser) {
        db.users.update(currentUser.id, { isOnline: false }).catch(() => {});
    }
    console.log('Logging out...');
    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.reload();
}

function hasPermission(perm) {
    if (!currentUser) return false;
    if (currentUser.username.toLowerCase() === 'admin') return true;
    return currentUser.permissions && currentUser.permissions.includes(perm);
}

// Helper function for RBAC
function hasPermission(perm) {
    if (!currentUser) return false;
    if (currentUser.username.toLowerCase() === 'admin') return true;
    return currentUser.permissions && currentUser.permissions.includes(perm);
}

// Override applyPermissions to hide elements
window.applyPermissions = function() {
    if (!currentUser) return;
    const perms = currentUser.permissions || [];
    
    // Hide menus
    document.querySelectorAll('.sys-menu-item').forEach(el => {
        const p = el.getAttribute('data-perm');
        if (p && !perms.includes(p) && currentUser.username.toLowerCase() !== 'admin') {
            el.style.display = 'none';
        } else {
            el.style.display = 'block';
        }
    });

    const specificAccessKeys = [
        'income_add', 'income_edit', 'income_delete',
        'expense_add', 'expense_edit', 'expense_delete',
        'invoice_add', 'invoice_list_edit', 'invoice_list_delete',
        'employee_add', 'employee_edit', 'employee_delete',
        'settings_categories_add', 'settings_categories_delete',
        'settings_preparers_add', 'settings_preparers_delete',
        'settings_farm_info_edit', 'settings_users_add', 'settings_users_edit', 'settings_users_delete',
        'settings_permissions_edit', 'settings_roles_add', 'settings_roles_delete',
        'settings_emp_structure_add', 'settings_emp_structure_edit', 'settings_emp_structure_delete'
    ];

    if (currentUser.username.toLowerCase() !== 'admin') {
        specificAccessKeys.forEach(key => {
            if (!perms.includes(key)) document.body.classList.add('no-' + key);
            else document.body.classList.remove('no-' + key);
        });
    } else {
        specificAccessKeys.forEach(key => document.body.classList.remove('no-' + key));
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
                    Swal.fire({icon: 'info', text: "✅ ទាញទិន្នន័យចូលជោគជ័យ! សូម Refresh វេបសាយ។", confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
                    loadEmployees();
    loadData();
                } else {
                    Swal.fire({icon: 'info', text: "❌ ឯកសារមិនត្រឹមត្រូវ!", confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
                }
            } catch(err) {
                Swal.fire({icon: 'info', text: "❌ បរាជ័យក្នុងការទាញទិន្នន័យ៖ " + err.message, confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
            }
        };
        reader.readAsText(file);
    };
    input.click();
};


// Moved updateOnlineStatus to utils.js

function loadSystemSettings() {
    const sysPhone = localStorage.getItem('sysPhone') || '095 989 708';
    const sysAddrKh = localStorage.getItem('sysAddrKh') || 'ភូមិព្រីង ឃុំយាយម៉ៅ\nស្រុកភ្នំស្រួច ខេត្តកំពង់ស្ពឺ';
    const sysAddrEn = localStorage.getItem('sysAddrEn') || 'Phoum Pring, Khum Yeay Moa\nSrok Phnom Srouch, Kampong Speu';
    const sysPreparer = localStorage.getItem('sysPreparer') || '';

    // Populate Settings Form
    const pInput = document.getElementById('setSysPhone');
    const khInput = document.getElementById('setSysAddrKh');
    const enInput = document.getElementById('setSysAddrEn');

    if (pInput) pInput.value = sysPhone;
    if (khInput) khInput.value = sysAddrKh;
    if (enInput) enInput.value = sysAddrEn;
    if (document.getElementById('setSysPreparer')) document.getElementById('setSysPreparer').value = sysPreparer;

    // Apply texts
    document.querySelectorAll('.sys-phone').forEach(el => el.textContent = sysPhone);
    document.querySelectorAll('.sys-addr-kh').forEach(el => {
        el.innerHTML = sysAddrKh.replace(/\n/g, '<br>');
    });
    document.querySelectorAll('.sys-addr-en').forEach(el => {
        el.innerHTML = sysAddrEn.replace(/\n/g, '<br>');
    });

    // Apply Preparer
    document.querySelectorAll('.sys-preparer').forEach(el => el.textContent = sysPreparer);

    // Apply Branding from Firebase (Re-invoke applyBranding to ensure it overrides)
    if (typeof applyBranding === 'function') {
        applyBranding();
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

// currentReportTab is in utils.js
let currentSettingsTab = 'categories';

window.showTab = function(tabId, subId = null) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar .nav-link').forEach(el => el.classList.remove('active'));
    
    document.querySelectorAll('.sidebar .sys-menu-item').forEach(el => el.classList.remove('active-group'));
    
    // Close other submenus
    document.querySelectorAll('.sidebar .nav.flex-column[id$="Submenu"]').forEach(sm => {
        const activeLink = document.getElementById('nav-' + tabId);
        if (sm.id !== tabId + 'Submenu' && (!activeLink || !sm.contains(activeLink))) {
            sm.style.display = 'none';
            const iconId = sm.id.replace('Submenu', 'Icon');
            const icon = document.getElementById(iconId);
            if (icon) icon.textContent = '▼';
        }
    });
    
    document.getElementById(tabId + '-view').classList.add('active');
    
    // Main nav-link
    const mainNav = document.getElementById('nav-' + tabId);
    if (mainNav) {
        mainNav.classList.add('active');
        const parentItem = mainNav.closest('.sys-menu-item');
        if (parentItem) parentItem.classList.add('active-group');
    }
    
    // Sub nav-link
    if (subId) {
        const subNav = document.getElementById('nav-' + tabId + '-' + subId);
        if (subNav) subNav.classList.add('active');
        
        // Ensure submenu is open
        const sm = document.getElementById(tabId + 'Submenu');
        const icon = document.getElementById(tabId + 'Icon');
        if (sm) sm.style.display = 'block';
        if (icon) icon.textContent = '▲';
    }
    
    // Close mobile sidebar if open
    document.querySelector('.sidebar').classList.remove('mobile-open');
    
    const titles = {
        'dashboard': 'ទំព័រដើម',
        'invoice': 'បង្កើតវិក្កយបត្រ',
        'invoice-list': 'បញ្ជីវិក្កយបត្រ',
        'income': 'ចំណូល',
        'expense': 'ចំណាយ',
        'reports': 'របាយការណ៍',
        'settings': 'ការកំណត់ទូទៅ',
        'employee': 'បញ្ជីបុគ្គលិក',
        'attendance': 'គ្រប់គ្រងវត្តមាន',
        'attendance-report': 'របាយការណ៍វត្តមាន'
    };
    
    const subTitles = {
        'summary': 'ចំណូលចំណាយ',
        'income': 'ចំណូល',
        'expense': 'ចំណាយ',
        'categories': 'ប្រភេទចំណូល/ចំណាយ',
        'preparers': 'អ្នករៀបចំរបាយការណ៍',
        'farm_info': 'ព័ត៌មានកសិដ្ឋាន',
        'users': 'បង្កើតអ្នកប្រើប្រាស់',
        'permissions': 'សិទ្ធិអ្នកប្រើប្រាស់',
        'roles': 'តួនាទី',
        'emp_structure': 'រចនាសម្ព័ន្ធបុគ្គលិក',
        'shifts': 'ម៉ោងធ្វើការ',
        'list': 'បញ្ជីបុគ្គលិក',
        'attendance': 'គ្រប់គ្រងវត្តមាន',
        'attendance-report': 'របាយការណ៍វត្តមាន'
    };
    
    const icons = {
        'dashboard': '🔘',
        'invoice': '🧾',
        'invoice-list': '🗂️',
        'income': '💰',
        'expense': '💸',
        'reports': '📊',
        'settings': '⚙️',
        'employee': '👨‍💼'
    };
    
    const topNavbarText = document.getElementById('top-navbar-text');
    if (topNavbarText) {
        const mainIcon = `<span class="me-2">${icons[tabId] || '☑'}</span>`;
        if (subId && subTitles[subId]) {
            topNavbarText.innerHTML = `${mainIcon} ${titles[tabId] || 'Dashboard'} &gt; <span class="text-primary">${subTitles[subId]}</span>`;
        } else {
            topNavbarText.innerHTML = `${mainIcon} ${titles[tabId] || 'Dashboard'}`;
        }
    }

    if (tabId === 'reports') {
        populateYearFilter();
        if (subId) currentReportTab = subId;
        if (typeof switchReportTab === 'function') switchReportTab(currentReportTab);
    }
    
    if (tabId === 'settings') {
        if (subId) currentSettingsTab = subId;
        if (typeof switchSettingsTab === 'function') switchSettingsTab(currentSettingsTab);
    }
    
    if (tabId === 'employee') {
        if (typeof loadEmployees === 'function') loadEmployees();
    }
    
    if (tabId === 'attendance') {
        if (typeof initAttendance === 'function') initAttendance();
    }
}

function formatCurrency(amount, currency) {
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }
    const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    return `៛${formatted}`;
}

function formatEngDate(dateStr) {
    if (!dateStr || dateStr.length !== 10) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10).toString().padStart(2, '0');
    return `${day}-${months[monthIndex]}-${year}`;
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


// Handle browser close or refresh to set offline status
window.addEventListener('beforeunload', () => {
    if (currentUser && currentUser.id) {
        // Use keepalive fetch or simple firestore call. Since we are using Firebase Web SDK, a direct call might not complete.
        // It's best effort.
        try { db.users.update(currentUser.id, { isOnline: false }); } catch(e){}
    }
});










