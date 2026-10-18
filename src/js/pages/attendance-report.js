// ====== ATTENDANCE REPORT ======

function formatReportDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(m, 10) - 1;
    const mName = months[mIdx] || m;
    return `${d}-${mName}-${y}`;
}

window.loadAttendanceReportLogo = async function() {
    const logoEl = document.getElementById('brand-logo-report-att');
    if (!logoEl) return;
    
    // 1. Try local storage cache for instant rendering
    const cached = localStorage.getItem('cachedReportLogo');
    if (cached) {
        logoEl.src = cached;
        logoEl.style.display = 'block';
    }
    
    // 2. Fetch from Firebase brandSettings
    try {
        if (typeof db !== 'undefined') {
            if (!db.brandSettings) db.brandSettings = new FirebaseStore('brandSettings');
            const brand = await db.brandSettings.get(1);
            if (brand) {
                const logoUrl = brand.reportLogo || brand.sidebarLogo || 'assets/images/logo.png';
                if (logoUrl) {
                    logoEl.src = logoUrl;
                    logoEl.style.display = 'block';
                    if (brand.reportLogo) {
                        localStorage.setItem('cachedReportLogo', brand.reportLogo);
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error loading report logo:', e);
    }
};

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
    
    loadAttendanceReportLogo();
    
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

        // 1. Group employees by Department
        const deptMap = {};
        employees.forEach(emp => {
            const dept = (emp.department && emp.department.trim()) ? emp.department.trim() : 'ផ្សេងៗ (Other)';
            if (!deptMap[dept]) {
                deptMap[dept] = [];
            }
            deptMap[dept].push(emp);
        });

        // 2. Sort departments Ascending (A-Z) in Khmer
        const sortedDeptNames = Object.keys(deptMap).sort((a, b) => a.localeCompare(b, 'km'));

        // 3. Sort employees within each department by Khmer name (A-Z)
        sortedDeptNames.forEach(dept => {
            deptMap[dept].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'km'));
        });

        // Chunk days into groups of 15 (fits nicely on A4 landscape)
        const chunkedDays = [];
        for (let i = 0; i < daysArray.length; i += 15) {
            chunkedDays.push(daysArray.slice(i, i + 15));
        }

        let finalHtml = '';

        chunkedDays.forEach((chunk, chunkIdx) => {
            // Build Header for this chunk
            let tr1 = `<tr>
                <th rowspan="2" class="align-middle col-no text-center">ល.រ</th>
                <th rowspan="2" class="align-middle col-emp">បុគ្គលិក (Employee)</th>
                <th rowspan="2" class="align-middle col-type">ប្រភេទការងារ<br><small style="font-size: 0.65rem;">(Type)</small></th>`;
            let tr2 = `<tr>`;
            
            chunk.forEach((dateStr, dIdx) => {
                const parts = dateStr.split('-');
                const isEven = (dIdx % 2 === 1);
                const hClass = isEven ? 'day-header-even' : 'day-header-odd';
                tr1 += `<th colspan="2" class="${hClass} day-border-right">${parts[2]}/${parts[1]}</th>`;
                tr2 += `<th class="${hClass} col-shift border-dotted-right"><small>ព្រឹក</small></th><th class="${hClass} col-shift day-border-right"><small>ល្ងាច</small></th>`;
            });
            
            tr1 += `<th colspan="3" class="col-total col-total-header">សរុប (Total)</th></tr>`;
            tr2 += `<th class="col-total col-total-p text-success"><small>P</small></th>
                    <th class="col-total col-total-a text-danger"><small>A</small></th>
                    <th class="col-total col-total-l text-warning"><small>L</small></th></tr>`;
            
            let tbodyHtml = '';
            let seqNo = 1;
            const totalCols = chunk.length * 2 + 6;

            sortedDeptNames.forEach(dept => {
                const deptEmps = deptMap[dept];
                if (!deptEmps || deptEmps.length === 0) return;

                // Department Header Row with Inner Indicator (No protruding outer border)
                tbodyHtml += `
                    <tr class="dept-header-row">
                        <td colspan="${totalCols}" class="text-start dept-header-cell">
                            <div class="d-flex align-items-center">
                                <span class="dept-inner-indicator"></span>
                                <span class="dept-header-title"><i class="bi bi-diagram-3-fill me-1 text-success"></i>ផ្នែក៖ <strong>${dept}</strong></span>
                                <span class="dept-header-count text-muted ms-2 small">(${deptEmps.length} នាក់)</span>
                            </div>
                        </td>
                    </tr>
                `;

                deptEmps.forEach(emp => {
                    let html = `
                        <tr>
                        <td class="align-middle text-center col-no fw-bold text-muted">${seqNo}</td>
                        <td class="text-start align-middle col-emp">
                            <div class="d-flex align-items-center">
                                <img src="${emp.photo || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" class="rounded-circle me-2 border flex-shrink-0" style="width: 24px; height: 24px; object-fit: cover;">
                                <div style="line-height: 1.35; overflow: hidden; white-space: nowrap; padding-top: 2px;">
                                    <div class="text-dark emp-name-km" style="font-size: 0.76rem; font-weight: normal; line-height: 1.35; overflow: hidden; text-overflow: ellipsis;" title="${emp.name}">${emp.name}</div>
                                    <div class="text-muted emp-name-latin" style="font-size: 0.62rem; line-height: 1.2; overflow: hidden; text-overflow: ellipsis;" title="${emp.latinName || ''}">${emp.latinName || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td class="align-middle text-center col-type">
                            <span class="badge ${emp.type === 'Part-Time' ? 'bg-warning text-dark' : 'bg-primary bg-opacity-75 text-white'} px-1 py-1" style="font-size: 0.62rem; font-weight: 500;">
                                ${emp.type || 'Full-Time'}
                            </span>
                        </td>`;

                    seqNo++;
                        
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

                        html += `<td class="col-shift ${dayClass} border-dotted-right p-0"><div class="att-cell att-${mClass}" style="cursor: default;">${mVal}</div></td>
                                 <td class="col-shift ${dayClass} day-border-right p-0"><div class="att-cell att-${aClass}" style="cursor: default;">${aVal}</div></td>`;
                    });

                    html += `<td class="col-total col-total-p text-success fw-bold p-1">${totalP}</td>
                             <td class="col-total col-total-a text-danger fw-bold p-1">${totalA}</td>
                             <td class="col-total col-total-l text-warning fw-bold p-1">${totalL}</td>
                        </tr>`;
                    
                    tbodyHtml += html;
                });
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

window.printAttReport = async function() {
    if (typeof loadAttendanceReportLogo === 'function') {
        await loadAttendanceReportLogo();
    }
    
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
    }, 300);
};

// Initial load check for logo
setTimeout(() => {
    if (typeof loadAttendanceReportLogo === 'function') {
        loadAttendanceReportLogo();
    }
}, 150);

