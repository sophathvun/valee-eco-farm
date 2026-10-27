// wallet.js - Petty Cash & Farm Wallet Logic

window.currentWalletUserId = null;
window.walletTypeFilter = 'all';
window.walletReceiptBase64 = null;
window.cachedWalletUsers = [];

// Initialize Wallet on load / tab activation
window.initWallet = async function() {
    try {
        await loadWalletData();
    } catch (e) {
        console.error('Error initializing wallet:', e);
    }
};

// Toggle Balance Privacy (Hide/Show amounts)
window.toggleWalletBalancePrivacy = function() {
    const isPrivate = localStorage.getItem('wallet_privacy') === 'true';
    localStorage.setItem('wallet_privacy', (!isPrivate).toString());
    updateBalanceDisplayPrivacy(!isPrivate);
};

function updateBalanceDisplayPrivacy(isPrivate) {
    const eyeIcon = document.getElementById('wallet-eye-icon');
    if (eyeIcon) {
        eyeIcon.className = isPrivate ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
    }
    const usdEl = document.getElementById('wallet-balance-usd');
    const khrEl = document.getElementById('wallet-balance-khr');

    if (usdEl) {
        if (isPrivate) {
            usdEl.dataset.actual = usdEl.textContent;
            usdEl.textContent = '••••••';
        } else if (usdEl.dataset.actual) {
            usdEl.textContent = usdEl.dataset.actual;
        }
    }
    if (khrEl) {
        if (isPrivate) {
            khrEl.dataset.actual = khrEl.textContent;
            khrEl.textContent = '••••••';
        } else if (khrEl.dataset.actual) {
            khrEl.textContent = khrEl.dataset.actual;
        }
    }
}

// Format numbers
function formatMoney(amount, currency = 'USD') {
    const num = parseFloat(amount) || 0;
    if (currency === 'USD') {
        return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        return Math.round(num).toLocaleString('en-US') + ' ៛';
    }
}

// Check if user is Admin or Farm Owner
function isWalletAdmin() {
    if (!window.currentUser) return false;
    const uname = (window.currentUser.username || '').toLowerCase();
    const perms = window.currentUser.permissions || [];
    return uname === 'admin' || perms.includes('wallet_topup') || perms.includes('settings');
}

// Filter Type (all, topup, expense)
window.setWalletTypeFilter = function(type) {
    window.walletTypeFilter = type;
    document.querySelectorAll('.btn-group button[id^="filter-type-"]').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById('filter-type-' + type);
    if (activeBtn) activeBtn.classList.add('active');
    renderWalletTransactions();
};

window.clearWalletFilters = function() {
    const fromEl = document.getElementById('wallet-filter-from');
    const toEl = document.getElementById('wallet-filter-to');
    const userEl = document.getElementById('filter-wallet-user');
    if (fromEl) fromEl.value = '';
    if (toEl) toEl.value = '';
    if (userEl) userEl.value = '';
    window.walletTypeFilter = 'all';
    window.currentWalletUserId = null;
    loadWalletData();
};

