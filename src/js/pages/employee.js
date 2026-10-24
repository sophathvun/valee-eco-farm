// ====== EMPLOYEE MANAGEMENT ======
let editingEmployeeId = null;

window.generateEmpCode = async function() {
    const all = await db.employees.toArray();
    let maxId = 0;
    all.forEach(emp => {
        if (emp.code && emp.code.startsWith('VEF-')) {
            const numStr = emp.code.replace('VEF-', '');
            const num = parseInt(numStr, 10);
            if (!isNaN(num) && num > maxId) {
                maxId = num;
            }
        }
    });
    maxId++;
    const code = 'VEF-' + maxId.toString().padStart(4, '0');
    const input = document.getElementById('emp-code');
    if(input) input.value = code;
};

async function loadEmployees() {
    const allEmps = await db.employees.toArray();
    const tbody = document.getElementById('employeeList');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    allEmps.forEach(emp => {
        const tr = document.createElement('tr');
        const typeLabel = emp.type || 'Full-Time';
        let wageSuffix = '';
        const wageType = emp.wageType || 'Monthly';
        if (wageType === 'Monthly') wageSuffix = '/ \u1781\u17c2';
        else if (wageType === 'Daily') wageSuffix = '/ \u1790\u17d2\u1784\u17c3';
        else if (wageType === 'Shift') wageSuffix = '/ \u179c\u17c1\u1793';
        else if (wageType === 'Hourly') wageSuffix = '/ \u1798\u17c9\u17c4\u1784';
        
        tr.innerHTML = `
            <td><img src="${emp.photo || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" class="emp-avatar" onclick="viewEmployeePhoto(${emp.id})" title="ចុចដើម្បីមើលរូបធំ និងទាញយក"></td>
            <td class="fw-bold text-primary">${emp.code || 'N/A'}</td>
            <td>
                <div>${emp.nationalId || '-'}</div>
                ${emp.idCardPhoto ? `<button type="button" class="btn btn-xs btn-outline-primary py-0 px-2 mt-1 rounded-pill" style="font-size: 0.68rem;" onclick="viewEmployeeIdCardPhoto(${emp.id})" title="ចុចដើម្បីមើលរូបអត្តសញ្ញាណប័ណ្ណធំ"><i class="bi bi-card-image me-1"></i>រូបកាត</button>` : ''}
            </td>
            <td class="text-start">
                <div class="text-dark emp-name-km">${emp.name}</div>
                ${emp.latinName ? `<div class="text-muted emp-name-latin">${emp.latinName}</div>` : ''}
            </td>
            <td>${emp.gender}</td>
            <td>${emp.department || ''}</td>
            <td>${emp.position}</td>
            <td><span class="badge bg-secondary">${typeLabel}</span></td>
            <td>${emp.phone}</td>
            <td class="text-info fw-bold">${formatCurrency(emp.salary, emp.currency || 'USD')} <small class="text-muted">${wageSuffix}</small></td>
            <td class="align-middle">
                ${hasPermission('employee_manage') ? `
                <button class="btn btn-sm btn-outline-warning btn-edit me-1" onclick="editEmployee(${emp.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                <button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteEmployee(${emp.id})"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}
window.loadEmployees = loadEmployees;

window.openAddEmployeeModal = async function() {
    editingEmployeeId = null;
    const form = document.getElementById('employeeForm');
    if (form) form.reset();
    
    document.getElementById('emp-type').value = 'Full-Time';
    document.getElementById('emp-wage-type').value = 'Monthly';
    if (document.getElementById('emp-currency')) document.getElementById('emp-currency').value = 'USD';
    const startDateEl = document.getElementById('emp-start-date');
    if (startDateEl) startDateEl.value = '';
    
    const preview = document.getElementById('emp-photo-preview');
    const badge = document.getElementById('emp-eface-status-badge');
    if (badge) {
        badge.className = 'badge bg-secondary bg-opacity-25 text-muted border px-2 py-1';
        badge.innerHTML = 'មិនទាន់ចុះឈ្មោះ';
    }
    if (preview) {
        delete preview.dataset.faceDescriptor;
        preview.src = 'assets/images/default-avatar.svg';
        preview.dataset.hasCustom = 'false';
    }
    if (typeof updateRemovePhotoBtnVisibility === 'function') updateRemovePhotoBtnVisibility();
    if (document.getElementById('emp-bank-name')) document.getElementById('emp-bank-name').value = '';
    if (document.getElementById('emp-bank-account')) document.getElementById('emp-bank-account').value = '';
    if (document.getElementById('emp-bank-account-name')) document.getElementById('emp-bank-account-name').value = '';
    if (typeof removeEmployeeBankQrInForm === 'function') removeEmployeeBankQrInForm();
    if (typeof removeEmployeeIdCardPhoto === 'function') removeEmployeeIdCardPhoto();

    const modalTitle = document.querySelector('#employeeModal .modal-title');
    if (modalTitle) modalTitle.textContent = 'បញ្ចូលព័ត៌មានបុគ្គលិកថ្មី';
    
    const subBtn = document.querySelector('#employeeForm button[type="submit"]');
    if (subBtn) subBtn.innerHTML = 'រក្សាទុក';
    
    await Promise.all([
        loadDepartmentsForEmp(''),
        loadPositionsForEmp(''),
        typeof generateEmpCode === 'function' ? generateEmpCode() : Promise.resolve()
    ]);
    
    const modalEl = document.getElementById('employeeModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }
};

window.editEmployee = async function(id) {
    try {
        const emp = await db.employees.get(id);
        if (!emp) return;
        
        editingEmployeeId = id;
        
        // Ensure dropdown options are loaded with the employee's values selected
        await Promise.all([
            loadDepartmentsForEmp(emp.department || ''),
            loadPositionsForEmp(emp.position || '')
        ]);
        
        const modalTitle = document.querySelector('#employeeModal .modal-title');
        if (modalTitle) modalTitle.textContent = 'កែប្រែព័ត៌មានបុគ្គលិក';
        
        const empCodeEl = document.getElementById('emp-code');
        if (empCodeEl) empCodeEl.value = emp.code || '';
        
        const natIdEl = document.getElementById('emp-national-id');
        if (natIdEl) natIdEl.value = emp.nationalId || '';
        
        const nameEl = document.getElementById('emp-name');
        if (nameEl) nameEl.value = emp.name || '';
        
        const latinNameEl = document.getElementById('emp-latin-name');
        if (latinNameEl) latinNameEl.value = emp.latinName || '';
        
        const genderEl = document.getElementById('emp-gender');
        if (genderEl) genderEl.value = emp.gender || 'ប្រុស';
        
        const dobEl = document.getElementById('emp-dob');
        if (dobEl) dobEl.value = emp.dob || '';
        
        const phoneEl = document.getElementById('emp-phone');
        if (phoneEl) phoneEl.value = emp.phone || '';
        
        if (document.getElementById('emp-currency')) {
            document.getElementById('emp-currency').value = emp.currency || 'USD';
        }
        
        const salaryEl = document.getElementById('emp-salary');
        if (salaryEl) salaryEl.value = emp.salary !== undefined ? emp.salary : '';
        
        const typeEl = document.getElementById('emp-type');
        if (typeEl) typeEl.value = emp.type || 'Full-Time';

        const startDateEl = document.getElementById('emp-start-date');
        if (startDateEl) startDateEl.value = emp.startDate || '';
        
        const wageTypeEl = document.getElementById('emp-wage-type');
        if (wageTypeEl) wageTypeEl.value = emp.wageType || 'Monthly';
        
        const preview = document.getElementById('emp-photo-preview');
        const badge = document.getElementById('emp-eface-status-badge');
        if (emp.faceDescriptor && Array.isArray(emp.faceDescriptor) && emp.faceDescriptor.length > 0) {
            if (badge) {
                badge.className = 'badge bg-success bg-opacity-25 text-success border border-success px-2 py-1';
                badge.innerHTML = '<i class="bi bi-shield-check me-1"></i> បានចុះឈ្មោះរួច';
            }
            if (preview) preview.dataset.faceDescriptor = JSON.stringify(emp.faceDescriptor);
        } else {
            if (badge) {
                badge.className = 'badge bg-secondary bg-opacity-25 text-muted border px-2 py-1';
                badge.innerHTML = 'មិនទាន់ចុះឈ្មោះ';
            }
            if (preview) delete preview.dataset.faceDescriptor;
        }
        if (preview) {
            if (emp.photo) {
                preview.src = emp.photo;
                preview.dataset.hasCustom = 'true';
            } else {
                preview.src = 'assets/images/default-avatar.svg';
                preview.dataset.hasCustom = 'false';
            }
        }
        if (typeof updateRemovePhotoBtnVisibility === 'function') updateRemovePhotoBtnVisibility();
        if (typeof updatePhotoPlaceholder === 'function') updatePhotoPlaceholder();

        // National ID Card photo
        const idCardPreview = document.getElementById('emp-idcard-preview');
        const idCardPlaceholder = document.getElementById('emp-idcard-placeholder');
        const idCardRemoveBtn = document.getElementById('btn-remove-emp-idcard');
        const idCardViewBtn = document.getElementById('btn-view-emp-idcard');
        const idCardRecropBtn = document.getElementById('btn-recrop-emp-idcard');
        const idCardBadge = document.getElementById('emp-idcard-status-badge');
        if (emp.idCardPhoto) {
            if (idCardPreview) { idCardPreview.src = emp.idCardPhoto; idCardPreview.style.display = 'block'; }
            if (idCardPlaceholder) idCardPlaceholder.style.display = 'none';
            if (idCardRemoveBtn) idCardRemoveBtn.style.display = 'inline-block';
            if (idCardViewBtn) idCardViewBtn.style.display = 'inline-block';
            if (idCardRecropBtn) idCardRecropBtn.style.display = 'inline-block';
            if (idCardBadge) {
                idCardBadge.className = 'badge bg-success bg-opacity-25 text-success border border-success';
                idCardBadge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>មានរូបកាត';
            }
        } else {
            if (typeof removeEmployeeIdCardPhoto === 'function') removeEmployeeIdCardPhoto();
        }

        // Bank details & QR
        if (document.getElementById('emp-bank-name')) document.getElementById('emp-bank-name').value = emp.bankName || '';
        if (document.getElementById('emp-bank-account')) document.getElementById('emp-bank-account').value = emp.bankAccount || '';
        if (document.getElementById('emp-bank-account-name')) document.getElementById('emp-bank-account-name').value = emp.bankAccountName || '';
        const qrPreview = document.getElementById('emp-bank-qr-preview');
        const qrPlaceholder = document.getElementById('emp-bank-qr-placeholder');
        const qrRemoveBtn = document.getElementById('btn-remove-emp-bank-qr');
        if (emp.bankQr) {
            if (qrPreview) { qrPreview.src = emp.bankQr; qrPreview.style.display = 'block'; }
            if (qrPlaceholder) qrPlaceholder.style.display = 'none';
            if (qrRemoveBtn) qrRemoveBtn.style.display = 'block';
        } else {
            if (qrPreview) { qrPreview.src = ''; qrPreview.style.display = 'none'; }
            if (qrPlaceholder) qrPlaceholder.style.display = 'block';
            if (qrRemoveBtn) qrRemoveBtn.style.display = 'none';
        }
        
        const subBtn = document.querySelector('#employeeForm button[type="submit"]');
        if (subBtn) subBtn.innerHTML = 'រក្សាទុក (Update)';
        
        const modalEl = document.getElementById('employeeModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
    } catch (err) {
        console.error('Error editing employee:', err);
        Swal.fire({icon: 'error', text: 'Error: ' + err.message, confirmButtonText: 'យល់ព្រម'});
    }
};

window.deleteEmployee = async function(id) {
    const res = await Swal.fire({
        title: '\u1794\u1789\u17d2\u1787\u17b6\u1780\u17cb',
        text: '\u178f\u17be\u17a2\u17d2\u1793\u1780\u1796\u17b7\u178f\u1787\u17b6\u1785\u1784\u17cb\u179b\u17bb\u1794\u1798\u17c2\u1793\u1791\u17c1?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798',
        cancelButtonText: '\u1794\u17c4\u17c7\u1794\u1784\u17cb'
    });
    if (res.isConfirmed) {
        await db.employees.delete(id);
        Swal.fire({icon: 'success', text: 'លុបបុគ្គលិកជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        loadEmployees();
    if (typeof buildEfaceMatcher === 'function') buildEfaceMatcher();
    }
};

document.getElementById('employeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.querySelector('#employeeForm button[type=submit]');
    btn.disabled = true;
    const origText = btn.innerHTML;
    btn.innerHTML = '\u1780\u17c6\u1796\u17bb\u1784\u178a\u17c6\u178e\u17be\u179a\u1780\u17b6\u179a...';
    
    try {
        const code = document.getElementById('emp-code').value.trim();
        const nationalId = document.getElementById('emp-national-id') ? document.getElementById('emp-national-id').value.trim() : '';
        const name = document.getElementById('emp-name').value.trim();
        const latinName = document.getElementById('emp-latin-name') ? document.getElementById('emp-latin-name').value.trim() : '';
        const gender = document.getElementById('emp-gender').value;
        const dob = document.getElementById('emp-dob').value;
        const phone = document.getElementById('emp-phone').value.trim();
        const department = document.getElementById('emp-department').value;
        const position = document.getElementById('emp-position').value;
        const type = document.getElementById('emp-type').value;
        const wageType = document.getElementById('emp-wage-type').value;
        const currency = document.getElementById('emp-currency') ? document.getElementById('emp-currency').value : 'USD';
        const salary = parseFloat(document.getElementById('emp-salary').value) || 0;
        const photoEl = document.getElementById('emp-photo-preview');
        const photo = (photoEl && photoEl.dataset.hasCustom === 'true' && photoEl.getAttribute('src')) ? photoEl.getAttribute('src') : '';

        const idCardEl = document.getElementById('emp-idcard-preview');
        const idCardPhoto = (idCardEl && idCardEl.style.display !== 'none' && idCardEl.getAttribute('src')) ? idCardEl.getAttribute('src') : '';

        const bankName = document.getElementById('emp-bank-name') ? document.getElementById('emp-bank-name').value.trim() : '';
        const bankAccount = document.getElementById('emp-bank-account') ? document.getElementById('emp-bank-account').value.trim() : '';
        const bankAccountName = document.getElementById('emp-bank-account-name') ? document.getElementById('emp-bank-account-name').value.trim() : '';
        const qrPreview = document.getElementById('emp-bank-qr-preview');
        const bankQr = (qrPreview && qrPreview.style.display !== 'none' && qrPreview.getAttribute('src')) ? qrPreview.getAttribute('src') : '';

        const allEmps = await db.employees.toArray();
        const isDuplicate = allEmps.some(e => e.code === code && e.id !== editingEmployeeId);
        if (isDuplicate) {
            Swal.fire({icon: 'error', text: 'អត្តលេខនេះមានរួចហើយ សូមបញ្ចូលអត្តលេខផ្សេង!', confirmButtonText: 'យល់ព្រម'});
            return;
        }

        const data = { 
            id: editingEmployeeId || Date.now(),
            code: code || '',
            nationalId: nationalId || '',
            idCardPhoto: idCardPhoto || '',
            name: name || '',
            latinName: latinName || '',
            gender: gender || 'ប្រុស',
            dob: dob || '',
            phone: phone || '',
            department: department || '',
            position: position || '',
            type: type || 'Full-Time',
            startDate: (document.getElementById('emp-start-date') ? document.getElementById('emp-start-date').value : '') || '',
            wageType: wageType || 'Monthly',
            currency: currency || 'USD',
            salary: isNaN(salary) ? 0 : salary,
            photo: photo || '',
            faceDescriptor: (photoEl && photoEl.dataset && photoEl.dataset.faceDescriptor) ? JSON.parse(photoEl.dataset.faceDescriptor) : (editingEmployeeId ? ((await db.employees.get(editingEmployeeId))?.faceDescriptor || null) : null),
            bankName: bankName || '',
            bankAccount: bankAccount || '',
            bankAccountName: bankAccountName || '',
            bankQr: bankQr || ''
        };
        if (editingEmployeeId) {
            await db.employees.update(editingEmployeeId, data);
            Swal.fire({icon: 'success', text: 'អាប់ដេតព័ត៌មានបុគ្គលិកជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        } else {
            await db.employees.add(data);
            Swal.fire({icon: 'success', text: 'បន្ថែមបុគ្គលិកថ្មីជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        }
        
        if (typeof buildEfaceMatcher === 'function') buildEfaceMatcher();
        document.getElementById('employeeForm').reset();
        document.getElementById('emp-type').value = 'Full-Time';
        document.getElementById('emp-wage-type').value = 'Monthly';
        if(document.getElementById('emp-currency')) document.getElementById('emp-currency').value = 'USD';
        if (typeof removeEmployeeBankQrInForm === 'function') removeEmployeeBankQrInForm();
        if (typeof removeEmployeeIdCardPhoto === 'function') removeEmployeeIdCardPhoto();
        editingEmployeeId = null;
        const prevPhoto = document.getElementById('emp-photo-preview');
        if (prevPhoto) {
            prevPhoto.src = 'assets/images/default-avatar.svg';
            prevPhoto.dataset.hasCustom = 'false';
        }
        if (typeof updateRemovePhotoBtnVisibility === 'function') updateRemovePhotoBtnVisibility();
        btn.innerHTML = 'រក្សាទុក';
        if(typeof generateEmpCode === 'function') generateEmpCode();
        loadEmployees();
        const modalEl = document.getElementById('employeeModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        Swal.fire('\u1787\u17c4\u1782\u1787\u17d0\u1799', '\u1787\u17c4\u1782\u1787\u17d0\u1799!', 'success');
    } catch(err) {
        console.error(err);
        Swal.fire({icon: 'error', text: 'Error: ' + err.message, confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
    } finally {
        btn.disabled = false;
        if (btn.innerHTML === '\u1780\u17c6\u1796\u17bb\u1784\u178a\u17c6\u178e\u17be\u179a\u1780\u17b6\u179a...') {
            btn.innerHTML = origText;
        }
    }
});

// ====== PHOTO UPLOAD, DRAG & DROP & CROPPER ======
let cropper = null;
const dropzone = document.getElementById('emp-photo-dropzone');
const photoInput = document.getElementById('emp-photo');
const cropperModalEl = document.getElementById('cropperModal');
let cropperModal = null;
if (typeof bootstrap !== 'undefined' && cropperModalEl) {
    cropperModal = new bootstrap.Modal(cropperModalEl);
}

// Hide placeholder if src exists
function updatePhotoPlaceholder() {
    const preview = document.getElementById('emp-photo-preview');
    const placeholder = document.getElementById('emp-photo-placeholder');
    if(preview && placeholder) {
        if (!preview.getAttribute('src')) {
            preview.src = 'assets/images/default-avatar.svg';
            preview.dataset.hasCustom = 'false';
        }
        preview.style.display = 'block';
        placeholder.style.display = 'block';
    }
}
updatePhotoPlaceholder();

// ====== REMOVE PHOTO HELPER ======
function updateRemovePhotoBtnVisibility() {
    const preview = document.getElementById('emp-photo-preview');
    const removeBtn = document.getElementById('btn-remove-emp-photo');
    if (!removeBtn) return;
    const hasCustom = preview && preview.dataset.hasCustom === 'true';
    removeBtn.style.display = hasCustom ? 'block' : 'none';
}
window.updateRemovePhotoBtnVisibility = updateRemovePhotoBtnVisibility;

window.removeEmployeePhoto = function() {
    const preview = document.getElementById('emp-photo-preview');
    if (preview) {
        preview.src = 'assets/images/default-avatar.svg';
        preview.dataset.hasCustom = 'false';
    }
    const photoInput = document.getElementById('emp-photo');
    if (photoInput) photoInput.value = '';
    updateRemovePhotoBtnVisibility();
    if (typeof updatePhotoPlaceholder === 'function') updatePhotoPlaceholder();
};
updateRemovePhotoBtnVisibility();

// ====== BANK QR HELPER FOR EMPLOYEE FORM ======
window.removeEmployeeBankQrInForm = function() {
    const preview = document.getElementById('emp-bank-qr-preview');
    const placeholder = document.getElementById('emp-bank-qr-placeholder');
    const removeBtn = document.getElementById('btn-remove-emp-bank-qr');
    const input = document.getElementById('emp-bank-qr');
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'none';
    if (input) input.value = '';
};

const bankQrFileInput = document.getElementById('emp-bank-qr');
if (bankQrFileInput) {
    bankQrFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
            if (typeof compressQrImage === 'function') {
                const compressed = await compressQrImage(file, 600, 0.9);
                const preview = document.getElementById('emp-bank-qr-preview');
                const placeholder = document.getElementById('emp-bank-qr-placeholder');
                const removeBtn = document.getElementById('btn-remove-emp-bank-qr');
                if (preview) {
                    preview.src = compressed;
                    preview.style.display = 'block';
                }
                if (placeholder) placeholder.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'block';
            }
        } catch (err) {
            console.error("Error processing QR image:", err);
            Swal.fire('បញ្ហា', 'មិនអាចអានរូបភាព QR បានឡើយ', 'error');
        }
    });
}

// ====== NATIONAL ID CARD PHOTO HELPER & DRAG-AND-DROP & CROPPER ======
let idCardCropper = null;
let idCardScaleX = 1;
let currentIdCardAspect = 1.586;
let idCardPreviewDebounceTimer = null;
const idCardCropperModalEl = document.getElementById('idCardCropperModal');
let idCardCropperModal = null;
if (typeof bootstrap !== 'undefined' && idCardCropperModalEl) {
    idCardCropperModal = new bootstrap.Modal(idCardCropperModalEl);
}

window.removeEmployeeIdCardPhoto = function() {
    const preview = document.getElementById('emp-idcard-preview');
    const placeholder = document.getElementById('emp-idcard-placeholder');
    const removeBtn = document.getElementById('btn-remove-emp-idcard');
    const viewBtn = document.getElementById('btn-view-emp-idcard');
    const recropBtn = document.getElementById('btn-recrop-emp-idcard');
    const input = document.getElementById('emp-idcard-photo');
    const badge = document.getElementById('emp-idcard-status-badge');

    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'none';
    if (viewBtn) viewBtn.style.display = 'none';
    if (recropBtn) recropBtn.style.display = 'none';
    if (input) input.value = '';
    if (badge) {
        badge.className = 'badge bg-light text-muted border';
        badge.innerHTML = '<i class="bi bi-card-image me-1"></i>គ្មានរូបកាត';
    }
};

window.viewCurrentFormIdCard = function() {
    const preview = document.getElementById('emp-idcard-preview');
    if (!preview || !preview.src || preview.style.display === 'none') {
        Swal.fire({ icon: 'info', title: 'គ្មានរូបភាព', text: 'សូមបញ្ចូលរូបអត្តសញ្ញាណប័ណ្ណជាមុនសិន!' });
        return;
    }
    const empName = document.getElementById('emp-name')?.value || 'អត្តសញ្ញាណប័ណ្ណ';
    const empCode = document.getElementById('emp-code')?.value || '';
    
    currentViewingEmp = { name: empName, code: empCode, _isIdCard: true };
    currentViewerZoom = 1;
    currentPanX = 0;
    currentPanY = 0;

    const modalEl = document.getElementById('empPhotoViewerModal');
    if (!modalEl) return;

    const nameEl = document.getElementById('viewer-emp-name');
    if (nameEl) nameEl.innerHTML = `<i class="bi bi-card-heading text-warning me-1"></i> រូបអត្តសញ្ញាណប័ណ្ណ៖ ${empName}`;

    const codeEl = document.getElementById('viewer-emp-code');
    if (codeEl) codeEl.textContent = empCode ? `(${empCode})` : '';

    const imgEl = document.getElementById('viewer-emp-img');
    if (imgEl) {
        imgEl.src = preview.src;
        imgEl.style.transform = 'translate(0px, 0px) scale(1)';
    }

    const zoomLevelEl = document.getElementById('viewer-zoom-level');
    if (zoomLevelEl) zoomLevelEl.textContent = '100%';

    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
};

window.viewEmployeeIdCardPhoto = async function(empId) {
    try {
        const emp = await db.employees.get(empId);
        if (!emp || !emp.idCardPhoto) {
            Swal.fire({ icon: 'info', title: 'គ្មានរូបភាព', text: 'បុគ្គលិកនេះមិនទាន់មានរូបអត្តសញ្ញាណប័ណ្ណនៅឡើយទេ។', confirmButtonText: 'យល់ព្រម' });
            return;
        }
        currentViewingEmp = { ...emp, _isIdCard: true };
        currentViewerZoom = 1;
        currentPanX = 0;
        currentPanY = 0;

        const modalEl = document.getElementById('empPhotoViewerModal');
        if (!modalEl) return;

        const nameEl = document.getElementById('viewer-emp-name');
        if (nameEl) nameEl.innerHTML = `<i class="bi bi-card-heading text-warning me-1"></i> រូបអត្តសញ្ញាណប័ណ្ណ៖ ${emp.name}`;

        const codeEl = document.getElementById('viewer-emp-code');
        if (codeEl) codeEl.textContent = emp.code ? `(${emp.code})` : '';

        const imgEl = document.getElementById('viewer-emp-img');
        if (imgEl) {
            imgEl.src = emp.idCardPhoto;
            imgEl.style.transform = 'translate(0px, 0px) scale(1)';
        }

        const zoomLevelEl = document.getElementById('viewer-zoom-level');
        if (zoomLevelEl) zoomLevelEl.textContent = '100%';

        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    } catch (err) {
        console.error('Error viewing employee ID card:', err);
    }
};

window.reCropCurrentFormIdCard = function() {
    const preview = document.getElementById('emp-idcard-preview');
    if (!preview || !preview.src || preview.style.display === 'none') {
        Swal.fire({ icon: 'info', title: 'គ្មានរូបភាព', text: 'សូមបញ្ចូលរូបអត្តសញ្ញាណប័ណ្ណជាមុនសិន!' });
        return;
    }
    openIdCardCropperWithImage(preview.src);
};

window.openIdCardCropperWithImage = function(imageSrc) {
    const img = document.getElementById('idcard-cropper-image');
    if (img) img.src = imageSrc;

    idCardScaleX = 1;
    currentIdCardAspect = 1.586;

    // Reset controls to ID card defaults (25% sharpen, +12 contrast for clear text)
    const sh = document.getElementById('idcard-sharpen'); if (sh) sh.value = 25;
    const shV = document.getElementById('idcard-sharpen-val'); if (shV) shV.textContent = '25%';
    const br = document.getElementById('idcard-brightness'); if (br) br.value = 0;
    const brV = document.getElementById('idcard-brightness-val'); if (brV) brV.textContent = '0';
    const ct = document.getElementById('idcard-contrast'); if (ct) ct.value = 12;
    const ctV = document.getElementById('idcard-contrast-val'); if (ctV) ctV.textContent = '+12';

    updateIdCardRatioButtons('idcard-ratio-card');

    if (!idCardCropperModal && idCardCropperModalEl && typeof bootstrap !== 'undefined') {
        idCardCropperModal = new bootstrap.Modal(idCardCropperModalEl);
    }
    if (idCardCropperModal) idCardCropperModal.show();
};

async function handleIdCardFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) {
        Swal.fire({ icon: 'error', text: 'សូមជ្រើសរើសឯកសារជារូបភាព (JPG, PNG, WebP)!', confirmButtonText: 'យល់ព្រម' });
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        openIdCardCropperWithImage(e.target.result);
    };
    reader.onerror = (err) => {
        console.error('Error reading ID card file:', err);
        Swal.fire({ icon: 'error', text: 'មិនអាចអានរូបភាពអត្តសញ្ញាណប័ណ្ណបានឡើយ!' });
    };
    reader.readAsDataURL(file);
}

function updateIdCardRatioButtons(activeId) {
    ['idcard-ratio-card', 'idcard-ratio-free', 'idcard-ratio-portrait'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (id === activeId) {
            btn.className = 'btn btn-sm btn-primary active fw-bold px-2 py-1';
        } else {
            btn.className = 'btn btn-sm btn-outline-secondary px-2 py-1';
        }
    });
}

function debounceRenderIdCardCropPreview() {
    clearTimeout(idCardPreviewDebounceTimer);
    idCardPreviewDebounceTimer = setTimeout(renderIdCardLivePreview, 75);
}

function renderIdCardLivePreview() {
    if (!idCardCropper) return;
    const previewCanvas = document.getElementById('idcard-crop-live-preview');
    if (!previewCanvas) return;
    const previewCtx = previewCanvas.getContext('2d');

    const cropData = idCardCropper.getData();
    const aspect = (cropData.width && cropData.height) ? (cropData.width / cropData.height) : 1.586;
    const pWidth = 580;
    const pHeight = Math.max(100, Math.round(580 / aspect));

    const croppedCanvas = idCardCropper.getCroppedCanvas({
        width: pWidth,
        height: pHeight,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    if (!croppedCanvas) return;

    previewCanvas.width = pWidth;
    previewCanvas.height = pHeight;
    previewCtx.clearRect(0, 0, pWidth, pHeight);
    previewCtx.drawImage(croppedCanvas, 0, 0, pWidth, pHeight);

    const sharpen = parseInt(document.getElementById('idcard-sharpen')?.value || '0', 10);
    const brightness = parseInt(document.getElementById('idcard-brightness')?.value || '0', 10);
    const contrast = parseInt(document.getElementById('idcard-contrast')?.value || '0', 10);

    processCanvasEnhancements(previewCtx, pWidth, pHeight, brightness, contrast, sharpen);

    const sizeBadge = document.getElementById('idcard-crop-file-size');
    if (sizeBadge) {
        previewCanvas.toBlob((blob) => {
            if (blob && sizeBadge) {
                const estKb = Math.round((blob.size / 1024) * 1.6);
                sizeBadge.textContent = `~${estKb > 0 ? estKb : 85} KB`;
            }
        }, 'image/webp', 0.88);
    }
}

// Modal lifecycle events for ID Card Cropper
if (idCardCropperModalEl) {
    idCardCropperModalEl.addEventListener('show.bs.modal', () => {
        idCardCropperModalEl.style.zIndex = '1070';
        setTimeout(() => {
            const backdrops = document.querySelectorAll('.modal-backdrop');
            if (backdrops.length > 1) {
                backdrops[backdrops.length - 1].style.zIndex = '1065';
            }
        }, 10);
    });

    idCardCropperModalEl.addEventListener('shown.bs.modal', () => {
        const image = document.getElementById('idcard-cropper-image');
        if (!image) return;
        if (idCardCropper) idCardCropper.destroy();

        idCardCropper = new Cropper(image, {
            aspectRatio: currentIdCardAspect || 1.586,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.92,
            restore: false,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            crop: debounceRenderIdCardCropPreview
        });

        setTimeout(renderIdCardLivePreview, 150);
    });

    idCardCropperModalEl.addEventListener('hidden.bs.modal', () => {
        if (idCardCropper) {
            idCardCropper.destroy();
            idCardCropper = null;
        }
        setTimeout(() => {
            const openModals = document.querySelectorAll('.modal.show');
            if (openModals.length > 0) {
                document.body.classList.add('modal-open');
            }
        }, 50);
    });
}

// Rotate buttons (↺ 90° L, ↻ 90° R)
document.getElementById('idcard-rotate-left')?.addEventListener('click', () => {
    if (idCardCropper) {
        idCardCropper.rotate(-90);
        debounceRenderIdCardCropPreview();
    }
});

document.getElementById('idcard-rotate-right')?.addEventListener('click', () => {
    if (idCardCropper) {
        idCardCropper.rotate(90);
        debounceRenderIdCardCropPreview();
    }
});

// Flip Horizontal
document.getElementById('idcard-flip-h')?.addEventListener('click', () => {
    if (idCardCropper) {
        idCardScaleX = -idCardScaleX;
        idCardCropper.scaleX(idCardScaleX);
        debounceRenderIdCardCropPreview();
    }
});

// Zoom in / out
document.getElementById('idcard-zoom-in')?.addEventListener('click', () => {
    if (idCardCropper) {
        idCardCropper.zoom(0.1);
        debounceRenderIdCardCropPreview();
    }
});

document.getElementById('idcard-zoom-out')?.addEventListener('click', () => {
    if (idCardCropper) {
        idCardCropper.zoom(-0.1);
        debounceRenderIdCardCropPreview();
    }
});

// Reset
document.getElementById('idcard-reset-all')?.addEventListener('click', () => {
    if (idCardCropper) {
        idCardScaleX = 1;
        idCardCropper.reset();
        currentIdCardAspect = 1.586;
        idCardCropper.setAspectRatio(1.586);
        updateIdCardRatioButtons('idcard-ratio-card');
    }
    const sh = document.getElementById('idcard-sharpen'); if (sh) sh.value = 25;
    const shV = document.getElementById('idcard-sharpen-val'); if (shV) shV.textContent = '25%';
    const br = document.getElementById('idcard-brightness'); if (br) br.value = 0;
    const brV = document.getElementById('idcard-brightness-val'); if (brV) brV.textContent = '0';
    const ct = document.getElementById('idcard-contrast'); if (ct) ct.value = 12;
    const ctV = document.getElementById('idcard-contrast-val'); if (ctV) ctV.textContent = '+12';
    debounceRenderIdCardCropPreview();
});

// Aspect ratio buttons
document.getElementById('idcard-ratio-card')?.addEventListener('click', () => {
    currentIdCardAspect = 1.586;
    if (idCardCropper) idCardCropper.setAspectRatio(1.586);
    updateIdCardRatioButtons('idcard-ratio-card');
    debounceRenderIdCardCropPreview();
});

document.getElementById('idcard-ratio-free')?.addEventListener('click', () => {
    currentIdCardAspect = NaN;
    if (idCardCropper) idCardCropper.setAspectRatio(NaN);
    updateIdCardRatioButtons('idcard-ratio-free');
    debounceRenderIdCardCropPreview();
});

document.getElementById('idcard-ratio-portrait')?.addEventListener('click', () => {
    currentIdCardAspect = 0.63;
    if (idCardCropper) idCardCropper.setAspectRatio(0.63);
    updateIdCardRatioButtons('idcard-ratio-portrait');
    debounceRenderIdCardCropPreview();
});

// Auto-Enhance Button (✨)
document.getElementById('btn-idcard-auto-enhance')?.addEventListener('click', () => {
    const sh = document.getElementById('idcard-sharpen'); if (sh) sh.value = 45;
    const shV = document.getElementById('idcard-sharpen-val'); if (shV) shV.textContent = '45%';
    const br = document.getElementById('idcard-brightness'); if (br) br.value = 6;
    const brV = document.getElementById('idcard-brightness-val'); if (brV) brV.textContent = '+6';
    const ct = document.getElementById('idcard-contrast'); if (ct) ct.value = 20;
    const ctV = document.getElementById('idcard-contrast-val'); if (ctV) ctV.textContent = '+20';
    debounceRenderIdCardCropPreview();
});

// Sliders listener
['idcard-sharpen', 'idcard-brightness', 'idcard-contrast'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', (e) => {
            const valEl = document.getElementById(id + '-val');
            if (valEl) {
                const prefix = (id === 'idcard-contrast' || id === 'idcard-brightness') && parseInt(e.target.value) > 0 ? '+' : '';
                const suffix = (id === 'idcard-sharpen') ? '%' : '';
                valEl.textContent = prefix + e.target.value + suffix;
            }
            debounceRenderIdCardCropPreview();
        });
    }
});

// Save Button
const btnIdCardSave = document.getElementById('idcard-crop-save-btn');
if (btnIdCardSave) {
    btnIdCardSave.addEventListener('click', async () => {
        if (!idCardCropper) return;
        const origBtnHtml = btnIdCardSave.innerHTML;
        btnIdCardSave.disabled = true;
        btnIdCardSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>កំពុងរក្សាទុក...';

        try {
            const cropData = idCardCropper.getData();
            const aspect = (cropData.width && cropData.height) ? (cropData.width / cropData.height) : 1.586;
            // Target high resolution: max width 1200px (so Khmer text and micro details are crisp and legible on zoom)
            const targetWidth = Math.min(1200, Math.max(800, Math.round(cropData.width)));
            const targetHeight = Math.max(200, Math.round(targetWidth / aspect));

            const highResCanvas = idCardCropper.getCroppedCanvas({
                width: targetWidth,
                height: targetHeight,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            if (!highResCanvas) {
                throw new Error('មិនអាចទាញយកទិន្នន័យរូបភាពពី Cropper បានទេ');
            }

            const highResCtx = highResCanvas.getContext('2d');
            const sharpen = parseInt(document.getElementById('idcard-sharpen')?.value || '0', 10);
            const brightness = parseInt(document.getElementById('idcard-brightness')?.value || '0', 10);
            const contrast = parseInt(document.getElementById('idcard-contrast')?.value || '0', 10);

            processCanvasEnhancements(highResCtx, targetWidth, targetHeight, brightness, contrast, sharpen);

            let finalDataUrl = highResCanvas.toDataURL('image/webp', 0.88);
            if (!finalDataUrl || finalDataUrl.length < 100 || !finalDataUrl.startsWith('data:image/webp')) {
                finalDataUrl = highResCanvas.toDataURL('image/jpeg', 0.88);
            }

            // Put into preview and form state
            const preview = document.getElementById('emp-idcard-preview');
            const placeholder = document.getElementById('emp-idcard-placeholder');
            const removeBtn = document.getElementById('btn-remove-emp-idcard');
            const viewBtn = document.getElementById('btn-view-emp-idcard');
            const recropBtn = document.getElementById('btn-recrop-emp-idcard');
            const badge = document.getElementById('emp-idcard-status-badge');

            if (preview) {
                preview.src = finalDataUrl;
                preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'inline-block';
            if (viewBtn) viewBtn.style.display = 'inline-block';
            if (recropBtn) recropBtn.style.display = 'inline-block';
            if (badge) {
                badge.className = 'badge bg-success bg-opacity-25 text-success border border-success';
                badge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>មានរូបកាត';
            }

            if (idCardCropperModal) idCardCropperModal.hide();

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'កាត់ និងកែប្រែរូបអត្តសញ្ញាណប័ណ្ណជោគជ័យ!',
                    text: 'រូបភាពកាតត្រូវបានរក្សាទុកយ៉ាងច្បាស់ម៉ត់',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            console.error('Error saving cropped ID card:', err);
            Swal.fire({ icon: 'error', text: 'បរាជ័យក្នុងការកាត់រូបកាត: ' + err.message });
        } finally {
            btnIdCardSave.disabled = false;
            btnIdCardSave.innerHTML = origBtnHtml;
        }
    });
}

const idCardDropzone = document.getElementById('emp-idcard-dropzone');
const idCardFileInput = document.getElementById('emp-idcard-photo');

if (idCardDropzone && idCardFileInput) {
    idCardDropzone.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        idCardFileInput.click();
    });
    idCardDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        idCardDropzone.classList.remove('bg-light');
        idCardDropzone.classList.add('bg-primary', 'bg-opacity-10');
        idCardDropzone.style.borderColor = '#0b5ed7';
    });
    idCardDropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        idCardDropzone.classList.add('bg-light');
        idCardDropzone.classList.remove('bg-primary', 'bg-opacity-10');
        idCardDropzone.style.borderColor = '#0d6efd';
    });
    idCardDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        idCardDropzone.classList.add('bg-light');
        idCardDropzone.classList.remove('bg-primary', 'bg-opacity-10');
        idCardDropzone.style.borderColor = '#0d6efd';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleIdCardFileSelect(e.dataTransfer.files[0]);
        }
    });

    idCardFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleIdCardFileSelect(e.target.files[0]);
        }
        idCardFileInput.value = '';
    });
}

