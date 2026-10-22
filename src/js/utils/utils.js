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

// ====== AUTOMATIC CLEANUP & DEDUPLICATION FOR PAYROLL EXPENSES ======
let isCleaningPayrollDuplicates = false;
window.autoCleanDuplicatePayrollExpense = async function() {
    if (isCleaningPayrollDuplicates) return;
    if (typeof db === 'undefined' || !db.transactions) return;

    isCleaningPayrollDuplicates = true;
    try {
        const allTx = await db.transactions.toArray();
        if (!allTx || allTx.length === 0) return;

        const isPayrollExpense = (t) => {
            if (!t || t.type !== 'expense') return false;
            const cat = (t.category || '').toLowerCase();
            const note = (t.note || '').toLowerCase();
            return cat.includes('ប្រាក់បៀវត្សរ៍') || cat.includes('payroll') ||
                   note.includes('បើកប្រាក់បៀវត្សរ៍') || note.includes('ប្រាក់បៀវត្សរ៍') ||
                   note.includes('pay-');
        };

        const payrollExpenses = allTx.filter(isPayrollExpense);
        if (payrollExpenses.length === 0) return;

        // 1. SPECIFIC TARGET: Deduplicate Oct 1-15 2026 payroll expenses where duplicate occurred on 2026-10-22
        const isOctPeriod1 = (t) => {
            const note = t.note || '';
            return (note.includes('តុលា') || note.includes('10')) &&
                   (note.includes('លើកទី 1') || note.includes('លើកទី ១') || note.includes('01 ដល់ 15') || note.includes('1 ដល់ 15') || note.includes('០១ ដល់ ១៥'));
        };

        const octPeriod1Tx = payrollExpenses.filter(isOctPeriod1);
        if (octPeriod1Tx.length > 1) {
            const has19 = octPeriod1Tx.some(t => t.date === '2026-10-19');
            const dup22List = octPeriod1Tx.filter(t => t.date === '2026-10-22');

            if (has19 && dup22List.length > 0) {
                for (const dTx of dup22List) {
                    console.log('AutoClean: Deleting duplicate payroll expense on 2026-10-22:', dTx.id, dTx.note);
                    await db.transactions.delete(dTx.id);
                }
            }
        }

        // 2. GENERAL SAFEGUARD: Deduplicate any payroll transactions that share the same batch or identical note
        const freshTx = await db.transactions.toArray();
        const freshPayrollTx = freshTx.filter(isPayrollExpense);

        const groups = {};
        for (const t of freshPayrollTx) {
            const normNote = (t.note || '').trim().replace(/\s+/g, ' ');
            const key = t.payrollBatchId ? `batch_${t.payrollBatchId}` : `note_${normNote}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        }

        for (const key in groups) {
            const list = groups[key];
            if (list.length > 1) {
                // Keep the earliest one (by date, then by id)
                list.sort((a, b) => (a.date || '').localeCompare(b.date || '') || String(a.id || '').localeCompare(String(b.id || '')));
                const original = list[0];
                const duplicates = list.slice(1);
                for (const dup of duplicates) {
                    console.log('AutoClean: Deleting general duplicate payroll expense:', dup.id, dup.note);
                    await db.transactions.delete(dup.id);
                }
            }
        }

        // 3. AUTO-LINK PAYROLL BATCHES IN db.payroll WITH THEIR EXPENSE TRANSACTIONS
        if (db.payroll) {
            const batches = await db.payroll.toArray();
            const currentTx = await db.transactions.toArray();
            for (const batch of batches) {
                if (batch.status === 'Paid') {
                    let matchedTx = currentTx.find(t => t.type === 'expense' && t.payrollBatchId === batch.id);
                    if (!matchedTx) {
                        matchedTx = currentTx.find(t => 
                            isPayrollExpense(t) && t.note && (t.note.includes(batch.title) || (batch.code && t.note.includes(batch.code)))
                        );
                    }
                    if (matchedTx) {
                        let needBatchUpdate = false;
                        const batchUpdates = {};
                        if (batch.expenseTransactionId !== matchedTx.id) {
                            batchUpdates.expenseTransactionId = matchedTx.id;
                            needBatchUpdate = true;
                        }
                        if (!batch.isExpenseRecorded) {
                            batchUpdates.isExpenseRecorded = true;
                            needBatchUpdate = true;
                        }
                        if (needBatchUpdate) {
                            await db.payroll.update(batch.id, batchUpdates);
                        }
                        if (matchedTx.payrollBatchId !== batch.id) {
                            await db.transactions.update(matchedTx.id, { payrollBatchId: batch.id });
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.warn('AutoCleanDuplicatePayrollExpense notice:', err);
    } finally {
        isCleaningPayrollDuplicates = false;
    }
};
