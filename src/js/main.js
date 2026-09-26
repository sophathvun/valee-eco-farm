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
    'settings'
];

async function initializeApp() {
    await applyBranding();
    const container = document.getElementById('main-content-container');
    
    // 1. Fetch and inject all HTML templates
    for (let view of viewsToLoad) {
        try {
            const response = await fetch(`src/templates/${view}.html`);
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
        'src/js/pages/attendance-report.js'
    ];

    for (let src of scriptsToLoad) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
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
                originalValueSetter.call(this, val);
                if (this._flatpickr) this._flatpickr.setDate(val, false);
            }
        });
        const originalValueAsDateSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'valueAsDate').set;
        Object.defineProperty(HTMLInputElement.prototype, 'valueAsDate', {
            set: function(val) {
                originalValueAsDateSetter.call(this, val);
                if (this._flatpickr) this._flatpickr.setDate(val, false);
            }
        });

        flatpickr('input[type="date"]', {
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'd-M-Y'
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

                // Dynamically create manifest.json for PWA / Android shortcut
                const manifest = {
                    "name": "Valee Eco Farm",
                    "short_name": "Valee",
                    "start_url": ".",
                    "display": "standalone",
                    "background_color": "#1e293b",
                    "theme_color": "#198754",
                    "icons": [
                        {
                            "src": brand.mobileIcon,
                            "sizes": "192x192 512x512",
                            "type": "image/png"
                        }
                    ]
                };
                const manifestBlob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
                const manifestURL = URL.createObjectURL(manifestBlob);
                let manifestLink = document.querySelector("link[rel='manifest']");
                if (!manifestLink) {
                    manifestLink = document.createElement('link');
                    manifestLink.rel = 'manifest';
                    document.getElementsByTagName('head')[0].appendChild(manifestLink);
                }
                manifestLink.href = manifestURL;
            }
        }
    } catch (e) {
        console.error('Error applying branding on load:', e);
    }
}

window.applyBranding = applyBranding;






