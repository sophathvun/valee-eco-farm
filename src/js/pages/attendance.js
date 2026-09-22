// ====== ATTENDANCE MANAGEMENT ======
let currentAttendanceData = {};

window.initAttendance = function() {
    const dateInput = document.getElementById('attendanceDate');
    if (!dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    loadAttendance();
};

window.loadAttendance = async function() {
    const dateInput = document.getElementById('attendanceDate');
    if(!dateInput) return;
    const date = dateInput.value;
    if (!date) return;

    let employees = await db.employees.toArray();
    let records = await db.attendance.where('date').equals(date).toArray();
    currentAttendanceData = {};
    records.forEach(r => currentAttendanceData[r.empId] = r);

    const tbody = document.getElementById('attendanceList');
    if(!tbody) return;
    tbody.innerHTML = '';

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-muted">មិនមានទិន្នន័យបុគ្គលិកទេ!</td></tr>';
        return;
    }

    employees.forEach(emp => {
        let rec = currentAttendanceData[emp.id] || { morning: 'P', afternoon: 'P', note: '' };
        
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
            <td>${genRadio('morning', 'P', 'success')}</td>
            <td>${genRadio('morning', 'A', 'danger')}</td>
            <td>${genRadio('morning', 'L', 'warning')}</td>
            <td>${genRadio('afternoon', 'P', 'success')}</td>
            <td>${genRadio('afternoon', 'A', 'danger')}</td>
            <td>${genRadio('afternoon', 'L', 'warning')}</td>
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
