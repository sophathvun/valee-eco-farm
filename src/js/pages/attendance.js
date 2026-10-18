// ====== ATTENDANCE MANAGEMENT ======
let currentAttendanceData = {}; // Format: { empId: { "2026-09-01": { morning: "P", afternoon: "A" } } }
let currentDaysInMonth = 30;
let currentYear = 2026;
let currentMonth = 9;

window.initAttendance = function() {
    const dateInput = document.getElementById('attendanceMonth');
    if (!dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}`;
    }
    loadAttendance();
};

window.loadAttendance = async function() {
    const monthInput = document.getElementById('attendanceMonth');
    if(!monthInput) return;
    const monthVal = monthInput.value; // YYYY-MM
    if (!monthVal) return;

    const [yyyy, mm] = monthVal.split('-');
    currentYear = parseInt(yyyy, 10);
    currentMonth = parseInt(mm, 10);
    currentDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    let employees = await db.employees.toArray();
    
    // Sort employees by department (A-Z) then by Khmer name (A-Z)
    employees.sort((a, b) => {
        const deptA = (a.department && a.department.trim()) ? a.department.trim() : 'ផ្សេងៗ (Other)';
        const deptB = (b.department && b.department.trim()) ? b.department.trim() : 'ផ្សេងៗ (Other)';
        const deptCompare = deptA.localeCompare(deptB, 'km');
        if (deptCompare !== 0) return deptCompare;
        return (a.name || '').localeCompare(b.name || '', 'km');
    });
    
    let allRecords = await db.attendance.toArray();
    let records = allRecords.filter(r => r.date && r.date.startsWith(monthVal));

    currentAttendanceData = {};
    employees.forEach(emp => { currentAttendanceData[emp.id] = {}; });

    records.forEach(r => {
        if (!currentAttendanceData[r.empId]) currentAttendanceData[r.empId] = {};
        currentAttendanceData[r.empId][r.date] = r;
    });

    renderAttendanceTable(employees);
};

function renderAttendanceTable(employees) {
    const thead = document.getElementById('attendanceHead');
    const tbody = document.getElementById('attendanceList');
    if (!thead || !tbody) return;

    // Build Header
    let tr1 = `<tr>
        <th rowspan="2" class="align-middle col-emp">បុគ្គលិក (Employee)</th>
        <th rowspan="2" class="align-middle col-type">ប្រភេទការងារ<br><small style="font-size: 0.65rem;">(Type)</small></th>`;
    let tr2 = `<tr>`;
    
    for (let d = 1; d <= currentDaysInMonth; d++) {
        const isEven = (d % 2 === 0);
        const dayHeaderClass = isEven ? 'day-header-even' : 'day-header-odd';
        tr1 += `<th colspan="2" class="border-start border-end text-center day-header ${dayHeaderClass}" onclick="openApplyAllPModal(${d})" title="ចុចទីនេះដើម្បីដាក់ P គ្រប់បុគ្គលិកនៅថ្ងៃទី ${d}">
            ${d} <i class="bi bi-check2 text-white-50" style="font-size: 0.65rem;"></i>
        </th>`;
        tr2 += `<th class="col-shift ${dayHeaderClass} border-start border-dotted-right"><small>ព្រឹក</small></th><th class="col-shift ${dayHeaderClass} border-end day-border-right"><small>ល្ងាច</small></th>`;
    }
    
    tr1 += `<th colspan="3" class="col-total col-total-header">សរុប (Total)</th></tr>`;
    tr2 += `<th class="col-total col-total-p text-success"><small>P</small></th>
            <th class="col-total col-total-a text-danger"><small>A</small></th>
            <th class="col-total col-total-l text-warning"><small>L</small></th></tr>`;
            
    thead.innerHTML = tr1 + tr2;
    tbody.innerHTML = '';

    if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${currentDaysInMonth * 2 + 5}" class="text-muted py-4">មិនមានទិន្នន័យបុគ្គលិកទេ!</td></tr>`;
        return;
    }

    employees.forEach(emp => {
        const tr = document.createElement('tr');
        
        let html = `
            <td class="text-start align-middle col-emp">
                <div class="d-flex align-items-center">
                    <img src="${emp.photo || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" class="rounded-circle me-2 border flex-shrink-0" style="width: 28px; height: 28px; object-fit: cover;">
                    <div style="line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-top: 2px;">
                        <div class="text-body emp-name-km" style="font-size: 0.78rem; font-weight: normal; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${emp.name}">${emp.name}</div>
                        <div class="text-muted emp-name-latin" style="font-size: 0.64rem; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${emp.latinName || ''}">${emp.latinName || ''}</div>
                    </div>
                </div>
            </td>
            <td class="align-middle text-center col-type">
                <span class="badge ${emp.type === 'Part-Time' ? 'bg-warning text-dark' : 'bg-primary bg-opacity-75 text-white'} px-1 py-1" style="font-size: 0.64rem; font-weight: 500;">
                    ${emp.type || 'Full-Time'}
                </span>
            </td>`;
            
        let totalP = 0, totalA = 0, totalL = 0;

        for (let d = 1; d <= currentDaysInMonth; d++) {
            const isEven = (d % 2 === 0);
            const dayClass = isEven ? 'day-even-col' : 'day-odd-col';
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const rec = currentAttendanceData[emp.id] ? currentAttendanceData[emp.id][dateStr] : null;
            
            let mVal = (rec && rec.morning) ? rec.morning : '';
            let aVal = (rec && rec.afternoon) ? rec.afternoon : '';
            
            // Tally totals
            if (mVal === 'P') totalP += 0.5;
            if (mVal === 'A') totalA += 0.5;
            if (mVal === 'L') totalL += 0.5;
            
            if (aVal === 'P') totalP += 0.5;
            if (aVal === 'A') totalA += 0.5;
            if (aVal === 'L') totalL += 0.5;

            let mClick = `onclick="toggleAtt('${emp.id}', '${dateStr}', 'morning', this)"`;
            let aClick = `onclick="toggleAtt('${emp.id}', '${dateStr}', 'afternoon', this)"`;
            
            let mClass = mVal ? mVal : 'none';
            let aClass = aVal ? aVal : 'none';

            html += `<td class="col-shift ${dayClass} border-start border-dotted-right"><div class="att-cell att-${mClass}" ${mClick}>${mVal}</div></td>
                     <td class="col-shift ${dayClass} border-end day-border-right"><div class="att-cell att-${aClass}" ${aClick}>${aVal}</div></td>`;
        }

        html += `<td class="col-total col-total-p text-success fw-bold" id="tot-p-${emp.id}">${totalP}</td>
                 <td class="col-total col-total-a text-danger fw-bold" id="tot-a-${emp.id}">${totalA}</td>
                 <td class="col-total col-total-l text-warning fw-bold" id="tot-l-${emp.id}">${totalL}</td>`;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

window.toggleAtt = function(empId, dateStr, shift, el) {
    const states = ['P', 'A', 'L', '']; // cycle: Empty -> P -> A -> L -> Empty
    let currentState = el.innerText.trim();
    let nextIdx = (states.indexOf(currentState) + 1) % states.length;
    let nextState = states[nextIdx];
    
    // Update UI
    el.innerText = nextState;
    el.className = `att-cell att-${nextState ? nextState : 'none'}`;
    
    // Update Data
    if (!currentAttendanceData[empId]) currentAttendanceData[empId] = {};
    if (!currentAttendanceData[empId][dateStr]) {
        currentAttendanceData[empId][dateStr] = { morning: '', afternoon: '' };
    }
    currentAttendanceData[empId][dateStr][shift] = nextState;
    
    // Recalculate totals for this employee
    recalcTotals(empId);
};

function recalcTotals(empId) {
    let totalP = 0, totalA = 0, totalL = 0;
    for (let d = 1; d <= currentDaysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const rec = currentAttendanceData[empId] ? currentAttendanceData[empId][dateStr] : null;
        
        let mVal = (rec && rec.morning) ? rec.morning : '';
        let aVal = (rec && rec.afternoon) ? rec.afternoon : '';
        
        if (mVal === 'P') totalP += 0.5;
        if (mVal === 'A') totalA += 0.5;
        if (mVal === 'L') totalL += 0.5;
        
        if (aVal === 'P') totalP += 0.5;
        if (aVal === 'A') totalA += 0.5;
        if (aVal === 'L') totalL += 0.5;
    }
    
    const pEl = document.getElementById(`tot-p-${empId}`);
    const aEl = document.getElementById(`tot-a-${empId}`);
    const lEl = document.getElementById(`tot-l-${empId}`);
    if (pEl) pEl.innerText = totalP;
    if (aEl) aEl.innerText = totalA;
    if (lEl) lEl.innerText = totalL;
}

window.openApplyAllPModal = async function(preselectedDay) {
    let employees = await db.employees.toArray();
    if (!employees || employees.length === 0) {
        Swal.fire('មិនមានបុគ្គលិក', 'សូមបញ្ចូលព័ត៌មានបុគ្គលិកជាមុនសិន!', 'warning');
        return;
    }

    const today = new Date();
    let defaultDay = preselectedDay;
    if (!defaultDay) {
        if (today.getFullYear() === currentYear && (today.getMonth() + 1) === currentMonth) {
            defaultDay = today.getDate();
        } else {
            defaultDay = 1;
        }
    }
    if (defaultDay > currentDaysInMonth) defaultDay = currentDaysInMonth;

    let dayOptions = '';
    for (let d = 1; d <= currentDaysInMonth; d++) {
        const sel = (d === defaultDay) ? 'selected' : '';
        dayOptions += `<option value="${d}" ${sel}>ថ្ងៃទី ${d}</option>`;
    }

    const { value: formValues } = await Swal.fire({
        title: '✅ ដាក់វត្តមាន "P" គ្រប់បុគ្គលិក',
        html: `
            <div class="text-start mb-3">
                <label class="form-label fw-bold">ជ្រើសរើសថ្ងៃ (ខែ ${String(currentMonth).padStart(2, '0')}/${currentYear})</label>
                <select id="swal-apply-day" class="form-select">
                    ${dayOptions}
                </select>
            </div>
            <div class="text-start mb-2">
                <label class="form-label fw-bold">ជ្រើសរើសវេន (Shift)</label>
                <select id="swal-apply-shift" class="form-select">
                    <option value="both">ពេញមួយថ្ងៃ (ព្រឹក និង ល្ងាច)</option>
                    <option value="morning">តែពេលព្រឹក</option>
                    <option value="afternoon">តែពេលល្ងាច</option>
                </select>
            </div>
            <div class="form-text text-muted text-start">
                * ប្រព័ន្ធនឹងដាក់ 'P' ទៅលើបុគ្គលិកទាំងអស់ (${employees.length} នាក់) សម្រាប់ថ្ងៃដែលបានជ្រើសរើស។
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-check-lg"></i> អនុវត្ត (Apply)',
        cancelButtonText: 'បោះបង់',
        confirmButtonColor: '#198754',
        focusConfirm: false,
        preConfirm: () => {
            const day = parseInt(document.getElementById('swal-apply-day').value, 10);
            const shift = document.getElementById('swal-apply-shift').value;
            return { day, shift };
        }
    });

    if (formValues) {
        applyPToAll(formValues.day, formValues.shift, employees);
    }
};

function applyPToAll(day, shift, employees) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    employees.forEach(emp => {
        if (!currentAttendanceData[emp.id]) currentAttendanceData[emp.id] = {};
        if (!currentAttendanceData[emp.id][dateStr]) {
            currentAttendanceData[emp.id][dateStr] = { morning: '', afternoon: '' };
        }
        
        if (shift === 'both' || shift === 'morning') {
            currentAttendanceData[emp.id][dateStr].morning = 'P';
        }
        if (shift === 'both' || shift === 'afternoon') {
            currentAttendanceData[emp.id][dateStr].afternoon = 'P';
        }
    });

    renderAttendanceTable(employees);

    Swal.fire({
        icon: 'success',
        title: 'ជោគជ័យ!',
        text: `បានដាក់ 'P' គ្រប់បុគ្គលិកសម្រាប់ថ្ងៃទី ${day} រួចរាល់។ សូមចុច «រក្សាទុកវត្តមាន» ដើម្បីកត់ត្រាចូលប្រព័ន្ធ។`,
        confirmButtonText: 'យល់ព្រម',
        confirmButtonColor: '#198754',
        timer: 2500
    });
}

window.saveAllAttendance = async function() {
    const monthVal = document.getElementById('attendanceMonth').value;
    if (!monthVal) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើសខែ!', 'warning');
        return;
    }
    
    const btn = document.querySelector('button[onclick="saveAllAttendance()"]');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> រក្សាទុក...';
        btn.disabled = true;
    }

    try {
        let employees = await db.employees.toArray();
        let allRecords = await db.attendance.toArray();
        let existingMap = {}; 
        allRecords.forEach(r => {
            if (r.date && r.date.startsWith(monthVal)) {
                existingMap[`${r.empId}_${r.date}`] = r;
            }
        });

        const batchAdds = [];
        const batchUpdates = [];

        employees.forEach(emp => {
            for (let d = 1; d <= currentDaysInMonth; d++) {
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const rec = currentAttendanceData[emp.id] ? currentAttendanceData[emp.id][dateStr] : null;
                
                let mVal = (rec && rec.morning) ? rec.morning : '';
                let aVal = (rec && rec.afternoon) ? rec.afternoon : '';
                
                let data = {
                    date: dateStr,
                    empId: emp.id,
                    empName: emp.name,
                    morning: mVal,
                    afternoon: aVal,
                    note: '' 
                };

                let ext = existingMap[`${emp.id}_${dateStr}`];
                if (ext) {
                    if (ext.morning !== mVal || ext.afternoon !== aVal) {
                        batchUpdates.push({ id: ext.id, data: data });
                    }
                } else {
                    if (mVal || aVal) { 
                        batchAdds.push(data);
                    }
                }
            }
        });

        for (let obj of batchAdds) {
            await db.attendance.add(obj);
        }
        for (let update of batchUpdates) {
            await db.attendance.update(update.id, update.data);
        }

        Swal.fire({icon: 'success', text: 'រក្សាទុកវត្តមានប្រចាំខែជោគជ័យ!', timer: 1500, showConfirmButton: false});
    } catch (error) {
        Swal.fire('បរាជ័យ', error.message || 'មានបញ្ហាក្នុងការរក្សាទុកវត្តមាន', 'error');
        console.error(error);
    } finally {
        if (btn) {
            btn.innerHTML = oldText;
            btn.disabled = false;
        }
    }
};