// Main Load Data
window.loadWalletData = async function() {
    if (typeof db === 'undefined' || !db.walletTransactions) return;

    try {
        // 1. Load active users
        let allUsers = [];
        try {
            allUsers = (await db.users.toArray()) || [];
        } catch (e) {
            allUsers = [];
        }
        window.cachedWalletUsers = allUsers;

        // 2. Load all wallet transactions
        let txList = [];
        try {
            txList = (await db.walletTransactions.toArray()) || [];
        } catch (e) {
            txList = [];
        }
        // Sort descending by date, then createdAt/id
        txList.sort((a, b) => {
            const dateCmp = (b.date || '').localeCompare(a.date || '');
            if (dateCmp !== 0) return dateCmp;
            return (b.id || 0) - (a.id || 0);
        });
        window._allWalletTransactions = txList;

        const isAdmin = isWalletAdmin();
        const loggedUser = window.currentUser || { username: 'Guest', id: 0 };

        // Hide/Show Top Up button based on permission
        const topupBtn = document.getElementById('btn-open-topup');
        const cardTopupBtn = document.getElementById('card-action-topup');
        if (topupBtn) topupBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        if (cardTopupBtn) cardTopupBtn.style.display = isAdmin ? 'inline-block' : 'none';

        // Populate User filter dropdown for Admin
        const userFilterSelect = document.getElementById('filter-wallet-user');
        if (userFilterSelect) {
            if (isAdmin) {
                userFilterSelect.style.display = 'inline-block';
                const currentVal = userFilterSelect.value;
                userFilterSelect.innerHTML = '<option value="">អ្នកកាន់ទាំងអស់ (All Handlers)</option>';
                allUsers.forEach(u => {
                    const opt = document.createElement('option');
                    opt.value = u.id;
                    opt.textContent = u.username;
                    if (String(u.id) === String(currentVal)) opt.selected = true;
                    userFilterSelect.appendChild(opt);
                });
            } else {
                userFilterSelect.style.display = 'none';
            }
        }

        // Determine currently active wallet user
        let activeUserId = null;
        let activeUserName = '';

        if (!isAdmin) {
            // Custodian sees ONLY their own wallet
            activeUserId = loggedUser.id || loggedUser.username;
            activeUserName = loggedUser.username || 'អ្នកកាន់កាបូបលុយ';
        } else {
            // Admin can view a specific custodian if chosen, otherwise Master Overview
            const selectedInFilter = userFilterSelect ? userFilterSelect.value : '';
            if (window.currentWalletUserId) {
                activeUserId = window.currentWalletUserId;
                const found = allUsers.find(u => String(u.id) === String(activeUserId));
                activeUserName = found ? found.username : 'អ្នកកាន់កាបូបលុយ';
            } else if (selectedInFilter) {
                activeUserId = selectedInFilter;
                const found = allUsers.find(u => String(u.id) === String(activeUserId));
                activeUserName = found ? found.username : 'អ្នកកាន់កាបូបលុយ';
            } else {
                activeUserId = null; // Master Overview
                activeUserName = 'VALLE MASTER WALLET';
            }
        }

        // Update Card Header Name & Avatar
        const cardNameEl = document.getElementById('wallet-card-user-name');
        if (cardNameEl) cardNameEl.textContent = activeUserName;

        let activeUserPhoto = null;
        if (!activeUserId) {
            activeUserPhoto = 'assets/images/logo.png';
        } else {
            const foundUser = (allUsers || []).find(u => String(u.id) === String(activeUserId));
            activeUserPhoto = foundUser && foundUser.photo ? foundUser.photo : null;
        }
        const cardAvatarEl = document.getElementById('wallet-card-user-avatar');
        if (cardAvatarEl) {
            cardAvatarEl.src = activeUserPhoto || 'assets/images/default-avatar.png';
        }

        // 3. Compute Balances & KPIs
        let targetTx = txList;
        if (activeUserId) {
            targetTx = txList.filter(t => String(t.userId) === String(activeUserId));
        }

        let inUSD = 0, inKHR = 0;
        let outUSD = 0, outKHR = 0;

        targetTx.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (t.type === 'topup') {
                if (t.currency === 'USD') inUSD += amt;
                else inKHR += amt;
            } else if (t.type === 'expense') {
                if (t.currency === 'USD') outUSD += amt;
                else outKHR += amt;
            }
        });

        const balUSD = inUSD - outUSD;
        const balKHR = inKHR - outKHR;

        // Render Balances on Card
        const usdEl = document.getElementById('wallet-balance-usd');
        const khrEl = document.getElementById('wallet-balance-khr');
        if (usdEl) {
            usdEl.textContent = formatMoney(balUSD, 'USD');
            usdEl.dataset.actual = usdEl.textContent;
        }
        if (khrEl) {
            khrEl.textContent = formatMoney(balKHR, 'KHR');
            khrEl.dataset.actual = khrEl.textContent;
        }

        // Render KPIs
        const inUsdEl = document.getElementById('kpi-money-in-usd');
        const inKhrEl = document.getElementById('kpi-money-in-khr');
        const outUsdEl = document.getElementById('kpi-money-out-usd');
        const outKhrEl = document.getElementById('kpi-money-out-khr');

        if (inUsdEl) inUsdEl.textContent = '+' + formatMoney(inUSD, 'USD');
        if (inKhrEl) inKhrEl.textContent = '+' + formatMoney(inKHR, 'KHR');
        if (outUsdEl) outUsdEl.textContent = '-' + formatMoney(outUSD, 'USD');
        if (outKhrEl) outKhrEl.textContent = '-' + formatMoney(outKHR, 'KHR');

        // Apply Privacy if enabled
        const isPrivate = localStorage.getItem('wallet_privacy') === 'true';
        updateBalanceDisplayPrivacy(isPrivate);

        // 4. Render Custodians Carousel (Admin Only)
        renderCustodiansCarousel(allUsers, txList, activeUserId);

        // 5. Render Transaction Feed
        renderWalletTransactions();

    } catch (err) {
        console.error('Error loading wallet data:', err);
    }
};

