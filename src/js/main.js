// main.js - Application Entry Point

// List of templates to load in order
const viewsToLoad = [
    'dashboard',
    'invoice',
    'invoice-list',
    'income',
    'expense',
    'voucher',
    'reports',
    'employee',
    'eface',
    'attendance',
    'attendance-report',
    'payroll',
    'settings'
];

async function initializeApp() {
    applyBranding();
    const container = document.getElementById('main-content-container');
    const hash = (window.location.hash || '').toLowerCase();
    const isEfaceRoute = hash.startsWith('#eface') || hash.startsWith('#scan');
    const isVoucherRoute = hash.startsWith('#pv') || hash.startsWith('#voucher') || hash.startsWith('#payment-voucher');
    const hashTab = location.hash ? location.hash.replace('#', '').split('?')[0].split('/')[0] : null;
    const targetRoute = isEfaceRoute ? 'eface' : (isVoucherRoute ? 'voucher' : (hashTab || (localStorage.getItem('currentUser') ? (localStorage.getItem('activeTab') || 'dashboard') : 'dashboard')));
    const appVersion = '1793027000000';
    
    // 1. Fetch and inject all HTML templates in PARALLEL using Promise.all for instant speed
    const templatePromises = viewsToLoad.map(async (view) => {
        try {
            const response = await fetch(`src/templates/${view}.html?v=${appVersion}`);
            if (response.ok) {
                const html = await response.text();
                return { view, html };
            }
        } catch (error) {
            console.error(`Error loading template ${view}.html:`, error);
        }
        return { view, html: '' };
    });

    const loadedTemplates = await Promise.all(templatePromises);
    for (let { view, html } of loadedTemplates) {
        if (!html) continue;
        const div = document.createElement('div');
        div.id = `${view}-view`;
        div.className = 'view-section';
        // ONLY activate the requested view! If targetRoute is eface, dashboard-view is NOT active!
        if (view === targetRoute) div.classList.add('active');
        div.innerHTML = html;
        container.appendChild(div);
    }

    // Apply translations to all newly injected HTML views
    if (typeof applyTranslations === 'function') {
        applyTranslations(container);
    }

    // 2. Load application logic scripts
    const coreScripts = [
        'src/js/config/firebase-config.js',
        'src/js/services/db.js',
        'src/js/utils/utils.js',
        'src/js/utils/print-util.js',
        'src/js/utils/auth.js',
        'src/js/pages/eface.js',
        'src/js/pages/voucher.js'
    ];

    const adminScripts = [
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

    async function loadScriptList(list) {
        for (let src of list) {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = `${src}?v=${appVersion}`;
                script.async = false;
                script.onload = resolve;
                script.onerror = (err) => {
                    console.warn(`Notice loading script ${src}:`, err);
                    resolve();
                };
                document.body.appendChild(script);
            });
        }
    }

    if (isEfaceRoute) {
        // FAST-TRACK: Load only core E-Face scripts first so scanner starts in < 1 second!
        await loadScriptList(coreScripts);
        if (typeof checkLogin === 'function') {
            await checkLogin();
        }
        if (typeof initEface === 'function') initEface();
        if (typeof applyTranslations === 'function') applyTranslations();

        // Load other admin scripts silently in the background without blocking the camera
        setTimeout(() => {
            loadScriptList(adminScripts);
        }, 1500);
    } else if (isVoucherRoute) {
        // FAST-TRACK: Load core & voucher scripts first so form is instantly interactive!
        await loadScriptList(coreScripts);
        if (typeof checkLogin === 'function') {
            await checkLogin();
        }
        if (typeof initVoucher === 'function') initVoucher();
        if (typeof applyTranslations === 'function') applyTranslations();

        setTimeout(() => {
            loadScriptList(adminScripts);
        }, 1500);
    } else {
        // Normal load for full system
        await loadScriptList([...coreScripts, ...adminScripts]);
        if (targetRoute === 'voucher' && typeof initVoucher === 'function') {
            initVoucher();
        }
    }
    
    // Initialize Flatpickr for all date inputs
    if (typeof flatpickr !== 'undefined') {
        const originalValueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        if (originalValueDesc && originalValueDesc.set) {
            Object.defineProperty(HTMLInputElement.prototype, 'value', {
                get: function() {
                    return originalValueDesc.get ? originalValueDesc.get.call(this) : this.getAttribute('value');
                },
                set: function(val) {
                    if (this._isSettingValue) {
                        try {
                            if (originalValueDesc.set) originalValueDesc.set.call(this, val);
                        } catch(e) {}
                        return;
                    }
                    this._isSettingValue = true;
                    try {
                        if (originalValueDesc.set) originalValueDesc.set.call(this, val);
                        if (this._flatpickr && typeof this._flatpickr.setDate === 'function') {
                            try {
                                this._flatpickr.setDate(val, false);
                            } catch(e) {}
                        }
                    } catch(e) {
                        // ignore sync errors
                    } finally {
                        this._isSettingValue = false;
                    }
                },
                configurable: true,
                enumerable: true
            });
        }

        const originalValueAsDateDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'valueAsDate');
        if (originalValueAsDateDesc && originalValueAsDateDesc.set) {
            Object.defineProperty(HTMLInputElement.prototype, 'valueAsDate', {
                get: function() {
                    try {
                        return originalValueAsDateDesc.get ? originalValueAsDateDesc.get.call(this) : null;
                    } catch(e) {
                        if (this.value) {
                            const d = new Date(this.value);
                            return isNaN(d.getTime()) ? null : d;
                        }
                        return null;
                    }
                },
                set: function(val) {
                    if (this._isSettingValueAsDate) {
                        try {
                            if (originalValueAsDateDesc.set) originalValueAsDateDesc.set.call(this, val);
                        } catch(e) {}
                        return;
                    }
                    this._isSettingValueAsDate = true;
                    try {
                        let nativeSuccess = false;
                        try {
                            if (originalValueAsDateDesc.set) {
                                originalValueAsDateDesc.set.call(this, val);
                                nativeSuccess = true;
                            }
                        } catch(e) {
                            // Suppress "This input element does not support Date values" when Flatpickr changes type to hidden
                        }

                        if (!nativeSuccess) {
                            if (val instanceof Date && !isNaN(val.getTime())) {
                                const y = val.getFullYear();
                                const m = String(val.getMonth() + 1).padStart(2, '0');
                                const d = String(val.getDate()).padStart(2, '0');
                                this.value = `${y}-${m}-${d}`;
                            } else if (typeof val === 'string') {
                                this.value = val;
                            } else if (val === null || val === undefined) {
                                this.value = '';
                            }
                        }

                        if (this._flatpickr && typeof this._flatpickr.setDate === 'function') {
                            try {
                                this._flatpickr.setDate(val, false);
                            } catch(e) {}
                        }
                    } catch(e) {
                        // ignore sync errors
                    } finally {
                        this._isSettingValueAsDate = false;
                    }
                },
                configurable: true,
                enumerable: true
            });
        }

        flatpickr('input[type="date"]', {
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'd-m-Y',
            allowInput: true,
            disableMobile: true
        });
    }

    // 3. Central Application Initialization for Non-Eface routes
    if (!isEfaceRoute && typeof checkLogin === 'function') {
        checkLogin().then((isLoggedIn) => {
            if (isLoggedIn && currentUser) {
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

                // Ensure current route view is fully initialized after all scripts have loaded
                const rawHash = (window.location.hash || '').replace('#', '').trim();
                const activeTab = rawHash ? rawHash.split('?')[0].split('/')[0] : (localStorage.getItem('activeTab') || 'dashboard');
                if (activeTab === 'attendance-report' && typeof initAttendanceReport === 'function') {
                    initAttendanceReport();
                } else if (activeTab === 'attendance' && typeof initAttendance === 'function') {
                    initAttendance();
                } else if (activeTab === 'payroll' && typeof initPayroll === 'function') {
                    initPayroll();
                } else if (typeof showTab === 'function') {
                    showTab(activeTab);
                }
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

