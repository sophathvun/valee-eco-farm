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
    let tr1 = `<tr><th rowspan="2" class="align-middle col-emp">បុគ្គលិក (Employee)</th>`;
    let tr2 = `<tr>`;
    
    for (let d = 1; d <= currentDaysInMonth; d++) {
        tr1 += `<th colspan="2" class="border-start border-end">${d}</th>`;
        tr2 += `<th class="border-start"><small>ព្រឹក</small></th><th class="border-end"><small>ល្ងាច</small></th>`;
    }
    
    tr1 += `<th colspan="3" class="col-total col-total-header">សរុប (Total)</th></tr>`;
    tr2 += `<th class="col-total col-total-p text-success"><small>P</small></th>
            <th class="col-total col-total-a text-danger"><small>A</small></th>
            <th class="col-total col-total-l text-warning"><small>L</small></th></tr>`;
            
    thead.innerHTML = tr1 + tr2;
    tbody.innerHTML = '';

    if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${currentDaysInMonth * 2 + 4}" class="text-muted">មិនមានទិន្នន័យបុគ្គលិកទេ!</td></tr>`;
        return;
    }

    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    employees.forEach(emp => {
        const tr = document.createElement('tr');
        
        let html = `
            <td class="text-start align-middle col-emp">
                <div class="d-flex align-items-center">
                    <img src="${emp.photo || 'assets/default-avatar.png'}" class="rounded-circle me-2 border" style="width: 30px; height: 30px; object-fit: cover;">
                    <div style="line-height: 1.2;">
                        <div class="fw-bold text-dark" style="font-size: 0.85rem;">${emp.name}</div>
                        <div class="text-muted" style="font-size: 0.7rem;">${emp.code}</div>
                    </div>
                </div>
            </td>`;
            
        let totalP = 0, totalA = 0, totalL = 0;

        for (let d = 1; d <= currentDaysInMonth; d++) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isFuture = dateStr > todayStr;
            const rec = currentAttendanceData[emp.id][dateStr];
            
            let mVal = rec ? rec.morning : (isFuture ? '' : 'P');
            let aVal = rec ? rec.afternoon : (isFuture ? '' : 'P');
            
            // Tally totals
            if (mVal === 'P') totalP += 0.5;
            if (mVal === 'A') totalA += 0.5;
            if (mVal === 'L') totalL += 0.5;
            
            if (aVal === 'P') totalP += 0.5;
            if (aVal === 'A') totalA += 0.5;
            if (aVal === 'L') totalL += 0.5;

            let mClick = isFuture ? '' : `onclick="toggleAtt('${emp.id}', '${dateStr}', 'morning', this)"`;
            let aClick = isFuture ? '' : `onclick="toggleAtt('${emp.id}', '${dateStr}', 'afternoon', this)"`;
            
            let mClass = mVal ? mVal : 'none';
            let aClass = aVal ? aVal : 'none';

            html += `<td class="border-start p-1"><div class="att-cell att-${mClass}" ${mClick}>${mVal}</div></td>
                     <td class="border-end p-1"><div class="att-cell att-${aClass}" ${aClick}>${aVal}</div></td>`;
        }

        html += `<td class="col-total col-total-p text-success fw-bold p-1" id="tot-p-${emp.id}">${totalP}</td>
                 <td class="col-total col-total-a text-danger fw-bold p-1" id="tot-a-${emp.id}">${totalA}</td>
                 <td class="col-total col-total-l text-warning fw-bold p-1" id="tot-l-${emp.id}">${totalL}</td>`;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

window.toggleAtt = function(empId, dateStr, shift, el) {
    // Extra safety: Check if future date
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
    if (dateStr > todayStr) return;

    const states = ['P', 'A', 'L'];
    let currentState = el.innerText.trim();
    if (!currentState) currentState = 'P'; // If somehow empty, default to P on first click
    else {
        let nextIdx = (states.indexOf(currentState) + 1) % states.length;
        currentState = states[nextIdx];
    }
    
    // Update UI
    el.innerText = currentState;
    el.className = `att-cell att-${currentState}`;
    
    // Update Data
    if (!currentAttendanceData[empId][dateStr]) {
        currentAttendanceData[empId][dateStr] = { morning: 'P', afternoon: 'P' };
    }
    currentAttendanceData[empId][dateStr][shift] = currentState;
    
    // Recalculate totals for this employee
    recalcTotals(empId);
};

function recalcTotals(empId) {
    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    let totalP = 0, totalA = 0, totalL = 0;
    for (let d = 1; d <= currentDaysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isFuture = dateStr > todayStr;
        const rec = currentAttendanceData[empId][dateStr];
        
        let mVal = rec ? rec.morning : (isFuture ? '' : 'P');
        let aVal = rec ? rec.afternoon : (isFuture ? '' : 'P');
        
        if (mVal === 'P') totalP += 0.5;
        if (mVal === 'A') totalA += 0.5;
        if (mVal === 'L') totalL += 0.5;
        
        if (aVal === 'P') totalP += 0.5;
        if (aVal === 'A') totalA += 0.5;
        if (aVal === 'L') totalL += 0.5;
    }
    
    document.getElementById(`tot-p-${empId}`).innerText = totalP;
    document.getElementById(`tot-a-${empId}`).innerText = totalA;
    document.getElementById(`tot-l-${empId}`).innerText = totalL;
}

window.saveAllAttendance = async function() {
    const monthVal = document.getElementById('attendanceMonth').value;
    if (!monthVal) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើសខែ!', 'warning');
        return;
    }
    
    const btn = document.querySelector('button[onclick="saveAllAttendance()"]');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> រក្សាទុក...';
    btn.disabled = true;

    try {
        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

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
                const isFuture = dateStr > todayStr;
                const rec = currentAttendanceData[emp.id][dateStr];
                
                let mVal = rec ? rec.morning : (isFuture ? '' : 'P');
                let aVal = rec ? rec.afternoon : (isFuture ? '' : 'P');
                
                // Do not save future empty days
                if (isFuture && !rec) continue; 
                
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
                    if (mVal !== 'P' || aVal !== 'P') { 
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
        Swal.fire('បរាជ័យ', 'មានបញ្ហាក្នុងការរក្សាទុកវត្តមាន', 'error');
        console.error(error);
    }
    
    btn.innerHTML = oldText;
    btn.disabled = false;
};