// Render Custodians Carousel
function renderCustodiansCarousel(allUsers, allTx, activeUserId) {
    const section = document.getElementById('wallet-admin-custodians-section');
    const container = document.getElementById('custodians-avatar-list');
    if (!section || !container) return;

    if (!isWalletAdmin()) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    container.innerHTML = '';

    // "All / Master" Item
    const allItem = document.createElement('div');
    allItem.className = `custodian-avatar-item ${!activeUserId ? 'active' : ''}`;
    allItem.onclick = () => {
        window.currentWalletUserId = null;
        const userSelect = document.getElementById('filter-wallet-user');
        if (userSelect) userSelect.value = '';
        loadWalletData();
    };
    allItem.innerHTML = `
        <div class="custodian-avatar-circle" style="background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%); color: #fff;">
            <i class="bi bi-wallet2"></i>
        </div>
        <div class="custodian-name">ទាំងអស់</div>
        <div class="custodian-balance-pill">Overview</div>
    `;
    container.appendChild(allItem);

    // List non-admin active users or all users
    const candidateUsers = allUsers.filter(u => (u.username || '').toLowerCase() !== 'admin');

    candidateUsers.forEach(u => {
        // Calculate user's specific balance
        let uInUSD = 0, uOutUSD = 0;
        let uInKHR = 0, uOutKHR = 0;
        allTx.filter(t => String(t.userId) === String(u.id)).forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (t.type === 'topup') {
                if (t.currency === 'USD') uInUSD += amt;
                else uInKHR += amt;
            } else if (t.type === 'expense') {
                if (t.currency === 'USD') uOutUSD += amt;
                else uOutKHR += amt;
            }
        });
        const uBalUSD = uInUSD - uOutUSD;
        const uBalKHR = uInKHR - uOutKHR;

        // Avatar initial and photo
        const initial = (u.username || 'U').charAt(0).toUpperCase();
        const avatarHtml = u.photo 
            ? `<img src="${u.photo}" alt="${u.username}" class="w-100 h-100 rounded-circle object-fit-cover">` 
            : initial;

        const item = document.createElement('div');
        const isSelected = String(u.id) === String(activeUserId);
        item.className = `custodian-avatar-item ${isSelected ? 'active' : ''}`;
        
        // Click to view their wallet or double click/badge to top up
        item.onclick = () => {
            window.currentWalletUserId = u.id;
            const userSelect = document.getElementById('filter-wallet-user');
            if (userSelect) userSelect.value = u.id;
            loadWalletData();
        };

        const hasMoney = uBalUSD > 0 || uBalKHR > 0;
        const balanceText = uBalUSD !== 0 ? formatMoney(uBalUSD, 'USD') : formatMoney(uBalKHR, 'KHR');

        item.innerHTML = `
            <div class="custodian-avatar-circle p-0 overflow-hidden">
                ${avatarHtml}
            </div>
            <div class="custodian-name" title="${u.username}">${u.username}</div>
            <div class="custodian-balance-pill ${hasMoney ? 'has-money' : 'low-money'}">
                ${balanceText}
            </div>
        `;
        container.appendChild(item);
    });

    // "+ Add Top Up" Quick shortcut item
    const addItem = document.createElement('div');
    addItem.className = 'custodian-avatar-item';
    addItem.onclick = () => openTopUpModal();
    addItem.innerHTML = `
        <div class="custodian-avatar-circle add-btn">
            <i class="bi bi-plus-lg"></i>
        </div>
        <div class="custodian-name">+ ដាក់លុយ</div>
        <div class="custodian-balance-pill">Top Up</div>
    `;
    container.appendChild(addItem);
}

