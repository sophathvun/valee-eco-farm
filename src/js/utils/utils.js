// Firebase Config moved to src/js/config/firebase-config.js
// Database Logic moved to src/js/services/db.js

let myChart = null;
let reportChartInstance = null;
let incReportChartInstance = null;
let expReportChartInstance = null;
let currentReportTab = 'summary';

Chart.defaults.font.family = "'Kantumruy Pro', 'Khmer OS Battambang', sans-serif";

document.getElementById('inc-date').valueAsDate = new Date();
document.getElementById('exp-date').valueAsDate = new Date();
document.getElementById('inv-date').valueAsDate = new Date();

function updateOnlineStatus() {
    const offlineBadge = document.getElementById('offline-status');
    if (offlineBadge) {
        if (!navigator.onLine) offlineBadge.style.display = 'block';
        else offlineBadge.style.display = 'none';
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();


function filterSidebarMenu() {
    const input = document.getElementById('sidebarSearchInput').value.toLowerCase();
    const menuItems = document.querySelectorAll('.sidebar-menu .sys-menu-item');
    menuItems.forEach(item => {
        const p = item.getAttribute('data-perm');
        if (p && typeof hasPermission === 'function' && !hasPermission(p)) {
            item.style.display = 'none';
            return;
        }
        
        const text = item.textContent.toLowerCase();
        if (text.includes(input)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-theme');
    const toggleIcon = document.getElementById('theme-toggle');
    if (toggleIcon) {
        toggleIcon.textContent = isDark ? '☀️' : '🌙';
    }
    localStorage.setItem('sysTheme', isDark ? 'dark' : 'light');
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('sysTheme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    // Update icon if it exists (since index.html might load after)
    setTimeout(() => {
        const toggleIcon = document.getElementById('theme-toggle');
        if (toggleIcon && document.body.classList.contains('dark-theme')) {
            toggleIcon.textContent = '☀️';
        }
    }, 100);
});
