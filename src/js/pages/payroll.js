// payroll.js - Employee Payroll Logic (Semi-Monthly, Attendance Auto-Sync, Standard 30 Days)

let currentPayrollBatches = [];
let currentBatch = null;
let editingItemEmpId = null;

// Helper: Khmer Month Names
function getKhmerMonthName(monthNumber) {
    const kmMonths = [
        'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
        'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    const idx = parseInt(monthNumber, 10) - 1;
    return kmMonths[idx] || monthNumber;
}

// Helper: Format Currency
function formatPayCurrency(amount, currency = 'USD') {
    const val = parseFloat(amount) || 0;
    if (currency === 'KHR') {
        return '៛' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(val));
    }
    return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

// Helper: Format Date
function formatPayDate(dateStr) {
    if (!dateStr || dateStr.length !== 10) return dateStr || '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

// ====== 1. INITIALIZATION ======
window.initPayroll = async function() {
    const filterMonth = document.getElementById('payrollFilterMonth');
    if (filterMonth && !filterMonth.value) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        filterMonth.value = `${yyyy}-${mm}`;
    }

    const genMonth = document.getElementById('genPayMonth');
    if (genMonth && !genMonth.value) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        genMonth.value = `${yyyy}-${mm}`;
    }

    await loadPayrollBatches();
};

window.resetPayrollFilters = function() {
    const filterMonth = document.getElementById('payrollFilterMonth');
    const filterStatus = document.getElementById('payrollFilterStatus');
    if (filterMonth) filterMonth.value = '';
    if (filterStatus) filterStatus.value = 'ALL';
    loadPayrollBatches();
};

