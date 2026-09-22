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
        else if (wageType === 'Hourly') wageSuffix = '/ \u1798\u17c9\u17c4\u1784';
        
        tr.innerHTML = `
            <td><img src="${emp.photo || ''}" style="width:50px; height:50px; object-fit:cover; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></td>
            <td class="fw-bold text-primary">${emp.code || 'N/A'}</td>
            <td class="fw-bold">${emp.name}</td>
            <td>${emp.gender}</td>
            <td>${emp.department || ''}</td>
            <td>${emp.position}</td>
            <td><span class="badge bg-secondary">${typeLabel}</span></td>
            <td>${emp.phone}</td>
            <td class="text-info fw-bold">${formatCurrency(emp.salary, 'USD')} <small class="text-muted">${wageSuffix}</small></td>
            <td class="align-middle">
                ${hasPermission('employee_manage') ? `
                <button class="btn btn-sm btn-outline-warning btn-edit me-1" onclick="editEmployee(${emp.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/><path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/></svg></button>
                <button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteEmployee(${emp.id})"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg></button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editEmployee = async function(id) {
    const emp = await db.employees.get(id);
    if (!emp) return;
    
    editingEmployeeId = id;
    document.getElementById('emp-code').value = emp.code || '';
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-gender').value = emp.gender;
    document.getElementById('emp-dob').value = emp.dob;
    document.getElementById('emp-phone').value = emp.phone;
    document.getElementById('emp-department').value = emp.department || '';
    document.getElementById('emp-position').value = emp.position || '';
    document.getElementById('emp-salary').value = emp.salary;
    document.getElementById('emp-type').value = emp.type || 'Full-Time';
    document.getElementById('emp-wage-type').value = emp.wageType || 'Monthly';
    if(emp.photo) document.getElementById('emp-photo-preview').src = emp.photo; else document.getElementById('emp-photo-preview').removeAttribute('src');
    
    document.querySelector('#employeeForm button[type="submit"]').innerHTML = '\u179a\u1780\u17d2\u179f\u17b6\u1791\u17bb\u1780 (Update)';
    showTab('employee');
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
        const name = document.getElementById('emp-name').value.trim();
        const gender = document.getElementById('emp-gender').value;
        const dob = document.getElementById('emp-dob').value;
        const phone = document.getElementById('emp-phone').value.trim();
        const department = document.getElementById('emp-department').value;
        const position = document.getElementById('emp-position').value;
        const type = document.getElementById('emp-type').value;
        const wageType = document.getElementById('emp-wage-type').value;
        const salary = parseFloat(document.getElementById('emp-salary').value);
        const photo = document.getElementById('emp-photo-preview').src;

        const allEmps = await db.employees.toArray();
        const isDuplicate = allEmps.some(e => e.code === code && e.id !== editingEmployeeId);
        if (isDuplicate) {
            Swal.fire({icon: 'error', text: 'អត្តលេខនេះមានរួចហើយ សូមបញ្ចូលអត្តលេខផ្សេង!', confirmButtonText: 'យល់ព្រម'});
            return;
        }

        const data = { code, name, gender, dob, phone, department, position, type, wageType, salary, photo };
        if (editingEmployeeId) {
            await db.employees.update(editingEmployeeId, data);
            Swal.fire({icon: 'success', text: 'អាប់ដេតព័ត៌មានបុគ្គលិកជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        } else {
            await db.employees.add(data);
            Swal.fire({icon: 'success', text: 'បន្ថែមបុគ្គលិកថ្មីជោគជ័យ!', confirmButtonText: 'យល់ព្រម', timer: 1500});
        }
        
        document.getElementById('employeeForm').reset();
        document.getElementById('emp-type').value = 'Full-Time';
        document.getElementById('emp-wage-type').value = 'Monthly';
        editingEmployeeId = null;
        document.getElementById('emp-photo-preview').removeAttribute('src');
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
        if (preview.getAttribute('src') && preview.getAttribute('src').length > 10) {
            placeholder.style.display = 'none';
            preview.style.display = 'block';
        } else {
            placeholder.style.display = 'flex';
            preview.style.display = 'none';
        }
    }
}
updatePhotoPlaceholder();

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
        Swal.fire({icon: 'error', text: '\u179f\u17bc\u1798\u1787\u17d2\u179a\u17be\u179f\u179a\u17be\u179f\u17af\u1780\u179f\u17b6\u179a\u1787\u17b6\u179a\u17bc\u1794\u1797\u17b6\u1796!', confirmButtonText: '\u1799\u179b\u17cb\u1796\u17d2\u179a\u1798'});
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('cropper-image');
        if(img) img.src = e.target.result;
        if(cropperModal) cropperModal.show();
    };
    reader.readAsDataURL(file);
}

