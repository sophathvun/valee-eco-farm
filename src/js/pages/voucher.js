// src/js/pages/voucher.js - Payment Voucher & Telegram Dispatch Controller

(function() {
    'use strict';

    // In-memory state
    let activeVoucherUser = null;
    let compressedReceiptDataUrl = null;
    let cachedVoucherUsers = [];

    // Default 5 users if none exist in Firebase
    const DEFAULT_VOUCHER_USERS = [
        { id: 'pv_user_1', name: 'User 1 (បុគ្គលិក ១)', pin: '1111', role: 'Payment Staff', active: true },
        { id: 'pv_user_2', name: 'User 2 (បុគ្គលិក ២)', pin: '2222', role: 'Payment Staff', active: true },
        { id: 'pv_user_3', name: 'User 3 (បុគ្គលិក ៣)', pin: '3333', role: 'Payment Staff', active: true },
        { id: 'pv_user_4', name: 'User 4 (បុគ្គលិក ៤)', pin: '4444', role: 'Payment Staff', active: true },
        { id: 'pv_user_5', name: 'User 5 (បុគ្គលិក ៥)', pin: '5555', role: 'Payment Staff', active: true }
    ];

    // ==========================================
    // INITIALIZATION
    // ==========================================
    window.initVoucher = async function() {
        try {
            await ensureVoucherUsersSeeded();
            await loadVoucherCategories();
            setupDefaultDateTime();
            generateNextVoucherNo();
            calcVoucherConversion();
            checkRememberedUser();
            loadRecentVouchers();
        } catch (err) {
            console.error('Error initializing voucher page:', err);
        }
    };

    // Ensure 5 default users are seeded in DB if table is empty
    async function ensureVoucherUsersSeeded() {
        try {
            if (typeof db !== 'undefined' && db.voucherUsers) {
                const list = await db.voucherUsers.toArray();
                if (!list || list.length === 0) {
                    for (const u of DEFAULT_VOUCHER_USERS) {
                        await db.voucherUsers.add(u);
                    }
                    cachedVoucherUsers = DEFAULT_VOUCHER_USERS;
                } else {
                    cachedVoucherUsers = list;
                }
            } else {
                cachedVoucherUsers = DEFAULT_VOUCHER_USERS;
            }
        } catch (e) {
            console.warn('Could not read voucherUsers from DB, using defaults:', e);
            cachedVoucherUsers = DEFAULT_VOUCHER_USERS;
        }
    }

    // Load expense categories into select
    async function loadVoucherCategories() {
        const select = document.getElementById('pv-category');
        if (!select) return;

        let categories = [];
        try {
            if (typeof db !== 'undefined' && db.categories) {
                const all = await db.categories.toArray();
                categories = all.filter(c => c.type === 'expense' || !c.type);
            }
        } catch (e) {
            console.warn('Could not load categories from db:', e);
        }

        // Default fallbacks if no categories in DB yet
        if (categories.length === 0) {
            categories = [
                { name: 'ជី និងថ្នាំកសិកម្ម' },
                { name: 'ចំណីសត្វ' },
                { name: 'ប្រេងឥន្ធនៈ' },
                { name: 'ថ្លៃឈ្នួលពលកម្ម' },
                { name: 'ជួសជុល និងសម្ភារៈ' },
                { name: 'ម្ហូបអាហារ និងទឹក' },
                { name: 'ថ្លៃដឹកជញ្ជូន' },
                { name: 'ចំណាយទូទៅ / ផ្សេងៗ' }
            ];
        }

        const currentVal = select.value;
        const defaultPrompt = (typeof t === 'function') ? t('pv_select_category', '-- ជ្រើសរើសប្រភេទចំណាយ --') : '-- ជ្រើសរើសប្រភេទចំណាយ --';
        select.innerHTML = `<option value="" disabled selected data-i18n="pv_select_category">${defaultPrompt}</option>`;
        categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;
            opt.textContent = c.name;
            select.appendChild(opt);
        });

        if (currentVal) select.value = currentVal;
    }

    // Set today's date and current time & initialize premium Flatpickr calendar
    function setupDefaultDateTime() {
        const dateInput = document.getElementById('pv-date');
        const timeInput = document.getElementById('pv-time');
        const now = new Date();

        if (timeInput && !timeInput.value) {
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            timeInput.value = `${hh}:${min}`;
        }

        if (dateInput) {
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;

            if (typeof flatpickr !== 'undefined') {
                if (dateInput._flatpickr) {
                    try { dateInput._flatpickr.destroy(); } catch (e) {}
                }
                flatpickr(dateInput, {
                    dateFormat: 'Y-m-d',
                    altInput: true,
                    altFormat: 'd-m-Y',
                    allowInput: true,
                    disableMobile: true,
                    defaultDate: dateInput.value || todayStr
                });
            } else if (!dateInput.value) {
                dateInput.value = todayStr;
            }
        }
    }

    // Generate auto voucher number: PV-YYYYMM-XXXX
    async function generateNextVoucherNo() {
        const displayBadge = document.getElementById('pv-display-voucher-no');
        const hiddenInput = document.getElementById('pv-voucher-no');
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `PV-${yyyy}${mm}-`;

        let count = 1;
        try {
            if (typeof db !== 'undefined' && db.paymentVouchers) {
                const all = await db.paymentVouchers.toArray();
                const thisMonth = all.filter(v => v.voucherNo && v.voucherNo.startsWith(prefix));
                count = thisMonth.length + 1;
            }
        } catch (e) {
            count = Math.floor(1000 + Math.random() * 9000);
        }

        const seq = String(count).padStart(4, '0');
        const voucherNo = `${prefix}${seq}`;

        if (displayBadge) displayBadge.textContent = `#${voucherNo}`;
        if (hiddenInput) hiddenInput.value = voucherNo;
    }

    // ==========================================
    // USER IDENTIFICATION & PIN
    // ==========================================
    function checkRememberedUser() {
        const authScreen = document.getElementById('pv-auth-screen');
        const mainScreen = document.getElementById('pv-main-screen');
        const activeNameEl = document.getElementById('pv-active-staff-name');

        const savedUserStr = localStorage.getItem('valee_pv_user');
        if (savedUserStr) {
            try {
                const user = JSON.parse(savedUserStr);
                if (user && user.name) {
                    activeVoucherUser = user;
                    if (activeNameEl) activeNameEl.textContent = user.name;
                    if (authScreen) authScreen.style.display = 'none';
                    if (mainScreen) mainScreen.style.display = 'block';
                    return;
                }
            } catch (e) {
                console.warn('Error reading saved voucher user:', e);
            }
        }

        // Show Auth Screen
        activeVoucherUser = null;
        if (authScreen) authScreen.style.display = 'block';
        if (mainScreen) mainScreen.style.display = 'none';
        populateAuthUserSelect();
    }

    function populateAuthUserSelect() {
        const select = document.getElementById('pv-auth-user-select');
        if (!select) return;

        const defaultPrompt = (typeof t === 'function') ? t('pv_select_name_placeholder', '-- សូមជ្រើសរើសឈ្មោះរបស់អ្នក --') : '-- សូមជ្រើសរើសឈ្មោះរបស់អ្នក --';
        select.innerHTML = `<option value="" disabled selected data-i18n="pv_select_name_placeholder">${defaultPrompt}</option>`;
        const users = (cachedVoucherUsers && cachedVoucherUsers.length > 0) ? cachedVoucherUsers : DEFAULT_VOUCHER_USERS;
        users.filter(u => u.active !== false).forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id || u.name;
            opt.textContent = u.name;
            select.appendChild(opt);
        });
    }

    window.handleVoucherUserLogin = function(e) {
        e.preventDefault();
        const select = document.getElementById('pv-auth-user-select');
        const pinInput = document.getElementById('pv-auth-pin');
        const rememberMe = document.getElementById('pv-remember-me');

        const selectedVal = select ? select.value : '';
        const enteredPin = (pinInput ? pinInput.value : '').trim();

        if (!selectedVal) {
            Swal.fire('សូមជ្រើសរើសឈ្មោះ', 'សូមជ្រើសរើសឈ្មោះរបស់អ្នកពីបញ្ជី!', 'warning');
            return;
        }

        if (!enteredPin || enteredPin.length !== 4) {
            Swal.fire('លេខសម្ងាត់មិនត្រឹមត្រូវ', 'សូមវាយលេខសម្ងាត់ PIN ៤ ខ្ទង់!', 'warning');
            return;
        }

        const users = (cachedVoucherUsers && cachedVoucherUsers.length > 0) ? cachedVoucherUsers : DEFAULT_VOUCHER_USERS;
        const matched = users.find(u => (u.id === selectedVal || u.name === selectedVal));

        if (!matched) {
            Swal.fire('រកមិនឃើញគណនី', 'មិនអាចស្វែងរកទិន្នន័យបុគ្គលិកនេះបានទេ!', 'error');
            return;
        }

        if (matched.pin !== enteredPin) {
            Swal.fire('លេខ PIN មិនត្រឹមត្រូវ', 'លេខកូដសម្ងាត់ ៤ ខ្ទង់ដែលអ្នកបានវាយមិនត្រឹមត្រូវទេ! សូមព្យាយាមម្ដងទៀត។', 'error');
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
            return;
        }

        // Success!
        activeVoucherUser = {
            id: matched.id,
            name: matched.name,
            role: matched.role || 'Staff'
        };

        if (rememberMe && rememberMe.checked) {
            localStorage.setItem('valee_pv_user', JSON.stringify(activeVoucherUser));
        } else {
            localStorage.removeItem('valee_pv_user');
        }

        const authScreen = document.getElementById('pv-auth-screen');
        const mainScreen = document.getElementById('pv-main-screen');
        const activeNameEl = document.getElementById('pv-active-staff-name');

        if (activeNameEl) activeNameEl.textContent = activeVoucherUser.name;
        if (authScreen) authScreen.style.display = 'none';
        if (mainScreen) mainScreen.style.display = 'block';

        if (pinInput) pinInput.value = '';

        Swal.fire({
            icon: 'success',
            title: `ស្វាគមន៍ ${activeVoucherUser.name}!`,
            text: 'ការផ្ទៀងផ្ទាត់ជោគជ័យ អ្នកអាចចាប់ផ្ដើមបំពេញប័ណ្ណទូទាត់ប្រាក់បានហើយ។',
            timer: 1600,
            showConfirmButton: false
        });
    };

    window.switchVoucherUser = function() {
        Swal.fire({
            title: 'ប្ដូរអ្នកប្រើប្រាស់?',
            text: 'តើអ្នកពិតជាចង់ចាកចេញ និងប្ដូរទៅកាន់ឈ្មោះបុគ្គលិកផ្សេងមែនទេ?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'បាទ/ចាស ប្ដូរ',
            cancelButtonText: 'ទេ'
        }).then((res) => {
            if (res.isConfirmed) {
                localStorage.removeItem('valee_pv_user');
                activeVoucherUser = null;
                const authScreen = document.getElementById('pv-auth-screen');
                const mainScreen = document.getElementById('pv-main-screen');
                if (authScreen) authScreen.style.display = 'block';
                if (mainScreen) mainScreen.style.display = 'none';
                populateAuthUserSelect();
            }
        });
    };

    window.togglePinVisibility = function() {
        const pinInput = document.getElementById('pv-auth-pin');
        const eyeIcon = document.getElementById('pv-pin-eye-icon');
        if (!pinInput || !eyeIcon) return;

        if (pinInput.type === 'password') {
            pinInput.type = 'text';
            eyeIcon.className = 'bi bi-eye-slash';
        } else {
            pinInput.type = 'password';
            eyeIcon.className = 'bi bi-eye';
        }
    };

    // ==========================================
    // CURRENCY & CALCULATION
    // ==========================================
    window.onVoucherCurrencyChange = function() {
        const curUsd = document.getElementById('pv-cur-usd');
        const curSymbol = document.getElementById('pv-cur-symbol');
        const isUsd = curUsd && curUsd.checked;

        if (curSymbol) {
            curSymbol.textContent = isUsd ? '$' : '៛';
        }
        calcVoucherConversion();
    };

    window.calcVoucherConversion = function() {
        const amountInput = document.getElementById('pv-amount');
        const curUsd = document.getElementById('pv-cur-usd');
        const noteEl = document.getElementById('pv-conversion-note');
        if (!noteEl) return;

        const isEn = window.i18n && window.i18n.currentLang === 'en';
        const rate = window.sysExchangeRate || 4100;
        const val = amountInput ? parseFloat(amountInput.value) : 0;
        const isUsd = curUsd && curUsd.checked;

        if (!val || isNaN(val) || val <= 0) {
            noteEl.textContent = isEn ? `Exchange Rate $1 = ${rate.toLocaleString()} KHR` : `អត្រាប្តូរប្រាក់ $1 = ${rate.toLocaleString()} ៛`;
            return;
        }

        const ratePrefix = isEn ? 'Rate' : 'អត្រា';
        if (isUsd) {
            const khrEquiv = Math.round(val * rate);
            noteEl.innerHTML = `💵 <b>$${val.toFixed(2)}</b> ≈ <span class="text-danger">${khrEquiv.toLocaleString()} ៛</span> (${ratePrefix}: ${rate.toLocaleString()} ៛)`;
        } else {
            const usdEquiv = (val / rate).toFixed(2);
            noteEl.innerHTML = `💵 <b>${val.toLocaleString()} ៛</b> ≈ <span class="text-danger">$${usdEquiv}</span> (${ratePrefix}: ${rate.toLocaleString()} ៛)`;
        }
    };

    // ==========================================
    // RECEIPT PHOTO COMPRESSION & HANDLING
    // ==========================================
    window.handleReceiptFileSelect = function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            const img = new Image();
            img.onload = function() {
                // Resize to max 1280px maintaining aspect ratio
                const maxDim = 1280;
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG quality 0.8 keeps size under 250KB for fast Telegram/Firestore sync
                compressedReceiptDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                const previewImg = document.getElementById('pv-photo-preview');
                const previewWrap = document.getElementById('pv-photo-preview-wrap');
                const placeholder = document.getElementById('pv-photo-upload-placeholder');

                if (previewImg) previewImg.src = compressedReceiptDataUrl;
                if (previewWrap) previewWrap.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    };

    window.removeReceiptPhoto = function() {
        compressedReceiptDataUrl = null;
        const fileInput = document.getElementById('pv-receipt-input');
        const previewWrap = document.getElementById('pv-photo-preview-wrap');
        const placeholder = document.getElementById('pv-photo-upload-placeholder');

        if (fileInput) fileInput.value = '';
        if (previewWrap) previewWrap.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
    };

    // Helper: Convert DataURL to Blob for Telegram sendPhoto
    function dataURLtoBlob(dataurl) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }

    // ==========================================
    // SAVE PAYMENT VOUCHER & EXPENSE INTEGRATION
    // ==========================================
    window.handleSavePaymentVoucher = async function(e) {
        e.preventDefault();

        if (!activeVoucherUser) {
            Swal.fire('សូមផ្ទៀងផ្ទាត់ឈ្មោះ', 'សូមជ្រើសរើសឈ្មោះ និងវាយលេខ PIN មុនពេលរក្សាទុក!', 'warning');
            checkRememberedUser();
            return;
        }

        const voucherNo = (document.getElementById('pv-voucher-no')?.value || '').trim() || `PV-${Date.now()}`;
        const selectedDate = document.getElementById('pv-date')?.value || new Date().toISOString().split('T')[0];
        const selectedTime = document.getElementById('pv-time')?.value || '12:00';
        const payee = (document.getElementById('pv-payee')?.value || '').trim();
        const category = document.getElementById('pv-category')?.value;
        const amount = parseFloat(document.getElementById('pv-amount')?.value);
        const curUsd = document.getElementById('pv-cur-usd');
        const currency = (curUsd && curUsd.checked) ? 'USD' : 'KHR';
        const methodCash = document.getElementById('pv-method-cash');
        const paymentMethod = (methodCash && methodCash.checked) ? 'Cash' : 'Bank';
        const description = (document.getElementById('pv-description')?.value || '').trim();
        const exchangeRate = window.sysExchangeRate || 4100;

        if (!payee) {
            Swal.fire('ខ្វះទិន្នន័យ', 'សូមបញ្ចូលឈ្មោះអ្នកទទួលប្រាក់ ឬហាងផ្គត់ផ្គង់!', 'warning');
            return;
        }

        if (!category) {
            Swal.fire('ខ្វះទិន្នន័យ', 'សូមជ្រើសរើសប្រភេទចំណាយ!', 'warning');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            Swal.fire('ចំនួនទឹកប្រាក់មិនត្រឹមត្រូវ', 'សូមបញ្ចូលចំនួនទឹកប្រាក់ទូទាត់ឱ្យបានត្រឹមត្រូវ!', 'warning');
            return;
        }

        const saveBtn = document.getElementById('pv-save-btn');
        const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> កំពុងរក្សាទុក និងផ្ញើ Telegram...';
        }

        try {
            // 1. Save to paymentVouchers table
            const pvRecord = {
                voucherNo,
                date: selectedDate,
                time: selectedTime,
                payee,
                category,
                amount,
                currency,
                paymentMethod,
                exchangeRate,
                description,
                receiptPhoto: compressedReceiptDataUrl || null,
                createdBy: activeVoucherUser.name,
                createdByUserId: activeVoucherUser.id,
                createdAt: new Date().toISOString()
            };

            let pvId = null;
            if (typeof db !== 'undefined' && db.paymentVouchers) {
                pvId = await db.paymentVouchers.add(pvRecord);
            }

            // 2. CRITICAL: Automatically record into Expense transactions (db.transactions)
            const expenseNote = description 
                ? `${description} [${voucherNo}] (បញ្ចូលដោយ: ${activeVoucherUser.name})`
                : `[${voucherNo}] បង់ជូន ${payee} (បញ្ចូលដោយ: ${activeVoucherUser.name})`;

            const txRecord = {
                type: 'expense',
                amount: amount,
                currency: currency,
                paymentMethod: paymentMethod, // 'Cash' or 'Bank'
                exchangeRate: exchangeRate,
                date: selectedDate, // The customized date picked by the user!
                category: category,
                note: expenseNote,
                voucherNo: voucherNo,
                voucherId: pvId,
                payee: payee,
                createdBy: activeVoucherUser.name, // ឈ្មោះអ្នកបញ្ចូលទិន្នន័យ!
                createdAt: new Date().toISOString()
            };

            if (typeof db !== 'undefined' && db.transactions) {
                await db.transactions.add(txRecord);
            }

            // 3. Dispatch to Telegram Group (like E-Face)
            await dispatchVoucherTelegramAlert({
                voucherNo,
                date: selectedDate,
                time: selectedTime,
                payee,
                category,
                amount,
                currency,
                paymentMethod,
                exchangeRate,
                description,
                staffName: activeVoucherUser.name,
                photoDataUrl: compressedReceiptDataUrl
            });

            // 4. Show Success Dialog
            await Swal.fire({
                icon: 'success',
                title: 'ជោគជ័យ!',
                html: `
                    <div class="text-start p-2">
                        <div class="alert alert-success py-2 mb-2">
                            <strong>✅ បានកត់ត្រាចូលជាចំណាយ (Expense) ក្នុងប្រព័ន្ធ</strong><br>
                            <strong>✈️ បានផ្ញើដំណឹងចូល Telegram Group រួចរាល់</strong>
                        </div>
                        <ul class="list-unstyled mb-0 small">
                            <li>▫️ <b>លេខប័ណ្ណ:</b> #${voucherNo}</li>
                            <li>▫️ <b>កាលបរិច្ឆេទ:</b> ${formatEngDate(selectedDate)}</li>
                            <li>▫️ <b>អ្នកទទួល:</b> ${escapeHtml(payee)}</li>
                            <li>▫️ <b>ចំនួនទឹកប្រាក់:</b> <span class="text-danger fw-bold">${currency === 'USD' ? '$' + amount.toFixed(2) : amount.toLocaleString() + ' ៛'}</span></li>
                            <li>▫️ <b>អ្នកបញ្ចូល:</b> <span class="text-primary fw-bold">${escapeHtml(activeVoucherUser.name)}</span></li>
                        </ul>
                    </div>
                `,
                confirmButtonText: 'បង្កើតប័ណ្ណថ្មីទៀត (Next Voucher)',
                confirmButtonColor: '#198754'
            });

            // Reset form for next entry
            resetVoucherForm();
            loadRecentVouchers();

            // Refresh dashboard data if loaded in system
            if (typeof loadData === 'function') {
                try { loadData(); } catch(e){}
            }

        } catch (err) {
            console.error('Error saving payment voucher:', err);
            Swal.fire('បរាជ័យក្នុងការរក្សាទុក', err.message || 'មានបញ្ហាមិនអាចរក្សាទុកបាន សូមព្យាយាមម្ដងទៀត!', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnHtml;
            }
        }
    };

    function resetVoucherForm() {
        const payeeInput = document.getElementById('pv-payee');
        const descInput = document.getElementById('pv-description');
        const amountInput = document.getElementById('pv-amount');

        if (payeeInput) payeeInput.value = '';
        if (descInput) descInput.value = '';
        if (amountInput) amountInput.value = '';

        removeReceiptPhoto();
        setupDefaultDateTime();
        generateNextVoucherNo();
        calcVoucherConversion();
    }

    // ==========================================
    // TELEGRAM DISPATCHER (LIKE E-FACE)
    // ==========================================
    async function dispatchVoucherTelegramAlert(data) {
        try {
            let tSettings = {};
            if (typeof db !== 'undefined' && db.telegramSettings) {
                try {
                    tSettings = (await db.telegramSettings.first()) || {};
                } catch (e) {
                    console.warn('Could not read telegramSettings:', e);
                }
            }

            // Bot Token: Use paymentBotToken if provided, else fall back to existing bot token
            const botToken = (tSettings.paymentBotToken && tSettings.paymentBotToken.trim()) ||
                             (tSettings.botToken && tSettings.botToken.trim()) ||
                             '8823338803:AAF8xrTeSo4Up7u5R9L1absAIK-GU-n4_eQ';

            // Chat ID: Must use dedicated paymentChatId for the new Telegram Group!
            // If paymentChatId is not set, fallback to chatId
            const chatId = (tSettings.paymentChatId && tSettings.paymentChatId.trim()) ||
                           (tSettings.chatId && tSettings.chatId.trim());

            if (!chatId) {
                console.warn('Telegram Payment Chat ID is not configured. Skipping Telegram dispatch.');
                return;
            }

            // Currency formatting
            let amountStr = '';
            const rate = data.exchangeRate || 4100;
            if (data.currency === 'USD') {
                const khrVal = Math.round(data.amount * rate);
                amountStr = `$${data.amount.toFixed(2)} (≈ ${khrVal.toLocaleString()} ៛)`;
            } else {
                const usdVal = (data.amount / rate).toFixed(2);
                amountStr = `${data.amount.toLocaleString()} ៛ (≈ $${usdVal})`;
            }

            const methodStr = data.paymentMethod === 'Bank' ? '🏦 ធនាគារ (Bank Transfer)' : '💵 សាច់ប្រាក់សុទ្ធ (Cash)';

            const caption =
`🧾 <b>ប័ណ្ណទូទាត់ប្រាក់ / PAYMENT VOUCHER</b>
━━━━━━━━━━━━━━━━━
▫️ <b>លេខប័ណ្ណ:</b> <code>#${escapeHtml(data.voucherNo)}</code>
▫️ <b>កាលបរិច្ឆេទចំណាយ:</b> ${formatEngDate(data.date)}
▫️ <b>ម៉ោងទូទាត់:</b> ${data.time}
▫️ <b>អ្នកបញ្ចូលទិន្នន័យ:</b> <b>${escapeHtml(data.staffName)}</b> ✍️
▫️ <b>អ្នកទទួលប្រាក់:</b> ${escapeHtml(data.payee)}
▫️ <b>ប្រភេទចំណាយ:</b> ${escapeHtml(data.category)}
▫️ <b>ចំនួនទឹកប្រាក់:</b> <b>${amountStr}</b>
▫️ <b>វិធីទូទាត់:</b> ${methodStr}
▫️ <b>បរិយាយ:</b> ${escapeHtml(data.description || 'គ្មាន')}
━━━━━━━━━━━━━━━━━
✅ <b>បានកត់ត្រាចូលប្រព័ន្ធចំណាយដោយជោគជ័យ</b>`;

            // If receipt photo is attached, send via sendPhoto
            if (data.photoDataUrl) {
                try {
                    const blob = dataURLtoBlob(data.photoDataUrl);
                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    formData.append('photo', blob, `voucher_${data.voucherNo}.jpg`);
                    formData.append('caption', caption);
                    formData.append('parse_mode', 'HTML');

                    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                        method: 'POST',
                        body: formData
                    });
                    const result = await res.json();
                    if (result.ok) {
                        console.log('Telegram photo voucher sent successfully');
                        return;
                    } else {
                        console.warn('Telegram sendPhoto failed, falling back to sendMessage:', result.description);
                    }
                } catch (photoErr) {
                    console.warn('Error in photo send, falling back to text:', photoErr);
                }
            }

            // Fallback: Send formatted text message
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: caption,
                    parse_mode: 'HTML'
                })
            });
            console.log('Telegram text voucher sent successfully');

        } catch (err) {
            console.warn('Error dispatching telegram voucher alert:', err);
        }
    }

    // ==========================================
    // RECENT VOUCHERS LIST
    // ==========================================
    window.toggleRecentVouchers = function() {
        const body = document.getElementById('pv-recent-body');
        const chevron = document.getElementById('pv-recent-chevron');
        if (!body) return;

        if (body.style.display === 'none') {
            body.style.display = 'block';
            if (chevron) chevron.className = 'bi bi-chevron-up text-muted';
            loadRecentVouchers();
        } else {
            body.style.display = 'none';
            if (chevron) chevron.className = 'bi bi-chevron-down text-muted';
        }
    };

    async function loadRecentVouchers() {
        const container = document.getElementById('pv-recent-list');
        if (!container) return;

        try {
            if (typeof db === 'undefined' || !db.paymentVouchers) {
                container.innerHTML = '<div class="text-center text-muted py-2">មិនទាន់មានទិន្នន័យ</div>';
                return;
            }

            const all = await db.paymentVouchers.toArray();
            if (!all || all.length === 0) {
                const emptyText = (typeof t === 'function') ? t('pv_no_records_yet', 'មិនទាន់មានប័ណ្ណទូទាត់នៅឡើយទេ') : 'មិនទាន់មានប័ណ្ណទូទាត់នៅឡើយទេ';
                container.innerHTML = `<div class="text-center text-muted py-3" data-i18n="pv_no_records_yet">${emptyText}</div>`;
                return;
            }

            // Sort descending by date & createdAt
            all.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
            const recent = all.slice(0, 8);

            container.innerHTML = '';
            recent.forEach(v => {
                const amountText = v.currency === 'USD' ? `$${Number(v.amount).toFixed(2)}` : `${Number(v.amount).toLocaleString()} ៛`;
                const item = document.createElement('div');
                item.className = 'list-group-item px-2 py-2 d-flex justify-content-between align-items-center border-bottom';
                item.innerHTML = `
                    <div>
                        <div class="fw-bold text-dark">${escapeHtml(v.payee || 'មិនបញ្ជាក់')} <span class="badge bg-secondary-subtle text-secondary ms-1" style="font-size:0.7rem;">#${v.voucherNo || ''}</span></div>
                        <div class="text-muted" style="font-size: 0.73rem;">
                            📅 ${formatEngDate(v.date)} • 👤 ${escapeHtml(v.createdBy || '')} • 🏷️ ${escapeHtml(v.category || '')}
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-danger">${amountText}</div>
                        <span class="badge bg-success-subtle text-success" style="font-size: 0.65rem;">
                            <i class="bi bi-check2-circle me-1"></i>${v.paymentMethod === 'Bank' ? 'Bank' : 'Cash'}
                        </span>
                    </div>
                `;
                container.appendChild(item);
            });

        } catch (e) {
            console.warn('Error loading recent vouchers:', e);
            container.innerHTML = '<div class="text-center text-muted py-2">មិនអាចទាញយកប្រវត្តិបានទេ</div>';
        }
    }

    // ==========================================
    // UTILITIES
    // ==========================================
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function formatEngDate(dateStr) {
        if (!dateStr) return '';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const mIndex = parseInt(parts[1], 10) - 1;
                return `${parts[2]}-${months[mIndex] || parts[1]}-${parts[0]}`;
            }
        } catch (e) {}
        return dateStr;
    }

    // Re-sync language-specific texts when language is changed
    window.addEventListener('languageChanged', function() {
        calcVoucherConversion();
        const catSelect = document.getElementById('pv-category');
        if (catSelect && catSelect.options[0] && catSelect.options[0].disabled) {
            catSelect.options[0].textContent = (typeof t === 'function') ? t('pv_select_category', '-- ជ្រើសរើសប្រភេទចំណាយ --') : '-- ជ្រើសរើសប្រភេទចំណាយ --';
        }
        const userSelect = document.getElementById('pv-auth-user-select');
        if (userSelect && userSelect.options[0] && userSelect.options[0].disabled) {
            userSelect.options[0].textContent = (typeof t === 'function') ? t('pv_select_name_placeholder', '-- សូមជ្រើសរើសឈ្មោះរបស់អ្នក --') : '-- សូមជ្រើសរើសឈ្មោះរបស់អ្នក --';
        }
        if (typeof applyTranslations === 'function') {
            const container = document.getElementById('voucher-page-container');
            if (container) applyTranslations(container);
        }
    });

})();
