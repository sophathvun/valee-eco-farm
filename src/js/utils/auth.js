// ======= AUTHENTICATION LOGIC =======
let currentUser = null;

function showPermissionExpiredAlert() {
    if (typeof Swal === 'undefined') {
        alert('Cloud Firestore Security Rules បានផុតកំណត់ (Expired)!\nសូមចូល Firebase Console ដើម្បីប្តូរទៅ allow read, write: if true;');
        return;
    }
    Swal.fire({
        icon: 'warning',
        title: 'សិទ្ធិទិន្នន័យបានផុតកំណត់ (Permission Expired)',
        html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #374151;">
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                    <p style="color: #991b1b; font-weight: bold; margin: 0 0 4px 0;">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i> Firestore Security Rules 30-Day Expired
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #7f1d1d;">
                        ច្បាប់សុវត្ថិភាព Firebase Firestore បានផុតកំណត់រយៈពេលសាកល្បង 30 ថ្ងៃ (កំណត់នៅថ្ងៃ 19-10-2026) ធ្វើឱ្យរាល់ប្រតិបត្តិការទិន្នន័យត្រូវបានបិទ។
                    </p>
                </div>
                <p style="font-weight: 600; margin-bottom: 6px; color: #111827;">
                    ដំណោះស្រាយសម្រាប់ Admin (ត្រឹមតែ 1 នាទី):
                </p>
                <ol style="margin-left: 20px; padding: 0; margin-bottom: 14px; font-size: 13px;">
                    <li style="margin-bottom: 4px;">ចូលទៅកាន់ <a href="https://console.firebase.google.com/project/valee-eco-farm/firestore/rules" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 600;">Firebase Console Rules</a></li>
                    <li style="margin-bottom: 4px;">ប្តូរច្បាប់ទៅជា: <br><code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; color: #1e293b; font-weight: bold;">allow read, write: if true;</code></li>
                    <li>ចុចប៊ូតុងពណ៌ខៀវ <b>Publish</b> រួច Refresh ប្រព័ន្ធ នោះនឹងដំណើរការធម្មតាវិញភ្លាមៗ។</li>
                </ol>
            </div>
        `,
        confirmButtonText: 'យល់ព្រម',
        confirmButtonColor: '#059669',
        width: '520px'
    });
}

async function ensureDefaultAdmin() {
    try {
        if (typeof db !== 'undefined' && db.users) {
            let userCount = await db.users.count();
            if (userCount === 0) {
                await db.users.add({
                    username: 'admin',
                    password: '123456',
                    permissions: ['dashboard', 'invoice_add', 'invoice_list', 'income', 'expense', 'reports', 'settings', 'employee_manage', 'perm_add', 'perm_edit', 'perm_delete']
                });
            }
        }
    } catch (err) {
        console.warn("Background admin check error:", err);
    }
}

async function checkLogin() {
    const sessionUser = localStorage.getItem('currentUser');
    if (sessionUser) {
        try {
            currentUser = JSON.parse(sessionUser);
            const loginView = document.getElementById('login-view');
            const mainWrapper = document.getElementById('main-wrapper');
            if (loginView) loginView.style.display = 'none';
            if (mainWrapper) mainWrapper.style.display = 'flex';
            const topUser = document.getElementById('top-user-name');
            if (topUser) topUser.textContent = (currentUser && currentUser.username ? currentUser.username : '').toUpperCase();
            applyPermissions();
            if (typeof loadSystemSettings === 'function') loadSystemSettings();

            // Restore active page from pending click, localStorage or URL hash
            const pending = window._pendingTab;
            window._pendingTab = null;
            const savedTab = (pending && pending.tabId) || localStorage.getItem('activeTab') || (location.hash ? location.hash.replace('#', '').split('/')[0] : 'dashboard');
            const savedSub = (pending && pending.subId) || localStorage.getItem('activeSubTab') || (location.hash && location.hash.includes('/') ? location.hash.split('/')[1] : null);
            if (hasPermission(savedTab)) {
                showTab(savedTab, savedSub);
            } else {
                const fallbackTab = ['dashboard', 'invoice', 'invoice-list', 'income', 'expense', 'reports', 'employee', 'attendance', 'payroll', 'settings'].find(t => hasPermission(t)) || 'dashboard';
                showTab(fallbackTab);
            }
        } catch (e) {
            console.error('Error restoring session:', e);
        }

        setTimeout(ensureDefaultAdmin, 200);
        return true;
    } else {
        const loginView = document.getElementById('login-view');
        const mainWrapper = document.getElementById('main-wrapper');
        if (loginView) loginView.style.display = 'flex';
        if (mainWrapper) mainWrapper.style.display = 'none';
        setTimeout(ensureDefaultAdmin, 200);
        return false;
    }
}

// Removed checkLogin() call because it is correctly called at the bottom of reports.js!

window.loginUser = async function() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    
    try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out. Please check your internet.')), 10000));
        const allUsers = await Promise.race([db.users.toArray(), timeout]);
        const user = allUsers.find(x => x && (x.username || '').toLowerCase() === (u || '').toLowerCase() && x.password === p);
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
            db.users.update(user.id, { isOnline: true }).catch(() => {});

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

            if (typeof window.checkPWAStatus === 'function') window.checkPWAStatus();
            
        } else {
            Swal.fire({icon: 'info', text: 'ឈ្មោះគណនី ឬ លេខសម្ងាត់មិនត្រឹមត្រូវទេ!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
        }
    } catch (err) {
        console.error(err);
        const errMsg = String(err && err.message || err);
        if (errMsg.toLowerCase().includes('permission')) {
            showPermissionExpiredAlert();
        } else {
            if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Database Error', text: errMsg, confirmButtonText: 'យល់ព្រម'}); else alert('Database Error: ' + errMsg);
        }
    }
};

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
    if ((currentUser.username || '').toLowerCase() === 'admin') return true;
    return Boolean(currentUser.permissions && currentUser.permissions.includes(perm));
}

// Override applyPermissions to hide elements
window.applyPermissions = function() {
    if (!currentUser) return;
    const perms = currentUser.permissions || [];
    
    // Hide menus
    document.querySelectorAll('.sys-menu-item').forEach(el => {
        const p = el.getAttribute('data-perm');
        if (p && !perms.includes(p) && (currentUser.username || '').toLowerCase() !== 'admin') {
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

    if ((currentUser.username || '').toLowerCase() !== 'admin') {
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
    window.sysExchangeRate = parseFloat(localStorage.getItem('sysExchangeRate')) || 4100;

    // Populate Settings Form
    const pInput = document.getElementById('setSysPhone');
    const khInput = document.getElementById('setSysAddrKh');
    const enInput = document.getElementById('setSysAddrEn');

    if (pInput) pInput.value = sysPhone;
    if (khInput) khInput.value = sysAddrKh;
    if (enInput) enInput.value = sysAddrEn;
    if (document.getElementById('setSysPreparer')) document.getElementById('setSysPreparer').value = sysPreparer;
    if (document.getElementById('setExchangeRate')) document.getElementById('setExchangeRate').value = window.sysExchangeRate;

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

window.updateTopNavbarTitle = function(tId = null, sId = null) {
    const tab = tId || localStorage.getItem('activeTab') || 'dashboard';
    const sub = sId !== null ? sId : (localStorage.getItem('activeSubTab') || null);
    const topText = document.getElementById('top-navbar-text');
    if (!topText) return;

    const navIcons = {
        'dashboard': '🔘',
        'invoice': '🧾',
        'invoice-list': '🗂️',
        'income': '💰',
        'expense': '💸',
        'reports': '📊',
        'settings': '⚙️',
        'employee': '👨‍💼',
        'attendance': '📅',
        'attendance-report': '📊',
        'payroll': '💵'
    };

    const mainIco = `<span class="me-2">${navIcons[tab] || '☑'}</span>`;
    const getT = (key, def) => (typeof window.t === 'function' ? window.t(key, def) : def);

    const titleMap = {
        'dashboard': getT('tab_dashboard', 'ទំព័រដើម'),
        'invoice': getT('tab_invoice', 'បង្កើតវិក្កយបត្រ'),
        'invoice-list': getT('tab_invoice_list', 'បញ្ជីវិក្កយបត្រ'),
        'income': getT('tab_income', 'ចំណូល'),
        'expense': getT('tab_expense', 'ចំណាយ'),
        'reports': getT('tab_reports', 'របាយការណ៍'),
        'settings': getT('tab_settings', 'ការកំណត់ទូទៅ'),
        'employee': getT('tab_employee', 'គ្រប់គ្រងបុគ្គលិក'),
        'attendance': getT('tab_attendance', 'គ្រប់គ្រងវត្តមាន'),
        'attendance-report': getT('tab_attendance_report', 'របាយការណ៍វត្តមាន'),
        'payroll': getT('tab_payroll', 'បើកប្រាក់បៀវត្សរ៍ (Payroll)')
    };

    const subMap = {
        'summary': getT('sub_summary', 'ចំណូលចំណាយ'),
        'income': getT('sub_income', 'ចំណូល'),
        'expense': getT('sub_expense', 'ចំណាយ'),
        'categories': getT('sub_categories', 'ប្រភេទចំណូល/ចំណាយ'),
        'preparers': getT('sub_preparers', 'អ្នករៀបចំរបាយការណ៍'),
        'farm_info': getT('sub_farm_info', 'ព័ត៌មានកសិដ្ឋាន'),
        'users': getT('sub_users', 'បង្កើតអ្នកប្រើប្រាស់'),
        'permissions': getT('sub_permissions', 'សិទ្ធិអ្នកប្រើប្រាស់'),
        'roles': getT('sub_roles', 'តួនាទី'),
        'emp_structure': getT('sub_emp_structure', 'រចនាសម្ព័ន្ធបុគ្គលិក'),
        'shifts': getT('sub_shifts', 'ម៉ោងធ្វើការ'),
        'list': getT('sub_list', 'បញ្ជីបុគ្គលិក'),
        'attendance': getT('sub_attendance', 'គ្រប់គ្រងវត្តមាន'),
        'attendance-report': getT('sub_attendance_report', 'របាយការណ៍វត្តមាន'),
        'payroll': getT('sub_payroll', 'បើកប្រាក់បៀវត្សរ៍'),
        'branding': getT('sub_branding', 'ការកំណត់យីហោ')
    };

    const mainTitle = titleMap[tab] || 'Dashboard';
    if (sub && subMap[sub]) {
        topText.innerHTML = `${mainIco} ${mainTitle} &gt; <span class="text-primary">${subMap[sub]}</span>`;
    } else {
        topText.innerHTML = `${mainIco} ${mainTitle}`;
    }
};

window.showTab = function(tabId, subId = null) {
    try {
        localStorage.setItem('activeTab', tabId);
        if (subId) {
            localStorage.setItem('activeSubTab', subId);
        } else {
            localStorage.removeItem('activeSubTab');
        }
        history.replaceState(null, '', '#' + tabId + (subId ? '/' + subId : ''));
    } catch (e) {}
    if (tabId === 'income') {
        const incEx = document.getElementById('inc-exchange-rate');
        if (incEx && !incEx.value) incEx.value = window.sysExchangeRate || 4100;
    }
    if (tabId === 'expense') {
        const expEx = document.getElementById('exp-exchange-rate');
        if (expEx && !expEx.value) expEx.value = window.sysExchangeRate || 4100;
    }
    // Clean up all print containers and print classes when switching tabs
    document.querySelectorAll('.print-container').forEach(el => {
        el.classList.remove('print-template');
        el.innerHTML = '';
    });
    document.body.classList.remove('printing-report');

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
    
    const targetView = document.getElementById(tabId + '-view');
    if (targetView) targetView.classList.add('active');

    // Auto-close sidebar on mobile
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        const bd = document.getElementById('sidebarBackdrop');
        if(bd) bd.classList.remove('show');
    }
    
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
    
        // Sync mobile bottom nav
    document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('onclick') && el.getAttribute('onclick').includes("showTab('" + tabId + "')")) {
            el.classList.add('active');
        }
    });
    
    // Close mobile sidebar if open
    if (sidebar) sidebar.classList.remove('mobile-open');
    
    if (typeof window.updateTopNavbarTitle === 'function') {
        window.updateTopNavbarTitle(tabId, subId);
    }

    if (tabId === 'dashboard') {
        if (typeof loadData === 'function') loadData();
        if (typeof loadEmployeeDashboardWidgets === 'function') loadEmployeeDashboardWidgets();
    }

    if (tabId === 'invoice-list') {
        if (typeof loadInvoices === 'function') loadInvoices();
    }

    if (tabId === 'reports') {
        if (typeof populateYearFilter === 'function') populateYearFilter();
        if (subId) currentReportTab = subId;
        if (typeof switchReportTab === 'function') switchReportTab(currentReportTab);
    }
    
    if (tabId === 'settings') {
        if (subId) currentSettingsTab = subId;
        if (typeof switchSettingsTab === 'function') switchSettingsTab(currentSettingsTab);
    }
    
    if (tabId === 'employee') {
        if (typeof loadEmployees === 'function') loadEmployees();
        if (typeof loadDepartmentsForEmp === 'function') loadDepartmentsForEmp();
        if (typeof loadPositionsForEmp === 'function') loadPositionsForEmp();
    }
    
    if (tabId === 'attendance') {
        if (typeof initAttendance === 'function') initAttendance();
    }
    
    if (tabId === 'attendance-report') {
        if (typeof initAttendanceReport === 'function') initAttendanceReport();
    }

    if (tabId === 'payroll') {
        if (typeof initPayroll === 'function') initPayroll();
    }

    if (typeof window.applyTranslations === 'function') {
        const activeView = document.getElementById(tabId + '-view');
        if (activeView) window.applyTranslations(activeView);
    }
};

// Replay any pending tab navigation requested before auth.js was loaded
if (window._pendingTab) {
    const pt = window._pendingTab;
    window._pendingTab = null;
    window.showTab(pt.tabId, pt.subId);
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





















