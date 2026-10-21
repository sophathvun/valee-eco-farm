// main.js - Application Entry Point

// List of templates to load in order
const viewsToLoad = [
    'dashboard',
    'invoice',
    'invoice-list',
    'income',
    'expense',
    'reports',
    'employee',
    'attendance',
    'attendance-report',
    'payroll',
    'settings'
];

async function initializeApp() {
    applyBranding();
    const container = document.getElementById('main-content-container');
    
    // 1. Fetch and inject all HTML templates
    for (let view of viewsToLoad) {
        try {
            const response = await fetch(`src/templates/${view}.html?v=${new Date().getTime()}`);
            if (response.ok) {
                const html = await response.text();
                // Create the view wrapper
                const div = document.createElement('div');
                div.id = `${view}-view`;
                div.className = 'view-section';
                if (view === 'dashboard') div.classList.add('active'); // Default view
                div.innerHTML = html;
                container.appendChild(div);
            } else {
                console.error(`Failed to load template: ${view}.html`);
            }
        } catch (error) {
            console.error(`Error loading template ${view}.html:`, error);
        }
    }

    // Apply translations to all newly injected HTML views
    if (typeof applyTranslations === 'function') {
        applyTranslations(container);
    }

    // 2. Load the main application logic sequentially AFTER all HTML is injected
    const scriptsToLoad = [
        'src/js/config/firebase-config.js',
        'src/js/services/db.js',
        'src/js/utils/utils.js',
        'src/js/utils/print-util.js',
        'src/js/utils/auth.js',
        'src/js/pages/settings.js',
        'src/js/pages/invoice.js',
        'src/js/pages/transactions.js',
        'src/js/pages/dashboard.js',
        'src/js/pages/reports.js',
        'src/js/pages/employee.js',
        'src/js/pages/attendance.js',
        'src/js/pages/attendance-report.js',
        'src/js/pages/payroll.js'
    ];

    for (let src of scriptsToLoad) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${src}?v=${new Date().getTime()}`;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    
    // Initialize Flatpickr for all date inputs
    if (typeof flatpickr !== 'undefined') {
        const originalValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        Object.defineProperty(HTMLInputElement.prototype, 'value', {
            set: function(val) {
                if (this._isSettingValue) {
                    originalValueSetter.call(this, val);
                    return;
                }
                this._isSettingValue = true;
                originalValueSetter.call(this, val);
                if (this._flatpickr) this._flatpickr.setDate(val, false);
                this._isSettingValue = false;
            }
        });
        const originalValueAsDateSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'valueAsDate').set;
        Object.defineProperty(HTMLInputElement.prototype, 'valueAsDate', {
            set: function(val) {
                if (this._isSettingValueAsDate) {
                    originalValueAsDateSetter.call(this, val);
                    return;
                }
                this._isSettingValueAsDate = true;
                originalValueAsDateSetter.call(this, val);
                if (this._flatpickr) this._flatpickr.setDate(val, false);
                this._isSettingValueAsDate = false;
            }
        });

        flatpickr('input[type="date"]', {
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'd-m-Y',
            allowInput: true
        });
    }

    // 3. Central Application Initialization & Session Restoration
    if (typeof checkLogin === 'function') {
        checkLogin().then((isLoggedIn) => {
            if (isLoggedIn) {
                if (typeof loadCategories === 'function') loadCategories();
                if (typeof loadUnits === 'function') loadUnits();
                if (typeof loadPreparers === 'function') loadPreparers();
                if (typeof loadUsersAndRoles === 'function') loadUsersAndRoles();
                if (typeof addInvoiceRow === 'function') addInvoiceRow();
                if (typeof generateInvoiceNumber === 'function') generateInvoiceNumber();
                if (typeof loadInvoices === 'function') loadInvoices();
                if (typeof loadData === 'function') loadData();
                if (typeof loadEmployees === 'function') loadEmployees();
                if (typeof loadDepartmentsForEmp === 'function') loadDepartmentsForEmp();
                if (typeof loadPositionsForEmp === 'function') loadPositionsForEmp();
                if (typeof initPayroll === 'function') initPayroll();
                if (typeof applyTranslations === 'function') applyTranslations();
            }
        }).catch(err => {
            console.error('Initialization error:', err);
        });
    }
}

// Start the app
document.addEventListener('DOMContentLoaded', initializeApp);
async function applyBranding() {
    try {
        if (!db.brandSettings) db.brandSettings = new FirebaseStore('brandSettings');
        const brand = await db.brandSettings.get(1);
        if (brand) {
            if (brand.loginLogo) {
                const ll = document.getElementById('loginLogoImg');
                if(ll) ll.src = brand.loginLogo;
                localStorage.setItem('cachedLoginLogo', brand.loginLogo);
            } else {
                localStorage.removeItem('cachedLoginLogo');
            }
            if (brand.sidebarLogo) {
                const sl = document.getElementById('sidebarLogoImg');
                if(sl) sl.src = brand.sidebarLogo;
                localStorage.setItem('cachedSidebarLogo', brand.sidebarLogo);
            } else {
                localStorage.removeItem('cachedSidebarLogo');
            }
            if (brand.reportLogo) {
                localStorage.setItem('cachedReportLogo', brand.reportLogo);
                const rLogo = document.getElementById('brand-logo-report-att');
                if (rLogo) {
                    rLogo.src = brand.reportLogo;
                    rLogo.style.display = 'block';
                }
            } else {
                localStorage.removeItem('cachedReportLogo');
            }
            if (brand.favicon) {
                let link = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.getElementsByTagName('head')[0].appendChild(link);
                }
                link.href = brand.favicon;
            }
            if (brand.mobileIcon) {
                let appleLink = document.querySelector("link[rel='apple-touch-icon']");
                if (!appleLink) {
                    appleLink = document.createElement('link');
                    appleLink.rel = 'apple-touch-icon';
                    document.getElementsByTagName('head')[0].appendChild(appleLink);
                }
                appleLink.href = brand.mobileIcon;
            }
        }
    } catch (e) {
        console.error('Error applying branding on load:', e);
    }
}

window.applyBranding = applyBranding;








// PWA Install Logic
window.deferredPrompt = window.deferredPrompt || null;
const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};
const isInStandaloneMode = () => {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || 
           (('standalone' in window.navigator) && window.navigator.standalone);
};

window.checkPWAStatus = function() {
    if (localStorage.getItem('currentUser') && !localStorage.getItem('pwaDismissed')) {
        const container = document.getElementById('pwa-install-container');
        if (!container) return;
        if (isInStandaloneMode()) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'inline-flex';
    }
};

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    checkPWAStatus();
});

window.triggerPWAInstall = async function() {
    const isIosDevice = isIos();
    const isAndroidDevice = /android/.test(window.navigator.userAgent.toLowerCase());

    if (window.deferredPrompt) {
        try {
            window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                const container = document.getElementById('pwa-install-container');
                if (container) container.style.display = 'none';
                Swal.fire({
                    icon: 'success',
                    title: 'ដំឡើងជោគជ័យ!',
                    text: 'Shortcut នៃកម្មវិធីត្រូវបានបញ្ចូលទៅក្នុងឧបករណ៍របស់អ្នករួចរាល់ហើយ។',
                    timer: 2500,
                    showConfirmButton: false
                });
            }
            window.deferredPrompt = null;
            return;
        } catch (err) {
            console.warn("PWA Prompt error, showing guide instead:", err);
            window.deferredPrompt = null;
        }
    }

    if (isIosDevice) {
        Swal.fire({
            title: '<strong>ដំឡើងលើ iPhone / iPad (iOS)</strong>',
            icon: 'info',
            html: `
                <div class="text-start" style="font-size: 0.95rem; line-height: 1.6;">
                    <p class="mb-2">ដើម្បីដាក់ Shortcut លើអេក្រង់ដើម (Safari)៖</p>
                    <ol class="ps-3 mb-3">
                        <li class="mb-2">ចុចប៊ូតុង <strong>Share (ចែករំលែក <i class="bi bi-box-arrow-up text-primary"></i>)</strong> នៅខាងក្រោម Safari</li>
                        <li class="mb-2">អូសចុះក្រោម រួចជ្រើសរើស <strong>"Add to Home Screen (បន្ថែមទៅអេក្រង់ដើម <i class="bi bi-plus-square"></i>)"</strong></li>
                        <li class="mb-0">ចុចប៊ូតុង <strong>"Add (បន្ថែម)"</strong> នៅជ្រុងខាងលើស្តាំ</li>
                    </ol>
                    <div class="alert alert-success py-2 px-3 small mb-0">
                        <i class="bi bi-check-circle-fill me-1"></i> កម្មវិធីនឹងបង្ហាញ Icon លើទូរស័ព្ទរបស់អ្នកដូច App ធម្មតា!
                    </div>
                </div>
            `,
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#198754'
        });
    } else if (isAndroidDevice) {
        Swal.fire({
            title: '<strong>ដំឡើងលើទូរស័ព្ទ Android</strong>',
            icon: 'info',
            html: `
                <div class="text-start" style="font-size: 0.95rem; line-height: 1.6;">
                    <p class="mb-2">ដើម្បីដាក់ Shortcut លើអេក្រង់ Android (Chrome)៖</p>
                    <ol class="ps-3 mb-3">
                        <li class="mb-2">ចុចសញ្ញាចុចបី <strong>(⋮)</strong> នៅជ្រុងខាងលើស្តាំនៃ Chrome</li>
                        <li class="mb-2">ជ្រើសរើស <strong>"Install app"</strong> ឬ <strong>"Add to Home screen (បន្ថែមទៅអេក្រង់ដើម)"</strong></li>
                        <li class="mb-0">ចុច <strong>"Install"</strong> ឬ <strong>"Add"</strong> ជាការស្រេច</li>
                    </ol>
                </div>
            `,
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#198754'
        });
    } else {
        // Desktop PC (Windows / Mac)
        Swal.fire({
            title: '<strong>ដំឡើង Shortcut លើកុំព្យូទ័រ (PC / Laptop)</strong>',
            icon: 'info',
            html: `
                <div class="text-start" style="font-size: 0.92rem; line-height: 1.6;">
                    <p class="mb-2">សូមជ្រើសរើសវិធីងាយៗមួយក្នុងចំណោមវិធីខាងក្រោម៖</p>
                    
                    <div class="p-2 border rounded mb-2 bg-light">
                        <strong class="text-primary"><i class="bi bi-1-circle-fill me-1"></i> វិធីទី១ (លឿនបំផុត)៖</strong><br>
                        សម្លឹងមើលទៅ <strong>របារអាសយដ្ឋាន (URL Bar ខាងលើបង្អស់)</strong> នៅខាងស្តាំដៃ អ្នកនឹងឃើញរូបតំណាង <strong>Install (📥 ឬ <i class="bi bi-laptop"></i>)</strong> &rarr; ចុចលើវា រួចចុច <strong>"Install"</strong>។
                    </div>

                    <div class="p-2 border rounded mb-2 bg-light">
                        <strong class="text-success"><i class="bi bi-2-circle-fill me-1"></i> វិធីទី២ (តាមរយៈម៉ឺនុយ Browser)៖</strong><br>
                        ១. ចុចសញ្ញាចុចបី <strong>(⋮)</strong> នៅជ្រុងលើស្តាំនៃ Chrome / Edge<br>
                        ២. ជ្រើសរើស <strong>"Save and share"</strong> ឬ <strong>"Cast, save, and share"</strong><br>
                        ៣. ចុច <strong>"Create shortcut..." (បង្កើតផ្លូវកាត់)</strong><br>
                        ៤. ធីកយក <strong>"Open as window"</strong> រួចចុច <strong>"Create"</strong>។
                    </div>

                    <div class="alert alert-success py-2 px-3 small mb-0">
                        <i class="bi bi-check-circle-fill me-1"></i> បន្ទាប់ពីធ្វើរួច កម្មវិធីនឹងបង្ហាញ Icon លើ <strong>Desktop</strong> របស់កុំព្យូទ័រ លោកអ្នកអាចចុចបើកប្រើបានភ្លាមៗ!
                    </div>
                </div>
            `,
            confirmButtonText: 'ខ្ញុំយល់ហើយ (Got it)',
            confirmButtonColor: '#0d6efd',
            showCancelButton: true,
            cancelButtonText: 'លាក់ប៊ូតុងនេះ',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.cancel) {
                dismissPWAInstall();
            }
        });
    }
};

window.dismissPWAInstall = function(e) {
    if (e) e.stopPropagation();
    const container = document.getElementById('pwa-install-container');
    if (container) container.style.display = 'none';
    localStorage.setItem('pwaDismissed', 'true');
};

window.addEventListener('appinstalled', () => {
    const container = document.getElementById('pwa-install-container');
    if (container) container.style.display = 'none';
    window.deferredPrompt = null;
    localStorage.setItem('pwaDismissed', 'true');
});

// Run once on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkPWAStatus, 1000);
});

