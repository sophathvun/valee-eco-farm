// ====== ATTENDANCE REPORT ======

function formatReportDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(m, 10) - 1;
    const mName = months[mIdx] || m;
    return `${d}-${mName}-${y}`;
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
        dateText.innerText = `គិតចាប់ពីថ្ងៃទី ${formatReportDate(from)} ដល់ថ្ងៃទី ${formatReportDate(to)}`;
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

        // Chunk days into groups of 15 (fits nicely on A4 landscape)
        const chunkedDays = [];
        for (let i = 0; i < daysArray.length; i += 15) {
            chunkedDays.push(daysArray.slice(i, i + 15));
        }

        let finalHtml = '';

        chunkedDays.forEach((chunk, chunkIdx) => {
            // Build Header for this chunk
            let tr1 = `<tr>
                <th rowspan="2" class="align-middle col-emp">បុគ្គលិក (Employee)</th>
                <th rowspan="2" class="align-middle col-type">ប្រភេទការងារ<br><small style="font-size: 0.65rem;">(Type)</small></th>`;
            let tr2 = `<tr>`;
            
            chunk.forEach((dateStr, dIdx) => {
                const parts = dateStr.split('-');
                const isEven = (dIdx % 2 === 1);
                const hClass = isEven ? 'day-header-even' : 'day-header-odd';
                tr1 += `<th colspan="2" class="${hClass} border-start border-end day-border-right">${parts[2]}/${parts[1]}</th>`;
                tr2 += `<th class="${hClass} border-start"><small>ព្រឹក</small></th><th class="${hClass} border-end day-border-right"><small>ល្ងាច</small></th>`;
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
                            <img src="${emp.photo || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" class="rounded-circle me-2 border flex-shrink-0" style="width: 26px; height: 26px; object-fit: cover;">
                            <div style="line-height: 1.18; overflow: hidden; white-space: nowrap;">
                                <div class="fw-bold text-dark emp-name-km" style="font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis;" title="${emp.name}">${emp.name}</div>
                                <div class="text-muted emp-name-latin" style="font-size: 0.68rem; overflow: hidden; text-overflow: ellipsis;" title="${emp.latinName || ''}">${emp.latinName || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="align-middle text-center col-type">
                        <span class="badge ${emp.type === 'Part-Time' ? 'bg-warning text-dark' : 'bg-primary bg-opacity-75 text-white'} px-1 py-1" style="font-size: 0.68rem; font-weight: 500;">
                            ${emp.type || 'Full-Time'}
                        </span>
                    </td>`;
                    
                // For Totals, sum up across ALL days in the entire range
                let totalP = 0, totalA = 0, totalL = 0;
                for (let d of daysArray) {
                    const rec = agg[emp.id][d];
                    let m = (rec && rec.morning) ? rec.morning : '';
                    let a = (rec && rec.afternoon) ? rec.afternoon : '';
                    
                    if (m === 'P') totalP += 0.5;
                    if (m === 'A') totalA += 0.5;
                    if (m === 'L') totalL += 0.5;
                    if (a === 'P') totalP += 0.5;
                    if (a === 'A') totalA += 0.5;
                    if (a === 'L') totalL += 0.5;
                }

                chunk.forEach((dateStr, dIdx) => {
                    const isEven = (dIdx % 2 === 1);
                    const dayClass = isEven ? 'day-even-col' : 'day-odd-col';
                    const rec = agg[emp.id][dateStr];
                    
                    let mVal = (rec && rec.morning) ? rec.morning : '';
                    let aVal = (rec && rec.afternoon) ? rec.afternoon : '';
                    
                    let mClass = mVal ? mVal : 'none';
                    let aClass = aVal ? aVal : 'none';

                    html += `<td class="border-start ${dayClass} p-1"><div class="att-cell att-${mClass}" style="cursor: default;">${mVal}</div></td>
                             <td class="border-end ${dayClass} day-border-right p-1"><div class="att-cell att-${aClass}" style="cursor: default;">${aVal}</div></td>`;
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
                    ${chunkedDays.length > 1 ? `<div class="fw-bold mb-2 text-dark small text-start">ផ្នែកទី ${chunkIdx + 1}: ថ្ងៃទី ${formatReportDate(chunk[0])} ដល់ ${formatReportDate(chunk[chunk.length - 1])}</div>` : ''}
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
    style.innerHTML = '@page { size: A4 landscape; margin: 8mm; } @media print { @page { size: A4 landscape; margin: 8mm; } }';
    document.body.classList.add('printing-report');
    
    const cleanup = () => {
        document.body.classList.remove('printing-report');
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    
    // Fallback if afterprint doesn't fire after 10s
    setTimeout(() => {
        document.body.classList.remove('printing-report');
    }, 10000);
    
    setTimeout(() => {
        window.print();
    }, 250);
};
