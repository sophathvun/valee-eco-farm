// ====== ATTENDANCE REPORT ======

function formatKhmerDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const khmerMonths = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
    const khmerNumbers = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
    
    let kD = d.split('').map(char => khmerNumbers[parseInt(char)]).join('');
    let kY = y.split('').map(char => khmerNumbers[parseInt(char)]).join('');
    let kM = khmerMonths[parseInt(m) - 1];
    
    return `${kD} ${kM} ${kY}`;
}

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
    
    if (typeof generateAttendanceReport === 'function') {
        generateAttendanceReport();
    }
    
    if (typeof db !== 'undefined') {
        if (db.settings) {
            db.settings.get('branding').then(res => {
                if (res && res.appName) {
                    const el = document.getElementById('brand-name-report-att');
                    if (el) el.innerText = res.appName;
                }
            });
        }
        if (db.brandSettings) {
            db.brandSettings.get(1).then(brand => {
                const logoEl = document.getElementById('brand-logo-report-att');
                if (brand && brand.reportLogo && logoEl) {
                    logoEl.src = brand.reportLogo;
                    logoEl.style.display = 'block';
                }
            });
        }
    }
};

window.generateAttendanceReport = async function() {
    const from = document.getElementById('repAttFrom').value;
    const to = document.getElementById('repAttTo').value;
    const wrapper = document.getElementById('report-tables-wrapper');
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
    
    if (diffDays > 93) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើសចន្លោះពេលមិនលើសពី ៣ខែ!', 'warning');
        return;
    }
    
    if (dateText) {
        dateText.innerText = `គិតចាប់ពីថ្ងៃទី ${formatKhmerDate(from)} ដល់ថ្ងៃទី ${formatKhmerDate(to)}`;
    }
    
    try {
        wrapper.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>`;
        
        let employees = await db.employees.toArray();
        if (employees.length === 0) {
            wrapper.innerHTML = `<div class="text-center py-4 text-muted">មិនមានទិន្នន័យបុគ្គលិកទេ</div>`;
            return;
        }
        
        let allAtt = await db.attendance.toArray();
        let records = allAtt.filter(r => r.date >= from && r.date <= to);
        
        let agg = {};
        employees.forEach(emp => { agg[emp.id] = {}; });
        records.forEach(r => {
            if (agg[r.empId]) {
                agg[r.empId][r.date] = r;
            }
        });
        
        let daysArray = [];
        let curD = new Date(startD);
        while (curD <= endD) {
            let yy = curD.getFullYear();
            let mm = String(curD.getMonth() + 1).padStart(2, '0');
            let dd = String(curD.getDate()).padStart(2, '0');
            daysArray.push(`${yy}-${mm}-${dd}`);
            curD.setDate(curD.getDate() + 1);
        }

        // Chunk days into groups of 15
        const chunkedDays = [];
        for (let i = 0; i < daysArray.length; i += 15) {
            chunkedDays.push(daysArray.slice(i, i + 15));
        }

        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

        let finalHtml = '';

        chunkedDays.forEach((chunk, chunkIdx) => {
            // Build Header for this chunk
            let tr1 = `<tr><th rowspan="2" class="align-middle col-emp">បុគ្គលិក (Employee)</th>`;
            let tr2 = `<tr>`;
            
            chunk.forEach(dateStr => {
                const parts = dateStr.split('-');
                tr1 += `<th colspan="2" class="border-start border-end">${parts[2]}/${parts[1]}</th>`;
                tr2 += `<th class="border-start"><small>ព្រឹក</small></th><th class="border-end"><small>ល្ងាច</small></th>`;
            });
            
            tr1 += `<th colspan="3" class="col-total col-total-header">សរុប (Total)</th></tr>`;
            tr2 += `<th class="col-total col-total-p text-success"><small>P</small></th>
                    <th class="col-total col-total-a text-danger"><small>A</small></th>
                    <th class="col-total col-total-l text-warning"><small>L</small></th></tr>`;
            
            let tbodyHtml = '';

            employees.forEach(emp => {
                let html = `
                    <tr>
                    <td class="text-start align-middle col-emp">
                        <div class="d-flex align-items-center">
                            <img src="${emp.photo || 'assets/default-avatar.png'}" class="rounded-circle me-2 border" style="width: 30px; height: 30px; object-fit: cover;">
                            <div style="line-height: 1.2;">
                                <div class="fw-bold text-dark" style="font-size: 0.85rem;">${emp.name}</div>
                                <div class="text-muted" style="font-size: 0.7rem;">${emp.code || ''}</div>
                            </div>
                        </div>
                    </td>`;
                    
                // For Totals, we sum up across ALL days in the entire range, not just this chunk!
                // So the user sees the grand total for the period on every chunk table.
                let totalP = 0, totalA = 0, totalL = 0;
                for (let d of daysArray) {
                    const rec = agg[emp.id][d];
                    const isF = d > todayStr;
                    let m = rec ? rec.morning : (isF ? '' : 'P');
                    let a = rec ? rec.afternoon : (isF ? '' : 'P');
                    
                    if (m === 'P') totalP += 0.5;
                    if (m === 'A') totalA += 0.5;
                    if (m === 'L') totalL += 0.5;
                    if (a === 'P') totalP += 0.5;
                    if (a === 'A') totalA += 0.5;
                    if (a === 'L') totalL += 0.5;
                }

                chunk.forEach(dateStr => {
                    const isFuture = dateStr > todayStr;
                    const rec = agg[emp.id][dateStr];
                    
                    let mVal = rec ? rec.morning : (isFuture ? '' : 'P');
                    let aVal = rec ? rec.afternoon : (isFuture ? '' : 'P');
                    
                    let mClass = mVal ? mVal : 'none';
                    let aClass = aVal ? aVal : 'none';

                    html += `<td class="border-start p-1"><div class="att-cell att-${mClass}" style="cursor: default;">${mVal}</div></td>
                             <td class="border-end p-1"><div class="att-cell att-${aClass}" style="cursor: default;">${aVal}</div></td>`;
                });

                html += `<td class="col-total col-total-p text-success fw-bold p-1">${totalP}</td>
                         <td class="col-total col-total-a text-danger fw-bold p-1">${totalA}</td>
                         <td class="col-total col-total-l text-warning fw-bold p-1">${totalL}</td>
                    </tr>`;
                
                tbodyHtml += html;
            });

            // Page break for printing (except last table)
            const pbClass = (chunkIdx < chunkedDays.length - 1) ? 'page-break-after' : '';
            
            finalHtml += `
                <div class="${pbClass} mb-4">
                    <table class="table table-hover table-bordered align-middle text-center mb-0 att-table print-table">
                        <thead class="table-darkgreen">
                            ${tr1}
                            ${tr2}
                        </thead>
                        <tbody>
                            ${tbodyHtml}
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        wrapper.innerHTML = finalHtml;
        
    } catch (err) {
        console.error(err);
        wrapper.innerHTML = `<div class="text-danger py-4 text-center">មានបញ្ហាក្នុងការទាញយកទិន្នន័យ</div>`;
    }
};

window.printAttReport = function() {
    let style = document.getElementById('dynamic-print-orientation');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-print-orientation';
        document.head.appendChild(style);
    }
    style.innerHTML = '@media print { @page { size: A4 landscape; margin: 10mm; } }';
    document.body.classList.add('printing-report');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-report'), 1000);
};;





