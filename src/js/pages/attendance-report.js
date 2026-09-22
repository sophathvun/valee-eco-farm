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
    
    if (dateText) {
        // Format to DD/MM/YYYY
        const [fY, fM, fD] = from.split('-');
        const [tY, tM, tD] = to.split('-');
        dateText.innerText = `គិតចាប់ពីថ្ងៃទី ${fD}/${fM}/${fY} ដល់ថ្ងៃទី ${tD}/${tM}/${tY}`;
    }
    
    try {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></td></tr>`;
        
        // Fetch all active employees
        let employees = await db.employees.toArray();
        if (employees.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-muted py-4">មិនមានទិន្នន័យបុគ្គលិកទេ</td></tr>`;
            return;
        }
        
        // Fetch attendance in range
        // Note: FirebaseStore doesn't natively support >= and <= on string dates efficiently in our simple wrapper.
        // We will fetch ALL attendance and filter in memory, which is fine for small/medium DBs.
        // Alternatively, since records are typically cached, we just filter.
        let allAtt = await db.attendance.toArray();
        let records = allAtt.filter(r => r.date >= from && r.date <= to);
        
        // Aggregate per employee
        let agg = {};
        employees.forEach(emp => {
            agg[emp.id] = { emp, totalP: 0, totalA: 0, totalL: 0 };
        });
        
        records.forEach(r => {
            if (agg[r.empId]) {
                if (r.morning === 'P') agg[r.empId].totalP += 0.5;
                if (r.morning === 'A') agg[r.empId].totalA += 0.5;
                if (r.morning === 'L') agg[r.empId].totalL += 0.5;
                
                if (r.afternoon === 'P') agg[r.empId].totalP += 0.5;
                if (r.afternoon === 'A') agg[r.empId].totalA += 0.5;
                if (r.afternoon === 'L') agg[r.empId].totalL += 0.5;
            }
        });
        
        // Render
        let html = '';
        let no = 1;
        
        employees.forEach(emp => {
            let a = agg[emp.id];
            html += `
                <tr>
                    <td>${no++}</td>
                    <td class="text-start fw-bold text-dark">${emp.name}</td>
                    <td class="text-muted">${emp.code || ''}</td>
                    <td>${emp.position || ''}</td>
                    <td class="text-success fw-bold">${a.totalP > 0 ? a.totalP : '-'}</td>
                    <td class="text-danger fw-bold">${a.totalA > 0 ? a.totalA : '-'}</td>
                    <td class="text-warning fw-bold">${a.totalL > 0 ? a.totalL : '-'}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="7" class="text-danger py-4">មានបញ្ហាក្នុងការទាញយកទិន្នន័យ</td></tr>`;
    }
};
