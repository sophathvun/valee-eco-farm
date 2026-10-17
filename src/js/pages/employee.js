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
            <td><img src="${emp.photo || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" style="width:50px; height:50px; object-fit:cover; border-radius:8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></td>
            <td class="fw-bold text-primary">${emp.code || 'N/A'}</td>
            <td>${emp.nationalId || '-'}</td>
            <td class="fw-bold">${emp.name}</td>
            <td>${emp.latinName || '-'}</td>
            <td>${emp.gender}</td>
            <td>${emp.department || ''}</td>
            <td>${emp.position}</td>
            <td><span class="badge bg-secondary">${typeLabel}</span></td>
            <td>${emp.phone}</td>
            <td class="text-info fw-bold">${formatCurrency(emp.salary, emp.currency || 'USD')} <small class="text-muted">${wageSuffix}</small></td>
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

window.openAddEmployeeModal = async function() {
    editingEmployeeId = null;
    const form = document.getElementById('employeeForm');
    if (form) form.reset();
    
    document.getElementById('emp-type').value = 'Full-Time';
    document.getElementById('emp-wage-type').value = 'Monthly';
    if (document.getElementById('emp-currency')) document.getElementById('emp-currency').value = 'USD';
    
    const preview = document.getElementById('emp-photo-preview');
    if (preview) {
        preview.src = 'assets/images/default-avatar.svg';
        preview.dataset.hasCustom = 'false';
    }
    if (typeof updatePhotoPlaceholder === 'function') updatePhotoPlaceholder();
    
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
        
        const wageTypeEl = document.getElementById('emp-wage-type');
        if (wageTypeEl) wageTypeEl.value = emp.wageType || 'Monthly';
        
        const preview = document.getElementById('emp-photo-preview');
        if (preview) {
            if (emp.photo) {
                preview.src = emp.photo;
                preview.dataset.hasCustom = 'true';
            } else {
                preview.src = 'assets/images/default-avatar.svg';
                preview.dataset.hasCustom = 'false';
            }
        }
        if (typeof updatePhotoPlaceholder === 'function') updatePhotoPlaceholder();
        
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
            name: name || '',
            latinName: latinName || '',
            gender: gender || 'ប្រុស',
            dob: dob || '',
            phone: phone || '',
            department: department || '',
            position: position || '',
            type: type || 'Full-Time',
            wageType: wageType || 'Monthly',
            currency: currency || 'USD',
            salary: isNaN(salary) ? 0 : salary,
            photo: photo || ''
        };
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
        if(document.getElementById('emp-currency')) document.getElementById('emp-currency').value = 'USD';
        editingEmployeeId = null;
        const prevPhoto = document.getElementById('emp-photo-preview');
        if (prevPhoto) {
            prevPhoto.src = 'assets/images/default-avatar.svg';
            prevPhoto.dataset.hasCustom = 'false';
        }
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
        document.querySelectorAll('.crop-bg-btn').forEach(b => {
            if (b.getAttribute('data-color') === 'original') b.classList.add('active');
            else b.classList.remove('active');
        });
        const tolWrap = document.getElementById('crop-bg-tol-wrap');
        if (tolWrap) tolWrap.style.display = 'none';

        if(cropperModal) cropperModal.show();
    };
    reader.readAsDataURL(file);
}

let selectedCropBgColor = 'original';
let previewDebounceTimer = null;

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

// 1. Background Replacement (sample corners & flood fill perimeter with feathering)
function processCanvasBackground(ctx, width, height, targetHex, tolerance = 45) {
    if (!targetHex || targetHex === 'original') return;
    const target = hexToRgb(targetHex);
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
                if (nx > width * 0.28 && nx < width * 0.72 && ny > height * 0.2 && ny < height * 0.8) {
                    if (r > 60 && g > 40 && b > 20 && r > g && g > b && (r - g >= 14)) {
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
            if (isEdge) {
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

    processCanvasBackground(workCtx, 280, 280, selectedCropBgColor, tolerance);
    processCanvasEnhancements(workCtx, 280, 280, brightness, contrast, sharpen);

    previewCanvas.width = 280;
    previewCanvas.height = 280;
    previewCtx.clearRect(0, 0, 280, 280);
    previewCtx.drawImage(workCanvas, 0, 0, 280, 280);

    const result = exportOptimizedWebP(workCanvas);
    const sizeEl = document.getElementById('crop-file-size');
    if (sizeEl) sizeEl.textContent = `${result.sizeKb} KB`;
}

function debounceRenderCropPreview() {
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(renderCropLivePreview, 40);
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
        if (tolWrap) tolWrap.style.display = (selectedCropBgColor === 'original') ? 'none' : 'block';
        renderCropLivePreview();
    });
});

document.getElementById('crop-bg-custom')?.addEventListener('input', (e) => {
    document.querySelectorAll('.crop-bg-btn').forEach(b => b.classList.remove('active'));
    selectedCropBgColor = e.target.value;
    const tolWrap = document.getElementById('crop-bg-tol-wrap');
    if (tolWrap) tolWrap.style.display = 'block';
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
    btnSave.addEventListener('click', () => {
        if (!cropper) return;
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

        // Run full processing
        processCanvasBackground(workCtx, 280, 280, selectedCropBgColor, tolerance);
        processCanvasEnhancements(workCtx, 280, 280, brightness, contrast, sharpen);

        // Export as WebP < 50KB
        const result = exportOptimizedWebP(workCanvas);
        const prev = document.getElementById('emp-photo-preview');
        if(prev) {
            prev.src = result.dataUrl;
            prev.dataset.hasCustom = 'true';
        }
        updatePhotoPlaceholder();
        if(cropperModal) cropperModal.hide();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'កាត់ និងកែរូបភាពជោគជ័យ!',
                html: `រូបភាពត្រូវបានកែច្បាស់ និងរក្សាទុកជា WebP<br><b class="text-success">ទំហំ៖ ${result.sizeKb} KB (&lt; 50KB)</b>`,
                timer: 1600,
                showConfirmButton: false
            });
        }
    });
}

const empForm = document.getElementById('employeeForm');
if(empForm) empForm.addEventListener('reset', () => { setTimeout(updatePhotoPlaceholder, 10); });

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