// ====== 2. LOAD BATCHES & KPI CARDS ======
window.loadPayrollBatches = async function() {
    const listBody = document.getElementById('payrollBatchesList');
    if (!listBody) return;

    try {
        if (!db.payroll) {
            db.payroll = new FirebaseStore('payroll');
        }

        const allBatches = await db.payroll.toArray();
        currentPayrollBatches = allBatches || [];

        // Apply filters
        const filterMonth = document.getElementById('payrollFilterMonth') ? document.getElementById('payrollFilterMonth').value : '';
        const filterStatus = document.getElementById('payrollFilterStatus') ? document.getElementById('payrollFilterStatus').value : 'ALL';

        let filtered = currentPayrollBatches.filter(b => {
            if (filterMonth) {
                const [y, m] = filterMonth.split('-');
                if (b.year !== parseInt(y, 10) || b.month !== parseInt(m, 10)) return false;
            }
            if (filterStatus && filterStatus !== 'ALL') {
                if (b.status !== filterStatus) return false;
            }
            return true;
        });

        // Sort descending: by startDate or createdAt
        filtered.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

        // Compute KPI metrics across filtered batches
        let totalNetUSD = 0;
        let totalNetKHR = 0;
        let totalEmployeesCount = 0;
        let pendingCount = 0;
        let paidCount = 0;

        filtered.forEach(b => {
            if (b.status === 'Paid') paidCount++;
            else pendingCount++;

            if (b.items && Array.isArray(b.items)) {
                totalEmployeesCount += b.items.length;
                b.items.forEach(it => {
                    const net = parseFloat(it.netSalary) || 0;
                    if (it.currency === 'KHR') totalNetKHR += net;
                    else totalNetUSD += net;
                });
            }
        });

        // Update KPI card elements
        const kpiNetEl = document.getElementById('kpi-total-net');
        const kpiNetKhrEl = document.getElementById('kpi-total-net-khr');
        const kpiEmpsEl = document.getElementById('kpi-total-employees');
        const kpiPendingEl = document.getElementById('kpi-pending-batches');
        const kpiPaidEl = document.getElementById('kpi-paid-batches');

        if (kpiNetEl) kpiNetEl.textContent = formatPayCurrency(totalNetUSD, 'USD');
        if (kpiNetKhrEl) kpiNetKhrEl.textContent = totalNetKHR > 0 ? formatPayCurrency(totalNetKHR, 'KHR') : '';
        if (kpiEmpsEl) kpiEmpsEl.textContent = `${totalEmployeesCount} នាក់`;
        if (kpiPendingEl) kpiPendingEl.textContent = `${pendingCount} លើក`;
        if (kpiPaidEl) kpiPaidEl.textContent = `${paidCount} លើក`;

        // Render Batches Table
        if (filtered.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="9" class="py-5 text-muted text-center">
                        <i class="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                        មិនមានទិន្នន័យតារាងបើកប្រាក់បៀវត្សរ៍សម្រាប់ចន្លោះពេលនេះទេ<br>
                        <button class="btn btn-primary btn-sm mt-3 px-3 rounded-pill" onclick="openGeneratePayrollModal()">
                            <i class="bi bi-plus-circle me-1"></i> បង្កើតតារាងបើកប្រាក់ខែថ្មី
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filtered.forEach((b, idx) => {
            let statusBadge = '<span class="badge bg-secondary">Draft</span>';
            if (b.status === 'Approved') statusBadge = '<span class="badge bg-info text-dark">Approved</span>';
            if (b.status === 'Paid') statusBadge = '<span class="badge bg-success">Paid</span>';

            // Calculate batch totals
            let batchGrossUSD = 0, batchGrossKHR = 0;
            let batchDeductUSD = 0, batchDeductKHR = 0;
            let batchNetUSD = 0, batchNetKHR = 0;

            (b.items || []).forEach(it => {
                const g = parseFloat(it.grossSalary || it.periodBaseSalary) || 0;
                const d = parseFloat(it.absenceDeduction) || 0;
                const n = parseFloat(it.netSalary) || 0;

                if (it.currency === 'KHR') {
                    batchGrossKHR += g;
                    batchDeductKHR += d;
                    batchNetKHR += n;
                } else {
                    batchGrossUSD += g;
                    batchDeductUSD += d;
                    batchNetUSD += n;
                }
            });

            const grossDisplay = batchGrossKHR > 0 ? `${formatPayCurrency(batchGrossUSD, 'USD')}<br><small class="text-muted">${formatPayCurrency(batchGrossKHR, 'KHR')}</small>` : formatPayCurrency(batchGrossUSD, 'USD');
            const deductDisplay = batchDeductKHR > 0 ? `-${formatPayCurrency(batchDeductUSD, 'USD')}<br><small class="text-danger">-${formatPayCurrency(batchDeductKHR, 'KHR')}</small>` : `-${formatPayCurrency(batchDeductUSD, 'USD')}`;
            const netDisplay = batchNetKHR > 0 ? `${formatPayCurrency(batchNetUSD, 'USD')}<br><small class="text-success">${formatPayCurrency(batchNetKHR, 'KHR')}</small>` : formatPayCurrency(batchNetUSD, 'USD');

            html += `
                <tr>
                    <td class="fw-bold text-muted">${idx + 1}</td>
                    <td class="text-start">
                        <div class="fw-bold text-dark cursor-pointer text-primary" onclick="viewPayrollDetail(${b.id})">
                            <i class="bi bi-folder2-open text-primary me-1"></i> ${b.title || b.code}
                        </div>
                        <small class="text-muted">${b.code} ${b.note ? '• ' + b.note : ''}</small>
                    </td>
                    <td><small class="text-muted">${formatPayDate(b.startDate)} - ${formatPayDate(b.endDate)}</small></td>
                    <td><span class="badge bg-light text-dark border">${(b.items || []).length} នាក់</span></td>
                    <td class="text-end fw-semibold">${grossDisplay}</td>
                    <td class="text-end text-danger">${deductDisplay}</td>
                    <td class="text-end fw-bold text-success fs-6">${netDisplay}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewPayrollDetail(${b.id})" title="មើលលម្អិត">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="printPayrollMaster(${b.id})" title="បោះពុម្ពតារាងរួម">
                                <i class="bi bi-printer"></i>
                            </button>
                            <button class="btn btn-outline-success btn-sm" onclick="exportPayrollExcel(${b.id})" title="Export Excel">
                                <i class="bi bi-file-earmark-excel"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deletePayrollBatch(${b.id})" title="លុប">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        listBody.innerHTML = html;

    } catch (err) {
        console.error("Error loading payroll batches:", err);
        listBody.innerHTML = `<tr><td colspan="9" class="text-danger py-4 text-center">មានបញ្ហាក្នុងការទាញយកទិន្នន័យ៖ ${err.message}</td></tr>`;
    }
};

// ====== 3. GENERATE PAYROLL MODAL & LOGIC ======
window.openGeneratePayrollModal = function() {
    const modalEl = document.getElementById('generatePayrollModal');
    if (!modalEl) return;

    const genMonth = document.getElementById('genPayMonth');
    if (genMonth && !genMonth.value) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        genMonth.value = `${yyyy}-${mm}`;
    }

    // Default to Period 1 or Period 2 based on current day
    const day = new Date().getDate();
    if (day > 15) {
        selectPeriodOption(2);
    } else {
        selectPeriodOption(1);
    }

    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
};

window.selectPeriodOption = function(periodNum) {
    const r1 = document.getElementById('genPeriod1');
    const r2 = document.getElementById('genPeriod2');
    if (r1 && r2) {
        if (periodNum === 1) {
            r1.checked = true;
            r1.closest('.period-select-card').classList.add('active');
            r2.closest('.period-select-card').classList.remove('active');
        } else {
            r2.checked = true;
            r2.closest('.period-select-card').classList.add('active');
            r1.closest('.period-select-card').classList.remove('active');
        }
    }
};

window.handleGeneratePayroll = async function(e) {
    if (e) e.preventDefault();

    const monthInput = document.getElementById('genPayMonth');
    if (!monthInput || !monthInput.value) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើសខែ និងឆ្នាំ!', 'warning');
        return;
    }

    const monthVal = monthInput.value; // YYYY-MM
    const [yyyyStr, mmStr] = monthVal.split('-');
    const year = parseInt(yyyyStr, 10);
    const month = parseInt(mmStr, 10);

    const periodRadio = document.querySelector('input[name="genPayPeriod"]:checked');
    const period = periodRadio ? parseInt(periodRadio.value, 10) : 1;
    const note = document.getElementById('genPayNote') ? document.getElementById('genPayNote').value.trim() : '';

    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const startDate = (period === 1) ? `${yyyyStr}-${mmStr}-01` : `${yyyyStr}-${mmStr}-16`;
    const endDate = (period === 1) ? `${yyyyStr}-${mmStr}-15` : `${yyyyStr}-${mmStr}-${String(lastDayOfMonth).padStart(2, '0')}`;
    const code = `PAY-${year}-${mmStr}-P${period}`;

    const subBtn = document.getElementById('btnSubmitGeneratePay');
    if (subBtn) {
        subBtn.disabled = true;
        subBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងទាញយកទិន្នន័យវត្តមាន...';
    }

    try {
        // Check if batch already exists
        const allBatches = await db.payroll.toArray();
        const existing = allBatches.find(b => b.year === year && b.month === month && b.period === period);
        let existingId = null;

        if (existing) {
            const confirmRes = await Swal.fire({
                title: 'តារាងមានរួចហើយ!',
                text: `តារាងបើកប្រាក់ខែ ${existing.title || code} មានរួចហើយ។ តើអ្នកចង់គណនាឡើងវិញ (Re-calculate) ឬទេ?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'បាទ/ចាស គណនាឡើងវិញ',
                cancelButtonText: 'បោះបង់'
            });

            if (!confirmRes.isConfirmed) {
                if (subBtn) {
                    subBtn.disabled = false;
                    subBtn.innerHTML = '<i class="bi bi-magic me-1"></i> ស្រង់វត្តមាន និងគណនាប្រាក់ខែភ្លាមៗ';
                }
                return;
            }
            existingId = existing.id;
        }

        // Fetch Employees
        const employees = await db.employees.toArray();
        if (!employees || employees.length === 0) {
            Swal.fire('ព័ត៌មាន', 'មិនមានបុគ្គលិកក្នុងប្រព័ន្ធទេ សូមបញ្ចូលបុគ្គលិកជាមុនសិន!', 'warning');
            return;
        }

        // Sort employees by Department (A-Z) then by Khmer Name (A-Z)
        employees.sort((a, b) => {
            const deptA = (a.department && a.department.trim()) ? a.department.trim() : 'ផ្សេងៗ';
            const deptB = (b.department && b.department.trim()) ? b.department.trim() : 'ផ្សេងៗ';
            const deptCompare = deptA.localeCompare(deptB, 'km');
            if (deptCompare !== 0) return deptCompare;
            return (a.name || '').localeCompare(b.name || '', 'km');
        });

        // Fetch Attendance records in date range
        const allAtt = await db.attendance.toArray();
        const rangeAtt = allAtt.filter(r => r.date >= startDate && r.date <= endDate);

        // Map attendance by empId: { [empId]: [records...] }
        const empAttMap = {};
        employees.forEach(emp => { empAttMap[emp.id] = []; });
        rangeAtt.forEach(r => {
            if (empAttMap[r.empId]) empAttMap[r.empId].push(r);
        });

        // Build existing adjustments map if overwriting (so user-entered allowances/deductions are preserved!)
        const existingAdjMap = {};
        if (existing && existing.items) {
            existing.items.forEach(it => {
                existingAdjMap[it.empId] = {
                    allowance: it.allowance || 0,
                    allowanceNote: it.allowanceNote || '',
                    otherDeduction: it.otherDeduction || 0,
                    deductionNote: it.deductionNote || ''
                };
            });
        }

        // Calculate line items for each employee
        const items = [];

        employees.forEach(emp => {
            const attList = empAttMap[emp.id] || [];
            let pShifts = 0;
            let lShifts = 0;
            let aShifts = 0;

            attList.forEach(r => {
                if (r.morning === 'P') pShifts++;
                else if (r.morning === 'L') lShifts++;
                else if (r.morning === 'A') aShifts++;

                if (r.afternoon === 'P') pShifts++;
                else if (r.afternoon === 'L') lShifts++;
                else if (r.afternoon === 'A') aShifts++;
            });

            const presentDays = pShifts * 0.5;
            const leaveDays = lShifts * 0.5;
            const absentDays = aShifts * 0.5;
            const workedDays = presentDays + leaveDays; // L counts as worked day!

            const empSalary = parseFloat(emp.salary) || 0;
            const currency = emp.currency || 'USD';
            const isPartTime = (emp.type === 'Part-Time');

            let periodBaseSalary = 0;
            let dailyRate = 0;
            let absenceDeduction = 0;
            let grossSalary = 0;

            if (isPartTime) {
                // Part-Time: paid strictly per worked day (workedDays * dailyRate)
                if (emp.wageType === 'Daily') {
                    dailyRate = empSalary;
                } else if (emp.wageType === 'Shift') {
                    dailyRate = empSalary * 2;
                } else {
                    dailyRate = empSalary / 30; // standard 30 days
                }
                grossSalary = workedDays * dailyRate;
                periodBaseSalary = grossSalary;
                absenceDeduction = 0; // Not deducted from a base salary, already paid by days worked
            } else {
                // Full-Time: Base Salary / 2 per period, Daily Rate = Base Salary / 30 (Option 1 Standard 30 days)
                periodBaseSalary = empSalary / 2;
                dailyRate = empSalary / 30;
                const shiftRate = dailyRate / 2;
                // Only Absent (A) is deducted. Leave (L) is paid as instructed!
                absenceDeduction = (aShifts * shiftRate);
                grossSalary = periodBaseSalary;
            }

            // Restore preserved adjustments or default to 0
            const prevAdj = existingAdjMap[emp.id] || {};
            const allowance = parseFloat(prevAdj.allowance) || 0;
            const allowanceNote = prevAdj.allowanceNote || '';
            const otherDeduction = parseFloat(prevAdj.otherDeduction) || 0;
            const deductionNote = prevAdj.deductionNote || '';

            const netSalary = Math.max(0, grossSalary - absenceDeduction + allowance - otherDeduction);

            items.push({
                empId: emp.id,
                empCode: emp.code || '',
                empName: emp.name || '',
                empLatinName: emp.latinName || '',
                empPhoto: emp.photo || '',
                department: emp.department || 'ផ្សេងៗ',
                position: emp.position || '',
                type: emp.type || 'Full-Time',
                wageType: emp.wageType || 'Monthly',
                currency: currency,
                baseSalary: empSalary,
                periodBaseSalary: periodBaseSalary,
                dailyRate: dailyRate,
                presentDays: presentDays,
                leaveDays: leaveDays,
                absentDays: absentDays,
                workedDays: workedDays,
                absenceDeduction: absenceDeduction,
                allowance: allowance,
                allowanceNote: allowanceNote,
                otherDeduction: otherDeduction,
                deductionNote: deductionNote,
                grossSalary: grossSalary,
                netSalary: netSalary,
                status: 'Pending'
            });
        });

        // Batch object
        const batchData = {
            id: existingId || Date.now(),
            year: year,
            month: month,
            period: period,
            code: code,
            title: `ខែ${getKhmerMonthName(month)} ឆ្នាំ${year} - លើកទី ${period} (ថ្ងៃទី ${period === 1 ? '០១ ដល់ ១៥' : '១៦ ដល់ ' + lastDayOfMonth})`,
            startDate: startDate,
            endDate: endDate,
            status: existing ? existing.status : 'Draft',
            note: note,
            createdAt: existing ? existing.createdAt : new Date().toISOString(),
            createdBy: currentUser ? (currentUser.fullname || currentUser.username) : 'Admin',
            items: items
        };

        if (existingId) {
            await db.payroll.update(existingId, batchData);
        } else {
            await db.payroll.add(batchData);
        }

        // Close modal
        const modalEl = document.getElementById('generatePayrollModal');
        if (modalEl) {
            const m = bootstrap.Modal.getInstance(modalEl);
            if (m) m.hide();
        }

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: 'បានស្រង់ទិន្នន័យវត្តមាន និងគណនាប្រាក់បៀវត្សរ៍ដោយស្វ័យប្រវត្តរួចរាល់!',
            timer: 1600,
            showConfirmButton: false
        });

        // Open Detail View immediately
        await viewPayrollDetail(batchData.id);

    } catch (err) {
        console.error("Error generating payroll:", err);
        Swal.fire('បញ្ហា', err.message, 'error');
    } finally {
        if (subBtn) {
            subBtn.disabled = false;
            subBtn.innerHTML = '<i class="bi bi-magic me-1"></i> ស្រង់វត្តមាន និងគណនាប្រាក់ខែភ្លាមៗ';
        }
    }
};

