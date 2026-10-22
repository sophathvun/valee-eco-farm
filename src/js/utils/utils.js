// Firebase Config moved to src/js/config/firebase-config.js
// Database Logic moved to src/js/services/db.js

let myChart = null;
let reportChartInstance = null;
let incReportChartInstance = null;
let expReportChartInstance = null;
let currentReportTab = 'summary';

Chart.defaults.font.family = "'Kantumruy Pro', 'Khmer OS Battambang', sans-serif";

const todayIso = new Date().toISOString().split('T')[0];
const incD = document.getElementById('inc-date'); if (incD) incD.value = todayIso;
const expD = document.getElementById('exp-date'); if (expD) expD.value = todayIso;
const invD = document.getElementById('inv-date'); if (invD) invD.value = todayIso;

function updateOnlineStatus() {
    const offlineBadge = document.getElementById('offline-status');
    if (offlineBadge) {
        if (!navigator.onLine) {
            offlineBadge.style.display = 'block';
        } else {
            offlineBadge.style.display = 'none';
        }
    }
}

window.addEventListener('online', () => {
    updateOnlineStatus();
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'success',
            title: 'បានភ្ជាប់អ៊ីនធឺណិតឡើងវិញ (Online)'
        });
    }
});

window.addEventListener('offline', () => {
    updateOnlineStatus();
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'warning',
            title: 'ដាច់ការតភ្ជាប់អ៊ីនធឺណិត!',
            text: 'ប្រព័ន្ធដំណើរការផ្ទាល់លើ Cloud Online ប៉ុណ្ណោះ។ សូមភ្ជាប់អ៊ីនធឺណិតដើម្បីបន្តប្រើប្រាស់។',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#d33'
        });
    }
});

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

function updateThemeButtons() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme') || localStorage.getItem('sysTheme') || 'light';
    const isDark = currentTheme === 'dark';

    const btnLight = document.getElementById('theme-btn-light');
    const btnDark = document.getElementById('theme-btn-dark');

    if (btnLight && btnDark) {
        if (!isDark) {
            btnLight.classList.add('active');
            btnLight.classList.remove('text-muted');
            btnDark.classList.remove('active');
            btnDark.classList.add('text-muted');
        } else {
            btnDark.classList.add('active');
            btnDark.classList.remove('text-muted');
            btnLight.classList.remove('active');
            btnLight.classList.add('text-muted');
        }
    }

    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
        themeSwitch.checked = isDark;
    }
}

function setTheme(theme) {
    const isDark = theme === 'dark';
    
    if (isDark) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        document.body.classList.add('dark-theme');
    } else {
        document.documentElement.setAttribute('data-bs-theme', 'light');
        document.body.classList.remove('dark-theme');
    }
    
    localStorage.setItem('sysTheme', isDark ? 'dark' : 'light');
    updateThemeButtons();

    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: isDark ? 'dark' : 'light' } }));
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme') || localStorage.getItem('sysTheme') || 'light';
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

window.setTheme = setTheme;
window.toggleTheme = toggleTheme;
window.updateThemeButtons = updateThemeButtons;

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('sysTheme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-bs-theme', theme);
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }

    updateThemeButtons();
});

// Global Image Compression Helper for Bank QR Code & Documents
window.compressQrImage = function(file, maxDimension = 600, quality = 0.9) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Fill white background so transparent PNGs/QRs don't turn black
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};