if (dropzone && photoInput) {
    dropzone.addEventListener('click', () => photoInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.remove('bg-light'); dropzone.classList.add('bg-info', 'bg-opacity-10'); });
    dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.classList.add('bg-light'); dropzone.classList.remove('bg-info', 'bg-opacity-10'); });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.add('bg-light');
        dropzone.classList.remove('bg-info', 'bg-opacity-10');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    photoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
        photoInput.value = ''; 
    });
}

function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        Swal.fire({icon: 'error', text: 'សូមជ្រើសរើសឯកសារជារូបភាព!', confirmButtonText: 'យល់ព្រម'});
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('cropper-image');
        if(img) img.src = e.target.result;

        // Reset controls for fresh image
        const sh = document.getElementById('crop-sharpen'); if (sh) sh.value = 0;
        const shV = document.getElementById('crop-sharpen-val'); if (shV) shV.textContent = '0%';
        const br = document.getElementById('crop-brightness'); if (br) br.value = 0;
        const brV = document.getElementById('crop-brightness-val'); if (brV) brV.textContent = '0';
        const ct = document.getElementById('crop-contrast'); if (ct) ct.value = 0;
        const ctV = document.getElementById('crop-contrast-val'); if (ctV) ctV.textContent = '0';
        const tol = document.getElementById('crop-bg-tolerance'); if (tol) tol.value = 45;
        const tolV = document.getElementById('crop-bg-tol-val'); if (tolV) tolV.textContent = '45';
        selectedCropBgColor = 'original';
        currentAiMaskCanvas = null;
        isAiSegmenting = false;
        document.querySelectorAll('.crop-bg-btn').forEach(b => {
            if (b.getAttribute('data-color') === 'original') b.classList.add('active');
            else b.classList.remove('active');
        });
        const tolWrap = document.getElementById('crop-bg-tol-wrap');
        if (tolWrap) tolWrap.style.display = 'none';

        // Pre-warm MediaPipe AI in background so it's ready when user picks a color
        getSelfieSegmenter().catch(() => {});

        if(cropperModal) cropperModal.show();
    };
    reader.readAsDataURL(file);
}

