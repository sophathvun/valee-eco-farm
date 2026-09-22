// ====== ATTENDANCE REPORT ======

window.initAttendanceReport = function() {
    const fromInput = document.getElementById('repAttFrom');
    const toInput = document.getElementById('repAttTo');
    
    if (!fromInput.value || !toInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
        
        fromInput.value = `${yyyy}-${mm}-01`;
        toInput.value = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
    }
    
    // Auto generate on load
    if (typeof generateAttendanceReport === 'function') {
        generateAttendanceReport();
    }
    
    // Setup branding text for print
    if (typeof db !== 'undefined' && db.settings) {
        db.settings.get('branding').then(res => {
            if (res && res.appName) {
                const el = document.getElementById('brand-name-report-att');
                if (el) el.innerText = res.appName;
            }
        });
    }
};

window.generateAttendanceReport = async function() {
    const from = document.getElementById('repAttFrom').value;
    const to = document.getElementById('repAttTo').value;
    const thead = document.getElementById('repAttHead');
    const tbody = document.getElementById('repAttList');
    const dateText = document.getElementById('repAttDateText');
    
    if (!from || !to) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើស ថ្ងៃចាប់ផ្តើម និងថ្ងៃបញ្ចប់!', 'warning');
        return;
    }
    
    if (from > to) {
        Swal.fire('បម្រាម', 'ថ្ងៃចាប់ផ្តើម មិនអាចធំជាង ថ្ងៃបញ្ចប់បានទេ!', 'warning');
        return;
    }
    
    const [fY, fM, fD] = from.split('-');
    const [tY, tM, tD] = to.split('-');
    let startD = new Date(fY, fM - 1, fD);
    let endD = new Date(tY, tM - 1, tD);
    
    const diffTime = Math.abs(endD - startD);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays > 62) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើសចន្លោះពេលមិនលើសពី ២ខែ ដើម្បីកុំអោយតារាងធំពេក!', 'warning');
        return;
    }
    
    if (dateText) {
        dateText.innerText = `គិតចាប់ពីថ្ងៃទី ${fD}/${fM}/${fY} ដល់ថ្ងៃទី ${tD}/${tM}/${tY}`;
    }
    
    try {
        tbody.innerHTML = `<tr><td class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></td></tr>`;
        
        let employees = await db.employees.toArray();
        if (employees.length === 0) {
            thead.innerHTML = `<tr><th class="py-4 text-muted">មិនមានទិន្នន័យបុគ្គលិកទេ</th></tr>`;
            tbody.innerHTML = '';
            return;
        }
        
        let allAtt = await db.attendance.toArray();
        let records = allAtt.filter(r => r.date >= from && r.date <= to);
        
        // agg[empId][dateStr] = { morning: 'P', afternoon: 'A' }
        let agg = {};
        employees.forEach(emp => { agg[emp.id] = {}; });
        records.forEach(r => {
            if (agg[r.empId]) {
                agg[r.empId][r.date] = r;
            }
        });
        
        // Build Header
        let tr1 = `<tr><th rowspan="2" class="align-middle col-emp">បុគ្គលិក (Employee)</th>`;
        let tr2 = `<tr>`;
        
        let daysArray = [];
        let curD = new Date(startD);
        while (curD <= endD) {
            let yy = curD.getFullYear();
            let mm = String(curD.getMonth() + 1).padStart(2, '0');
            let dd = String(curD.getDate()).padStart(2, '0');
            let dateStr = `${yy}-${mm}-${dd}`;
            daysArray.push(dateStr);
            
            tr1 += `<th colspan="2" class="border-start border-end">${dd}/${mm}</th>`;
            tr2 += `<th class="border-start"><small>ព្រឹក</small></th><th class="border-end"><small>ល្ងាច</small></th>`;
            
            curD.setDate(curD.getDate() + 1);
        }
        
        tr1 += `<th colspan="3" class="col-total col-total-header">សរុប (Total)</th></tr>`;
        tr2 += `<th class="col-total col-total-p text-success"><small>P</small></th>
                <th class="col-total col-total-a text-danger"><small>A</small></th>
                <th class="col-total col-total-l text-warning"><small>L</small></th></tr>`;
                
        thead.innerHTML = tr1 + tr2;
        tbody.innerHTML = '';

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
                            <div class="text-muted" style="font-size: 0.7rem;">${emp.code || ''}</div>
                        </div>
                    </div>
                </td>`;
                
            let totalP = 0, totalA = 0, totalL = 0;

            for (let dateStr of daysArray) {
                const isFuture = dateStr > todayStr;
                const rec = agg[emp.id][dateStr];
                
                let mVal = rec ? rec.morning : (isFuture ? '' : 'P');
                let aVal = rec ? rec.afternoon : (isFuture ? '' : 'P');
                
                if (mVal === 'P') totalP += 0.5;
                if (mVal === 'A') totalA += 0.5;
                if (mVal === 'L') totalL += 0.5;
                
                if (aVal === 'P') totalP += 0.5;
                if (aVal === 'A') totalA += 0.5;
                if (aVal === 'L') totalL += 0.5;

                let mClass = mVal ? mVal : 'none';
                let aClass = aVal ? aVal : 'none';

                html += `<td class="border-start p-1"><div class="att-cell att-${mClass}" style="cursor: default;">${mVal}</div></td>
                         <td class="border-end p-1"><div class="att-cell att-${aClass}" style="cursor: default;">${aVal}</div></td>`;
            }

            html += `<td class="col-total col-total-p text-success fw-bold p-1">${totalP}</td>
                     <td class="col-total col-total-a text-danger fw-bold p-1">${totalA}</td>
                     <td class="col-total col-total-l text-warning fw-bold p-1">${totalL}</td>`;

            tr.innerHTML = html;
            tbody.appendChild(tr);
        });
        
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="3" class="text-danger py-4">មានបញ្ហាក្នុងការទាញយកទិន្នន័យ</td></tr>`;
    }
};
