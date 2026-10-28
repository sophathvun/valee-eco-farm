// ====== CATEGORY MANAGEMENT ======
async function loadCategories() {
    let allCats = await db.categories.toArray();
    let hasGarbled = allCats.some(c => c.name && c.name.includes('Ã¡Å¾'));
    if (hasGarbled) {
        for (let c of allCats) {
            if (c.name.includes('Ã¡Å¾')) await db.categories.delete(c.id);
        }
    }
    let catCount = await db.categories.count();
    if (catCount === 0) {
        const defaults = [
            { type: 'income', name: 'លក់ជ្រូកសាច់' }, { type: 'income', name: 'លក់កូនជ្រូក' },
            { type: 'income', name: 'លក់ជី (លាមកជ្រូក)' }, { type: 'income', name: 'ផ្សេងៗ' },
            { type: 'expense', name: 'ចំណីជ្រូក' }, { type: 'expense', name: 'ថ្នាំសង្កូវ និងវ៉ាក់សាំង' },
            { type: 'expense', name: 'ប្រាក់ខែបុគ្គលិក' }, { type: 'expense', name: 'ថ្លៃទឹក និងភ្លើង' },
            { type: 'expense', name: 'ថ្លៃដឹកជញ្ជូន' }, { type: 'expense', name: 'ទិញកូនជ្រូក' },
            { type: 'expense', name: 'ផ្សេងៗ' }
        ];
        await db.categories.bulkAdd(defaults);
    }
    
    const allCategories = await db.categories.toArray();
    const incomeCats = allCategories.filter(c => c.type === 'income');
    const expenseCats = allCategories.filter(c => c.type === 'expense');

    const incSelect = document.getElementById('inc-category');
    const invIncSelect = document.getElementById('inv-income-category');
    incSelect.innerHTML = '';
    invIncSelect.innerHTML = '';
    incomeCats.forEach(c => {
        incSelect.appendChild(new Option(c.name, c.name));
        invIncSelect.appendChild(new Option(c.name, c.name));
    });

    const expSelect = document.getElementById('exp-category');
    expSelect.innerHTML = '';
    expenseCats.forEach(c => {
        expSelect.appendChild(new Option(c.name, c.name));
    });

    const incList = document.getElementById('incCatList');
    incList.innerHTML = '';
    incomeCats.forEach(c => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${c.name}</span><div><button class="btn btn-sm btn-outline-primary btn-edit me-1" onclick="editCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button><button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteCategory(${c.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></div>`;
        incList.appendChild(li);
    });

    const expList = document.getElementById('expCatList');
    expList.innerHTML = '';
    expenseCats.forEach(c => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${c.name}</span><div><button class="btn btn-sm btn-outline-primary btn-edit me-1" onclick="editCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button><button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteCategory(${c.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></div>`;
        expList.appendChild(li);
    });
}

// ====== PREPARER MANAGEMENT ======
async function loadPreparers() {
    let allPrep = await db.preparers.toArray();
    let hasGarbled = allPrep.some(p => p.name && p.name.includes('Ã¡Å¾'));
    if (hasGarbled) {
        for (let p of allPrep) {
            if (p.name.includes('Ã¡Å¾')) await db.preparers.delete(p.id);
        }
    }
    let pCount = await db.preparers.count();
    if (pCount === 0) {
        await db.preparers.bulkAdd([{name: 'សុខ សាន្ត'}]);
    }
    const all = await db.preparers.toArray();
    
    // Populate list in Settings
    const list = document.getElementById('preparerList');
    if (list) {
        list.innerHTML = '';
        all.forEach(p => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `<span>${p.name}</span><div><button class="btn btn-sm btn-outline-primary btn-edit me-1" onclick="editPreparer(${p.id}, '${p.name.replace(/'/g, "\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button><button class="btn btn-sm btn-outline-danger btn-delete" onclick="deletePreparer(${p.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button></div>`;
            list.appendChild(li);
        });
    }

    // Populate Dropdown in Reports
    const select = document.getElementById('filterPreparer');
    if (select) {
        const currentVal = select.value || localStorage.getItem('sysPreparer') || all[0]?.name; 
        select.innerHTML = all.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
        if (currentVal && all.some(p => p.name === currentVal)) {
            select.value = currentVal;
        } else if (all.length > 0) {
            select.value = all[0].name;
        }
        updatePreparerName();
    }
}

window.updatePreparerName = function() {
    const prepName = document.getElementById('filterPreparer')?.value || '';
    document.querySelectorAll('.sys-preparer').forEach(el => el.textContent = prepName);
    localStorage.setItem('sysPreparer', prepName);
}