let selectedCropBgColor = 'original';
let previewDebounceTimer = null;
let selfieSegmenter = null;
let selfieSegLoadingPromise = null;
let currentAiMaskCanvas = null;
let isAiSegmenting = false;

function hexToRgb(hex) {
    if (!hex) return null;
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
        return {
            r: parseInt(clean[0] + clean[0], 16),
            g: parseInt(clean[1] + clean[1], 16),
            b: parseInt(clean[2] + clean[2], 16)
        };
    }
    if (clean.length === 6) {
        return {
            r: parseInt(clean.substring(0, 2), 16),
            g: parseInt(clean.substring(2, 4), 16),
            b: parseInt(clean.substring(4, 6), 16)
        };
    }
    return null;
}

// ====== AI SELFIE SEGMENTATION (PERSON & WHITE SHIRT PROTECTION) ======
function getSelfieSegmenter() {
    if (selfieSegmenter) return Promise.resolve(selfieSegmenter);
    if (selfieSegLoadingPromise) return selfieSegLoadingPromise;

    selfieSegLoadingPromise = new Promise((resolve, reject) => {
        try {
            if (typeof SelfieSegmentation === 'undefined') {
                reject(new Error('MediaPipe SelfieSegmentation script not loaded'));
                return;
            }
            const segmenter = new SelfieSegmentation({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
            });
            segmenter.setOptions({
                modelSelection: 0, // General 256x256 square portrait model
                selfieMode: false
            });
            selfieSegmenter = segmenter;
            resolve(segmenter);
        } catch (e) {
            reject(e);
        }
    });
    return selfieSegLoadingPromise;
}

