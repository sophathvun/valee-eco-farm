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

function toggleTheme() {
    const isDark = document.getElementById('themeSwitch').checked;
    
    if (isDark) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        document.body.classList.add('dark-theme');
    } else {
        document.documentElement.setAttribute('data-bs-theme', 'light');
        document.body.classList.remove('dark-theme');
    }
    
    localStorage.setItem('sysTheme', isDark ? 'dark' : 'light');
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('sysTheme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
        themeSwitch.checked = isDark;
    }
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