// ====== 4. BATCH DETAIL VIEW & LINE ITEMS ======
window.viewPayrollDetail = async function(batchId) {
    try {
        const batch = await db.payroll.get(batchId);
        if (!batch) {
            Swal.fire('រកមិនឃើញ', 'មិនមានទិន្នន័យតារាងបើកប្រាក់ខែនេះទេ!', 'warning');
            return;
        }

        currentBatch = batch;

        // Switch Views
        document.getElementById('payroll-batches-view').style.display = 'none';
        document.getElementById('payroll-kpi-cards').style.display = 'none';
        document.getElementById('payroll-detail-view').style.display = 'block';

        // Header info
        document.getElementById('detail-batch-title').textContent = batch.title || batch.code;
        document.getElementById('detail-batch-daterange').textContent = `${formatPayDate(batch.startDate)} ដល់ ${formatPayDate(batch.endDate)}`;
        document.getElementById('detail-batch-creator').textContent = batch.createdBy || 'Admin';

        // Status badge
        const statusBadge = document.getElementById('detail-batch-status-badge');
        if (statusBadge) {
            if (batch.status === 'Paid') {
                statusBadge.className = 'badge bg-success';
                statusBadge.textContent = 'Paid (បានទូទាត់)';
            } else if (batch.status === 'Approved') {
                statusBadge.className = 'badge bg-info text-dark';
                statusBadge.textContent = 'Approved (បានអនុម័ត)';
            } else {
                statusBadge.className = 'badge bg-secondary';
                statusBadge.textContent = 'Draft (សេចក្តីព្រាង)';
            }
        }

        // Aggregate metrics for summary bar
        let totEmps = batch.items.length;
        let totGrossUSD = 0, totGrossKHR = 0;
        let totDeductUSD = 0, totDeductKHR = 0;
        let totNetUSD = 0, totNetKHR = 0;

        batch.items.forEach(it => {
            const g = parseFloat(it.grossSalary) || 0;
            const d = parseFloat(it.absenceDeduction) || 0;
            const n = parseFloat(it.netSalary) || 0;

            if (it.currency === 'KHR') {
                totGrossKHR += g;
                totDeductKHR += d;
                totNetKHR += n;
            } else {
                totGrossUSD += g;
                totDeductUSD += d;
                totNetUSD += n;
            }
        });

        document.getElementById('detail-stat-emps').textContent = `${totEmps} នាក់`;
        document.getElementById('detail-stat-gross').innerHTML = totGrossKHR > 0 ? `${formatPayCurrency(totGrossUSD, 'USD')} <small class="text-muted">(${formatPayCurrency(totGrossKHR, 'KHR')})</small>` : formatPayCurrency(totGrossUSD, 'USD');
        document.getElementById('detail-stat-deduction').innerHTML = totDeductKHR > 0 ? `-${formatPayCurrency(totDeductUSD, 'USD')} <small class="text-danger">(-${formatPayCurrency(totDeductKHR, 'KHR')})</small>` : `-${formatPayCurrency(totDeductUSD, 'USD')}`;
        document.getElementById('detail-stat-net').innerHTML = totNetKHR > 0 ? `${formatPayCurrency(totNetUSD, 'USD')} <small class="text-success">(${formatPayCurrency(totNetKHR, 'KHR')})</small>` : formatPayCurrency(totNetUSD, 'USD');

        // Group items by Department
        const deptMap = {};
        batch.items.forEach(it => {
            const d = it.department || 'ផ្សេងៗ (Other)';
            if (!deptMap[d]) deptMap[d] = [];
            deptMap[d].push(it);
        });

        const sortedDeptNames = Object.keys(deptMap).sort((a, b) => a.localeCompare(b, 'km'));
        const tbody = document.getElementById('payrollDetailItemsList');
        if (!tbody) return;

        let html = '';
        let seq = 1;

        sortedDeptNames.forEach(dept => {
            const emps = deptMap[dept];
            // Sort emps by Khmer name
            emps.sort((a, b) => (a.empName || '').localeCompare(b.empName || '', 'km'));

            // Department row
            html += `
                <tr class="payroll-dept-header-row text-start">
                    <td colspan="13" class="py-2 px-3">
                        <i class="bi bi-diagram-3-fill text-success me-1"></i>
                        ផ្នែក៖ <strong>${dept}</strong> (${emps.length} នាក់)
                    </td>
                </tr>
            `;

            emps.forEach(it => {
                const isPartTime = (it.type === 'Part-Time');
                const typeBadge = isPartTime ? '<span class="badge bg-warning text-dark px-1">Part-Time</span>' : '<span class="badge bg-primary bg-opacity-75 text-white px-1">Full-Time</span>';
                
                const cur = it.currency || 'USD';
                const baseDisplay = formatPayCurrency(it.baseSalary, cur);
                const periodBaseDisplay = isPartTime ? '<span class="text-muted">-</span>' : formatPayCurrency(it.periodBaseSalary, cur);
                const deductDisplay = it.absenceDeduction > 0 ? `<span class="text-danger fw-bold">-${formatPayCurrency(it.absenceDeduction, cur)}</span>` : '<span class="text-muted">$0.00</span>';
                const allowanceDisplay = it.allowance > 0 ? `<span class="text-info fw-bold">+${formatPayCurrency(it.allowance, cur)}</span>${it.allowanceNote ? `<br><small class="text-muted" title="${it.allowanceNote}">(${it.allowanceNote})</small>` : ''}` : '<span class="text-muted">$0.00</span>';
                const otherDeductDisplay = it.otherDeduction > 0 ? `<span class="text-warning fw-bold">-${formatPayCurrency(it.otherDeduction, cur)}</span>${it.deductionNote ? `<br><small class="text-muted" title="${it.deductionNote}">(${it.deductionNote})</small>` : ''}` : '<span class="text-muted">$0.00</span>';
                const netDisplay = formatPayCurrency(it.netSalary, cur);

                html += `
                    <tr>
                        <td class="fw-bold text-muted">${seq++}</td>
                        <td class="text-start">
                            <div class="d-flex align-items-center">
                                <img src="${it.empPhoto || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" class="rounded-circle border me-2 flex-shrink-0" style="width: 28px; height: 28px; object-fit: cover;">
                                <div style="line-height: 1.25;">
                                    <div class="fw-bold text-dark col-emp-name">${it.empName}</div>
                                    <div class="text-muted small">${it.empLatinName || it.empCode || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td>${typeBadge}</td>
                        <td>${baseDisplay}</td>
                        <td class="text-success fw-bold">${it.presentDays}</td>
                        <td class="text-warning fw-bold">${it.leaveDays}</td>
                        <td class="text-danger fw-bold">${it.absentDays}</td>
                        <td>${periodBaseDisplay}</td>
                        <td>${deductDisplay}</td>
                        <td>${allowanceDisplay}</td>
                        <td>${otherDeductDisplay}</td>
                        <td class="fw-bold text-success fs-6">${netDisplay}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-sm px-2" onclick="openEditItemModal(${it.empId})" title="កែប្រាក់បន្ថែម/កាត់">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-success btn-sm px-2" onclick="viewPayslip(${batch.id}, ${it.empId})" title="ប័ណ្ណបើកប្រាក់ (Payslip)">
                                    <i class="bi bi-receipt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        });

        tbody.innerHTML = html;

    } catch (err) {
        console.error("Error viewing payroll detail:", err);
        Swal.fire('បញ្ហា', err.message, 'error');
    }
};

window.closePayrollDetail = function() {
    currentBatch = null;
    document.getElementById('payroll-detail-view').style.display = 'none';
    document.getElementById('payroll-kpi-cards').style.display = 'flex';
    document.getElementById('payroll-batches-view').style.display = 'block';
    loadPayrollBatches();
};

// ====== 5. RE-SYNC ATTENDANCE ======
window.resyncBatchAttendance = async function() {
    if (!currentBatch) return;

    const confirmRes = await Swal.fire({
        title: 'Sync វត្តមានឡើងវិញ?',
        text: 'តើអ្នកចង់ស្រង់ទិន្នន័យវត្តមាន (P, A, L) ពីប្រព័ន្ធវត្តមានមកគណនាឡើងវិញមែនទេ? (ប្រាក់បន្ថែម និងប្រាក់កាត់ដោយដៃ នឹងត្រូវបានរក្សាទុកដដែល)',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'បាទ/ចាស Sync ឡើងវិញ',
        cancelButtonText: 'បោះបង់'
    });

    if (!confirmRes.isConfirmed) return;

    try {
        const allAtt = await db.attendance.toArray();
        const rangeAtt = allAtt.filter(r => r.date >= currentBatch.startDate && r.date <= currentBatch.endDate);

        const empAttMap = {};
        currentBatch.items.forEach(it => { empAttMap[it.empId] = []; });
        rangeAtt.forEach(r => {
            if (empAttMap[r.empId]) empAttMap[r.empId].push(r);
        });

        currentBatch.items.forEach(it => {
            const attList = empAttMap[it.empId] || [];
            let pShifts = 0, lShifts = 0, aShifts = 0;

            attList.forEach(r => {
                if (r.morning === 'P') pShifts++;
                else if (r.morning === 'L') lShifts++;
                else if (r.morning === 'A') aShifts++;

                if (r.afternoon === 'P') pShifts++;
                else if (r.afternoon === 'L') lShifts++;
                else if (r.afternoon === 'A') aShifts++;
            });

            it.presentDays = pShifts * 0.5;
            it.leaveDays = lShifts * 0.5;
            it.absentDays = aShifts * 0.5;
            it.workedDays = it.presentDays + it.leaveDays;

            const isPartTime = (it.type === 'Part-Time');
            if (isPartTime) {
                it.grossSalary = it.workedDays * it.dailyRate;
                it.periodBaseSalary = it.grossSalary;
                it.absenceDeduction = 0;
            } else {
                it.periodBaseSalary = it.baseSalary / 2;
                it.dailyRate = it.baseSalary / 30;
                it.absenceDeduction = (aShifts * (it.dailyRate / 2));
                it.grossSalary = it.periodBaseSalary;
            }

            // Keep allowance and otherDeduction, recompute net
            it.netSalary = Math.max(0, it.grossSalary - it.absenceDeduction + (parseFloat(it.allowance) || 0) - (parseFloat(it.otherDeduction) || 0));
        });

        await db.payroll.update(currentBatch.id, currentBatch);
        await viewPayrollDetail(currentBatch.id);

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ',
            text: 'បាន Sync វត្តមានឡើងវិញ និងគណនាប្រាក់ខែរួចរាល់!',
            timer: 1500,
            showConfirmButton: false
        });

    } catch (err) {
        console.error("Error resyncing attendance:", err);
        Swal.fire('បញ្ហា', err.message, 'error');
    }
};

// ====== 6. EDIT ITEM ADJUSTMENTS ======
window.openEditItemModal = function(empId) {
    if (!currentBatch) return;
    const item = currentBatch.items.find(it => it.empId === empId);
    if (!item) return;

    editingItemEmpId = empId;

    document.getElementById('adj-emp-id').value = empId;
    document.getElementById('adj-emp-photo').src = item.empPhoto || 'assets/images/default-avatar.svg';
    document.getElementById('adj-emp-name').textContent = item.empName;
    document.getElementById('adj-emp-meta').textContent = `${item.department} • ${item.position || 'បុគ្គលិក'} • ប្រាក់ខែគោល៖ ${formatPayCurrency(item.baseSalary, item.currency)}`;

    document.getElementById('adj-allowance').value = item.allowance || 0;
    document.getElementById('adj-allowance-note').value = item.allowanceNote || '';
    document.getElementById('adj-other-deduction').value = item.otherDeduction || 0;
    document.getElementById('adj-deduction-note').value = item.deductionNote || '';

    calculateItemNetPreview();

    const modalEl = document.getElementById('editPayrollItemModal');
    if (modalEl) {
        const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        m.show();
    }
};

window.calculateItemNetPreview = function() {
    if (!currentBatch || !editingItemEmpId) return;
    const item = currentBatch.items.find(it => it.empId === editingItemEmpId);
    if (!item) return;

    const allowance = parseFloat(document.getElementById('adj-allowance').value) || 0;
    const otherDeduction = parseFloat(document.getElementById('adj-other-deduction').value) || 0;

    let baseGross = item.grossSalary || item.periodBaseSalary || 0;
    let absenceDeduct = item.absenceDeduction || 0;
    let net = Math.max(0, baseGross - absenceDeduct + allowance - otherDeduction);

    const prevEl = document.getElementById('adj-net-preview');
    if (prevEl) prevEl.textContent = formatPayCurrency(net, item.currency);
};

window.handleSaveItemAdjustment = async function(e) {
    if (e) e.preventDefault();
    if (!currentBatch || !editingItemEmpId) return;

    const item = currentBatch.items.find(it => it.empId === editingItemEmpId);
    if (!item) return;

    const allowance = parseFloat(document.getElementById('adj-allowance').value) || 0;
    const allowanceNote = document.getElementById('adj-allowance-note').value.trim();
    const otherDeduction = parseFloat(document.getElementById('adj-other-deduction').value) || 0;
    const deductionNote = document.getElementById('adj-deduction-note').value.trim();

    item.allowance = allowance;
    item.allowanceNote = allowanceNote;
    item.otherDeduction = otherDeduction;
    item.deductionNote = deductionNote;

    let baseGross = item.grossSalary || item.periodBaseSalary || 0;
    let absenceDeduct = item.absenceDeduction || 0;
    item.netSalary = Math.max(0, baseGross - absenceDeduct + allowance - otherDeduction);

    try {
        await db.payroll.update(currentBatch.id, currentBatch);

        const modalEl = document.getElementById('editPayrollItemModal');
        if (modalEl) {
            const m = bootstrap.Modal.getInstance(modalEl);
            if (m) m.hide();
        }

        await viewPayrollDetail(currentBatch.id);

        Swal.fire({
            icon: 'success',
            title: 'រក្សាទុកជោគជ័យ',
            timer: 1200,
            showConfirmButton: false
        });

    } catch (err) {
        console.error("Error saving adjustment:", err);
        Swal.fire('បញ្ហា', err.message, 'error');
    }
};

// ====== 7. STATUS MANAGEMENT & EXPENSE INTEGRATION ======
window.setBatchStatus = async function(newStatus) {
    if (!currentBatch) return;

    try {
        currentBatch.status = newStatus;
        await db.payroll.update(currentBatch.id, { status: newStatus });

        // If marked as Paid, offer to record expense transaction
        if (newStatus === 'Paid') {
            let totalNetUSD = 0;
            currentBatch.items.forEach(it => {
                const n = parseFloat(it.netSalary) || 0;
                if (it.currency === 'KHR') {
                    totalNetUSD += (n / (window.sysExchangeRate || 4100));
                } else {
                    totalNetUSD += n;
                }
            });

            const askExpense = await Swal.fire({
                title: 'ទូទាត់ប្រាក់ខែបានជោគជ័យ!',
                html: `ប្រព័ន្ធបានកំណត់ស្ថានភាពទៅជា <b>Paid</b>។<br><br>តើអ្នកចង់កត់ត្រាការទូទាត់ប្រាក់បៀវត្សរ៍សរុប <b>${formatPayCurrency(totalNetUSD, 'USD')}</b> នេះចូលជា <b>ចំណាយ (Expense)</b> ក្នុងប្រព័ន្ធដោយស្វ័យប្រវត្តិដែរឬទេ?`,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: 'បាទ/ចាស កត់ត្រាជាចំណាយ',
                cancelButtonText: 'មិនបាច់ទេ',
                confirmButtonColor: '#198754'
            });

            if (askExpense.isConfirmed) {
                if (!db.transactions) db.transactions = new FirebaseStore('transactions');
                const expDate = new Date().toISOString().split('T')[0];
                await db.transactions.add({
                    type: 'expense',
                    amount: parseFloat(totalNetUSD.toFixed(2)),
                    currency: 'USD',
                    paymentMethod: 'Bank Transfer',
                    exchangeRate: window.sysExchangeRate || 4100,
                    date: expDate,
                    category: 'ប្រាក់បៀវត្សរ៍ (Payroll)',
                    note: `បើកប្រាក់បៀវត្សរ៍បុគ្គលិក ${currentBatch.title}`
                });

                Swal.fire({
                    icon: 'success',
                    title: 'បានកត់ត្រាចូលចំណាយ!',
                    text: 'ទិន្នន័យចំណាយត្រូវបានបញ្ចូលក្នុងប្រព័ន្ធចំណាយដោយជោគជ័យ។',
                    timer: 1800,
                    showConfirmButton: false
                });
            }
        } else {
            Swal.fire({
                icon: 'info',
                title: 'បានប្តូរស្ថានភាព!',
                text: `ស្ថានភាពត្រូវបានប្តូរទៅជា ${newStatus}`,
                timer: 1300,
                showConfirmButton: false
            });
        }

        await viewPayrollDetail(currentBatch.id);

    } catch (err) {
        console.error("Error setting batch status:", err);
        Swal.fire('បញ្ហា', err.message, 'error');
    }
};

// ====== 8. DELETE BATCH ======
window.deletePayrollBatch = async function(batchId) {
    if (!batchId && currentBatch) batchId = currentBatch.id;
    if (!batchId) return;

    const res = await Swal.fire({
        title: 'បញ្ជាក់ការលុប!',
        text: 'តើអ្នកពិតជាចង់លុបតារាងបើកប្រាក់ខែនេះមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានឡើយ!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'បាទ/ចាស លុបចេញ',
        cancelButtonText: 'បោះបង់'
    });

    if (res.isConfirmed) {
        try {
            await db.payroll.delete(batchId);
            Swal.fire({
                icon: 'success',
                title: 'លុបបានជោគជ័យ!',
                timer: 1400,
                showConfirmButton: false
            });
            if (currentBatch && currentBatch.id === batchId) {
                closePayrollDetail();
            } else {
                await loadPayrollBatches();
            }
        } catch (err) {
            console.error("Error deleting batch:", err);
            Swal.fire('បញ្ហា', err.message, 'error');
        }
    }
};

// ====== 9. EMPLOYEE PAYSLIP ======
window.viewPayslip = function(batchId, empId) {
    let batch = currentBatch;
    if (!batch || batch.id !== batchId) {
        batch = currentPayrollBatches.find(b => b.id === batchId);
    }
    if (!batch) return;

    const item = batch.items.find(it => it.empId === empId);
    if (!item) return;

    const reportLogo = localStorage.getItem('cachedReportLogo') || 'assets/images/default-avatar.svg';
    const cur = item.currency || 'USD';
    const isPartTime = (item.type === 'Part-Time');

    const html = `
        <div class="payslip-wrapper">
            <!-- Header -->
            <div class="payslip-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <img src="${reportLogo}" class="payslip-logo me-3" onerror="this.style.display='none'">
                    <div>
                        <div class="payslip-title">ប័ណ្ណបើកប្រាក់បៀវត្សរ៍</div>
                        <div class="payslip-subtitle">VALEE ECO FARM • EMPLOYEE PAYSLIP</div>
                    </div>
                </div>
                <div class="text-end">
                    <span class="badge ${batch.status === 'Paid' ? 'bg-success' : 'bg-secondary'} payslip-badge">${batch.status || 'Draft'}</span>
                    <div class="text-muted small mt-1">${batch.code}</div>
                </div>
            </div>

            <!-- Employee Info -->
            <div class="payslip-info-box">
                <div class="row g-2">
                    <div class="col-6">
                        <div class="d-flex align-items-center">
                            <img src="${item.empPhoto || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" class="rounded-circle border me-2" style="width: 44px; height: 44px; object-fit: cover;">
                            <div>
                                <div class="fw-bold text-dark fs-6">${item.empName}</div>
                                <div class="text-muted small">${item.empLatinName || ''} • <strong>${item.empCode || ''}</strong></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 text-end">
                        <div class="small"><strong>ផ្នែក៖</strong> ${item.department}</div>
                        <div class="small"><strong>តួនាទី៖</strong> ${item.position || 'បុគ្គលិក'}</div>
                        <div class="small"><strong>ប្រភេទការងារ៖</strong> <span class="badge ${isPartTime ? 'bg-warning text-dark' : 'bg-primary'}">${item.type}</span></div>
                    </div>
                </div>
                <hr class="my-2 text-muted">
                <div class="row g-1 small text-muted">
                    <div class="col-6">
                        <strong>វដ្តទូទាត់៖</strong> ${batch.title}
                    </div>
                    <div class="col-6 text-end">
                        <strong>កាលបរិច្ឆេទ៖</strong> ${formatPayDate(batch.startDate)} ដល់ ${formatPayDate(batch.endDate)}
                    </div>
                </div>
            </div>

            <!-- Attendance Summary -->
            <div class="row g-2 mb-3 text-center">
                <div class="col-4">
                    <div class="p-2 border rounded bg-success bg-opacity-10 border-success">
                        <div class="small text-success fw-bold">វត្តមាន (Present)</div>
                        <h5 class="mb-0 fw-bold text-success">${item.presentDays} <small class="fs-6">ថ្ងៃ</small></h5>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-2 border rounded bg-warning bg-opacity-10 border-warning">
                        <div class="small text-warning text-dark fw-bold">ច្បាប់ (Leave)</div>
                        <h5 class="mb-0 fw-bold text-dark">${item.leaveDays} <small class="fs-6">ថ្ងៃ</small></h5>
                    </div>
                </div>
                <div class="col-4">
                    <div class="p-2 border rounded bg-danger bg-opacity-10 border-danger">
                        <div class="small text-danger fw-bold">អវត្តមាន (Absent)</div>
                        <h5 class="mb-0 fw-bold text-danger">${item.absentDays} <small class="fs-6">ថ្ងៃ</small></h5>
                    </div>
                </div>
            </div>

            <!-- Earnings & Deductions Table -->
            <div class="row g-3 mb-3">
                <div class="col-6">
                    <table class="payslip-table">
                        <thead>
                            <tr>
                                <th>ប្រាក់ចំណូល (Earnings)</th>
                                <th class="text-end">ចំនួនទឹកប្រាក់</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    ${isPartTime ? 'ថ្លៃឈ្នួលតាមថ្ងៃធ្វើការ' : 'ប្រាក់ខែគោលកន្លះខែ'}
                                    <div class="text-muted" style="font-size: 0.72rem;">${isPartTime ? `(${item.workedDays} ថ្ងៃ × ${formatPayCurrency(item.dailyRate, cur)})` : `(ប្រាក់ខែពេញ ${formatPayCurrency(item.baseSalary, cur)} / 2)`}</div>
                                </td>
                                <td class="text-end fw-semibold">${formatPayCurrency(item.periodBaseSalary, cur)}</td>
                            </tr>
                            <tr>
                                <td>
                                    ប្រាក់បន្ថែម / Bonus
                                    ${item.allowanceNote ? `<div class="text-muted" style="font-size: 0.72rem;">(${item.allowanceNote})</div>` : ''}
                                </td>
                                <td class="text-end text-success fw-semibold">+${formatPayCurrency(item.allowance, cur)}</td>
                            </tr>
                            <tr class="table-light fw-bold">
                                <td>សរុបប្រាក់ចំណូល</td>
                                <td class="text-end text-primary">${formatPayCurrency(item.periodBaseSalary + (item.allowance || 0), cur)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="col-6">
                    <table class="payslip-table">
                        <thead>
                            <tr>
                                <th>ការកាត់ប្រាក់ (Deductions)</th>
                                <th class="text-end">ចំនួនទឹកប្រាក់</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    កាត់អវត្តមាន (Absence)
                                    ${item.absentDays > 0 ? `<div class="text-muted" style="font-size: 0.72rem;">(${item.absentDays} ថ្ងៃ × ${formatPayCurrency(item.dailyRate, cur)})</div>` : ''}
                                </td>
                                <td class="text-end text-danger fw-semibold">-${formatPayCurrency(item.absenceDeduction, cur)}</td>
                            </tr>
                            <tr>
                                <td>
                                    កាត់ផ្សេងៗ / បុរេប្រទាន
                                    ${item.deductionNote ? `<div class="text-muted" style="font-size: 0.72rem;">(${item.deductionNote})</div>` : ''}
                                </td>
                                <td class="text-end text-warning fw-semibold">-${formatPayCurrency(item.otherDeduction, cur)}</td>
                            </tr>
                            <tr class="table-light fw-bold">
                                <td>សរុបការកាត់</td>
                                <td class="text-end text-danger">-${formatPayCurrency((item.absenceDeduction || 0) + (item.otherDeduction || 0), cur)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Net Salary Box -->
            <div class="payslip-total-box d-flex justify-content-between align-items-center">
                <div>
                    <div class="text-success fw-bold text-uppercase" style="font-size: 0.85rem; letter-spacing: 0.5px;">ប្រាក់បៀវត្សរ៍សុទ្ធទទួលបាន (NET SALARY)</div>
                    <small class="text-muted">បូកសរុបចំណូល ដកការកាត់អវត្តមាន និងកាត់ផ្សេងៗ</small>
                </div>
                <h3 class="mb-0 fw-bold text-success">${formatPayCurrency(item.netSalary, cur)}</h3>
            </div>

            <!-- Signatures -->
            <div class="row text-center payslip-signatures">
                <div class="col-4">
                    <div class="payslip-signature-line">អ្នករៀបចំ (Prepared By)</div>
                </div>
                <div class="col-4">
                    <div class="payslip-signature-line">អ្នកអនុម័ត (Approved By)</div>
                </div>
                <div class="col-4">
                    <div class="payslip-signature-line">ហត្ថលេខាបុគ្គលិក (Employee)</div>
                </div>
            </div>
        </div>
    `;

    const container = document.getElementById('payslip-render-container');
    if (container) container.innerHTML = html;

    const modalEl = document.getElementById('payslipModal');
    if (modalEl) {
        const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        m.show();
    }
};

window.triggerPrintCurrentPayslip = function() {
    let style = document.getElementById('dynamic-payslip-print');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-payslip-print';
        document.head.appendChild(style);
    }
    style.innerHTML = '@page { size: A4 portrait; margin: 10mm; } @media print { @page { size: A4 portrait; margin: 10mm; } }';

    document.body.classList.add('printing-single-payslip');

    const cleanup = () => {
        document.body.classList.remove('printing-single-payslip');
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 10000);

    setTimeout(() => {
        window.print();
    }, 250);
};

// ====== 10. PRINT MASTER PAYROLL SHEET (A4 LANDSCAPE) ======
window.printPayrollMaster = async function(batchId) {
    let batch = currentBatch;
    if (!batch || (batchId && batch.id !== batchId)) {
        batch = await db.payroll.get(batchId);
    }
    if (!batch) return;

    const reportLogo = localStorage.getItem('cachedReportLogo') || '';

    // Group items by Department
    const deptMap = {};
    batch.items.forEach(it => {
        const d = it.department || 'ផ្សេងៗ';
        if (!deptMap[d]) deptMap[d] = [];
        deptMap[d].push(it);
    });

    const sortedDeptNames = Object.keys(deptMap).sort((a, b) => a.localeCompare(b, 'km'));

    let tbodyRows = '';
    let seq = 1;

    let gTotBase = 0;
    let gTotP = 0, gTotL = 0, gTotA = 0;
    let gTotPeriodBase = 0;
    let gTotAbsenceDeduct = 0;
    let gTotAllowance = 0;
    let gTotOtherDeduct = 0;
    let gTotNet = 0;

    sortedDeptNames.forEach(dept => {
        const emps = deptMap[dept];
        emps.sort((a, b) => (a.empName || '').localeCompare(b.empName || '', 'km'));

        tbodyRows += `
            <tr class="master-dept-row">
                <td colspan="12" style="background-color: #f1f5f9; font-weight: bold; text-align: left; padding: 4px 8px;">
                    ផ្នែក៖ ${dept} (${emps.length} នាក់)
                </td>
            </tr>
        `;

        emps.forEach(it => {
            const isPartTime = (it.type === 'Part-Time');
            const cur = it.currency || 'USD';

            gTotBase += (it.baseSalary || 0);
            gTotP += (it.presentDays || 0);
            gTotL += (it.leaveDays || 0);
            gTotA += (it.absentDays || 0);
            gTotPeriodBase += (it.periodBaseSalary || 0);
            gTotAbsenceDeduct += (it.absenceDeduction || 0);
            gTotAllowance += (it.allowance || 0);
            gTotOtherDeduct += (it.otherDeduction || 0);
            gTotNet += (it.netSalary || 0);

            tbodyRows += `
                <tr>
                    <td>${seq++}</td>
                    <td style="text-align: left; padding-left: 6px;">
                        <strong>${it.empName}</strong>
                        ${it.empLatinName ? `<br><small style="color: #64748b;">${it.empLatinName}</small>` : ''}
                    </td>
                    <td>${it.position || ''}</td>
                    <td>${it.type}</td>
                    <td style="text-align: right;">${formatPayCurrency(it.baseSalary, cur)}</td>
                    <td style="font-weight: bold; color: #15803d;">${it.presentDays}</td>
                    <td style="font-weight: bold; color: #b45309;">${it.leaveDays}</td>
                    <td style="font-weight: bold; color: #b91c1c;">${it.absentDays}</td>
                    <td style="text-align: right;">${isPartTime ? '-' : formatPayCurrency(it.periodBaseSalary, cur)}</td>
                    <td style="text-align: right; color: #b91c1c;">${it.absenceDeduction > 0 ? '-' + formatPayCurrency(it.absenceDeduction, cur) : '$0.00'}</td>
                    <td style="text-align: right; color: #0284c7;">${it.allowance > 0 ? '+' + formatPayCurrency(it.allowance, cur) : '$0.00'}</td>
                    <td style="text-align: right; font-weight: bold; color: #15803d; font-size: 9.5px;">${formatPayCurrency(it.netSalary, cur)}</td>
                </tr>
            `;
        });
    });

    const printHtml = `
        <div style="font-family: 'Battambang', sans-serif; padding: 5px;">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #198754; padding-bottom: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center;">
                    ${reportLogo ? `<img src="${reportLogo}" style="max-height: 55px; max-width: 140px; object-fit: contain; margin-right: 15px;">` : ''}
                    <div>
                        <h4 style="margin: 0; font-family: 'Khmer OS Muol Light', cursive; font-size: 1.15rem; color: #0f5132;">តារាងទូទាត់ប្រាក់បៀវត្សរ៍បុគ្គលិក (MASTER PAYROLL SHEET)</h4>
                        <div style="font-size: 8.5px; color: #475569; margin-top: 3px;">
                            ${batch.title} | កាលបរិច្ឆេទ៖ ${formatPayDate(batch.startDate)} ដល់ ${formatPayDate(batch.endDate)} | កូដ៖ ${batch.code}
                        </div>
                    </div>
                </div>
                <div style="text-align: right; font-size: 8.5px; color: #475569;">
                    <div>កាលបរិច្ឆេទបោះពុម្ព៖ ${new Date().toLocaleDateString('en-GB')}</div>
                    <div>ស្ថានភាព៖ <strong>${batch.status || 'Draft'}</strong></div>
                </div>
            </div>

            <!-- Master Table -->
            <table class="payroll-master-print-table" style="width: 100%; border-collapse: collapse; font-size: 8.2px;">
                <thead>
                    <tr style="background-color: #198754; color: #ffffff;">
                        <th style="width: 25px;">ល.រ</th>
                        <th style="text-align: left; min-width: 130px;">ឈ្មោះបុគ្គលិក</th>
                        <th style="width: 75px;">តួនាទី</th>
                        <th style="width: 65px;">ប្រភេទ</th>
                        <th style="width: 70px; text-align: right;">ប្រាក់ខែ/ថ្ងៃ</th>
                        <th style="width: 32px;">P</th>
                        <th style="width: 32px;">L</th>
                        <th style="width: 32px;">A</th>
                        <th style="width: 75px; text-align: right;">ប្រាក់គោលកន្លះខែ</th>
                        <th style="width: 75px; text-align: right;">កាត់អវត្តមាន</th>
                        <th style="width: 70px; text-align: right;">ប្រាក់បន្ថែម</th>
                        <th style="width: 85px; text-align: right;">ប្រាក់សុទ្ធ (Net Pay)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tbodyRows}
                </tbody>
                <tfoot>
                    <tr style="background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #000;">
                        <td colspan="4" style="text-align: center;">សរុបរួម (GRAND TOTAL - ${batch.items.length} នាក់)</td>
                        <td style="text-align: right;">${formatPayCurrency(gTotBase, 'USD')}</td>
                        <td>${gTotP}</td>
                        <td>${gTotL}</td>
                        <td>${gTotA}</td>
                        <td style="text-align: right;">${formatPayCurrency(gTotPeriodBase, 'USD')}</td>
                        <td style="text-align: right; color: #b91c1c;">-${formatPayCurrency(gTotAbsenceDeduct, 'USD')}</td>
                        <td style="text-align: right; color: #0284c7;">+${formatPayCurrency(gTotAllowance, 'USD')}</td>
                        <td style="text-align: right; color: #15803d; font-size: 9.5px;">${formatPayCurrency(gTotNet, 'USD')}</td>
                    </tr>
                </tfoot>
            </table>

            <!-- Signatures Footer -->
            <div style="display: flex; justify-content: space-between; margin-top: 35px; text-align: center; font-size: 8.5px;">
                <div style="width: 25%;">
                    <div style="border-top: 1px dashed #475569; padding-top: 5px;">អ្នករៀបចំ (Prepared By)</div>
                </div>
                <div style="width: 25%;">
                    <div style="border-top: 1px dashed #475569; padding-top: 5px;">អ្នកត្រួតពិនិត្យ (Checked By)</div>
                </div>
                <div style="width: 25%;">
                    <div style="border-top: 1px dashed #475569; padding-top: 5px;">អ្នកអនុម័ត (Approved By)</div>
                </div>
            </div>
        </div>
    `;

    const printContainer = document.getElementById('print-area-payroll-master');
    if (!printContainer) return;

    printContainer.innerHTML = printHtml;

    let style = document.getElementById('dynamic-master-payroll-print');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-master-payroll-print';
        document.head.appendChild(style);
    }
    style.innerHTML = '@page { size: A4 landscape; margin: 8mm; } @media print { @page { size: A4 landscape; margin: 8mm; } }';

    document.body.classList.add('printing-payroll-master');

    const cleanup = () => {
        document.body.classList.remove('printing-payroll-master');
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 10000);

    setTimeout(() => {
        window.print();
    }, 250);
};

// ====== 11. EXPORT EXCEL (CSV WITH UTF-8 BOM) ======
window.exportPayrollExcel = async function(batchId) {
    let batch = currentBatch;
    if (!batch || (batchId && batch.id !== batchId)) {
        batch = await db.payroll.get(batchId);
    }
    if (!batch) return;

    const headers = [
        "ល.រ",
        "កូដបុគ្គលិក",
        "ឈ្មោះជាភាសាខ្មែរ",
        "ឈ្មោះឡាតាំង",
        "ផ្នែក (Department)",
        "តួនាទី (Position)",
        "ប្រភេទការងារ (Type)",
        "រូបិយប័ណ្ណ",
        "ប្រាក់ខែ/ថ្ងៃ",
        "វត្តមាន P (ថ្ងៃ)",
        "ច្បាប់ L (ថ្ងៃ)",
        "អវត្តមាន A (ថ្ងៃ)",
        "ថ្ងៃធ្វើការសរុប",
        "ប្រាក់គោលកន្លះខែ",
        "ប្រាក់កាត់អវត្តមាន",
        "ប្រាក់បន្ថែម",
        "មូលហេតុបន្ថែម",
        "ប្រាក់កាត់ផ្សេងៗ",
        "មូលហេតុការកាត់",
        "ប្រាក់សុទ្ធត្រូវបើក (Net Pay)"
    ];

    let csvContent = "\uFEFF" + headers.join(",") + "\n";

    batch.items.forEach((it, idx) => {
        const row = [
            idx + 1,
            `"${it.empCode || ''}"`,
            `"${(it.empName || '').replace(/"/g, '""')}"`,
            `"${(it.empLatinName || '').replace(/"/g, '""')}"`,
            `"${(it.department || '').replace(/"/g, '""')}"`,
            `"${(it.position || '').replace(/"/g, '""')}"`,
            `"${it.type || ''}"`,
            `"${it.currency || 'USD'}"`,
            it.baseSalary || 0,
            it.presentDays || 0,
            it.leaveDays || 0,
            it.absentDays || 0,
            it.workedDays || 0,
            it.periodBaseSalary || 0,
            it.absenceDeduction || 0,
            it.allowance || 0,
            `"${(it.allowanceNote || '').replace(/"/g, '""')}"`,
            it.otherDeduction || 0,
            `"${(it.deductionNote || '').replace(/"/g, '""')}"`,
            it.netSalary || 0
        ];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Payroll_${batch.code}_${batch.startDate}_to_${batch.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