async function requestAiSegmentation(croppedCanvas) {
    if (!croppedCanvas) return null;
    const spinner = document.getElementById('crop-ai-spinner');
    if (spinner) spinner.style.display = 'block';

    try {
        const segmenter = await getSelfieSegmenter();
        const maskCanvas = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('AI Segmentation timeout'));
            }, 8000);

            segmenter.onResults((results) => {
                clearTimeout(timeout);
                if (results && results.segmentationMask) {
                    const mCanvas = document.createElement('canvas');
                    mCanvas.width = 280;
                    mCanvas.height = 280;
                    const mCtx = mCanvas.getContext('2d');
                    mCtx.drawImage(results.segmentationMask, 0, 0, 280, 280);
                    resolve(mCanvas);
                } else {
                    reject(new Error('Empty segmentation result'));
                }
            });

            segmenter.send({ image: croppedCanvas }).catch((err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        if (spinner) spinner.style.display = 'none';
        return maskCanvas;
    } catch (err) {
        console.warn('AI Segmentation failed or fallback:', err);
        if (spinner) spinner.style.display = 'none';
        return null;
    }
}

function applyAiBackground(destCtx, croppedCanvas, maskCanvas, targetColor) {
    const width = 280;
    const height = 280;

    const bufCanvas = document.createElement('canvas');
    bufCanvas.width = width;
    bufCanvas.height = height;
    const bufCtx = bufCanvas.getContext('2d');
    bufCtx.drawImage(croppedCanvas, 0, 0, width, height);

    const imgData = bufCtx.getImageData(0, 0, width, height);
    const pixels = imgData.data;
    const mData = maskCanvas.getContext('2d').getImageData(0, 0, width, height).data;

    let targetR = 255, targetG = 255, targetB = 255, isTransparent = false;
    if (!targetColor || targetColor === 'transparent') {
        isTransparent = true;
    } else {
        const rgb = hexToRgb(targetColor);
        if (rgb) {
            targetR = rgb.r;
            targetG = rgb.g;
            targetB = rgb.b;
        }
    }

    for (let i = 0; i < pixels.length; i += 4) {
        // MediaPipe segmentation mask: person has high value in R and/or Alpha
        const confidence = Math.max(mData[i], mData[i + 3]) / 255;

        if (confidence >= 0.65) {
            // Definite Person (skin, hair, eyes, clothes, white shirt) -> Keep 100% original pixel!
            // White shirt is never erased
        } else if (confidence <= 0.25) {
            // Definite Background
            if (isTransparent) {
                pixels[i + 3] = 0;
            } else {
                pixels[i] = targetR;
                pixels[i + 1] = targetG;
                pixels[i + 2] = targetB;
                pixels[i + 3] = 255;
            }
        } else {
            // Soft Antialiased Edge Feathering between 0.25 and 0.65
            const fgFactor = (confidence - 0.25) / 0.40;
            if (isTransparent) {
                pixels[i + 3] = Math.round(pixels[i + 3] * fgFactor);
            } else {
                pixels[i] = Math.round(pixels[i] * fgFactor + targetR * (1 - fgFactor));
                pixels[i + 1] = Math.round(pixels[i] * fgFactor + targetG * (1 - fgFactor));
                pixels[i + 2] = Math.round(pixels[i] * fgFactor + targetB * (1 - fgFactor));
                pixels[i + 3] = 255;
            }
        }
    }

    destCtx.putImageData(imgData, 0, 0);
}