// Render Transactions Feed
function renderWalletTransactions() {
    const container = document.getElementById('wallet-transaction-list');
    if (!container) return;

    let list = window._allWalletTransactions || [];
    const isAdmin = isWalletAdmin();
    const loggedUser = window.currentUser || { username: 'Guest', id: 0 };

    // Filter by Active Custodian
    if (!isAdmin) {
        list = list.filter(t => String(t.userId) === String(loggedUser.id || loggedUser.username));
    } else if (window.currentWalletUserId) {
        list = list.filter(t => String(t.userId) === String(window.currentWalletUserId));
    }

    // Filter by Type (all, topup, expense)
    if (window.walletTypeFilter && window.walletTypeFilter !== 'all') {
        list = list.filter(t => t.type === window.walletTypeFilter);
    }

    // Filter by Date Range
    const fromVal = document.getElementById('wallet-filter-from')?.value;
    const toVal = document.getElementById('wallet-filter-to')?.value;
    if (fromVal) {
        list = list.filter(t => (t.date || '') >= fromVal);
    }
    if (toVal) {
        list = list.filter(t => (t.date || '') <= toVal);
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <div class="fs-1 mb-2">📭</div>
                <div class="fw-semibold">មិនមានប្រតិបត្តិការនៅក្នុងបញ្ជីនេះទេ</div>
                <small class="text-secondary">រាល់ការបញ្ចូលប្រាក់ ឬការចំណាយ នឹងបង្ហាញនៅទីនេះ</small>
            </div>
        `;
        return;
    }

    let html = '';
    list.forEach(tx => {
        const isTopup = tx.type === 'topup';
        const iconClass = isTopup ? 'bi bi-arrow-down-left topup' : 'bi bi-cart-dash expense';
        const boxClass = isTopup ? 'topup' : 'expense';
        const amountClass = isTopup ? 'topup' : 'expense';
        const prefix = isTopup ? '+' : '-';
        const amountFormatted = prefix + formatMoney(tx.amount, tx.currency);

        const title = isTopup 
            ? (tx.note || 'បញ្ចូលប្រាក់បុរេប្រទាន (Top Up)') 
            : (tx.category ? `${tx.category}${tx.payee ? ' - ' + tx.payee : ''}` : (tx.note || 'ចំណាយទូទៅ'));

        const dateStr = tx.date || '';
        const userObj = (window.cachedWalletUsers || []).find(u => String(u.id) === String(tx.userId));
        const userPhoto = userObj && userObj.photo ? userObj.photo : null;
        const userLabel = tx.userName ? `
            <span class="badge bg-secondary-subtle text-secondary rounded-pill d-inline-flex align-items-center gap-1 py-1 px-2">
                ${userPhoto ? `<img src="${userPhoto}" class="rounded-circle object-fit-cover" style="width: 14px; height: 14px;">` : `<i class="bi bi-person-fill" style="font-size: 11px;"></i>`}
                <span>${tx.userName}</span>
            </span>
        ` : '';

        // Receipt button if receipt image exists
        const receiptBtn = tx.receiptUrl ? `
            <button class="btn btn-sm btn-outline-info rounded-pill py-0 px-2" style="font-size: 11px;" onclick="viewReceiptPhoto('${encodeURIComponent(tx.receiptUrl)}', '${encodeURIComponent(title)}')">
                <i class="bi bi-image"></i> វិក្កយបត្រ
            </button>
        ` : '';

        // Delete button for Admin
        const deleteBtn = isAdmin ? `
            <button class="btn btn-sm btn-outline-danger border-0 rounded-circle p-1 ms-1" title="លុបប្រតិបត្តិការ" onclick="deleteWalletTx(${tx.id})">
                <i class="bi bi-trash"></i>
            </button>
        ` : '';

        html += `
            <div class="wallet-tx-row">
                <div class="d-flex align-items-center min-w-0 flex-fill">
                    <div class="tx-icon-box ${boxClass}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="tx-details">
                        <div class="tx-title" title="${title}">${title}</div>
                        <div class="tx-meta">
                            <span>📅 ${dateStr}</span>
                            ${userLabel}
                            ${receiptBtn}
                            ${tx.note && !isTopup && tx.category ? `<span class="text-truncate d-none d-md-inline" style="max-width: 250px;">💬 ${tx.note}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="d-flex align-items-center">
                    <div class="tx-amounts">
                        <div class="tx-amount-val ${amountClass}">${amountFormatted}</div>
                        <small class="text-secondary" style="font-size: 11px;">${tx.currency || 'USD'}</small>
                    </div>
                    ${deleteBtn}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ========================================================
// TOP UP ACTIONS
// ========================================================
window.openTopUpModal = async function(preselectedUserId = null) {
    const modalEl = document.getElementById('walletTopupModal');
    if (!modalEl) return;

    // Reset form
    document.getElementById('walletTopupForm')?.reset();

    // Default Date to Today
    const dateEl = document.getElementById('topup-date');
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

    // Populate Recipient select
    const select = document.getElementById('topup-recipient');
    if (select) {
        select.innerHTML = '<option value="">-- សូមជ្រើសរើសអ្នកទទួល --</option>';
        const users = window.cachedWalletUsers || [];
        const candidates = users.filter(u => (u.username || '').toLowerCase() !== 'admin');
        candidates.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.dataset.name = u.username;
            opt.textContent = u.username;
            if (preselectedUserId && String(u.id) === String(preselectedUserId)) {
                opt.selected = true;
            } else if (window.currentWalletUserId && String(u.id) === String(window.currentWalletUserId)) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
    }

    updateTopUpCurrencySymbol();

    const m = new bootstrap.Modal(modalEl);
    m.show();
};

window.updateTopUpCurrencySymbol = function() {
    const cur = document.getElementById('topup-currency')?.value || 'USD';
    const sym = document.getElementById('topup-symbol');
    if (sym) sym.textContent = cur === 'USD' ? '$' : '៛';
};

window.handleTopUpSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-topup');
    const recipientSelect = document.getElementById('topup-recipient');
    const currency = document.getElementById('topup-currency')?.value || 'USD';
    const date = document.getElementById('topup-date')?.value || new Date().toISOString().split('T')[0];
    const amountVal = parseFloat(document.getElementById('topup-amount')?.value);
    const note = document.getElementById('topup-note')?.value.trim();
    const notifyTelegram = document.getElementById('topup-telegram-notify')?.checked;

    if (!recipientSelect || !recipientSelect.value) {
        Swal.fire({ icon: 'warning', text: 'សូមជ្រើសរើសអ្នកទទួលប្រាក់!', confirmButtonText: 'យល់ព្រម' });
        return;
    }

    if (!amountVal || amountVal <= 0) {
        Swal.fire({ icon: 'warning', text: 'សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ!', confirmButtonText: 'យល់ព្រម' });
        return;
    }

    const userId = recipientSelect.value;
    const selectedOpt = recipientSelect.options[recipientSelect.selectedIndex];
    const userName = selectedOpt ? selectedOpt.dataset.name || selectedOpt.textContent : 'Unknown';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងរក្សាទុក...';
    }

    try {
        const txObj = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            type: 'topup',
            userId: userId,
            userName: userName,
            currency: currency,
            amount: amountVal,
            date: date,
            note: note || 'បញ្ចូលប្រាក់បុរេប្រទាន',
            createdBy: (window.currentUser && window.currentUser.username) || 'Admin',
            createdAt: new Date().toISOString()
        };

        // Add to walletTransactions (does NOT affect farm expenses)
        await db.walletTransactions.add(txObj);

        // Telegram Notification
        if (notifyTelegram) {
            dispatchWalletTelegramAlert('topup', txObj);
        }

        const modalEl = document.getElementById('walletTopupModal');
        if (modalEl) {
            const m = bootstrap.Modal.getInstance(modalEl);
            if (m) m.hide();
        }

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ',
            text: `បានបញ្ចូលប្រាក់ ${formatMoney(amountVal, currency)} ជូន ${userName} រួចរាល់!`,
            timer: 2000,
            showConfirmButton: false
        });

        loadWalletData();
    } catch (err) {
        console.error('Error in handleTopUpSubmit:', err);
        Swal.fire('កំហុស', err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> បញ្ចូលប្រាក់ភ្លាម';
        }
    }
};

// ========================================================
// EXPENSE / PAYMENT ACTIONS
// ========================================================
window.openWalletExpenseModal = async function() {
    const modalEl = document.getElementById('walletExpenseModal');
    if (!modalEl) return;

    // Reset Form
    document.getElementById('walletExpenseForm')?.reset();
    removeWalletReceipt();

    // Default Date to Today
    const dateEl = document.getElementById('wallet-exp-date');
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

    // Determine current user
    const loggedUser = window.currentUser || { username: 'Michael', id: 0 };
    const isAdmin = isWalletAdmin();
    const effectiveUserId = (!isAdmin && loggedUser.id) ? loggedUser.id : (window.currentWalletUserId || loggedUser.id || loggedUser.username);
    const effectiveUserName = (!isAdmin && loggedUser.username) ? loggedUser.username : (document.getElementById('wallet-card-user-name')?.textContent || loggedUser.username);

    const userLabelEl = document.getElementById('exp-modal-user-label');
    if (userLabelEl) userLabelEl.textContent = `អ្នកចំណាយ៖ ${effectiveUserName}`;

    // Show Available Balances Badge in Modal
    const balUSDText = document.getElementById('wallet-balance-usd')?.textContent || '$0.00';
    const balKHRText = document.getElementById('wallet-balance-khr')?.textContent || '0 ៛';
    const badgeEl = document.getElementById('exp-modal-balance-badge');
    if (badgeEl) badgeEl.textContent = `${balUSDText} | ${balKHRText}`;

    // Populate Categories Dropdown
    const catSelect = document.getElementById('wallet-exp-category');
    if (catSelect) {
        catSelect.innerHTML = '<option value="">-- សូមជ្រើសរើសប្រភេទ --</option>';
        try {
            const cats = (await db.categories.toArray()) || [];
            const expCats = cats.filter(c => (c.type || 'expense') === 'expense');
            expCats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.name;
                opt.textContent = c.name;
                catSelect.appendChild(opt);
            });
        } catch (e) {
            console.warn('Could not load categories:', e);
        }
    }

    updateWalletExpenseCurrencySymbol();

    const m = new bootstrap.Modal(modalEl);
    m.show();
};

window.updateWalletExpenseCurrencySymbol = function() {
    const cur = document.getElementById('wallet-exp-currency')?.value || 'USD';
    const sym = document.getElementById('wallet-exp-symbol');
    if (sym) sym.textContent = cur === 'USD' ? '$' : '៛';
};

// Receipt Preview and Compression
window.previewWalletReceipt = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = function(err) {
        URL.revokeObjectURL(blobUrl);
        console.error("Wallet receipt error:", err);
    };
    img.onload = function() {
        try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            window.walletReceiptBase64 = compressedBase64;

            const previewImg = document.getElementById('wallet-exp-receipt-preview');
            const previewWrap = document.getElementById('wallet-exp-receipt-wrap');
            if (previewImg) previewImg.src = compressedBase64;
            if (previewWrap) previewWrap.style.display = 'block';
        } finally {
            URL.revokeObjectURL(blobUrl);
        }
    };
    img.src = blobUrl;
};

window.removeWalletReceipt = function() {
    window.walletReceiptBase64 = null;
    const fileInput = document.getElementById('wallet-exp-receipt');
    const container = document.getElementById('receipt-preview-container');
    if (fileInput) fileInput.value = '';
    if (container) container.style.display = 'none';
};

// Handle Expense Submit
window.handleWalletExpenseSubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-wallet-expense');
    const date = document.getElementById('wallet-exp-date')?.value || new Date().toISOString().split('T')[0];
    const category = document.getElementById('wallet-exp-category')?.value;
    const currency = document.getElementById('wallet-exp-currency')?.value || 'USD';
    const amountVal = parseFloat(document.getElementById('wallet-exp-amount')?.value);
    const payee = document.getElementById('wallet-exp-payee')?.value.trim();
    const note = document.getElementById('wallet-exp-note')?.value.trim();
    const syncToSystem = document.getElementById('wallet-exp-sync-system')?.checked;
    const notifyTelegram = document.getElementById('wallet-exp-telegram-notify')?.checked;

    if (!category) {
        Swal.fire({ icon: 'warning', text: 'សូមជ្រើសរើសប្រភេទចំណាយ!', confirmButtonText: 'យល់ព្រម' });
        return;
    }

    if (!amountVal || amountVal <= 0) {
        Swal.fire({ icon: 'warning', text: 'សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ!', confirmButtonText: 'យល់ព្រម' });
        return;
    }

    const loggedUser = window.currentUser || { username: 'Guest', id: 0 };
    const isAdmin = isWalletAdmin();
    const effectiveUserId = (!isAdmin && loggedUser.id) ? loggedUser.id : (window.currentWalletUserId || loggedUser.id || loggedUser.username);
    const effectiveUserName = (!isAdmin && loggedUser.username) ? loggedUser.username : (document.getElementById('wallet-card-user-name')?.textContent || loggedUser.username);

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងរក្សាទុក...';
    }

    try {
        const txObj = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            type: 'expense',
            userId: effectiveUserId,
            userName: effectiveUserName,
            currency: currency,
            amount: amountVal,
            date: date,
            category: category,
            payee: payee || '',
            note: note || '',
            receiptUrl: window.walletReceiptBase64 || '',
            createdBy: loggedUser.username || 'User',
            createdAt: new Date().toISOString()
        };

        // 1. Add to walletTransactions
        await db.walletTransactions.add(txObj);

        // 2. Synchronize as Farm Expense in System (transactions table)
        if (syncToSystem && db.transactions) {
            const systemNote = (payee ? `[${payee}] ` : '') + (note || '') + ` (កាបូបលុយ៖ ${effectiveUserName})`;
            await db.transactions.add({
                type: 'expense',
                amount: amountVal,
                currency: currency,
                paymentMethod: 'cash',
                exchangeRate: window.sysExchangeRate || 4100,
                date: date,
                category: category,
                note: systemNote
            });
        }

        // 3. Dispatch Telegram Alert
        if (notifyTelegram) {
            dispatchWalletTelegramAlert('expense', txObj);
        }

        const modalEl = document.getElementById('walletExpenseModal');
        if (modalEl) {
            const m = bootstrap.Modal.getInstance(modalEl);
            if (m) m.hide();
        }

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ',
            text: `បានកត់ត្រាចំណាយ ${formatMoney(amountVal, currency)} ពីកាបូបលុយរួចរាល់!`,
            timer: 2000,
            showConfirmButton: false
        });

        loadWalletData();
        // Also reload main system transactions if function exists
        if (typeof window.loadData === 'function') window.loadData();

    } catch (err) {
        console.error('Error in handleWalletExpenseSubmit:', err);
        Swal.fire('កំហុស', err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> កត់ត្រាចំណាយភ្លាម';
        }
    }
};

// View Receipt Photo Large Modal
window.viewReceiptPhoto = function(encodedUrl, encodedTitle) {
    const url = decodeURIComponent(encodedUrl);
    const title = decodeURIComponent(encodedTitle);
    const modalEl = document.getElementById('walletReceiptViewerModal');
    const imgEl = document.getElementById('receipt-viewer-img');
    const titleEl = document.getElementById('receipt-modal-title');
    const infoEl = document.getElementById('receipt-viewer-info');

    if (!modalEl || !imgEl) return;
    imgEl.src = url;
    if (titleEl) titleEl.textContent = title || 'រូបថតវិក្កយបត្រ';
    if (infoEl) infoEl.textContent = title;

    const m = new bootstrap.Modal(modalEl);
    m.show();
};

// Delete Wallet Transaction (Admin only)
window.deleteWalletTx = async function(id) {
    const res = await Swal.fire({
        title: 'បញ្ជាក់ការលុប',
        text: 'តើអ្នកពិតជាចង់លុបប្រតិបត្តិការនេះចេញពីកាបូបលុយមែនទេ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'យល់ព្រមលុប',
        cancelButtonText: 'បោះបង់'
    });

    if (res.isConfirmed) {
        try {
            await db.walletTransactions.delete(id);
            Swal.fire({ icon: 'success', title: 'បានលុបរួចរាល់!', timer: 1500, showConfirmButton: false });
            loadWalletData();
        } catch (e) {
            Swal.fire('កំហុស', e.message, 'error');
        }
    }
};

// ========================================================
// TELEGRAM ALERT DISPATCH
// ========================================================
async function dispatchWalletTelegramAlert(type, tx) {
    if (typeof db === 'undefined' || !db.telegramSettings) return;

    try {
        const tSettings = (await db.telegramSettings.first()) || {};
        if (tSettings.enabled === false) return;

        const botToken = (tSettings.paymentBotToken && tSettings.paymentBotToken.trim()) || 
                         (tSettings.botToken && tSettings.botToken.trim()) || 
                         '8823338803:AAF8xrTeSo4Up7u5R9L1absAIK-GU-n4_eQ';

        const chatId = (tSettings.paymentChatId && tSettings.paymentChatId.trim()) || 
                       (tSettings.chatId && tSettings.chatId.trim()) || 
                       '-5344695591';

        const farmName = tSettings.farmName || 'VALLE ECO FARM';
        const isTopup = type === 'topup';

        let message = '';
        if (isTopup) {
            message = `📥 <b>[កាបូបលុយ] ការបញ្ចូលប្រាក់បុរេប្រទានថ្មី</b>\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `🌾 <b>កសិដ្ឋាន៖</b> ${farmName}\n` +
                      `👤 <b>អ្នកទទួលប្រាក់៖</b> <b>${tx.userName}</b>\n` +
                      `💵 <b>ចំនួនទឹកប្រាក់៖</b> <b>+${formatMoney(tx.amount, tx.currency)}</b> (${tx.currency})\n` +
                      `📅 <b>កាលបរិច្ឆេទ៖</b> ${tx.date}\n` +
                      `💬 <b>គោលបំណង៖</b> ${tx.note || '-'}\n` +
                      `👑 <b>អ្នកបញ្ចូល៖</b> ${tx.createdBy || 'Admin'}\n` +
                      `━━━━━━━━━━━━━━━━━━━━`;
        } else {
            message = `📤 <b>[កាបូបលុយ] ការកត់ត្រាចំណាយជាក់ស្តែង</b>\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `🌾 <b>កសិដ្ឋាន៖</b> ${farmName}\n` +
                      `👤 <b>អ្នកចំណាយ៖</b> <b>${tx.userName}</b>\n` +
                      `💸 <b>ចំនួនទឹកប្រាក់៖</b> <b>-${formatMoney(tx.amount, tx.currency)}</b> (${tx.currency})\n` +
                      `🗂️ <b>ប្រភេទចំណាយ៖</b> ${tx.category || '-'}\n` +
                      (tx.payee ? `🏪 <b>អ្នកទទួល/ហាង៖</b> ${tx.payee}\n` : '') +
                      `📅 <b>កាលបរិច្ឆេទ៖</b> ${tx.date}\n` +
                      (tx.note ? `💬 <b>កំណត់សម្គាល់៖</b> ${tx.note}\n` : '') +
                      `━━━━━━━━━━━━━━━━━━━━`;
        }

        // If receipt photo is present and is a base64 string, upload as multipart photo
        if (tx.receiptUrl && tx.receiptUrl.startsWith('data:image')) {
            try {
                const blob = await (await fetch(tx.receiptUrl)).blob();
                const formData = new FormData();
                formData.append('chat_id', chatId);
                formData.append('caption', message);
                formData.append('parse_mode', 'HTML');
                formData.append('photo', blob, 'receipt.jpg');

                await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                    method: 'POST',
                    body: formData
                });
                return;
            } catch (errPhoto) {
                console.warn('Failed to send Telegram photo, falling back to text:', errPhoto);
            }
        }

        // Otherwise send text message
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

    } catch (err) {
        console.warn('Telegram wallet alert dispatch skipped:', err);
    }
}