if(cropperModalEl) {
    cropperModalEl.addEventListener('shown.bs.modal', () => {
        const image = document.getElementById('cropper-image');
        if (cropper) cropper.destroy();
        cropper = new Cropper(image, { aspectRatio: 1, viewMode: 1, dragMode: 'move', autoCropArea: 0.9, restore: false, guides: true, center: true, highlight: false, cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false });
    });

    cropperModalEl.addEventListener('hidden.bs.modal', () => {
        if (cropper) { cropper.destroy(); cropper = null; }
    });
}

const btnRotL = document.getElementById('crop-rotate-left'); if(btnRotL) btnRotL.addEventListener('click', () => { if (cropper) cropper.rotate(-90); });
const btnRotR = document.getElementById('crop-rotate-right'); if(btnRotR) btnRotR.addEventListener('click', () => { if (cropper) cropper.rotate(90); });
const btnZoomI = document.getElementById('crop-zoom-in'); if(btnZoomI) btnZoomI.addEventListener('click', () => { if (cropper) cropper.zoom(0.1); });
const btnZoomO = document.getElementById('crop-zoom-out'); if(btnZoomO) btnZoomO.addEventListener('click', () => { if (cropper) cropper.zoom(-0.1); });
const btnSave = document.getElementById('crop-save-btn'); 
if(btnSave) {
    btnSave.addEventListener('click', () => {
        if (!cropper) return;
        const canvas = cropper.getCroppedCanvas({ width: 400, height: 400, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const prev = document.getElementById('emp-photo-preview');
        if(prev) prev.src = dataUrl;
        updatePhotoPlaceholder();
        if(cropperModal) cropperModal.hide();
    });
}

const originalEditEmployee = window.editEmployee;
window.editEmployee = async function(id) {
    if(originalEditEmployee) await originalEditEmployee(id);
    updatePhotoPlaceholder();
};

const empForm = document.getElementById('employeeForm');
if(empForm) empForm.addEventListener('reset', () => { setTimeout(updatePhotoPlaceholder, 10); });

window.loadDepartmentsForEmp = async function() {
    const all = await db.departments.toArray();
    const select = document.getElementById('emp-department');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- ជ្រើសរើសផ្នែក --</option>';
    all.forEach(d => {
        select.appendChild(new Option(d.name, d.name));
    });
    if(currentVal) select.value = currentVal;
};

window.loadPositionsForEmp = async function() {
    const all = await db.positions.toArray();
    const select = document.getElementById('emp-position');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- ជ្រើសរើសតួនាទី --</option>';
    all.forEach(p => {
        select.appendChild(new Option(p.name, p.name));
    });
    if(currentVal) select.value = currentVal;
};

// Auto-load employees when this script loads (since it loads after the init block in reports.js)
loadEmployees();
// Generate Employee ID on load
if (typeof generateEmpCode === 'function') generateEmpCode();

// Ensure code is generated when Employee tab is clicked
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const link = document.getElementById('nav-employee');
        if (link) {
            link.addEventListener('click', () => {
                if (!editingEmployeeId && typeof generateEmpCode === 'function') generateEmpCode();
            });
        }
    }, 1000); // Wait for DOM injection
});


window.switchEmployeeTab = function(tabId) {
    document.querySelectorAll('.employee-tab').forEach(el => el.style.display = 'none');
    const target = document.getElementById('emp-tab-' + tabId);
    if (target) target.style.display = 'block';

    if (tabId === 'list') {
        loadEmployees();
    } else if (tabId === 'attendance') {
        initAttendance();
    }
};

let currentAttendanceData = {};