// ====== FALLBACK COLOR-BASED BACKGROUND REPLACEMENT (WITH SHIRT PROTECTION) ======
function processCanvasBackground(ctx, width, height, targetHex, tolerance = 45) {
    if (!targetHex || targetHex === 'original') return;
    const isTransparent = (targetHex === 'transparent');
    const target = isTransparent ? { r: 255, g: 255, b: 255 } : hexToRgb(targetHex);
    if (!target) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Sample background from 4 outer corners and top-middle
    const sampleCoords = [
        [2, 2], [width - 3, 2], [Math.floor(width / 2), 2],
        [2, Math.floor(height * 0.25)], [width - 3, Math.floor(height * 0.25)]
    ];
    let sR = 0, sG = 0, sB = 0, sCount = 0;
    for (let [sx, sy] of sampleCoords) {
        const idx = (sy * width + sx) * 4;
        if (data[idx + 3] > 40) {
            sR += data[idx]; sG += data[idx + 1]; sB += data[idx + 2];
            sCount++;
        }
    }
    if (sCount > 0) {
        sR = Math.round(sR / sCount);
        sG = Math.round(sG / sCount);
        sB = Math.round(sB / sCount);
    } else {
        sR = 240; sG = 240; sB = 240;
    }

    const tolSq = tolerance * tolerance;
    const isBg = new Uint8Array(width * height);
    const queue = [];

    // Seed outer edges
    for (let x = 0; x < width; x++) {
        isBg[0 * width + x] = 1;
        queue.push(0 * width + x);
    }
    for (let y = 1; y < Math.floor(height * 0.7); y++) {
        isBg[y * width + 0] = 1;
        queue.push(y * width + 0);
        isBg[y * width + (width - 1)] = 1;
        queue.push(y * width + (width - 1));
    }

    let head = 0;
    while (head < queue.length) {
        const p = queue[head++];
        const px = p % width;
        const py = Math.floor(p / width);

        const neighbors = [
            px > 0 ? p - 1 : -1,
            px < width - 1 ? p + 1 : -1,
            py > 0 ? p - width : -1,
            py < height - 1 ? p + width : -1
        ];

        for (let np of neighbors) {
            if (np >= 0 && !isBg[np]) {
                const nx = np % width;
                const ny = Math.floor(np / width);
                const nIdx = np * 4;
                const a = data[nIdx + 3];

                if (a < 50) {
                    isBg[np] = 1;
                    queue.push(np);
                    continue;
                }

                const r = data[nIdx];
                const g = data[nIdx + 1];
                const b = data[nIdx + 2];

                // Protect face / skin tone in center region
                if (nx > width * 0.25 && nx < width * 0.75 && ny > height * 0.15 && ny < height * 0.85) {
                    if (r > 60 && g > 40 && b > 20 && r > g && g > b && (r - g >= 14)) {
                        continue;
                    }
                }

                // Protect torso & chest region (white shirt / clothes)
                if (ny > height * 0.38 && nx > width * 0.20 && nx < width * 0.80) {
                    if (r > 170 && g > 170 && b > 170) {
                        continue;
                    }
                    if (Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && (r + g + b) > 380) {
                        continue;
                    }
                }

                const dr = r - sR;
                const dg = g - sG;
                const db = b - sB;
                if ((dr * dr + dg * dg + db * db) <= tolSq) {
                    isBg[np] = 1;
                    queue.push(np);
                }
            }
        }
    }

    // Apply target background with feathering
    for (let i = 0; i < width * height; i++) {
        if (isBg[i]) {
            const idx = i * 4;
            const px = i % width;
            const py = Math.floor(i / width);
            const isEdge = (px > 0 && !isBg[i - 1]) ||
                           (px < width - 1 && !isBg[i + 1]) ||
                           (py > 0 && !isBg[i - width]) ||
                           (py < height - 1 && !isBg[i + width]);
            if (isTransparent) {
                data[idx + 3] = isEdge ? 120 : 0;
            } else if (isEdge) {
                data[idx] = Math.round((data[idx] + target.r) / 2);
                data[idx + 1] = Math.round((data[idx + 1] + target.g) / 2);
                data[idx + 2] = Math.round((data[idx + 2] + target.b) / 2);
                data[idx + 3] = 255;
            } else {
                data[idx] = target.r;
                data[idx + 1] = target.g;
                data[idx + 2] = target.b;
                data[idx + 3] = 255;
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

// 2. Brightness, Contrast & Sharpening (Fix blur / old photo)
function processCanvasEnhancements(ctx, width, height, brightness, contrast, sharpen) {
    if (brightness === 0 && contrast === 0 && sharpen === 0) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // A. Brightness & Contrast
    if (brightness !== 0 || contrast !== 0) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            if (contrast !== 0) {
                r = factor * (r - 128) + 128;
                g = factor * (g - 128) + 128;
                b = factor * (b - 128) + 128;
            }
            if (brightness !== 0) {
                r += brightness;
                g += brightness;
                b += brightness;
            }

            data[i] = r < 0 ? 0 : (r > 255 ? 255 : r);
            data[i + 1] = g < 0 ? 0 : (g > 255 ? 255 : g);
            data[i + 2] = b < 0 ? 0 : (b > 255 ? 255 : b);
        }
    }

    // B. Sharpen (Unsharp Mask Kernel to fix blurry/old photos)
    if (sharpen > 0) {
        const s = (sharpen / 100) * 0.8;
        const copy = new Uint8ClampedArray(data);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const top = ((y - 1) * width + x) * 4;
                const btm = ((y + 1) * width + x) * 4;
                const lft = (y * width + (x - 1)) * 4;
                const rgt = (y * width + (x + 1)) * 4;

                for (let c = 0; c < 3; c++) {
                    const center = copy[idx + c];
                    const neighbors = copy[top + c] + copy[btm + c] + copy[lft + c] + copy[rgt + c];
                    let val = center * (1 + 4 * s) - neighbors * s;
                    data[idx + c] = val < 0 ? 0 : (val > 255 ? 255 : val);
                }
            }
        }
    }

    ctx.putImageData(imgData, 0, 0);
}

