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
    'settings'
];

async function initializeApp() {
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
        'src/js/utils/auth.js',
        'src/js/pages/settings.js',
        'src/js/pages/invoice.js',
        'src/js/pages/transactions.js',
        'src/js/pages/dashboard.js',
        'src/js/pages/reports.js',
        'src/js/pages/employee.js'
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
}

// Start the app
document.addEventListener('DOMContentLoaded', initializeApp);