window.initAttendance = function() {
    const dateInput = document.getElementById('attendanceDate');
    if (!dateInput.value) {
        const today = new Date();
        // Format to YYYY-MM-DD in local time
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    loadAttendance();
};

window.loadAttendance = async function() {
    const date = document.getElementById('attendanceDate').value;
    if (!date) return;

    // Fetch active employees
    let employees = await db.employees.toArray();
    
    // Fetch attendance records for the selected date
    let records = await db.attendance.where('date').equals(date).toArray();
    currentAttendanceData = {};
    records.forEach(r => currentAttendanceData[r.empId] = r);

    const tbody = document.getElementById('attendanceList');
    tbody.innerHTML = '';

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-muted">មិនមានទិន្នន័យបុគ្គលិកទេ!</td></tr>';
        return;
    }

    employees.forEach(emp => {
        let rec = currentAttendanceData[emp.id] || { morning: 'P', afternoon: 'P', note: '' };
        
        // Helper to generate radio buttons
        const genRadio = (shift, val, colorClass) => {
            const checked = rec[shift] === val ? 'checked' : '';
            return `<input type="radio" class="btn-check att-${shift}-${emp.id}" name="att_${shift}_${emp.id}" id="att_${shift}_${val}_${emp.id}" value="${val}" ${checked} autocomplete="off">
                    <label class="btn btn-outline-${colorClass} btn-sm p-1" style="width: 28px; height: 28px;" for="att_${shift}_${val}_${emp.id}">${val}</label>`;
        };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-start align-middle">
                <div class="d-flex align-items-center">
                    <img src="${emp.photo || 'assets/default-avatar.png'}" class="rounded-circle me-2 border" style="width: 40px; height: 40px; object-fit: cover;">
                    <div>
                        <div class="fw-bold text-dark" style="font-size: 0.9rem;">${emp.name}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${emp.code} - ${emp.position}</div>
                    </div>
                </div>
            </td>
            <!-- Morning -->
            <td>${genRadio('morning', 'P', 'success')}</td>
            <td>${genRadio('morning', 'A', 'danger')}</td>
            <td>${genRadio('morning', 'L', 'warning')}</td>
            <!-- Afternoon -->
            <td>${genRadio('afternoon', 'P', 'success')}</td>
            <td>${genRadio('afternoon', 'A', 'danger')}</td>
            <td>${genRadio('afternoon', 'L', 'warning')}</td>
            <!-- Note -->
            <td>
                <input type="text" class="form-control form-control-sm text-center att-note-${emp.id}" placeholder="..." value="${rec.note || ''}">
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.saveAllAttendance = async function() {
    const date = document.getElementById('attendanceDate').value;
    if (!date) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើសកាលបរិច្ឆេទ!', 'warning');
        return;
    }
    
    const btn = document.querySelector('button[onclick="saveAllAttendance()"]');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> រក្សាទុក...';
    btn.disabled = true;

    try {
        let employees = await db.employees.toArray();
        let existingRecords = await db.attendance.where('date').equals(date).toArray();
        let existingMap = {};
        existingRecords.forEach(r => existingMap[r.empId] = r);

        for (let emp of employees) {
            let mRadio = document.querySelector(`input[name="att_morning_${emp.id}"]:checked`);
            let aRadio = document.querySelector(`input[name="att_afternoon_${emp.id}"]:checked`);
            let noteInput = document.querySelector(`.att-note-${emp.id}`);

            let data = {
                date: date,
                empId: emp.id,
                empName: emp.name,
                morning: mRadio ? mRadio.value : 'P',
                afternoon: aRadio ? aRadio.value : 'P',
                note: noteInput ? noteInput.value : ''
            };

            let ext = existingMap[emp.id];
            if (ext) {
                await db.attendance.update(ext.id, data);
            } else {
                await db.attendance.add(data);
            }
        }
        Swal.fire({icon: 'success', text: 'រក្សាទុកវត្តមានបានជោគជ័យ!', timer: 1500, showConfirmButton: false});
    } catch (error) {
        Swal.fire('បរាជ័យ', 'មានបញ្ហាក្នុងការរក្សាទុកវត្តមាន', 'error');
        console.error(error);
    }
    
    btn.innerHTML = oldText;
    btn.disabled = false;
};