// 3. Export as WebP strictly under 50KB
function exportOptimizedWebP(canvas) {
    let quality = 0.84;
    let dataUrl = canvas.toDataURL('image/webp', quality);
    
    // In case browser doesn't support WebP, fallback to JPEG
    if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    // Strictly ensure < 50KB (48KB buffer)
    const maxBytes = 48 * 1024;
    while (dataUrl.length * 0.75 > maxBytes && quality > 0.35) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/webp', quality);
    }
    const sizeKb = ((dataUrl.length * 0.75) / 1024).toFixed(1);
    return { dataUrl, sizeKb };
}

// 4. Live Preview Renderer
function renderCropLivePreview() {
    if (!cropper) return;
    const previewCanvas = document.getElementById('crop-live-preview');
    if (!previewCanvas) return;
    const previewCtx = previewCanvas.getContext('2d');

    const croppedCanvas = cropper.getCroppedCanvas({
        width: 280,
        height: 280,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    if (!croppedCanvas) return;

    const workCanvas = document.createElement('canvas');
    workCanvas.width = 280;
    workCanvas.height = 280;
    const workCtx = workCanvas.getContext('2d');
    workCtx.drawImage(croppedCanvas, 0, 0);

    const tolerance = parseInt(document.getElementById('crop-bg-tolerance')?.value || '45', 10);
    const sharpen = parseInt(document.getElementById('crop-sharpen')?.value || '0', 10);
    const brightness = parseInt(document.getElementById('crop-brightness')?.value || '0', 10);
    const contrast = parseInt(document.getElementById('crop-contrast')?.value || '0', 10);

    if (selectedCropBgColor !== 'original') {
        if (currentAiMaskCanvas) {
            applyAiBackground(workCtx, croppedCanvas, currentAiMaskCanvas, selectedCropBgColor);
            finish();
        } else if (!isAiSegmenting) {
            isAiSegmenting = true;
            requestAiSegmentation(croppedCanvas).then(mask => {
                isAiSegmenting = false;
                currentAiMaskCanvas = mask;
                renderCropLivePreview();
            }).catch(e => {
                isAiSegmenting = false;
                console.warn('AI segmentation fallback:', e);
                processCanvasBackground(workCtx, 280, 280, selectedCropBgColor, tolerance);
                finish();
            });
            finish();
            return;
        } else {
            finish();
            return;
        }
    } else {
        finish();
    }

    function finish() {
        processCanvasEnhancements(workCtx, 280, 280, brightness, contrast, sharpen);
        previewCanvas.width = 280;
        previewCanvas.height = 280;
        previewCtx.clearRect(0, 0, 280, 280);
        previewCtx.drawImage(workCanvas, 0, 0, 280, 280);

        const result = exportOptimizedWebP(workCanvas);
        const sizeEl = document.getElementById('crop-file-size');
        if (sizeEl) sizeEl.textContent = `${result.sizeKb} KB`;
    }
}

function debounceRenderCropPreview() {
    currentAiMaskCanvas = null;
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(renderCropLivePreview, 120);
}

if(cropperModalEl) {
    cropperModalEl.addEventListener('shown.bs.modal', () => {
        const image = document.getElementById('cropper-image');
        if (cropper) cropper.destroy();
        cropper = new Cropper(image, {
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
                debounceRenderCropPreview();
            }
        });
        setTimeout(renderCropLivePreview, 150);
    });

    cropperModalEl.addEventListener('hidden.bs.modal', () => {
        if (cropper) { cropper.destroy(); cropper = null; }
        currentAiMaskCanvas = null;
        isAiSegmenting = false;
        const spinner = document.getElementById('crop-ai-spinner');
        if (spinner) spinner.style.display = 'none';
    });
}

// Rotate & Zoom buttons
document.getElementById('crop-rotate-left')?.addEventListener('click', () => { if (cropper) { cropper.rotate(-90); debounceRenderCropPreview(); } });
document.getElementById('crop-rotate-right')?.addEventListener('click', () => { if (cropper) { cropper.rotate(90); debounceRenderCropPreview(); } });
document.getElementById('crop-zoom-in')?.addEventListener('click', () => { if (cropper) { cropper.zoom(0.1); debounceRenderCropPreview(); } });
document.getElementById('crop-zoom-out')?.addEventListener('click', () => { if (cropper) { cropper.zoom(-0.1); debounceRenderCropPreview(); } });

// Reset button
document.getElementById('crop-reset-all')?.addEventListener('click', () => {
    if (cropper) cropper.reset();
    const sh = document.getElementById('crop-sharpen'); if (sh) sh.value = 0;
    const shV = document.getElementById('crop-sharpen-val'); if (shV) shV.textContent = '0%';
    const br = document.getElementById('crop-brightness'); if (br) br.value = 0;
    const brV = document.getElementById('crop-brightness-val'); if (brV) brV.textContent = '0';
    const ct = document.getElementById('crop-contrast'); if (ct) ct.value = 0;
    const ctV = document.getElementById('crop-contrast-val'); if (ctV) ctV.textContent = '0';
    const tol = document.getElementById('crop-bg-tolerance'); if (tol) tol.value = 45;
    const tolV = document.getElementById('crop-bg-tol-val'); if (tolV) tolV.textContent = '45';
    selectedCropBgColor = 'original';
    currentAiMaskCanvas = null;
    isAiSegmenting = false;
    const spinner = document.getElementById('crop-ai-spinner');
    if (spinner) spinner.style.display = 'none';
    document.querySelectorAll('.crop-bg-btn').forEach(b => {
        if (b.getAttribute('data-color') === 'original') b.classList.add('active');
        else b.classList.remove('active');
    });
    const tolWrap = document.getElementById('crop-bg-tol-wrap');
    if (tolWrap) tolWrap.style.display = 'none';
    renderCropLivePreview();
});

// Background selection
document.querySelectorAll('.crop-bg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.crop-bg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCropBgColor = btn.getAttribute('data-color');
        const tolWrap = document.getElementById('crop-bg-tol-wrap');
        if (tolWrap) tolWrap.style.display = 'none';
        renderCropLivePreview();
    });
});

