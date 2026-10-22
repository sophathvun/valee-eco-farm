// ====== ATTENDANCE MANAGEMENT ======
let currentAttendanceData = {}; // Format: { empId: { "2026-09-01": { morning: "P", afternoon: "A" } } }
let currentDaysInMonth = 30;
let currentYear = 2026;
let currentMonth = 9;
let allAttendanceRecordsCached = [];
let attendanceEmployeesCached = [];

// Calculate Monthly Leave (L) balance (accrued, used, remaining) for an employee up to a specific year and month
function getEmployeeLeaveBalance(emp, year, month, inMemoryCurrentMonthData = null) {
    if (!emp) return { accrued: 0, used: 0, remaining: 0 };
    
    // 1. Accrued calculation (2 days per active month in calendar year: Jan to Dec)
    let startMonth = 1;
    let startYear = year;
    if (emp.startDate) {
        const parts = emp.startDate.split('-');
        if (parts.length >= 2) {
            startYear = parseInt(parts[0], 10);
            startMonth = parseInt(parts[1], 10);
        }
    }

    let accrued = 0;
    if (startYear < year) {
        // Joined before current year: gets 2 days per month from Jan to 'month'
        accrued = month * 2;
    } else if (startYear === year) {
        if (month >= startMonth) {
            accrued = (month - startMonth + 1) * 2;
        } else {
            accrued = 0;
        }
    } else {
        // startYear > year (future join date)
        accrued = 0;
    }

    // 2. Used calculation
    // A. Past months in the same year (month 1 to month - 1) from all attendance records
    let used = 0;
    const allRecords = allAttendanceRecordsCached || window._allAttendanceRecords || [];
    const empIdStr = String(emp.id);

    allRecords.forEach(r => {
        if (String(r.empId) === empIdStr && r.date && r.date.startsWith(`${year}-`)) {
            const parts = r.date.split('-');
            const rMonth = parseInt(parts[1], 10);
            if (rMonth < month) {
                if (r.morning === 'L') used += 0.5;
                if (r.afternoon === 'L') used += 0.5;
            }
        }
    });

    // B. Current month usage: use in-memory data (currentAttendanceData) if provided, otherwise check allRecords
    if (inMemoryCurrentMonthData && inMemoryCurrentMonthData[emp.id]) {
        const monthRecs = inMemoryCurrentMonthData[emp.id];
        for (let d = 1; d <= 31; d++) {
            const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const rec = monthRecs[dStr];
            if (rec) {
                if (rec.morning === 'L') used += 0.5;
                if (rec.afternoon === 'L') used += 0.5;
            }
        }
    } else {
        allRecords.forEach(r => {
            if (String(r.empId) === empIdStr && r.date && r.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
                if (r.morning === 'L') used += 0.5;
                if (r.afternoon === 'L') used += 0.5;
            }
        });
    }

    const remaining = Math.max(0, +(accrued - used).toFixed(1));
    return {
        accrued: +accrued.toFixed(1),
        used: +used.toFixed(1),
        remaining: remaining
    };
}
window.getEmployeeLeaveBalance = getEmployeeLeaveBalance;

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

    // Auto-migrate legacy scan records where status was accidentally saved as 'L' instead of 'P'
    try {
        const legacyRecords = allRecords.filter(r => 
            (r.morning === 'L' && (r.scanTimeMorning || r.checkInTime)) || 
            (r.afternoon === 'L' && (r.scanTimeAfternoon || r.scanTimeAfternoonOut || r.checkOutTime))
        );
        for (const lr of legacyRecords) {
            const patch = {};
            if (lr.morning === 'L' && (lr.scanTimeMorning || lr.checkInTime)) patch.morning = 'P';
            if (lr.afternoon === 'L' && (lr.scanTimeAfternoon || lr.scanTimeAfternoonOut || lr.checkOutTime)) patch.afternoon = 'P';
            if (Object.keys(patch).length > 0) {
                await db.attendance.update(lr.id, patch);
                Object.assign(lr, patch);
            }
        }
    } catch (migErr) {
        console.warn('Attendance scan migration error:', migErr);
    }

    let records = allRecords.filter(r => r.date && r.date.startsWith(monthVal));

    currentAttendanceData = {};
    employees.forEach(emp => { currentAttendanceData[emp.id] = {}; });

    records.forEach(r => {
        if (!currentAttendanceData[r.empId]) currentAttendanceData[r.empId] = {};
        currentAttendanceData[r.empId][r.date] = r;
    });

    attendanceEmployeesCached = employees;
    window._attendanceEmployees = employees;
    allAttendanceRecordsCached = allRecords;
    window._allAttendanceRecords = allRecords;

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
            <th class="col-total col-total-l text-warning" title="ច្បាប់សម្រាកប្រចាំខែ (Monthly Leave)"><small>L</small></th></tr>`;
            
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
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const currentHour = today.getHours();

        for (let d = 1; d <= currentDaysInMonth; d++) {
            const isEven = (d % 2 === 0);
            const dayClass = isEven ? 'day-even-col' : 'day-odd-col';
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const rec = currentAttendanceData[emp.id] ? currentAttendanceData[emp.id][dateStr] : null;
            
            let mVal = (rec && rec.morning) ? rec.morning : '';
            let aVal = (rec && rec.afternoon) ? rec.afternoon : '';

            // If staff has not scanned for past shifts, record/display as 'A' (Absent)
            if (dateStr < todayStr) {
                if (!mVal) mVal = 'A';
                if (!aVal) aVal = 'A';
            } else if (dateStr === todayStr) {
                if (currentHour >= 12 && !mVal) mVal = 'A';
                if (currentHour >= 18 && !aVal) aVal = 'A';
            }

            // Sync back to currentAttendanceData for proper recalculation and save
            if (!currentAttendanceData[emp.id]) currentAttendanceData[emp.id] = {};
            if (!currentAttendanceData[emp.id][dateStr]) {
                currentAttendanceData[emp.id][dateStr] = { morning: mVal, afternoon: aVal };
            } else {
                currentAttendanceData[emp.id][dateStr].morning = mVal;
                currentAttendanceData[emp.id][dateStr].afternoon = aVal;
            }
            
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

        const bal = getEmployeeLeaveBalance(emp, currentYear, currentMonth, currentAttendanceData);
        html += `<td class="col-total col-total-p text-success fw-bold" id="tot-p-${emp.id}">${totalP}</td>
                 <td class="col-total col-total-a text-danger fw-bold" id="tot-a-${emp.id}">${totalA}</td>
                 <td class="col-total col-total-l text-warning fw-bold" id="tot-l-${emp.id}" title="Monthly Leave: បានប្រើ ${bal.used}/${bal.accrued} ថ្ងៃ (នៅសល់ ${bal.remaining} ថ្ងៃ)">
                     <span class="text-nowrap" style="font-size: 0.78rem;">L: ${bal.used}/${bal.accrued}</span>
                 </td>`;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

window.toggleAtt = function(empId, dateStr, shift, el) {
    if (typeof canEditAttendance === 'function' && !canEditAttendance()) {
        Swal.fire({
            icon: 'warning',
            title: 'គ្មានសិទ្ធិ',
            text: 'អ្នកមិនមានសិទ្ធិកែប្រែវត្តមានបុគ្គលិកទេ! សូមទាក់ទង Admin។',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#059669'
        });
        return;
    }

    const states = ['P', 'A', 'L', '']; // cycle: P -> A -> L -> Empty
    let currentState = el.innerText.trim();
    let nextIdx = (states.indexOf(currentState) + 1) % states.length;
    let nextState = states[nextIdx];
    
    // Check Leave quota restriction when attempting to set 'L' (Monthly Leave)
    if (nextState === 'L') {
        const emp = (window._attendanceEmployees || []).find(e => String(e.id) === String(empId));
        const bal = getEmployeeLeaveBalance(emp, currentYear, currentMonth, currentAttendanceData);
        if (bal.remaining < 0.5) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ អស់កូតាច្បាប់សម្រាក (Monthly Leave Exceeded)',
                html: `
                    <div class="text-start" style="font-size: 0.92rem;">
                        <div class="mb-2 pb-2 border-bottom">
                            <strong>បុគ្គលិក:</strong> <span class="text-success fw-bold">${emp ? emp.name : empId}</span>
                            ${emp && emp.latinName ? `<small class="text-muted">(${emp.latinName})</small>` : ''}
                        </div>
                        <div class="d-flex justify-content-between mb-1">
                            <span>កូតាទទួលបានសរុប (ត្រឹមខែ ${currentMonth}/${currentYear})៖</span>
                            <span class="badge bg-primary text-white fs-6 px-2 py-1">${bal.accrued} ថ្ងៃ</span>
                        </div>
                        <div class="d-flex justify-content-between mb-1">
                            <span>កូតាបានប្រើប្រាស់រួច៖</span>
                            <span class="badge bg-warning text-dark fs-6 px-2 py-1">${bal.used} ថ្ងៃ</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>កូតានៅសល់ជាក់ស្តែង៖</span>
                            <span class="badge bg-danger text-white fs-6 px-2 py-1">${bal.remaining} ថ្ងៃ</span>
                        </div>
                        <div class="alert alert-danger py-2 px-3 mt-3 mb-0 small">
                            <i class="bi bi-exclamation-triangle-fill me-1"></i>
                            <strong>មិនអនុញ្ញាត៖</strong> បុគ្គលិកនេះបានប្រើប្រាស់ Monthly Leave អស់កូតាកំណត់ហើយ! មិនអាចបញ្ចូល <strong>L</strong> បានទៀតទេ។ អនុញ្ញាតបានតែវត្តមាន <strong>P (មកធ្វើការ)</strong> ឬ <strong>A (អវត្តមាន/កាត់ប្រាក់)</strong> តែប៉ុណ្ណោះ។
                        </div>
                    </div>
                `,
                confirmButtonText: 'យល់ព្រម',
                confirmButtonColor: '#059669'
            });
            // Skip 'L' -> cycle directly to empty ''
            nextState = '';
        }
    }

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
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const currentHour = today.getHours();

    for (let d = 1; d <= currentDaysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const rec = currentAttendanceData[empId] ? currentAttendanceData[empId][dateStr] : null;
        
        let mVal = (rec && rec.morning) ? rec.morning : '';
        let aVal = (rec && rec.afternoon) ? rec.afternoon : '';

        if (dateStr < todayStr) {
            if (!mVal) mVal = 'A';
            if (!aVal) aVal = 'A';
        } else if (dateStr === todayStr) {
            if (currentHour >= 12 && !mVal) mVal = 'A';
            if (currentHour >= 18 && !aVal) aVal = 'A';
        }
        
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
    if (lEl) {
        const emp = (window._attendanceEmployees || []).find(e => String(e.id) === String(empId));
        const bal = getEmployeeLeaveBalance(emp, currentYear, currentMonth, currentAttendanceData);
        lEl.setAttribute('title', `Monthly Leave: បានប្រើ ${bal.used}/${bal.accrued} ថ្ងៃ (នៅសល់ ${bal.remaining} ថ្ងៃ)`);
        lEl.innerHTML = `<span class="text-nowrap" style="font-size: 0.78rem;">L: ${bal.used}/${bal.accrued}</span>`;
    }
}

window.openApplyAllPModal = async function(preselectedDay) {
    if (typeof canEditAttendance === 'function' && !canEditAttendance()) {
        Swal.fire({
            icon: 'warning',
            title: 'គ្មានសិទ្ធិ',
            text: 'អ្នកមិនមានសិទ្ធិកែប្រែវត្តមានបុគ្គលិកទេ! សូមទាក់ទង Admin។',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#059669'
        });
        return;
    }

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

    attendanceEmployeesCached = employees;
    window._attendanceEmployees = employees;
    allAttendanceRecordsCached = allRecords;
    window._allAttendanceRecords = allRecords;

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
    if (typeof canEditAttendance === 'function' && !canEditAttendance()) {
        Swal.fire({
            icon: 'warning',
            title: 'គ្មានសិទ្ធិ',
            text: 'អ្នកមិនមានសិទ្ធិកែប្រែ ឬរក្សាទុកវត្តមានទេ! សូមទាក់ទង Admin។',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#059669'
        });
        return;
    }

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

        allAttendanceRecordsCached = await db.attendance.toArray();
        window._allAttendanceRecords = allAttendanceRecordsCached;

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
