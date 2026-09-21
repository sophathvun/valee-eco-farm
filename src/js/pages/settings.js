// ====== CATEGORY MANAGEMENT ======
async function loadCategories() {
    let allCats = await db.categories.toArray();
    let hasGarbled = allCats.some(c => c.name && c.name.includes('áž'));
    if (hasGarbled) {
        for (let c of allCats) {
            if (c.name.includes('áž')) await db.categories.delete(c.id);
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
    let hasGarbled = allPrep.some(p => p.name && p.name.includes('áž'));
    if (hasGarbled) {
        for (let p of allPrep) {
            if (p.name.includes('áž')) await db.preparers.delete(p.id);
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
}

// ====== USER MANAGEMENT ======
let editingUserId = null;

async function loadUsersAndRoles() {
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
    const admins = allUsers.filter(u => u.username.toLowerCase() === 'admin');
    admins.sort((a,b) => a.id - b.id);
    const originalAdminId = admins.length > 0 ? admins[0].id : null;
    
    allUsers.forEach(u => {
        const tr = document.createElement('tr');
        let roleName = 'N/A';
        if (u.roleId) {
            const r = roles.find(ro => ro.id == u.roleId);
            if (r) roleName = r.name;
        } else if (u.username.toLowerCase() === 'admin') {
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

        tr.innerHTML = `
            <td class="fw-bold">${u.username}</td>
            <td><span class="badge bg-primary">${roleName}</span></td>
            <td>${statusToggle}</td>
            <td>
                ${!isOriginalAdmin ? `
                    <button class="btn btn-sm btn-outline-warning btn-edit" onclick="editUser(${u.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                    <button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteUser(${u.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
                ` : '<span class="text-muted">No actions</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editUser = async function(id) {
    const user = await db.users.get(id);
    if (!user) return;
    
    document.getElementById('newUsername').value = user.username;
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
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newUserPassword').value.trim();
    const roleId = document.getElementById('newUserRole').value;
    const isActive = document.getElementById('newUserStatus').checked;
    
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
        await db.users.update(editingUserId, { username, password, roleId: parseInt(roleId), isActive });
        Swal.fire({icon: 'info', text: 'កែប្រែគណនីបានជោគជ័យ!', confirmButtonText: 'យល់ព្រម'});
    } else {
        const exists = await db.users.where('username').equalsIgnoreCase(username).count();
        if (exists > 0) {
            Swal.fire({icon: 'info', text: 'ឈ្មោះគណនីនេះមានរួចហើយ!', confirmButtonText: 'យល់ព្រម'});
            return;
        }
        await db.users.add({ username, password, roleId: parseInt(roleId), isActive });
        Swal.fire({icon: 'info', text: 'បង្កើតគណនីបានជោគជ័យ!', confirmButtonText: 'យល់ព្រម'});
    }
    
    document.getElementById('addUserForm').reset();
    document.getElementById('newUserStatus').checked = true;
    document.getElementById('newUserStatusLabel').textContent = 'ON';
    document.getElementById('newUserStatusLabel').className = 'form-check-label ms-2 fw-bold text-success';
    editingUserId = null;
    const btn = document.querySelector('#addUserForm button[type="submit"]');
    btn.textContent = 'បង្កើតគណនី';
    btn.classList.replace('btn-warning', 'btn-dark');
    
    loadUsersAndRoles();
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
                ${r.name.toLowerCase() !== 'admin' ? `
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
        if(role.name.toLowerCase() === 'admin') {
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
    if(!roleId) return;
    const role = await db.roles.get(parseInt(roleId));
    if(role.name.toLowerCase() === 'admin') {
        Swal.fire('បដិសេធ', 'មិនអាចកែប្រែសិទ្ធិ Admin បានទេ!', 'error');
        return;
    }
    
    const perms = [];
    document.querySelectorAll('.role-perm-checkbox:checked').forEach(cb => {
        perms.push(cb.value);
    });
    
    await db.roles.update(parseInt(roleId), { permissions: perms });
    Swal.fire('ជោគជ័យ', 'សិទ្ធិត្រូវបានរក្សាទុក!', 'success');
}

document.getElementById('addIncomeCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.categories.add({ type: 'income', name: document.getElementById('newIncCatName').value });
    document.getElementById('newIncCatName').value = '';
    Swal.fire({icon: 'success', text: 'បញ្ចូលប្រភេទទិន្នន័យជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
    loadCategories();
});

document.getElementById('addExpenseCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await db.categories.add({ type: 'expense', name: document.getElementById('newExpCatName').value });
    document.getElementById('newExpCatName').value = '';
    Swal.fire({icon: 'success', text: 'បញ្ចូលប្រភេទទិន្នន័យជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
    loadCategories();
});

document.getElementById('systemSettingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('setSysPhone').value;
    const addrKh = document.getElementById('setSysAddrKh').value;
    const addrEn = document.getElementById('setSysAddrEn').value;
    const fileInput = document.getElementById('setSysLogo');
    
    localStorage.setItem('sysPhone', phone);
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
        Swal.fire('ជោគជ័យ!', 'ការកំណត់ប្រព័ន្ធត្រូវបានរក្សាទុក។', 'success');
    }
});

async function editCategory(id, oldName) {
    const newName = prompt('សូមបញ្ចូលឈ្មោះប្រភេទថ្មី៖', oldName);
    if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
        const finalName = newName.trim();
        await db.categories.update(id, { name: finalName });
        const txsToUpdate = await db.transactions.where('category').equals(oldName).toArray();
        for (let tx of txsToUpdate) await db.transactions.update(tx.id, { category: finalName });
        Swal.fire({icon: 'info', text: 'កែប្រែបានជោគជ័យ!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
        loadCategories(); loadData();
    }
}

async function deleteCategory(id) {
    const res = await Swal.fire({title: '\u1794\u1789\u17d2\u1787\u17b6\u1780\u17cb', text: 'តើអ្នកពិតជាចង់លុបប្រភេទនេះមែនទេ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798', cancelButtonText: '\u1794\u17c4\u17c7\u1794\u1784\u17cb'});
    if (res.isConfirmed) {
        await db.categories.delete(id);
        Swal.fire({icon: 'success', text: 'លុបប្រភេទទិន្នន័យជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
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
            if (brand.loginLogo) document.getElementById('previewLoginLogo').src = brand.loginLogo;
            if (brand.sidebarLogo) document.getElementById('previewSidebarLogo').src = brand.sidebarLogo;
            if (brand.sidebarLogoDark) document.getElementById('previewSidebarLogoDark').src = brand.sidebarLogoDark;
            if (brand.favicon) document.getElementById('previewFavicon').src = brand.favicon;
            if (brand.mobileIcon) document.getElementById('previewMobileIcon').src = brand.mobileIcon;
        }
    } catch (error) {
        console.error("Error loading branding:", error);
    }
}

// Handle file input changes for previews using event delegation
document.addEventListener('change', function(e) {
    const ids = ['inputLoginLogo', 'inputSidebarLogo', 'inputSidebarLogoDark', 'inputFavicon', 'inputMobileIcon'];
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
