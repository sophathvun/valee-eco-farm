// ====== EMPLOYEE MANAGEMENT ======
let editingEmployeeId = null;

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
            <td class="fw-bold">${emp.name}</td>
            <td>${emp.gender}</td>
            <td>${emp.position}</td>
            <td><span class="badge bg-secondary">${typeLabel}</span></td>
            <td>${emp.phone}</td>
            <td class="text-info fw-bold">${formatCurrency(emp.salary, 'USD')} <small class="text-muted">${wageSuffix}</small></td>
            <td class="align-middle">
                ${hasPermission('employee_manage') ? `
                <button class="btn btn-sm btn-outline-warning btn-edit me-1" onclick="editEmployee(${emp.id})">\u1780\u17c2\u1794\u17d2\u179a\u17c2</button>
                <button class="btn btn-sm btn-outline-danger btn-delete" onclick="deleteEmployee(${emp.id})">\u179b\u17bb\u1794</button>
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
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-gender').value = emp.gender;
    document.getElementById('emp-dob').value = emp.dob;
    document.getElementById('emp-phone').value = emp.phone;
    document.getElementById('emp-position').value = emp.position;
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
        const name = document.getElementById('emp-name').value.trim();
        const gender = document.getElementById('emp-gender').value;
        const dob = document.getElementById('emp-dob').value;
        const phone = document.getElementById('emp-phone').value.trim();
        const position = document.getElementById('emp-position').value.trim();
        const type = document.getElementById('emp-type').value;
        const wageType = document.getElementById('emp-wage-type').value;
        const salary = parseFloat(document.getElementById('emp-salary').value);
        const photo = document.getElementById('emp-photo-preview').src;

        const data = { name, gender, dob, phone, position, type, wageType, salary, photo };
        if (editingEmployeeId) {
            await db.employees.update(editingEmployeeId, data);
        } else {
            await db.employees.add(data);
        }
        
        document.getElementById('employeeForm').reset();
        document.getElementById('emp-type').value = 'Full-Time';
        document.getElementById('emp-wage-type').value = 'Monthly';
        editingEmployeeId = null;
        document.getElementById('emp-photo-preview').removeAttribute('src');
        btn.innerHTML = '\u179a\u1780\u17d2\u179f\u17b6\u1791\u17bb\u1780';
        loadEmployees();
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