document.getElementById('crop-bg-custom')?.addEventListener('input', (e) => {
    document.querySelectorAll('.crop-bg-btn').forEach(b => b.classList.remove('active'));
    selectedCropBgColor = e.target.value;
    const tolWrap = document.getElementById('crop-bg-tol-wrap');
    if (tolWrap) tolWrap.style.display = 'none';
    renderCropLivePreview();
});

// Slider inputs
['crop-sharpen', 'crop-brightness', 'crop-contrast', 'crop-bg-tolerance'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', (e) => {
            const valEl = document.getElementById(id + '-val');
            if (valEl) {
                const suffix = (id === 'crop-sharpen') ? '%' : '';
                valEl.textContent = e.target.value + suffix;
            }
            debounceRenderCropPreview();
        });
    }
});

// Auto-Enhance Button (Fix Blur & Boost Contrast/Light)
document.getElementById('btn-auto-enhance')?.addEventListener('click', () => {
    const sh = document.getElementById('crop-sharpen'); if (sh) sh.value = 45;
    const shV = document.getElementById('crop-sharpen-val'); if (shV) shV.textContent = '45%';
    const br = document.getElementById('crop-brightness'); if (br) br.value = 8;
    const brV = document.getElementById('crop-brightness-val'); if (brV) brV.textContent = '+8';
    const ct = document.getElementById('crop-contrast'); if (ct) ct.value = 18;
    const ctV = document.getElementById('crop-contrast-val'); if (ctV) ctV.textContent = '+18';
    renderCropLivePreview();
});