document.getElementById('addPreparerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.preparers.add({ name: document.getElementById('newPrepName').value });
    document.getElementById('newPrepName').value = '';
    Swal.fire({icon: 'success', text: 'បញ្ចូលអ្នករៀបចំជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
    loadPreparers();
});

async function editPreparer(id, oldName) {
    const newName = prompt('សូមបញ្ចូលឈ្មោះអ្នករៀបចំរបាយការណ៍ថ្មី', oldName);
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        await db.preparers.update(id, { name: newName.trim() });
        Swal.fire({icon: 'success', text: 'កែប្រែអ្នករៀបចំជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadPreparers();
    }
}

async function deletePreparer(id) {
    const res = await Swal.fire({title: 'បញ្ជាក់', text: 'តើអ្នកពិតជាចង់លុបឈ្មោះនេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'យល់ព្រម', cancelButtonText: 'បោះបង់'});
    if (res.isConfirmed) {
        await db.preparers.delete(id);
        Swal.fire({icon: 'success', text: 'លុបអ្នករៀបចំជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadPreparers();
    }
}

window.switchSettingsTab = function(tabId) {
    if (!tabId) tabId = 'categories';
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.style.display = 'none';
    });
    const targetTab = document.getElementById(`settings-${tabId}-tab`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
    
    // load specific data based on tab
    if (tabId === 'categories') {
        loadCategories();
        loadUnits();
    }
    if (tabId === 'preparers') loadPreparers();
    if (tabId === 'roles') loadRoles();
    if (tabId === 'permissions') loadRolesForPerms();
    if (tabId === 'users') loadUsersAndRoles();
    if (tabId === 'branding') loadBranding();
    if (tabId === 'emp_structure') {
        loadDepartments();
        loadPositions();
    }
    if (tabId === 'shifts') {
        loadShifts();
    }
    if (tabId === 'telegram') {
        if (typeof loadTelegramSettings === 'function') loadTelegramSettings();
    }
    if (tabId === 'gps') {
        if (typeof loadGpsSettings === 'function') loadGpsSettings();
    }
}

// ====== SHIFT MANAGEMENT ======
async function loadShifts() {
    const shiftSettings = await db.workShifts.first() || { morningIn: '07:00', morningOut: '11:00', afternoonIn: '13:00', afternoonOut: '17:00' };
    document.getElementById('morningIn').value = shiftSettings.morningIn;
    document.getElementById('morningOut').value = shiftSettings.morningOut;
    document.getElementById('afternoonIn').value = shiftSettings.afternoonIn;
    document.getElementById('afternoonOut').value = shiftSettings.afternoonOut;
}

document.getElementById('shiftsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '...';
    btn.disabled = true;
    
    const settings = {
        morningIn: document.getElementById('morningIn').value,
        morningOut: document.getElementById('morningOut').value,
        afternoonIn: document.getElementById('afternoonIn').value,
        afternoonOut: document.getElementById('afternoonOut').value
    };
    
    try {
        const existing = await db.workShifts.first();
        if (existing) {
            await db.workShifts.update(existing.id, settings);
        } else {
            await db.workShifts.add(settings);
        }
        Swal.fire({icon: 'success', text: 'រក្សាទុកការកំណត់ម៉ោងធ្វើការជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
    } catch (error) {
        Swal.fire({icon: 'error', text: 'បរាជ័យក្នុងការរក្សាទុក!', confirmButtonText: 'យល់ព្រម'});
    }
    
    btn.innerHTML = oldHtml;
    btn.disabled = false;
});

// ====== USER MANAGEMENT ======
let editingUserId = null;

async function loadUsersAndRoles() {
    if (typeof initUserPhotoFeatures === 'function') {
        initUserPhotoFeatures();
    }
    const roles = await db.roles.toArray();
    const roleSelect = document.getElementById('newUserRole');
    if (roleSelect) {
        roleSelect.innerHTML = '<option value="">-- សូមជ្រើសរើសតួនាទី --</option>';
        roles.forEach(r => {
            roleSelect.appendChild(new Option(r.name, r.id));
        });
    }
    
    const allUsers = await db.users.toArray();
    const tbody = document.getElementById('userListTable');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Identify the original admin (the one with the lowest ID)
    const admins = allUsers.filter(u => u && u.username && u.username.toLowerCase() === 'admin');
    admins.sort((a,b) => a.id - b.id);
    const originalAdminId = admins.length > 0 ? admins[0].id : null;
    
    allUsers.forEach(u => {
        const tr = document.createElement('tr');
        let roleName = 'N/A';
        if (u.roleId) {
            const r = roles.find(ro => ro.id == u.roleId);
            if (r) roleName = r.name;
        } else if (u && u.username && u.username.toLowerCase() === 'admin') {
            roleName = 'Admin';
        }
        
        const isOriginalAdmin = (u.id === originalAdminId);
        const isChecked = u.isActive !== false ? 'checked' : '';
        const disabled = isOriginalAdmin ? 'disabled' : '';
        
        let statusToggle = `
            <div class="form-check form-switch d-flex justify-content-center align-items-center mb-0">
                <input class="form-check-input" type="checkbox" ${isChecked} ${disabled} onchange="toggleUserStatus(${u.id}, this.checked)" style="transform: scale(1.2); cursor: pointer;">
            </div>
        `;

        const onlineBadge = u.isOnline 
            ? '<span class="badge bg-success ms-2" style="font-size: 0.65em; padding: 0.35em 0.5em;"><i class="bi bi-circle-fill me-1" style="font-size:0.7em;"></i>Online</span>' 
            : '<span class="badge bg-secondary ms-2" style="font-size: 0.65em; padding: 0.35em 0.5em;"><i class="bi bi-circle me-1" style="font-size:0.7em;"></i>Offline</span>';

        const photoHtml = u.photo 
            ? `<img src="${u.photo}" class="rounded-circle border shadow-sm" style="width: 38px; height: 38px; object-fit: cover;">`
            : `<div class="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center fw-bold shadow-sm" style="width: 38px; height: 38px; font-size: 14px;">${(u.username || 'U').charAt(0).toUpperCase()}</div>`;

        tr.innerHTML = `
            <td class="align-middle text-center p-1">${photoHtml}</td>
            <td class="fw-bold align-middle text-start text-dark">
                ${u.fullname || '-'}
            </td>
            <td class="align-middle text-start">
                <div class="d-flex align-items-center">
                    <span class="fw-semibold">${u.username || 'Unknown'}</span> ${onlineBadge}
                </div>
            </td>
            <td class="align-middle text-start font-monospace small text-muted">${u.phone || '-'}</td>
            <td class="align-middle"><span class="badge bg-primary">${roleName}</span></td>
            <td class="align-middle">${statusToggle}</td>
            <td class="align-middle">
                ${!isOriginalAdmin ? `
                    <button class="btn btn-sm btn-outline-warning btn-edit" onclick="editUser(${u.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                    <button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteUser(${u.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
                ` : '<span class="text-muted">No actions</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Fast Image Compression Helper (<50ms via native hardware acceleration)
async function compressImageFast(file, maxDim = 250, quality = 0.8) {
    if (typeof window.createImageBitmap === 'function') {
        try {
            const bitmap = await window.createImageBitmap(file, {
                resizeWidth: maxDim,
                resizeHeight: maxDim,
                resizeQuality: 'medium'
            });
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(bitmap, 0, 0);
            bitmap.close();
            return canvas.toDataURL('image/jpeg', quality);
        } catch (e) {
            console.warn('createImageBitmap resize fallback:', e);
        }
    }

    // High-speed Fallback using Blob ObjectURL (avoids huge FileReader base64)
    return new Promise((resolve, reject) => {
        const blobUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onerror = (e) => {
            URL.revokeObjectURL(blobUrl);
            reject(e);
        };
        img.onload = () => {
            try {
                let { width, height } = img;
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
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(blobUrl);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } catch (err) {
                URL.revokeObjectURL(blobUrl);
                reject(err);
            }
        };
        img.src = blobUrl;
    });
}

// ====== USER PHOTO CROPPER & COMPRESSION (400x400 WebP < 40KB) ======
window.currentUserPhotoBase64 = null;
let userPhotoCropperInstance = null;
let userCropModalInstance = null;
let userCropCurrentBlobUrl = null;
let userCropDebounceTimer = null;

window.openUserPhotoCropper = function(fileOrBlob) {
    if (!fileOrBlob) return;
    if (fileOrBlob.type && !fileOrBlob.type.startsWith('image/')) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'warning', title: 'សូមជ្រើសរើសជារូបភាព', text: 'ឯកសារដែលបានជ្រើសរើសមិនមែនជារូបភាពទេ។' });
        }
        return;
    }

    const modalEl = document.getElementById('userPhotoCropModal');
    if (!modalEl) {
        console.warn('userPhotoCropModal element not found');
        return;
    }

    if (userCropCurrentBlobUrl) {
        URL.revokeObjectURL(userCropCurrentBlobUrl);
    }
    userCropCurrentBlobUrl = URL.createObjectURL(fileOrBlob);

    const imgEl = document.getElementById('userCropperImage');
    if (imgEl) {
        imgEl.src = userCropCurrentBlobUrl;
    }

    if (typeof bootstrap !== 'undefined') {
        if (!userCropModalInstance) {
            userCropModalInstance = new bootstrap.Modal(modalEl);
        }
        userCropModalInstance.show();
    }
};

function renderUserCropLivePreview() {
    clearTimeout(userCropDebounceTimer);
    userCropDebounceTimer = setTimeout(() => {
        if (!userPhotoCropperInstance) return;
        const canvas = userPhotoCropperInstance.getCroppedCanvas({
            width: 100,
            height: 100,
            imageSmoothingQuality: 'medium'
        });
        if (!canvas) return;
        const liveCanvas = document.getElementById('userCropLiveCanvas');
        if (liveCanvas) {
            const ctx = liveCanvas.getContext('2d');
            ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
            ctx.drawImage(canvas, 0, 0, liveCanvas.width, liveCanvas.height);
        }
    }, 60);
}

async function applyUserCrop() {
    if (!userPhotoCropperInstance) return;
    const applyBtn = document.getElementById('btnApplyUserCrop');
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងដំណើរការ...';
    }

    try {
        const croppedCanvas = userPhotoCropperInstance.getCroppedCanvas({
            width: 400,
            height: 400,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        if (!croppedCanvas) {
            throw new Error('មិនអាចទាញយកទិន្នន័យរូបភាពពី Cropper បានទេ');
        }

        // Draw onto opaque canvas (white background for any transparency)
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = 400;
        finalCanvas.height = 400;
        const ctx = finalCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(croppedCanvas, 0, 0, 400, 400);

        // Compress to WebP (with fallback to jpeg)
        let quality = 0.88;
        let format = 'image/webp';
        let dataUrl = finalCanvas.toDataURL(format, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
            format = 'image/jpeg';
            dataUrl = finalCanvas.toDataURL(format, quality);
        }

        // Measure byte size in KB
        let sizeKb = Math.round((dataUrl.length * 3 / 4) / 1024 * 10) / 10;

        // Step down quality iteratively until < 40KB (target <= 38.5KB)
        while (sizeKb > 38.5 && quality > 0.3) {
            quality -= 0.08;
            dataUrl = finalCanvas.toDataURL(format, quality);
            sizeKb = Math.round((dataUrl.length * 3 / 4) / 1024 * 10) / 10;
        }

        if (sizeKb > 39.5) {
            dataUrl = finalCanvas.toDataURL(format, 0.25);
            sizeKb = Math.round((dataUrl.length * 3 / 4) / 1024 * 10) / 10;
        }

        // Update preview and state
        window.currentUserPhotoBase64 = dataUrl;
        const previewImg = document.getElementById('userPhotoPreview');
        if (previewImg) previewImg.src = dataUrl;

        const removeBtn = document.getElementById('btnRemoveUserPhoto');
        if (removeBtn) removeBtn.classList.remove('d-none');

        const statusTxt = document.getElementById('userPhotoStatus');
        if (statusTxt) {
            statusTxt.innerHTML = `<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i>400x400px (${sizeKb} KB - WebP) រួចរាល់</span>`;
        }

        // Hide modal
        if (userCropModalInstance) {
            userCropModalInstance.hide();
        } else {
            const modalEl = document.getElementById('userPhotoCropModal');
            if (modalEl && typeof bootstrap !== 'undefined') {
                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();
            }
        }
    } catch (err) {
        console.error('Error applying user crop:', err);
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'បរាជ័យ', text: 'មានបញ្ហាក្នុងការកាត់រូបភាព៖ ' + err.message });
        }
    } finally {
        if (applyBtn) {
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<i class="fas fa-check me-1"></i> កាត់ និងរក្សាទុក (Crop & Save)';
        }
    }
}

window.previewUserPhoto = function(event) {
    const file = event.target.files && event.target.files[0];
    if (file) {
        openUserPhotoCropper(file);
    }
    event.target.value = '';
};

window.removeUserPhoto = function() {
    window.currentUserPhotoBase64 = null;
    const previewImg = document.getElementById('userPhotoPreview');
    const removeBtn = document.getElementById('btnRemoveUserPhoto');
    const fileInput = document.getElementById('newUserPhoto');
    const statusTxt = document.getElementById('userPhotoStatus');
    const spinner = document.getElementById('userPhotoSpinner');
    if (fileInput) fileInput.value = '';
    if (previewImg) previewImg.src = 'assets/images/default-avatar.png';
    if (removeBtn) removeBtn.classList.add('d-none');
    if (spinner) spinner.classList.add('d-none');
    if (statusTxt) {
        statusTxt.innerHTML = 'ទំហំ 400x400px • WebP &lt; 40KB';
        statusTxt.className = 'text-muted d-block mt-1';
    }
};

function initUserPhotoFeatures() {
    if (window._userPhotoFeaturesInitialized) return;
    const dropzone = document.getElementById('userPhotoDropzone');
    const modalEl = document.getElementById('userPhotoCropModal');
    if (!dropzone || !modalEl) return;
    window._userPhotoFeaturesInitialized = true;

    // Modal lifecycle
    modalEl.addEventListener('shown.bs.modal', () => {
        const imgEl = document.getElementById('userCropperImage');
        if (userPhotoCropperInstance) {
            userPhotoCropperInstance.destroy();
            userPhotoCropperInstance = null;
        }
        if (typeof Cropper !== 'undefined' && imgEl) {
            userPhotoCropperInstance = new Cropper(imgEl, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.9,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                crop: () => {
                    renderUserCropLivePreview();
                }
            });
            setTimeout(renderUserCropLivePreview, 150);
        }
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
        if (userPhotoCropperInstance) {
            userPhotoCropperInstance.destroy();
            userPhotoCropperInstance = null;
        }
        if (userCropCurrentBlobUrl) {
            URL.revokeObjectURL(userCropCurrentBlobUrl);
            userCropCurrentBlobUrl = null;
        }
        const imgEl = document.getElementById('userCropperImage');
        if (imgEl) imgEl.src = '';
    });

    // Cropper Controls
    document.getElementById('userCropRotateLeft')?.addEventListener('click', () => {
        if (userPhotoCropperInstance) {
            userPhotoCropperInstance.rotate(-90);
            renderUserCropLivePreview();
        }
    });
    document.getElementById('userCropRotateRight')?.addEventListener('click', () => {
        if (userPhotoCropperInstance) {
            userPhotoCropperInstance.rotate(90);
            renderUserCropLivePreview();
        }
    });
    document.getElementById('userCropZoomIn')?.addEventListener('click', () => {
        if (userPhotoCropperInstance) {
            userPhotoCropperInstance.zoom(0.1);
            renderUserCropLivePreview();
        }
    });
    document.getElementById('userCropZoomOut')?.addEventListener('click', () => {
        if (userPhotoCropperInstance) {
            userPhotoCropperInstance.zoom(-0.1);
            renderUserCropLivePreview();
        }
    });
    document.getElementById('userCropReset')?.addEventListener('click', () => {
        if (userPhotoCropperInstance) {
            userPhotoCropperInstance.reset();
            renderUserCropLivePreview();
        }
    });
    document.getElementById('btnApplyUserCrop')?.addEventListener('click', applyUserCrop);

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(evtName => {
        dropzone.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = '#0d6efd';
            dropzone.style.backgroundColor = '#e8f0fe';
        }, false);
    });

    ['dragleave', 'drop'].forEach(evtName => {
        dropzone.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.style.borderColor = '#b0c4de';
            dropzone.style.backgroundColor = '#f8fafc';
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type && file.type.startsWith('image/')) {
                openUserPhotoCropper(file);
            } else {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'warning', text: 'សូមទម្លាក់ឯកសារជារូបភាព (Image file) ប៉ុណ្ណោះ' });
                }
            }
        }
    }, false);

    // Paste (Ctrl+V)
    document.addEventListener('paste', (e) => {
        const usersTab = document.getElementById('settings-users-tab');
        if (!usersTab || usersTab.style.display === 'none') return;

        const items = (e.clipboardData || window.clipboardData)?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    openUserPhotoCropper(file);
                    break;
                }
            }
        }
    });
}

// Auto-run features initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserPhotoFeatures);
} else {
    initUserPhotoFeatures();
}

window.cancelEditUser = function() {
    editingUserId = null;
    document.getElementById('addUserForm')?.reset();
    const fnInput = document.getElementById('newFullname');
    if (fnInput) fnInput.value = '';
    const phInput = document.getElementById('newUserPhone');
    if (phInput) phInput.value = '';
    const stCheck = document.getElementById('newUserStatus');
    const stLbl = document.getElementById('newUserStatusLabel');
    if (stCheck) stCheck.checked = true;
    if (stLbl) {
        stLbl.textContent = 'ON';
        stLbl.className = 'form-check-label ms-2 fw-bold text-success';
    }
    removeUserPhoto();
    const btn = document.querySelector('#addUserForm button[type="submit"]');
    if (btn) {
        btn.textContent = 'បង្កើតគណនី';
        btn.classList.replace('btn-warning', 'btn-dark');
    }
    const cancelBtn = document.getElementById('btnCancelEditUser');
    if (cancelBtn) cancelBtn.classList.add('d-none');
};

window.editUser = async function(id) {
    const user = await db.users.get(id);
    if (!user) return;
    
    if (document.getElementById('newFullname')) document.getElementById('newFullname').value = user.fullname || '';
    document.getElementById('newUsername').value = user.username;
    if (document.getElementById('newUserPhone')) document.getElementById('newUserPhone').value = user.phone || '';
    document.getElementById('newUserPassword').value = user.password;
    if (user.roleId) {
        document.getElementById('newUserRole').value = user.roleId;
    }
    
    const statusCheckbox = document.getElementById('newUserStatus');
    const statusLabel = document.getElementById('newUserStatusLabel');
    if (user.isActive === false) {
        statusCheckbox.checked = false;
        statusLabel.textContent = 'OFF';
        statusLabel.className = 'form-check-label ms-2 fw-bold text-danger';
    } else {
        statusCheckbox.checked = true;
        statusLabel.textContent = 'ON';
        statusLabel.className = 'form-check-label ms-2 fw-bold text-success';
    }
    
    editingUserId = id;
    const btn = document.querySelector('#addUserForm button[type="submit"]');
    btn.textContent = 'កែប្រែគណនី (Update)';
    btn.classList.replace('btn-dark', 'btn-warning');
    
    // Populate photo preview & cancel button
    window.currentUserPhotoBase64 = user.photo || null;
    const previewImg = document.getElementById('userPhotoPreview');
    const removeBtn = document.getElementById('btnRemoveUserPhoto');
    const fileInput = document.getElementById('newUserPhoto');
    const statusTxt = document.getElementById('userPhotoStatus');
    if (fileInput) fileInput.value = '';
    if (previewImg) previewImg.src = user.photo || 'assets/images/default-avatar.png';
    if (removeBtn) {
        if (user.photo) removeBtn.classList.remove('d-none');
        else removeBtn.classList.add('d-none');
    }
    if (statusTxt) {
        if (user.photo) {
            statusTxt.innerHTML = '<span class="text-success fw-bold"><i class="fas fa-check-circle me-1"></i>រូបភាព Profile បច្ចុប្បន្ន</span>';
        } else {
            statusTxt.innerHTML = 'ទំហំ 400x400px • WebP &lt; 40KB';
        }
    }
    const cancelBtn = document.getElementById('btnCancelEditUser');
    if (cancelBtn) cancelBtn.classList.remove('d-none');
};

document.getElementById('newUserStatus')?.addEventListener('change', (e) => {
    const lbl = document.getElementById('newUserStatusLabel');
    if (e.target.checked) {
        lbl.textContent = 'ON';
        lbl.className = 'form-check-label ms-2 fw-bold text-success';
    } else {
        lbl.textContent = 'OFF';
        lbl.className = 'form-check-label ms-2 fw-bold text-danger';
    }
});

document.getElementById('addUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('btnSaveUser');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងរក្សាទុក... (Saving...)';
    }
    try {
        const fullname = (document.getElementById('newFullname')?.value || '').trim();
        const username = document.getElementById('newUsername').value.trim();
        const phone = (document.getElementById('newUserPhone')?.value || '').trim();
        const password = document.getElementById('newUserPassword').value.trim();
        const roleId = document.getElementById('newUserRole').value;
        const isActive = document.getElementById('newUserStatus').checked;
        const photo = window.currentUserPhotoBase64 || null;

        if (!roleId) {
            Swal.fire({icon: 'info', text: 'សូមជ្រើសរើសតួនាទី!', confirmButtonText: 'យល់ព្រម'});
            return;
        }

        if (editingUserId) {
            const exists = await db.users.where('username').equalsIgnoreCase(username).first();
            if (exists && exists.id !== editingUserId) {
                Swal.fire({icon: 'info', text: 'ឈ្មោះគណនីនេះមានរួចហើយ!', confirmButtonText: 'យល់ព្រម'});
                return;
            }
            await db.users.update(editingUserId, { fullname, username, phone, password, roleId: parseInt(roleId), isActive, photo });
            try {
                const cur = JSON.parse(localStorage.getItem('currentUser') || 'null');
                if (cur && cur.id === editingUserId) {
                    cur.fullname = fullname;
                    cur.username = username;
                    cur.phone = phone;
                    cur.photo = photo;
                    localStorage.setItem('currentUser', JSON.stringify(cur));
                    if (window.currentUser) {
                        window.currentUser.fullname = fullname;
                        window.currentUser.username = username;
                        window.currentUser.phone = phone;
                        window.currentUser.photo = photo;
                    }
                    if (typeof window.updateTopNavbarUser === 'function') {
                        window.updateTopNavbarUser(cur);
                    }
                }
            } catch(ex){}
            Swal.fire({icon: 'info', text: 'កែប្រែគណនីបានជោគជ័យ!', confirmButtonText: 'យល់ព្រម'});
        } else {
            const exists = await db.users.where('username').equalsIgnoreCase(username).count();
            if (exists > 0) {
                Swal.fire({icon: 'info', text: 'ឈ្មោះគណនីនេះមានរួចហើយ!', confirmButtonText: 'យល់ព្រម'});
                return;
            }
            await db.users.add({ fullname, username, phone, password, roleId: parseInt(roleId), isActive, photo });
            Swal.fire({icon: 'info', text: 'បង្កើតគណនីបានជោគជ័យ!', confirmButtonText: 'យល់ព្រម'});
        }

        cancelEditUser();
        loadUsersAndRoles();
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            if (editingUserId) {
                saveBtn.textContent = 'កែប្រែគណនី (Update)';
            } else {
                saveBtn.textContent = 'បង្កើតគណនី';
            }
        }
    }
});

window.toggleUserStatus = async function(id, isActive) {
    try {
        await db.users.update(id, { isActive });
        // Optional: show a small toast, but doing it silently is fine since UI updates immediately
    } catch (error) {
        console.error('Error toggling user status:', error);
        loadUsersAndRoles(); // revert UI if failed
    }
};

window.deleteUser = async function(id) {
    const res = await Swal.fire({title: 'បញ្ជាក់', text: 'តើអ្នកពិតជាចង់លុបគណនីនេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'យល់ព្រម', cancelButtonText: 'បោះបង់'});
    if (res.isConfirmed) {
        await db.users.delete(id);
        loadUsersAndRoles();
    }
};

// ====== ROLE MANAGEMENT ======
async function loadRoles() {
    let roles = await db.roles.toArray();
    if (roles.length === 0) {
        await db.roles.bulkAdd([
            { name: 'Admin', permissions: ['dashboard', 'invoice_add', 'invoice_list', 'income', 'expense', 'reports', 'settings', 'employee_manage', 'perm_add', 'perm_edit', 'perm_delete'] },
            { name: 'Manager', permissions: ['dashboard', 'invoice_list', 'income', 'expense', 'reports', 'employee_manage', 'perm_add', 'perm_edit'] },
            { name: 'Staff', permissions: ['dashboard', 'invoice_add', 'invoice_list', 'income', 'expense', 'perm_add'] }
        ]);
        roles = await db.roles.toArray();
    }
    const ul = document.getElementById('roleList');
    if (!ul) return;
    ul.innerHTML = '';
    roles.forEach(r => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${r.name}</span>
            <div>
                ${(r && r.name && r.name.toLowerCase() !== 'admin') ? `
                <button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteRole(${r.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
                ` : `<span class="badge bg-secondary">មិនអាចលុបបាន</span>`}
            </div>`;
        ul.appendChild(li);
    });
}

document.getElementById('addRoleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newRoleName').value.trim();
    if(name) {
        await db.roles.add({ name, permissions: [] });
        document.getElementById('newRoleName').value = '';
        loadRoles();
    }
});

window.deleteRole = async function(id) {
    const res = await Swal.fire({title: 'បញ្ជាក់', text: 'តើអ្នកពិតជាចង់លុបតួនាទីនេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'យល់ព្រម'});
    if(res.isConfirmed) {
        await db.roles.delete(id);
        loadRoles();
    }
}

// ====== PERMISSIONS MANAGEMENT ======
async function loadRolesForPerms() {
    const roles = await db.roles.toArray();
    const select = document.getElementById('roleSelectForPerms');
    if(!select) return;
    select.innerHTML = '<option value="">-- សូមជ្រើសរើសតួនាទី --</option>';
    roles.forEach(r => {
        select.appendChild(new Option(r.name, r.id));
    });
}

window.loadPermissionsForRole = async function() {
    const roleId = document.getElementById('roleSelectForPerms').value;
    const container = document.getElementById('rolePermissionsContainer');
    if(!roleId) {
        container.style.display = 'none';
        return;
    }
    
    const role = await db.roles.get(parseInt(roleId));
    if(!role) return;
    
    document.querySelectorAll('.role-perm-checkbox').forEach(cb => {
        cb.checked = (role.permissions || []).includes(cb.value);
        if((role.name || '').toLowerCase() === 'admin') {
            cb.checked = true;
            cb.disabled = true;
        } else {
            cb.disabled = false;
        }
    });
    
    container.style.display = 'block';
}

window.saveRolePermissions = async function() {
    const roleId = document.getElementById('roleSelectForPerms').value;
    if(!roleId) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើសតួនាទីជាមុនសិន!', 'warning');
        return;
    }
    const role = await db.roles.get(parseInt(roleId));
    if((role.name || '').toLowerCase() === 'admin') {
        Swal.fire('បដិសេធ', 'មិនអាចកែប្រែសិទ្ធិ Admin បានទេ!', 'error');
        return;
    }
    
    const perms = [];
    document.querySelectorAll('.role-perm-checkbox:checked').forEach(cb => {
        perms.push(cb.value);
    });
    
    await db.roles.update(parseInt(roleId), { permissions: perms });

    // Sync active session if current user has this role
    try {
        const cur = (typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : null) || JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (cur && String(cur.roleId) === String(roleId)) {
            cur.permissions = perms;
            cur.roleName = role.name;
            localStorage.setItem('currentUser', JSON.stringify(cur));
            window.currentUser = cur;
            if (typeof window.applyPermissions === 'function') {
                window.applyPermissions();
            }
        }
    } catch (e) {}

    Swal.fire('ជោគជ័យ', 'សិទ្ធិត្រូវបានរក្សាទុក!', 'success');
}


document.getElementById('addIncomeCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerHTML;
    btn.innerHTML = '...';
    btn.disabled = true;
    try {
        await db.categories.add({ type: 'income', name: document.getElementById('newIncCatName').value });
        document.getElementById('newIncCatName').value = '';
        Swal.fire({icon: 'success', text: 'បន្ថែមប្រភេទចំណូលជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadCategories();
    } catch(err) {
        Swal.fire({icon: 'error', text: 'បរាជ័យ៖ ' + err.message, confirmButtonText: 'យល់ព្រម'});
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
});

document.getElementById('addExpenseCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const oldText = btn.innerHTML;
    btn.innerHTML = '...';
    btn.disabled = true;
    try {
        await db.categories.add({ type: 'expense', name: document.getElementById('newExpCatName').value });
        document.getElementById('newExpCatName').value = '';
        Swal.fire({icon: 'success', text: 'បន្ថែមប្រភេទចំណាយជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadCategories();
    } catch(err) {
        Swal.fire({icon: 'error', text: 'បរាជ័យ៖ ' + err.message, confirmButtonText: 'យល់ព្រម'});
    } finally {
        btn.innerHTML = oldText;
        btn.disabled = false;
    }
});

document.getElementById('setExchangeRateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const exRate = document.getElementById('setExchangeRate').value;
    if (exRate) {
        localStorage.setItem('sysExchangeRate', exRate);
        window.sysExchangeRate = parseFloat(exRate);
        if(document.getElementById('inc-exchange-rate')) document.getElementById('inc-exchange-rate').value = window.sysExchangeRate;
        if(document.getElementById('exp-exchange-rate')) document.getElementById('exp-exchange-rate').value = window.sysExchangeRate;
        Swal.fire('ជោគជ័យ!', 'អត្រាប្តូរប្រាក់ត្រូវបានរក្សាទុក!', 'success');
        if (typeof loadData === 'function') loadData(); // refresh dashboard if loaded
    }
});

document.getElementById('systemSettingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('setSysPhone').value;
    const exRate = document.getElementById('setExchangeRate') ? document.getElementById('setExchangeRate').value : '';
    const addrKh = document.getElementById('setSysAddrKh').value;
    const addrEn = document.getElementById('setSysAddrEn').value;
    const fileInput = document.getElementById('setSysLogo');
    
    localStorage.setItem('sysPhone', phone);
    if (exRate) localStorage.setItem('sysExchangeRate', exRate);
    localStorage.setItem('sysAddrKh', addrKh);
    localStorage.setItem('sysAddrEn', addrEn);

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            localStorage.setItem('sysLogo', evt.target.result);
            loadSystemSettings();
            Swal.fire('ជោគជ័យ!', 'ការកំណត់ប្រព័ន្ធត្រូវបានរក្សាទុក។', 'success');
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        loadSystemSettings();
        Swal.fire('ជោគជ័យ!', 'ព័ត៌មានកសិដ្ឋានត្រូវបានរក្សាទុក!', 'success');
    }
});

async function editCategory(id, oldName) {
    const res = await Swal.fire({
        title: 'កែប្រែឈ្មោះប្រភេទ',
        input: 'text',
        inputValue: oldName,
        showCancelButton: true,
        confirmButtonText: 'រក្សាទុក',
        cancelButtonText: 'បោះបង់',
        inputValidator: (value) => {
            if (!value || value.trim() === '') return 'សូមបញ្ចូលឈ្មោះប្រភេទថ្មី!';
        }
    });
    if (res.isConfirmed) {
        const newName = res.value;
        if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
            const finalName = newName.trim();
            await db.categories.update(id, { name: finalName });
            const txsToUpdate = await db.transactions.where('category').equals(oldName).toArray();
            for (let tx of txsToUpdate) await db.transactions.update(tx.id, { category: finalName });
            Swal.fire({icon: 'success', text: 'កែប្រែបានជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
            loadCategories(); 
            if(typeof loadData === 'function') loadData();
        }
    }
}

async function deleteCategory(id) {
    const res = await Swal.fire({title: 'បញ្ជាក់', text: 'តើអ្នកពិតជាចង់លុបប្រភេទនេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'យល់ព្រម', cancelButtonText: 'បោះបង់'});
    if (res.isConfirmed) {
        await db.categories.delete(id);
        Swal.fire({icon: 'success', text: 'លុបប្រភេទជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadCategories();
    }
}

// ====== UNIT MANAGEMENT ======
async function loadUnits() {
    let unitCount = await db.units.count();
    if (unitCount === 0) {
        const defaults = [{ name: 'Kg' }, { name: 'ក្បាល' }];
        await db.units.bulkAdd(defaults);
    }
    
    const allUnits = await db.units.toArray();
    const list = document.getElementById('unitList');
    if (list) {
        list.innerHTML = '';
        allUnits.forEach(u => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `<span>${u.name}</span>
            <div>
                <button class="btn btn-sm btn-outline-primary btn-edit me-1" onclick="editUnit(${u.id}, '${u.name.replace(/'/g, "\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                <button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteUnit(${u.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
            </div>`;
            list.appendChild(li);
        });
    }
}

document.getElementById('addUnitForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.units.add({ name: document.getElementById('newUnitName').value });
    document.getElementById('newUnitName').value = '';
    Swal.fire({icon: 'success', text: 'បញ្ចូលឯកតាជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
    loadUnits();
});

async function editUnit(id, oldName) {
    const res = await Swal.fire({
        title: 'កែប្រែឯកតា',
        input: 'text',
        inputValue: oldName,
        showCancelButton: true,
        confirmButtonText: 'រក្សាទុក',
        cancelButtonText: 'បោះបង់',
        inputValidator: (value) => {
            if (!value || value.trim() === '') return 'សូមបញ្ចូលឈ្មោះឯកតាថ្មី!';
        }
    });
    if (res.isConfirmed) {
        const newName = res.value;
        if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
            await db.units.update(id, { name: newName.trim() });
            Swal.fire({icon: 'success', text: 'កែប្រែឯកតាជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
            loadUnits();
        }
    }
}

async function deleteUnit(id) {
    const res = await Swal.fire({title: 'បញ្ជាក់', text: 'តើអ្នកពិតជាចង់លុបឯកតានេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'យល់ព្រម', cancelButtonText: 'បោះបង់'});
    if (res.isConfirmed) {
        await db.units.delete(id);
        Swal.fire({icon: 'success', text: 'លុបឯកតាជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadUnits();
    }
}

// ====== DEPARTMENT MANAGEMENT ======
async function loadDepartments() {
    const all = await db.departments.toArray();
    const list = document.getElementById('departmentList');
    if (!list) return;
    list.innerHTML = '';
    all.forEach(d => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${d.name}</span><div>
            <button class="btn btn-sm btn-outline-primary btn-edit me-1" onclick="editDepartment(${d.id}, '${d.name.replace(/'/g, "\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
            <button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteDepartment(${d.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
        </div>`;
        list.appendChild(li);
    });
}

document.getElementById('addDepartmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newDepartmentName');
    const name = input.value.trim();
    if (name) {
        await db.departments.add({ name });
        input.value = '';
        Swal.fire({icon: 'success', text: 'បានបញ្ចូលដោយជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadDepartments();
        if (typeof loadDepartmentsForEmp === 'function') loadDepartmentsForEmp();
    }
});

window.editDepartment = async function(id, oldName) {
    const newName = prompt('សូមបញ្ចូលឈ្មោះផ្នែកថ្មី:', oldName);
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        await db.departments.update(id, { name: newName.trim() });
        Swal.fire({icon: 'info', text: 'កែប្រែបានជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadDepartments();
        if (typeof loadDepartmentsForEmp === 'function') loadDepartmentsForEmp();
    }
};

window.deleteDepartment = async function(id) {
    const res = await Swal.fire({title: 'បញ្ជាក់', text: 'តើអ្នកពិតជាចង់លុបផ្នែកនេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonText: 'យល់ព្រម', cancelButtonText: 'បោះបង់', confirmButtonColor: '#d33'});
    if (res.isConfirmed) {
        await db.departments.delete(id);
        loadDepartments();
        if (typeof loadDepartmentsForEmp === 'function') loadDepartmentsForEmp();
    }
};

// ====== POSITION MANAGEMENT ======
async function loadPositions() {
    const all = await db.positions.toArray();
    const list = document.getElementById('positionList');
    if (!list) return;
    list.innerHTML = '';
    all.forEach(p => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `<span>${p.name}</span><div>
            <button class="btn btn-sm btn-outline-primary btn-edit me-1" onclick="editPosition(${p.id}, '${p.name.replace(/'/g, "\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
            <button class="btn btn-sm btn-outline-danger btn-delete" onclick="deletePosition(${p.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
        </div>`;
        list.appendChild(li);
    });
}

document.getElementById('addPositionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newPositionName');
    const name = input.value.trim();
    if (name) {
        await db.positions.add({ name });
        input.value = '';
        Swal.fire({icon: 'success', text: 'បានបញ្ចូលដោយជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadPositions();
        if (typeof loadPositionsForEmp === 'function') loadPositionsForEmp();
    }
});

window.editPosition = async function(id, oldName) {
    const newName = prompt('សូមបញ្ចូលឈ្មោះតួនាទីថ្មី:', oldName);
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        await db.positions.update(id, { name: newName.trim() });
        Swal.fire({icon: 'info', text: 'កែប្រែបានជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadPositions();
        if (typeof loadPositionsForEmp === 'function') loadPositionsForEmp();
    }
};

window.deletePosition = async function(id) {
    const res = await Swal.fire({title: 'បញ្ជាក់', text: 'តើអ្នកពិតជាចង់លុបតួនាទីនេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonText: 'យល់ព្រម', cancelButtonText: 'បោះបង់', confirmButtonColor: '#d33'});
    if (res.isConfirmed) {
        await db.positions.delete(id);
        loadPositions();
        if (typeof loadPositionsForEmp === 'function') loadPositionsForEmp();
    }
};
// Auto-check parent menu if child submenu is checked
document.addEventListener('change', function(e) {
    if (e.target && e.target.classList.contains('role-perm-checkbox')) {
        const val = e.target.value;
        if (e.target.checked) {
            if (val.startsWith('reports_')) document.getElementById('rpermReports').checked = true;
            if (val.startsWith('settings_')) document.getElementById('rpermSettings').checked = true;
        } else {
            // If parent unchecked, uncheck all children
            if (val === 'reports') {
                document.querySelectorAll('.role-perm-checkbox[value^="reports_"]').forEach(cb => cb.checked = false);
            }
            if (val === 'settings') {
                document.querySelectorAll('.role-perm-checkbox[value^="settings_"]').forEach(cb => cb.checked = false);
            }
        }
    }
});

// ==========================================
// Branding Settings
// ==========================================

async function loadBranding() {
    try {
        if (!db.brandSettings) db.brandSettings = new FirebaseStore('brandSettings');
        const brand = await db.brandSettings.get(1);
        if (brand) {
            if (brand.reportLogo) document.getElementById('previewReportLogo').src = brand.reportLogo;
            if (brand.loginLogo) document.getElementById('previewLoginLogo').src = brand.loginLogo;
            if (brand.sidebarLogo) document.getElementById('previewSidebarLogo').src = brand.sidebarLogo;
            if (brand.sidebarLogoDark) document.getElementById('previewSidebarLogoDark').src = brand.sidebarLogoDark;
            if (brand.favicon) document.getElementById('previewFavicon').src = brand.favicon;
            if (brand.mobileIcon) document.getElementById('previewMobileIcon').src = brand.mobileIcon;
        }
        const curLang = localStorage.getItem('sys_lang') || 'km';
        const kmRadio = document.getElementById('setting-lang-km');
        const enRadio = document.getElementById('setting-lang-en');
        if (kmRadio && enRadio) {
            kmRadio.checked = (curLang === 'km');
            enRadio.checked = (curLang === 'en');
        }
    } catch (error) {
        console.error("Error loading branding:", error);
    }
}

// Handle file input changes for previews using event delegation
document.addEventListener('change', function(e) {
    const ids = ['inputReportLogo', 'inputLoginLogo', 'inputSidebarLogo', 'inputSidebarLogoDark', 'inputFavicon', 'inputMobileIcon'];
    if (ids.includes(e.target.id)) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const type = e.target.id.replace('input', '');
                document.getElementById('preview' + type).src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
});

async function compressImage(base64Str, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve) => {
        let img = new Image();
        img.crossOrigin = "Anonymous"; // just in case
        img.onload = () => {
            try {
                let canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }
                canvas.width = Math.max(1, width);
                canvas.height = Math.max(1, height);
                let ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/webp', 0.8));
            } catch (e) {
                console.error("Canvas compression error:", e);
                resolve(base64Str); // Fallback on error
            }
        };
        img.onerror = () => resolve(base64Str); // Fallback
        img.src = base64Str;
    });
}

window.saveBranding = async function() {
    Swal.fire({ title: 'កំពុងរក្សាទុក...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    try {
        if (!db.brandSettings) db.brandSettings = new FirebaseStore('brandSettings');
        const brandData = { id: 1 };
        
        const reportEl = document.getElementById('previewReportLogo');
        if (reportEl) {
            brandData.reportLogo = reportEl.src.includes('assets/images/logo.png') ? '' : await compressImage(reportEl.src, 400, 400);
        }

        const loginEl = document.getElementById('previewLoginLogo');
        if (loginEl) {
            brandData.loginLogo = loginEl.src.includes('assets/images/logo.png') ? '' : await compressImage(loginEl.src, 400, 400);
        }

        const sidebarEl = document.getElementById('previewSidebarLogo');
        if (sidebarEl) {
            brandData.sidebarLogo = sidebarEl.src.includes('assets/images/logo.png') ? '' : await compressImage(sidebarEl.src, 200, 200);
        }

        const sidebarDarkEl = document.getElementById('previewSidebarLogoDark');
        if (sidebarDarkEl) {
            brandData.sidebarLogoDark = sidebarDarkEl.src.includes('assets/images/logo.png') ? '' : await compressImage(sidebarDarkEl.src, 200, 200);
        }

        const faviconEl = document.getElementById('previewFavicon');
        if (faviconEl) {
            brandData.favicon = faviconEl.src.includes('assets/images/logo.png') ? '' : await compressImage(faviconEl.src, 64, 64);
        }

        const mobileEl = document.getElementById('previewMobileIcon');
        if (mobileEl) {
            brandData.mobileIcon = mobileEl.src.includes('assets/images/logo.png') ? '' : await compressImage(mobileEl.src, 192, 192);
        }

        const existing = await db.brandSettings.get(1);
        if (existing) {
            await db.brandSettings.update(1, brandData);
        } else {
            await db.brandSettings.add(brandData);
        }
        
        Swal.fire({ icon: 'success', title: 'ជោគជ័យ!', text: 'ការកំណត់យីហោត្រូវបានរក្សាទុក។ សូម Refresh (Ctrl+Shift+R) ដើម្បីឃើញការផ្លាស់ប្តូរ។' });
        
    } catch (error) {
        console.error("Error saving branding:", error);
        Swal.fire({ icon: 'error', title: 'បរាជ័យ', text: 'មានបញ្ហាក្នុងការរក្សាទុក។ (' + error.message + ')' });
    }
};

// Handle Drag & Drop for Branding Logos
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.branding-dropzone').forEach(zone => {
        zone.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                const targetId = zone.getAttribute('data-target');
                if (targetId) document.getElementById(targetId).click();
            }
        });
        
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.style.backgroundColor = '#e9ecef';
            zone.style.borderColor = '#0d6efd';
        });
        
        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            zone.style.backgroundColor = '#f8f9fa';
            zone.style.borderColor = '#ccc';
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.style.backgroundColor = '#f8f9fa';
            zone.style.borderColor = '#ccc';
            
            const targetId = zone.getAttribute('data-target');
            if (targetId && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const input = document.getElementById(targetId);
                input.files = e.dataTransfer.files;
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        });
    });
});

window.deleteBrandingLogo = function(type) {
    Swal.fire({
        title: 'បញ្ជាក់',
        text: 'តើអ្នកពិតជាចង់លុបរូបភាពនេះមែនទេ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'លុប',
        cancelButtonText: 'បោះបង់'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById('preview' + type).src = 'assets/images/logo.png';
            document.getElementById('input' + type).value = '';
        }
    });
};
// Force update directly after save
const origSaveBranding = window.saveBranding;
window.saveBranding = async function() {
    await origSaveBranding();
    // After save, try to apply immediately without refresh
    try {
        if (typeof applyBranding === 'function') {
            await applyBranding();
        } else {
            // fallback if applyBranding not globally exposed
            const brand = await db.brandSettings.get(1);
            if (brand) {
                if (brand.loginLogo) {
                    const ll = document.getElementById('loginLogoImg');
                    if(ll) ll.src = brand.loginLogo;
                }
                if (brand.sidebarLogo) {
                    const sl = document.getElementById('sidebarLogoImg');
                    if(sl) sl.src = brand.sidebarLogo;
                }
                if (brand.favicon) {
                    let link = document.querySelector("link[rel~='icon']");
                    if (link) link.href = brand.favicon;
                }
            }
        }
    } catch(e){}
}


// ====== TELEGRAM SETTINGS ======
window.loadTelegramSettings = async function() {
    try {
        const settings = (typeof db !== 'undefined' && db.telegramSettings) 
            ? (await db.telegramSettings.first() || {}) 
            : {};
        
        const tokenEl = document.getElementById('telegramBotToken');
        const chatEl = document.getElementById('telegramChatId');
        const farmEl = document.getElementById('telegramFarmName');
        const enableEl = document.getElementById('telegramAlertEnabled');

        if (tokenEl) tokenEl.value = settings.botToken || '8823338803:AAF8xrTeSo4Up7u5R9L1absAIK-GU-n4_eQ';
        if (chatEl) chatEl.value = settings.chatId || '-5344695591';
        if (farmEl) farmEl.value = settings.farmName || 'VALLE ECO FARM';
        if (enableEl) enableEl.checked = settings.enabled !== false;
        const threshEl = document.getElementById('telegramFaceThreshold');
        if (threshEl) threshEl.value = String(settings.faceMatchThreshold || '0.40');
        const paymentChatEl = document.getElementById('telegramPaymentChatId');
        const paymentTokenEl = document.getElementById('telegramPaymentBotToken');
        if (paymentChatEl) paymentChatEl.value = settings.paymentChatId || '';
        if (paymentTokenEl) paymentTokenEl.value = settings.paymentBotToken || '';

        const shareLinkEl = document.getElementById('pv-share-link');
        if (shareLinkEl) {
            shareLinkEl.value = `${window.location.origin}${window.location.pathname}#pv`;
        }

        if (typeof loadVoucherStaffTable === 'function') {
            await loadVoucherStaffTable();
        }
    } catch (e) {
        console.error('Error loading telegram settings:', e);
    }
};

window.saveTelegramSettings = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const token = (document.getElementById('telegramBotToken')?.value || '8823338803:AAF8xrTeSo4Up7u5R9L1absAIK-GU-n4_eQ').trim();
    const chatId = (document.getElementById('telegramChatId')?.value || '-5344695591').trim();
    const farmName = (document.getElementById('telegramFarmName')?.value || 'VALLE ECO FARM').trim();
    const enabled = document.getElementById('telegramAlertEnabled')?.checked ?? true;

    try {
        const existing = await db.telegramSettings.first();
        const data = {
            botToken: token,
            chatId: chatId,
            farmName: farmName,
            enabled: enabled,
            faceMatchThreshold: parseFloat(document.getElementById('telegramFaceThreshold')?.value) || 0.40,
            updatedAt: new Date().toISOString()
        };
        if (existing) {
            await db.telegramSettings.update(existing.id, data);
        } else {
            await db.telegramSettings.add(data);
        }
        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ',
            text: 'បានរក្សាទុកការកំណត់ Telegram Bot រួចរាល់!',
            timer: 1800,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'បរាជ័យ',
            text: 'មិនអាចរក្សាទុកបានទេ: ' + (err.message || err)
        });
    }
};

window.testTelegramConnection = async function() {
    const token = (document.getElementById('telegramBotToken')?.value || '').trim();
    const chatId = (document.getElementById('telegramChatId')?.value || '').trim();
    const farmName = (document.getElementById('telegramFarmName')?.value || 'VALLE ECO FARM').trim();

    if (!token || !chatId) {
        Swal.fire('ខ្វះទិន្នន័យ', 'សូមបញ្ចូល Bot Token និង Chat ID ជាមុនសិន!', 'warning');
        return;
    }

    const btn = document.getElementById('btnTestTelegram');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងផ្ញើសារ...';
        btn.disabled = true;
    }

    try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB');
        const day = String(now.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateFormatted = day + '-' + months[now.getMonth()] + '-' + now.getFullYear();
        const text = '🔔 <b>វត្តមាន E-FACE: សារតេស្តសាកល្បង</b>\n━━━━━━━━━━━━━━━━━\n▫️ <b>ម៉ោង:</b> ' + timeStr + '\n▫️ <b>កាលបរិច្ឆេទ:</b> ' + dateFormatted + '\n▫️ <b>ស្ថានភាព:</b> ការតភ្ជាប់ Telegram Bot ទទួលបានជោគជ័យ!';
        
        const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        const resJson = await res.json();
        if (resJson.ok) {
            Swal.fire({
                icon: 'success',
                title: 'ការតភ្ជាប់ជោគជ័យ!',
                text: 'សារតេស្តត្រូវបានផ្ញើទៅកាន់ Telegram Group ដោយជោគជ័យ។',
                confirmButtonColor: '#198754'
            });
        } else {
            throw new Error(resJson.description || 'បរាជ័យក្នុងការផ្ញើសារ');
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'ការតភ្ជាប់បរាជ័យ',
            text: 'មិនអាចផ្ញើសារបានទេ: ' + (err.message || err) + '\nសូមពិនិត្យ Bot Token, Chat ID ឬប្រាកដថាបាន Invite Bot ចូលក្នុង Group។',
            confirmButtonColor: '#dc3545'
        });
    } finally {
        if (btn) {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    }
};


// ====== PAYMENT VOUCHER SETTINGS & 5 STAFF PINs ======
window.savePaymentVoucherSettings = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const paymentChatId = (document.getElementById('telegramPaymentChatId')?.value || '').trim();
    const paymentBotToken = (document.getElementById('telegramPaymentBotToken')?.value || '').trim();

    if (!paymentChatId) {
        Swal.fire('ខ្វះ Payment Group Chat ID', 'សូមបញ្ចូល Chat ID នៃ Telegram Group ថ្មីសម្រាប់ប័ណ្ណទូទាត់!', 'warning');
        return;
    }

    try {
        const existing = (typeof db !== 'undefined' && db.telegramSettings) ? await db.telegramSettings.first() : null;
        if (existing) {
            await db.telegramSettings.update(existing.id, {
                paymentChatId: paymentChatId,
                paymentBotToken: paymentBotToken,
                updatedAt: new Date().toISOString()
            });
        } else if (typeof db !== 'undefined' && db.telegramSettings) {
            await db.telegramSettings.add({
                paymentChatId: paymentChatId,
                paymentBotToken: paymentBotToken,
                botToken: '8823338803:AAF8xrTeSo4Up7u5R9L1absAIK-GU-n4_eQ',
                chatId: '-5344695591',
                enabled: true,
                createdAt: new Date().toISOString()
            });
        }

        // Save 5 Staff rows
        await saveVoucherStaffTable();

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: 'បានរក្សាទុកការកំណត់ Telegram Payment Group និងបុគ្គលិកទាំង ៥ នាក់រួចរាល់!',
            timer: 1800,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'បរាជ័យ',
            text: 'មិនអាចរក្សាទុកបានទេ: ' + (err.message || err)
        });
    }
};

window.testPaymentTelegramConnection = async function() {
    const mainToken = (document.getElementById('telegramBotToken')?.value || '').trim() || '8823338803:AAF8xrTeSo4Up7u5R9L1absAIK-GU-n4_eQ';
    const customToken = (document.getElementById('telegramPaymentBotToken')?.value || '').trim();
    const token = customToken || mainToken;
    const chatId = (document.getElementById('telegramPaymentChatId')?.value || '').trim();

    if (!chatId) {
        Swal.fire('ខ្វះ Payment Group Chat ID', 'សូមបញ្ចូល Payment Group Chat ID នៃ Telegram Group ថ្មីជាមុនសិន!', 'warning');
        return;
    }

    const btn = document.getElementById('btnTestPaymentTelegram');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងផ្ញើសារ...';
        btn.disabled = true;
    }

    try {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB');
        const day = String(now.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateFormatted = day + '-' + months[now.getMonth()] + '-' + now.getFullYear();

        const text =
`🧾 <b>ប័ណ្ណទូទាត់ប្រាក់ (PAYMENT VOUCHER): សារតេស្តសាកល្បង</b>
━━━━━━━━━━━━━━━━━
▫️ <b>ម៉ោង:</b> ${timeStr}
▫️ <b>កាលបរិច្ឆេទ:</b> ${dateFormatted}
▫️ <b>ស្ថានភាព:</b> ការតភ្ជាប់ Payment Telegram Group ទទួលបានជោគជ័យ! ✅
▫️ <b>ប្រព័ន្ធ:</b> ត្រៀមខ្លួនរួចរាល់សម្រាប់ទទួលប័ណ្ណទូទាត់ពីបុគ្គលិក`;

        const res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        const resJson = await res.json();
        if (resJson.ok) {
            Swal.fire({
                icon: 'success',
                title: 'ការតភ្ជាប់ជោគជ័យ!',
                text: 'សារតេស្តប័ណ្ណទូទាត់ត្រូវបានផ្ញើទៅកាន់ Payment Telegram Group ដោយជោគជ័យ។',
                confirmButtonColor: '#198754'
            });
        } else {
            throw new Error(resJson.description || 'បរាជ័យក្នុងការផ្ញើសារ');
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'ការតភ្ជាប់បរាជ័យ',
            text: 'មិនអាចផ្ញើសារបានទេ: ' + (err.message || err) + '\nសូមប្រាកដថាបាន Invite Bot ចូលក្នុង Payment Group ថ្មី និងផ្ដល់សិទ្ធិជា Admin។',
            confirmButtonColor: '#dc3545'
        });
    } finally {
        if (btn) {
            btn.innerHTML = oldHtml;
            btn.disabled = false;
        }
    }
};

window.copyVoucherFormLink = function() {
    const linkInput = document.getElementById('pv-share-link');
    if (!linkInput) return;
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    try {
        navigator.clipboard.writeText(linkInput.value).then(() => {
            Swal.fire({
                icon: 'success',
                title: 'បានចម្លង Link រួចរាល់!',
                text: 'អ្នកអាចយក Link នេះទៅ Share ឬ Pin ក្នុង Telegram Group ដើម្បីឱ្យបុគ្គលិកចុចបំពេញប័ណ្ណទូទាត់។',
                timer: 2000,
                showConfirmButton: false
            });
        }).catch(() => {
            Swal.fire('Link សម្រាប់បំពេញប័ណ្ណទូទាត់', linkInput.value, 'info');
        });
    } catch(e) {
        Swal.fire('Link សម្រាប់បំពេញប័ណ្ណទូទាត់', linkInput.value, 'info');
    }
};

window.loadVoucherStaffTable = async function() {
    const tbody = document.getElementById('voucherStaffTableBody');
    if (!tbody) return;

    let users = [];
    try {
        if (typeof db !== 'undefined' && db.voucherUsers) {
            users = await db.voucherUsers.toArray();
        }
    } catch (e) {
        console.warn('loadVoucherStaffTable error:', e);
    }

    if (!users || users.length === 0) {
        users = [
            { id: 'pv_user_1', name: 'User 1 (បុគ្គលិក ១)', pin: '1111', role: 'Staff', active: true },
            { id: 'pv_user_2', name: 'User 2 (បុគ្គលិក ២)', pin: '2222', role: 'Staff', active: true },
            { id: 'pv_user_3', name: 'User 3 (បុគ្គលិក ៣)', pin: '3333', role: 'Staff', active: true },
            { id: 'pv_user_4', name: 'User 4 (បុគ្គលិក ៤)', pin: '4444', role: 'Staff', active: true },
            { id: 'pv_user_5', name: 'User 5 (បុគ្គលិក ៥)', pin: '5555', role: 'Staff', active: true }
        ];
    }

    while (users.length < 5) {
        const i = users.length + 1;
        users.push({ id: `pv_user_${i}`, name: `User ${i} (បុគ្គលិក ${i})`, pin: `${i}${i}${i}${i}`, role: 'Staff', active: true });
    }

    const escapeAttr = (s) => (s || '').replace(/"/g, '&quot;');

    tbody.innerHTML = '';
    users.slice(0, 5).forEach((u, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.userId = u.id || `pv_user_${idx+1}`;
        tr.innerHTML = `
            <td class="text-center fw-bold align-middle">${idx + 1}</td>
            <td>
                <input type="text" class="form-control form-control-sm pv-staff-name-input" value="${escapeAttr(u.name || '')}" placeholder="ឈ្មោះបុគ្គលិក..." required>
            </td>
            <td style="width: 120px;">
                <input type="text" maxlength="4" class="form-control form-control-sm text-center fw-bold pv-staff-pin-input font-monospace" value="${escapeAttr(u.pin || '1234')}" placeholder="4 PIN" required>
            </td>
            <td class="text-center align-middle" style="width: 60px;">
                <div class="form-check form-switch d-inline-block">
                    <input class="form-check-input pv-staff-active-input" type="checkbox" ${u.active !== false ? 'checked' : ''}>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.saveVoucherStaffTable = async function() {
    const tbody = document.getElementById('voucherStaffTableBody');
    if (!tbody || typeof db === 'undefined' || !db.voucherUsers) return;

    const rows = tbody.querySelectorAll('tr');
    for (const row of rows) {
        const userId = row.dataset.userId;
        const name = (row.querySelector('.pv-staff-name-input')?.value || '').trim();
        const pin = (row.querySelector('.pv-staff-pin-input')?.value || '').trim();
        const active = row.querySelector('.pv-staff-active-input')?.checked ?? true;

        if (name && pin) {
            try {
                const existing = await db.voucherUsers.get(userId);
                if (existing) {
                    await db.voucherUsers.update(userId, { name, pin, active, updatedAt: new Date().toISOString() });
                } else {
                    await db.voucherUsers.add({ id: userId, name, pin, active, createdAt: new Date().toISOString() });
                }
            } catch (err) {
                console.warn('Error saving voucher user row:', err);
            }
        }
    }
};


// ====== GPS GEOFENCE SETTINGS ======
window.calculateHaversineDistance = function(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const toRad = deg => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
};

window.selectGpsMode = function(enabled) {
    const radioOn = document.getElementById('gpsModeOn');
    const radioOff = document.getElementById('gpsModeOff');
    const hiddenInput = document.getElementById('gpsGeofenceEnabled');
    const cardOn = document.getElementById('gps-mode-card-on');
    const cardOff = document.getElementById('gps-mode-card-off');
    const coordsSection = document.getElementById('gpsCoordinatesSection');
    const disabledNotice = document.getElementById('gpsDisabledNotice');
    const testBtn = document.getElementById('btnTestGpsDistance');

    if (enabled) {
        if (radioOn) radioOn.checked = true;
        if (radioOff) radioOff.checked = false;
        if (hiddenInput) hiddenInput.value = 'true';
        if (cardOn) {
            cardOn.style.borderColor = '#198754';
            cardOn.style.backgroundColor = '#f0fdf4';
        }
        if (cardOff) {
            cardOff.style.borderColor = '#e2e8f0';
            cardOff.style.backgroundColor = '#ffffff';
        }
        if (coordsSection) coordsSection.style.display = 'block';
        if (disabledNotice) disabledNotice.style.display = 'none';
        if (testBtn) testBtn.style.display = 'inline-block';
    } else {
        if (radioOn) radioOn.checked = false;
        if (radioOff) radioOff.checked = true;
        if (hiddenInput) hiddenInput.value = 'false';
        if (cardOff) {
            cardOff.style.borderColor = '#64748b';
            cardOff.style.backgroundColor = '#f8fafc';
        }
        if (cardOn) {
            cardOn.style.borderColor = '#e2e8f0';
            cardOn.style.backgroundColor = '#ffffff';
        }
        if (coordsSection) coordsSection.style.display = 'none';
        if (disabledNotice) disabledNotice.style.display = 'flex';
        if (testBtn) testBtn.style.display = 'none';
    }
};

window.loadGpsSettings = async function() {
    try {
        const settings = (typeof db !== 'undefined' && db.gpsSettings) 
            ? (await db.gpsSettings.first() || {}) 
            : {};
        
        const isEnabled = settings.enabled === true;
        if (typeof window.selectGpsMode === 'function') {
            window.selectGpsMode(isEnabled);
        }

        const farmEl = document.getElementById('gpsFarmName');
        const latEl = document.getElementById('gpsFarmLat');
        const lngEl = document.getElementById('gpsFarmLng');
        const radiusEl = document.getElementById('gpsAllowedRadius');

        if (farmEl) farmEl.value = settings.farmName || 'VALLE ECO FARM';
        if (latEl && settings.latitude) latEl.value = settings.latitude;
        if (lngEl && settings.longitude) lngEl.value = settings.longitude;
        if (radiusEl && settings.radiusMeters) radiusEl.value = String(settings.radiusMeters);
    } catch (e) {
        console.error('Error loading GPS settings:', e);
        if (typeof window.selectGpsMode === 'function') {
            window.selectGpsMode(false);
        }
    }
};

window.fetchCurrentGpsLocation = function() {
    if (!navigator.geolocation) {
        Swal.fire({
            icon: 'error',
            title: 'មិនគាំទ្រ GPS',
            text: 'ឧបករណ៍ ឬ Browser របស់អ្នកមិនគាំទ្រ GPS Geolocation ឡើយ!',
            confirmButtonColor: '#dc3545'
        });
        return;
    }

    const btn = document.getElementById('btnGetCurrentGps');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងចាប់យកទីតាំង...';
        btn.disabled = true;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = Math.round(position.coords.accuracy);

            const latEl = document.getElementById('gpsFarmLat');
            const lngEl = document.getElementById('gpsFarmLng');
            if (latEl) latEl.value = lat.toFixed(6);
            if (lngEl) lngEl.value = lng.toFixed(6);

            Swal.fire({
                icon: 'success',
                title: 'ចាប់យកទីតាំងជោគជ័យ!',
                html: `<b>រយៈទទឹង (Lat):</b> ${lat.toFixed(6)}<br><b>រយៈបណ្តោយ (Lng):</b> ${lng.toFixed(6)}<br><small class="text-muted">(ភាពសុក្រិត Accuracy: ~${accuracy}m)</small>`,
                confirmButtonColor: '#198754'
            });

            if (btn) {
                btn.innerHTML = oldHtml;
                btn.disabled = false;
            }
        },
        (error) => {
            let msg = 'មិនអាចទាញយកទីតាំងបានទេ!';
            if (error.code === 1) {
                msg = 'លោកអ្នកបានបដិសេធសិទ្ធិចូលប្រើ GPS (Permission Denied)។ សូមបើកសិទ្ធិ Location ក្នុង Browser។';
            } else if (error.code === 2) {
                msg = 'រកមិនឃើញសញ្ញា GPS (Position Unavailable)។ សូមប្រាកដថាបានបើក Location Service លើឧបករណ៍។';
            } else if (error.code === 3) {
                msg = 'ដំណើរការចាប់យកទីតាំងចំណាយពេលយូរពេក (Timeout)។ សូមព្យាយាមម្តងទៀត។';
            }
            Swal.fire({
                icon: 'warning',
                title: 'មិនអាចចាប់យកទីតាំងបាន',
                text: msg,
                confirmButtonColor: '#f59e0b'
            });

            if (btn) {
                btn.innerHTML = oldHtml;
                btn.disabled = false;
            }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
};

window.viewGpsOnGoogleMaps = function(e) {
    if (e) e.preventDefault();
    const lat = document.getElementById('gpsFarmLat')?.value;
    const lng = document.getElementById('gpsFarmLng')?.value;
    if (!lat || !lng) {
        Swal.fire({
            icon: 'info',
            title: 'ខ្វះកូអរដោណេ',
            text: 'សូមបញ្ចូល ឬចុចចាប់យក Latitude និង Longitude ជាមុនសិន!',
            confirmButtonColor: '#0d6efd'
        });
        return;
    }
    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(mapUrl, '_blank');
};

window.testMyGpsDistance = function() {
    const latEl = document.getElementById('gpsFarmLat');
    const lngEl = document.getElementById('gpsFarmLng');
    const radiusEl = document.getElementById('gpsAllowedRadius');

    const farmLat = parseFloat(latEl?.value);
    const farmLng = parseFloat(lngEl?.value);
    const allowedRadius = parseInt(radiusEl?.value || '200', 10);

    if (isNaN(farmLat) || isNaN(farmLng)) {
        Swal.fire({
            icon: 'warning',
            title: 'ខ្វះកូអរដោណេកសិដ្ឋាន',
            text: 'សូមបញ្ចូលកូអរដោណេកសិដ្ឋានជាមុនសិន ដើម្បីគណនាចម្ងាយ!',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }

    if (!navigator.geolocation) {
        Swal.fire('មិនគាំទ្រ GPS', 'ឧបករណ៍នេះមិនគាំទ្រ GPS ទេ', 'error');
        return;
    }

    const btn = document.getElementById('btnTestGpsDistance');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងវាស់...';
        btn.disabled = true;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const myLat = pos.coords.latitude;
            const myLng = pos.coords.longitude;
            const distance = window.calculateHaversineDistance(myLat, myLng, farmLat, farmLng);
            const inRange = distance <= allowedRadius;

            const distDisplay = distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${distance} ម៉ែត្រ`;

            Swal.fire({
                icon: inRange ? 'success' : 'warning',
                title: inRange ? 'ស្ថិតក្នុងបរិវេណកសិដ្ឋាន ✅' : 'ស្ថិតនៅក្រៅបរិវេណកសិដ្ឋាន ⚠️',
                html: `
                    <div class="text-start p-3 bg-light rounded-3 my-2 border">
                        <div class="d-flex justify-content-between mb-2">
                            <span>ចម្ងាយបច្ចុប្បន្នរបស់អ្នក:</span>
                            <strong class="${inRange ? 'text-success' : 'text-danger'} fs-5">${distDisplay}</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>កាំអនុញ្ញាត (Allowed Radius):</span>
                            <strong>${allowedRadius} ម៉ែត្រ</strong>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span>ស្ថានភាពស្កែន E-Face:</span>
                            <span class="badge ${inRange ? 'bg-success' : 'bg-danger'}">${inRange ? 'អនុញ្ញាតឱ្យស្កែន' : 'ចាក់សោរារាំង (Blocked)'}</span>
                        </div>
                    </div>
                `,
                confirmButtonColor: inRange ? '#198754' : '#dc3545'
            });

            if (btn) {
                btn.innerHTML = oldHtml;
                btn.disabled = false;
            }
        },
        (err) => {
            Swal.fire('បរាជ័យ', 'មិនអាចទទួលទីតាំងបច្ចុប្បន្នរបស់អ្នកបានទេ: ' + (err.message || ''), 'error');
            if (btn) {
                btn.innerHTML = oldHtml;
                btn.disabled = false;
            }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
};

window.saveGpsSettings = async function(e) {
    if (e) e.preventDefault();
    const hiddenVal = document.getElementById('gpsGeofenceEnabled')?.value;
    const enabled = (hiddenVal === 'true');
    const farmName = (document.getElementById('gpsFarmName')?.value || 'VALLE ECO FARM').trim();
    const lat = parseFloat(document.getElementById('gpsFarmLat')?.value);
    const lng = parseFloat(document.getElementById('gpsFarmLng')?.value);
    const radiusMeters = parseInt(document.getElementById('gpsAllowedRadius')?.value || '200', 10);

    if (enabled && (isNaN(lat) || isNaN(lng))) {
        Swal.fire({
            icon: 'warning',
            title: 'ខ្វះកូអរដោណេ',
            text: 'នៅពេលបើកដំណើរការ GPS Checking លោកអ្នកត្រូវតែបញ្ចូល Latitude និង Longitude ឬចុច «ចាប់យកទីតាំងបច្ចុប្បន្ន»!',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }

    try {
        const existing = await db.gpsSettings.first();
        const data = {
            enabled: enabled,
            farmName: farmName,
            latitude: isNaN(lat) ? null : lat,
            longitude: isNaN(lng) ? null : lng,
            radiusMeters: radiusMeters,
            updatedAt: new Date().toISOString()
        };

        if (existing && existing.id) {
            await db.gpsSettings.update(existing.id, data);
        } else {
            await db.gpsSettings.add(data);
        }

        // Immediately sync in-memory state across open components
        window._efaceGpsSettings = data;
        if (!enabled) {
            window._efaceGpsLocked = false;
            window._efaceCurrentGpsDistance = null;
            const overlay = document.getElementById('eface-gps-lock-overlay');
            if (overlay) overlay.style.display = 'none';
            const badge = document.getElementById('eface-gps-badge');
            if (badge) badge.style.display = 'none';
        }

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: enabled 
                ? 'ការកំណត់ទីតាំង GPS Checking ត្រូវបានបើកដំណើរការ!' 
                : 'បានកំណត់ «មិនប្រើប្រាស់ GPS Checking» ដោយជោគជ័យ! បុគ្គលិកអាចស្កែនវត្តមានបានដោយសេរី គ្មានការទាមទារ GPS ឡើយ។',
            confirmButtonColor: '#198754'
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'បរាជ័យ',
            text: 'មិនអាចរក្សាទុកបានទេ: ' + (err.message || err),
            confirmButtonColor: '#dc3545'
        });
    }
};

// One-time self-healing migration: Ensure GPS checking is set to disabled per management request
(async function ensureGpsCheckDisabledOnce() {
    try {
        if (!localStorage.getItem('gpsCheckAutoDisabled_20261023')) {
            localStorage.setItem('gpsCheckAutoDisabled_20261023', 'true');
            if (typeof db !== 'undefined' && db.gpsSettings) {
                const existing = await db.gpsSettings.first();
                if (existing && existing.id && existing.enabled) {
                    await db.gpsSettings.update(existing.id, { enabled: false, updatedAt: new Date().toISOString() });
                    console.log('GPS Geofence checking auto-disabled in database per user request');
                }
            }
        }
    } catch (e) {
        console.warn('GPS migration notice:', e);
    }
})();