// Save button (Crop & Save WebP)
const btnSave = document.getElementById('crop-save-btn'); 
if(btnSave) {
    btnSave.addEventListener('click', async () => {
        if (!cropper) return;
        const origBtnHtml = btnSave.innerHTML;
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>កំពុងរក្សាទុក...';

        try {
            const croppedCanvas = cropper.getCroppedCanvas({
                width: 280,
                height: 280,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            if (!croppedCanvas) return;

            const workCanvas = document.createElement('canvas');
            workCanvas.width = 280;
            workCanvas.height = 280;
            const workCtx = workCanvas.getContext('2d');
            workCtx.drawImage(croppedCanvas, 0, 0);

            const tolerance = parseInt(document.getElementById('crop-bg-tolerance')?.value || '45', 10);
            const sharpen = parseInt(document.getElementById('crop-sharpen')?.value || '0', 10);
            const brightness = parseInt(document.getElementById('crop-brightness')?.value || '0', 10);
            const contrast = parseInt(document.getElementById('crop-contrast')?.value || '0', 10);

            // Process Background
            if (selectedCropBgColor !== 'original') {
                let mask = currentAiMaskCanvas;
                if (!mask) {
                    mask = await requestAiSegmentation(croppedCanvas);
                    currentAiMaskCanvas = mask;
                }
                if (mask) {
                    applyAiBackground(workCtx, croppedCanvas, mask, selectedCropBgColor);
                } else {
                    processCanvasBackground(workCtx, 280, 280, selectedCropBgColor, tolerance);
                }
            }

            // Process Enhancements (Sharpen & Light)
            processCanvasEnhancements(workCtx, 280, 280, brightness, contrast, sharpen);

            // Export as WebP < 50KB
            const result = exportOptimizedWebP(workCanvas);
            const prev = document.getElementById('emp-photo-preview');
            if(prev) {
                prev.src = result.dataUrl;
                prev.dataset.hasCustom = 'true';
            }
            updatePhotoPlaceholder();
            if (typeof updateRemovePhotoBtnVisibility === 'function') updateRemovePhotoBtnVisibility();
            if(cropperModal) cropperModal.hide();

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'រក្សាទុករូបភាពជោគជ័យ!',
                    html: `រូបភាពត្រូវបានកាត់ផ្ទៃ និងរក្សាទុកជា WebP<br><b class="text-success">ទំហំ៖ ${result.sizeKb} KB (&lt; 50KB)</b>`,
                    timer: 1600,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            console.error('Error saving cropped image:', err);
            Swal.fire({icon: 'error', text: 'បរាជ័យក្នុងការរក្សាទុករូបភាព: ' + err.message, confirmButtonText: 'យល់ព្រម'});
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = origBtnHtml;
        }
    });
}

const empForm = document.getElementById('employeeForm');
if(empForm) empForm.addEventListener('reset', () => { 
    setTimeout(() => {
        if (typeof updatePhotoPlaceholder === 'function') updatePhotoPlaceholder();
        if (typeof updateRemovePhotoBtnVisibility === 'function') updateRemovePhotoBtnVisibility();
        if (typeof removeEmployeeIdCardPhoto === 'function') removeEmployeeIdCardPhoto();
    }, 10); 
});

window.loadDepartmentsForEmp = async function(selectedVal = null) {
    try {
        const all = await db.departments.toArray();
        const select = document.getElementById('emp-department');
        if (!select) return;
        const currentVal = selectedVal !== null ? selectedVal : select.value;
        select.innerHTML = '<option value="">-- ជ្រើសរើសផ្នែក --</option>';
        all.forEach(d => {
            if (d && d.name) {
                select.appendChild(new Option(d.name, d.name));
            }
        });
        if (currentVal) {
            if (!Array.from(select.options).some(o => o.value === currentVal)) {
                select.appendChild(new Option(currentVal, currentVal));
            }
            select.value = currentVal;
        }
    } catch (e) {
        console.error('Error loading departments for employee form:', e);
    }
};

window.loadPositionsForEmp = async function(selectedVal = null) {
    try {
        const all = await db.positions.toArray();
        const select = document.getElementById('emp-position');
        if (!select) return;
        const currentVal = selectedVal !== null ? selectedVal : select.value;
        select.innerHTML = '<option value="">-- ជ្រើសរើសតួនាទី --</option>';
        all.forEach(p => {
            if (p && p.name) {
                select.appendChild(new Option(p.name, p.name));
            }
        });
        if (currentVal) {
            if (!Array.from(select.options).some(o => o.value === currentVal)) {
                select.appendChild(new Option(currentVal, currentVal));
            }
            select.value = currentVal;
        }
    } catch (e) {
        console.error('Error loading positions for employee form:', e);
    }
};

// Auto-load employees, departments, and positions when this script loads
loadEmployees();
loadDepartmentsForEmp();
loadPositionsForEmp();
if (typeof generateEmpCode === 'function') generateEmpCode();

// Listen to employeeModal shown to ensure dropdowns are populated even if opened via data-bs-toggle
const empModalEl = document.getElementById('employeeModal');
if (empModalEl) {
    empModalEl.addEventListener('show.bs.modal', async () => {
        if (!editingEmployeeId) {
            await Promise.all([
                loadDepartmentsForEmp(),
                loadPositionsForEmp(),
                typeof generateEmpCode === 'function' ? generateEmpCode() : Promise.resolve()
            ]);
        }
    });
}

// Ensure code and dropdowns are ready when Employee tab is clicked
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const link = document.getElementById('nav-employee');
        if (link) {
            link.addEventListener('click', () => {
                loadDepartmentsForEmp();
                loadPositionsForEmp();
                if (!editingEmployeeId && typeof generateEmpCode === 'function') generateEmpCode();
            });
        }
    }, 1000);
});

// ====== PHOTO VIEWER POPUP (ZOOM & DOWNLOAD JPG) ======
let currentViewingEmp = null;
let currentViewerZoom = 1;
let isPanningViewer = false;
let startPanX = 0, startPanY = 0;
let currentPanX = 0, currentPanY = 0;

window.viewEmployeePhoto = async function(empId) {
    try {
        const emp = await db.employees.get(empId);
        if (!emp) return;
        currentViewingEmp = emp;
        currentViewerZoom = 1;
        currentPanX = 0;
        currentPanY = 0;

        const modalEl = document.getElementById('empPhotoViewerModal');
        if (!modalEl) return;

        const nameEl = document.getElementById('viewer-emp-name');
        if (nameEl) nameEl.textContent = emp.name || 'រូបថតបុគ្គលិក';

        const codeEl = document.getElementById('viewer-emp-code');
        if (codeEl) codeEl.textContent = emp.code ? `(${emp.code})` : '';

        const imgEl = document.getElementById('viewer-emp-img');
        if (imgEl) {
            imgEl.src = emp.photo || 'assets/images/default-avatar.svg';
            imgEl.style.transform = 'translate(0px, 0px) scale(1)';
        }

        const zoomLevelEl = document.getElementById('viewer-zoom-level');
        if (zoomLevelEl) zoomLevelEl.textContent = '100%';

        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    } catch (err) {
        console.error('Error viewing employee photo:', err);
    }
};

window.zoomEmpPhoto = function(delta) {
    currentViewerZoom = Math.max(0.5, Math.min(4.0, parseFloat((currentViewerZoom + delta).toFixed(2))));
    applyViewerTransform();
};

window.resetEmpPhotoZoom = function() {
    currentViewerZoom = 1;
    currentPanX = 0;
    currentPanY = 0;
    applyViewerTransform();
};

function applyViewerTransform() {
    const imgEl = document.getElementById('viewer-emp-img');
    const zoomLevelEl = document.getElementById('viewer-zoom-level');
    if (imgEl) {
        imgEl.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentViewerZoom})`;
    }
    if (zoomLevelEl) {
        zoomLevelEl.textContent = `${Math.round(currentViewerZoom * 100)}%`;
    }
}

// Mouse Wheel Zoom & Drag Pan inside Viewer
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const wrapper = document.getElementById('viewer-photo-wrapper');
        if (!wrapper) return;

        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.2 : -0.2;
            zoomEmpPhoto(delta);
        }, { passive: false });

        wrapper.addEventListener('mousedown', (e) => {
            if (currentViewerZoom > 1) {
                isPanningViewer = true;
                startPanX = e.clientX - currentPanX;
                startPanY = e.clientY - currentPanY;
                wrapper.style.cursor = 'grabbing';
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isPanningViewer) return;
            currentPanX = e.clientX - startPanX;
            currentPanY = e.clientY - startPanY;
            applyViewerTransform();
        });

        window.addEventListener('mouseup', () => {
            if (isPanningViewer) {
                isPanningViewer = false;
                if (wrapper) wrapper.style.cursor = currentViewerZoom > 1 ? 'grab' : 'default';
            }
        });
    }, 1000);
});

// Download Photo as high-quality JPG
window.downloadEmpPhotoJpg = function() {
    const img = document.getElementById('viewer-emp-img');
    if (!img || !img.src) return;

    const btn = document.getElementById('viewer-download-btn');
    if (btn) btn.disabled = true;

    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = function() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = tempImg.naturalWidth || 400;
            canvas.height = tempImg.naturalHeight || 400;
            const ctx = canvas.getContext('2d');

            // Solid white background fill so any transparency doesn't turn black in JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);

            const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const link = document.createElement('a');
            const empCode = (currentViewingEmp && currentViewingEmp.code) ? currentViewingEmp.code : 'EMP';
            let safeName = 'photo';
            if (currentViewingEmp) {
                safeName = (currentViewingEmp.latinName || currentViewingEmp.name || 'photo').replace(/[^a-zA-Z0-9_\u1780-\u17D3]/g, '_');
            }
            const isId = currentViewingEmp && currentViewingEmp._isIdCard;
            link.download = isId ? `${empCode}_${safeName}_IDCard.jpg` : `${empCode}_${safeName}.jpg`;
            link.href = jpgDataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (btn) btn.disabled = false;
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'ទាញយកជោគជ័យ!',
                    text: `រូបថតត្រូវបានរក្សាទុកជា ${link.download}`,
                    timer: 1600,
                    showConfirmButton: false
                });
            }
        } catch (e) {
            console.error('Download error:', e);
            if (btn) btn.disabled = false;
        }
    };
    tempImg.onerror = function() {
        if (btn) btn.disabled = false;
        alert('មិនអាចទាញយករូបភាពបានទេ!');
    };
    tempImg.src = img.src;
};




