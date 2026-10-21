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

// Helper: Format Date (DD-MMM-YYYY, e.g. 01-Oct-2026)
function formatPayDate(dateStr) {
    if (!dateStr || dateStr.length !== 10) return dateStr || '';
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d}-${monthName}-${y}`;
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

        const exRate = window.sysExchangeRate || parseFloat(localStorage.getItem('sysExchangeRate')) || 4100;

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
                    if (it.currency === 'KHR') {
                        totalNetKHR += net;
                    } else {
                        totalNetUSD += net;
                    }
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
        if (kpiNetKhrEl) {
            kpiNetKhrEl.innerHTML = totalNetKHR > 0
                ? `${formatPayCurrency(totalNetKHR, 'KHR')} <span class="text-white-50 small">(សរុបស្មើ៖ ${formatPayCurrency(totalNetUSD + (totalNetKHR / exRate), 'USD')})</span>`
                : `(សរុបស្មើ៖ ${formatPayCurrency(totalNetUSD, 'USD')})`;
        }
        if (kpiEmpsEl) kpiEmpsEl.textContent = `${totalEmployeesCount} នាក់`;
        if (kpiPendingEl) kpiPendingEl.textContent = `${pendingCount} លើក`;
        if (kpiPaidEl) kpiPaidEl.textContent = `${paidCount} លើក`;

        // Render Batches Table
        if (filtered.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="10" class="py-5 text-muted text-center">
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
            let batchGrossUSD = 0;
            let batchDeductUSD = 0;
            let batchSumUSD = 0, batchSumKHR = 0;

            (b.items || []).forEach(it => {
                const g = parseFloat(it.grossSalary || it.periodBaseSalary) || 0;
                const d = parseFloat(it.absenceDeduction) || 0;
                const n = parseFloat(it.netSalary) || 0;

                if (it.currency === 'KHR') {
                    batchGrossUSD += (g / exRate);
                    batchDeductUSD += (d / exRate);
                    batchSumKHR += n;
                } else {
                    batchGrossUSD += g;
                    batchDeductUSD += d;
                    batchSumUSD += n;
                }
            });

            const grossDisplay = formatPayCurrency(batchGrossUSD, 'USD');
            const deductDisplay = batchDeductUSD > 0 ? `-${formatPayCurrency(batchDeductUSD, 'USD')}` : '$0.00';
            const netUSDDisplay = batchSumUSD > 0 ? formatPayCurrency(batchSumUSD, 'USD') : '<span class="text-muted">-</span>';
            const netKHRDisplay = batchSumKHR > 0 ? formatPayCurrency(batchSumKHR, 'KHR') : '<span class="text-muted">-</span>';

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
                    <td class="text-end fw-bold text-success">${netUSDDisplay}</td>
                    <td class="text-end fw-bold text-success">${netKHRDisplay}</td>
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
        listBody.innerHTML = `<tr><td colspan="10" class="text-danger py-4 text-center">មានបញ្ហាក្នុងការទាញយកទិន្នន័យ៖ ${err.message}</td></tr>`;
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
                status: 'Pending',
                bankQr: emp.bankQr || '',
                bankName: emp.bankName || '',
                bankAccount: emp.bankAccount || '',
                bankAccountName: emp.bankAccountName || ''
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

        // Aggregate metrics for summary bar & footer
        const exRate = window.sysExchangeRate || parseFloat(localStorage.getItem('sysExchangeRate')) || 4100;
        let totEmps = batch.items.length;
        let sumBaseUSD = 0, sumBaseKHR = 0;
        let sumPeriodBaseUSD = 0, sumPeriodBaseKHR = 0;
        let sumAbsenceDeductUSD = 0, sumAbsenceDeductKHR = 0;
        let sumAllowanceUSD = 0, sumAllowanceKHR = 0;
        let sumOtherDeductUSD = 0, sumOtherDeductKHR = 0;
        let sumNetUSD = 0, sumNetKHR = 0;
        let gTotP = 0, gTotL = 0, gTotA = 0;

        batch.items.forEach(it => {
            const cur = it.currency || 'USD';
            const isPartTime = (it.type === 'Part-Time');
            const dRate = parseFloat(it.dailyRate) || (isPartTime ? (parseFloat(it.baseSalary) || 0) : ((parseFloat(it.baseSalary) || 0) / 30));
            const b = isPartTime ? (dRate * 30) : (parseFloat(it.baseSalary) || 0);
            const pb = parseFloat(it.periodBaseSalary) || 0;
            const ad = parseFloat(it.absenceDeduction) || 0;
            const al = parseFloat(it.allowance) || 0;
            const od = parseFloat(it.otherDeduction) || 0;
            const net = parseFloat(it.netSalary) || 0;

            if (cur === 'KHR') {
                sumBaseKHR += b;
                sumPeriodBaseKHR += pb;
                sumAbsenceDeductKHR += ad;
                sumAllowanceKHR += al;
                sumOtherDeductKHR += od;
                sumNetKHR += net;
            } else {
                sumBaseUSD += b;
                sumPeriodBaseUSD += pb;
                sumAbsenceDeductUSD += ad;
                sumAllowanceUSD += al;
                sumOtherDeductUSD += od;
                sumNetUSD += net;
            }

            gTotP += (it.presentDays || 0);
            gTotL += (it.leaveDays || 0);
            gTotA += (it.absentDays || 0);
        });

        const grandTotalBaseUSD = sumBaseUSD + (sumBaseKHR / exRate);
        const grandTotalBaseKHR = (sumBaseUSD * exRate) + sumBaseKHR;

        const grandTotalPeriodUSD = sumPeriodBaseUSD + (sumPeriodBaseKHR / exRate);
        const grandTotalPeriodKHR = (sumPeriodBaseUSD * exRate) + sumPeriodBaseKHR;

        const grandTotalAbsenceUSD = sumAbsenceDeductUSD + (sumAbsenceDeductKHR / exRate);
        const grandTotalAbsenceKHR = (sumAbsenceDeductUSD * exRate) + sumAbsenceDeductKHR;

        const grandTotalAllowanceUSD = sumAllowanceUSD + (sumAllowanceKHR / exRate);
        const grandTotalAllowanceKHR = (sumAllowanceUSD * exRate) + sumAllowanceKHR;

        const grandTotalOtherDeductUSD = sumOtherDeductUSD + (sumOtherDeductKHR / exRate);
        const grandTotalOtherDeductKHR = (sumOtherDeductUSD * exRate) + sumOtherDeductKHR;

        const grandTotalNetUSD = sumNetUSD + (sumNetKHR / exRate);
        const grandTotalNetKHR = (sumNetUSD * exRate) + sumNetKHR;

        document.getElementById('detail-stat-emps').textContent = `${totEmps} នាក់`;
        document.getElementById('detail-stat-gross').innerHTML = `
            <span>${formatPayCurrency(sumPeriodBaseUSD, 'USD')} + ${formatPayCurrency(sumPeriodBaseKHR, 'KHR')}</span>
            <br><small class="text-primary fw-bold">(ស្មើ៖ ${formatPayCurrency(grandTotalPeriodUSD, 'USD')})</small>
        `;
        const deductGrossUSD = (sumAbsenceDeductUSD > 0 ? '-' + formatPayCurrency(sumAbsenceDeductUSD, 'USD') : '$0.00');
        const deductGrossKHR = (sumAbsenceDeductKHR > 0 ? '-' + formatPayCurrency(sumAbsenceDeductKHR, 'KHR') : '៛0');
        document.getElementById('detail-stat-deduction').innerHTML = `
            <span>${deductGrossUSD} + ${deductGrossKHR}</span>
            <br><small class="text-danger fw-bold">(ស្មើ៖ ${grandTotalAbsenceUSD > 0 ? '-' + formatPayCurrency(grandTotalAbsenceUSD, 'USD') : '$0.00'})</small>
        `;
        document.getElementById('detail-stat-net').innerHTML = `
            <span>${formatPayCurrency(sumNetUSD, 'USD')} + ${formatPayCurrency(sumNetKHR, 'KHR')}</span>
            <br><small class="text-success fw-bold">(ស្មើ៖ ${formatPayCurrency(grandTotalNetUSD, 'USD')} | ${formatPayCurrency(grandTotalNetKHR, 'KHR')})</small>
        `;

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
                    <td colspan="19" class="py-2 px-3">
                        <i class="bi bi-diagram-3-fill text-success me-1"></i>
                        ផ្នែក៖ <strong>${dept}</strong> (${emps.length} នាក់)
                    </td>
                </tr>
            `;

            emps.forEach(it => {
                const isPartTime = (it.type === 'Part-Time');
                const typeBadge = isPartTime ? '<span class="badge bg-warning text-dark px-1">Part-Time</span>' : '<span class="badge bg-primary bg-opacity-75 text-white px-1">Full-Time</span>';
                
                const cur = it.currency || 'USD';
                const dRate = parseFloat(it.dailyRate) || (isPartTime ? (parseFloat(it.baseSalary) || 0) : ((parseFloat(it.baseSalary) || 0) / 30));
                const b = isPartTime ? (dRate * 30) : (parseFloat(it.baseSalary) || 0);
                const pb = parseFloat(it.periodBaseSalary) || 0;
                const ad = parseFloat(it.absenceDeduction) || 0;
                const al = parseFloat(it.allowance) || 0;
                const od = parseFloat(it.otherDeduction) || 0;
                const net = parseFloat(it.netSalary) || 0;

                // Base Salary display (Full month equivalent for both Full-Time and Part-Time)
                const baseNoteHtml = isPartTime ? `<br><small class="text-muted" style="font-size: 0.72rem;">(${formatPayCurrency(dRate, cur)}/ថ្ងៃ × 30)</small>` : '';
                const baseUSDDisplay = cur === 'USD' ? `${formatPayCurrency(b, 'USD')}${baseNoteHtml}` : '<span class="text-muted">-</span>';
                const baseKHRDisplay = cur === 'KHR' ? `${formatPayCurrency(b, 'KHR')}${baseNoteHtml}` : '<span class="text-muted">-</span>';

                // Period Base display (Shows actual period base earnings)
                const periodNoteHtml = isPartTime ? `<br><small class="text-muted" style="font-size: 0.72rem;">(${it.workedDays} ថ្ងៃ)</small>` : '';
                const periodBaseUSDDisplay = cur === 'USD' ? `${formatPayCurrency(pb, 'USD')}${periodNoteHtml}` : '<span class="text-muted">-</span>';
                const periodBaseKHRDisplay = cur === 'KHR' ? `${formatPayCurrency(pb, 'KHR')}${periodNoteHtml}` : '<span class="text-muted">-</span>';

                // Absence Deduction display
                let deductUSDDisplay = '<span class="text-muted">-</span>';
                let deductKHRDisplay = '<span class="text-muted">-</span>';
                if (ad > 0) {
                    if (cur === 'USD') deductUSDDisplay = `<span class="text-danger fw-bold">-${formatPayCurrency(ad, 'USD')}</span>`;
                    else deductKHRDisplay = `<span class="text-danger fw-bold">-${formatPayCurrency(ad, 'KHR')}</span>`;
                }

                // Allowance display
                let allowanceUSDDisplay = '<span class="text-muted">-</span>';
                let allowanceKHRDisplay = '<span class="text-muted">-</span>';
                const allowNoteHtml = it.allowanceNote ? `<br><small class="text-muted" title="${it.allowanceNote}">(${it.allowanceNote})</small>` : '';
                if (al > 0) {
                    if (cur === 'USD') allowanceUSDDisplay = `<span class="text-info fw-bold">+${formatPayCurrency(al, 'USD')}</span>${allowNoteHtml}`;
                    else allowanceKHRDisplay = `<span class="text-info fw-bold">+${formatPayCurrency(al, 'KHR')}</span>${allowNoteHtml}`;
                }

                // Other Deduction display
                let otherDeductUSDDisplay = '<span class="text-muted">-</span>';
                let otherDeductKHRDisplay = '<span class="text-muted">-</span>';
                const deductNoteHtml = it.deductionNote ? `<br><small class="text-muted" title="${it.deductionNote}">(${it.deductionNote})</small>` : '';
                if (od > 0) {
                    if (cur === 'USD') otherDeductUSDDisplay = `<span class="text-warning fw-bold">-${formatPayCurrency(od, 'USD')}</span>${deductNoteHtml}`;
                    else otherDeductKHRDisplay = `<span class="text-warning fw-bold">-${formatPayCurrency(od, 'KHR')}</span>${deductNoteHtml}`;
                }

                // Net Salary display
                const netUSDDisplay = cur === 'USD' ? formatPayCurrency(net, 'USD') : '<span class="text-muted">-</span>';
                const netKHRDisplay = cur === 'KHR' ? formatPayCurrency(net, 'KHR') : '<span class="text-muted">-</span>';

                html += `
                    <tr>
                        <td class="fw-bold text-muted col-sticky-1">${seq++}</td>
                        <td class="text-start col-sticky-2">
                            <div class="d-flex align-items-center">
                                <img src="${it.empPhoto || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" class="rounded-circle border me-2 flex-shrink-0" style="width: 28px; height: 28px; object-fit: cover;">
                                <div style="line-height: 1.25;">
                                    <div class="fw-bold text-body col-emp-name">${it.empName}</div>
                                    <div class="text-muted small">${it.empLatinName || it.empCode || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td>${typeBadge}</td>
                        <td class="text-end">${baseUSDDisplay}</td>
                        <td class="text-end">${baseKHRDisplay}</td>
                        <td class="text-success fw-bold">${it.presentDays}</td>
                        <td class="text-warning fw-bold">${it.leaveDays}</td>
                        <td class="text-danger fw-bold">${it.absentDays}</td>
                        <td class="text-end">${periodBaseUSDDisplay}</td>
                        <td class="text-end">${periodBaseKHRDisplay}</td>
                        <td class="text-end">${deductUSDDisplay}</td>
                        <td class="text-end">${deductKHRDisplay}</td>
                        <td class="text-end">${allowanceUSDDisplay}</td>
                        <td class="text-end">${allowanceKHRDisplay}</td>
                        <td class="text-end">${otherDeductUSDDisplay}</td>
                        <td class="text-end">${otherDeductKHRDisplay}</td>
                        <td class="fw-bold text-success text-end">${netUSDDisplay}</td>
                        <td class="fw-bold text-success text-end">${netKHRDisplay}</td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary btn-sm px-2" onclick="openEditItemModal('${it.empId}')" title="កែប្រាក់បន្ថែម/កាត់">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-success btn-sm px-2" onclick="viewPayslip('${batch.id}', '${it.empId}')" title="ប័ណ្ណបើកប្រាក់ (Payslip)">
                                    <i class="bi bi-receipt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        });

        tbody.innerHTML = html;

        // Render Table Footer
        const tfoot = document.getElementById('payrollDetailItemsFooter');
        if (tfoot) {
            tfoot.innerHTML = `
                <tr class="payroll-foot-subtotal">
                    <td colspan="3" class="text-center py-2 col-sticky-foot">សរុបតាមរូបិយប័ណ្ណ (${batch.items.length} នាក់)</td>
                    <td class="text-end fw-semibold">${formatPayCurrency(sumBaseUSD, 'USD')}</td>
                    <td class="text-end fw-semibold">${formatPayCurrency(sumBaseKHR, 'KHR')}</td>
                    <td class="text-success fw-bold">${gTotP}</td>
                    <td class="text-warning text-dark fw-bold">${gTotL}</td>
                    <td class="text-danger fw-bold">${gTotA}</td>
                    <td class="text-end fw-semibold">${formatPayCurrency(sumPeriodBaseUSD, 'USD')}</td>
                    <td class="text-end fw-semibold">${formatPayCurrency(sumPeriodBaseKHR, 'KHR')}</td>
                    <td class="text-end text-danger fw-semibold">${sumAbsenceDeductUSD > 0 ? '-' + formatPayCurrency(sumAbsenceDeductUSD, 'USD') : '$0.00'}</td>
                    <td class="text-end text-danger fw-semibold">${sumAbsenceDeductKHR > 0 ? '-' + formatPayCurrency(sumAbsenceDeductKHR, 'KHR') : '៛0'}</td>
                    <td class="text-end text-info fw-semibold">${sumAllowanceUSD > 0 ? '+' + formatPayCurrency(sumAllowanceUSD, 'USD') : '$0.00'}</td>
                    <td class="text-end text-info fw-semibold">${sumAllowanceKHR > 0 ? '+' + formatPayCurrency(sumAllowanceKHR, 'KHR') : '៛0'}</td>
                    <td class="text-end text-warning fw-semibold">${sumOtherDeductUSD > 0 ? '-' + formatPayCurrency(sumOtherDeductUSD, 'USD') : '$0.00'}</td>
                    <td class="text-end text-warning fw-semibold">${sumOtherDeductKHR > 0 ? '-' + formatPayCurrency(sumOtherDeductKHR, 'KHR') : '៛0'}</td>
                    <td class="text-end fw-bold text-success fs-6">${formatPayCurrency(sumNetUSD, 'USD')}</td>
                    <td class="text-end fw-bold text-success fs-6">${formatPayCurrency(sumNetKHR, 'KHR')}</td>
                    <td></td>
                </tr>
                <tr class="payroll-foot-grandtotal">
                    <td colspan="3" class="text-center py-2 px-2 text-success fw-bold col-sticky-foot">
                        <i class="bi bi-calculator me-1"></i> សរុបរួមស្មើនឹង ($ និង ៛)<br><small class="text-muted fw-normal">(អត្រា 1$ = ${exRate.toLocaleString('en-US')} ៛)</small>
                    </td>
                    <td colspan="2" class="text-end py-2 px-2 fw-bold text-primary">
                        ${formatPayCurrency(grandTotalBaseUSD, 'USD')} = ${formatPayCurrency(grandTotalBaseKHR, 'KHR')}
                    </td>
                    <td colspan="3" class="text-center text-muted">-</td>
                    <td colspan="2" class="text-end py-2 px-2 fw-bold text-primary">
                        ${formatPayCurrency(grandTotalPeriodUSD, 'USD')} = ${formatPayCurrency(grandTotalPeriodKHR, 'KHR')}
                    </td>
                    <td colspan="2" class="text-end py-2 px-2 fw-bold text-danger">
                        ${grandTotalAbsenceUSD > 0 ? '-' + formatPayCurrency(grandTotalAbsenceUSD, 'USD') : '$0.00'} = ${grandTotalAbsenceKHR > 0 ? '-' + formatPayCurrency(grandTotalAbsenceKHR, 'KHR') : '៛0'}
                    </td>
                    <td colspan="2" class="text-end py-2 px-2 fw-bold text-info">
                        ${grandTotalAllowanceUSD > 0 ? '+' + formatPayCurrency(grandTotalAllowanceUSD, 'USD') : '$0.00'} = ${grandTotalAllowanceKHR > 0 ? '+' + formatPayCurrency(grandTotalAllowanceKHR, 'KHR') : '៛0'}
                    </td>
                    <td colspan="2" class="text-end py-2 px-2 fw-bold text-warning">
                        ${grandTotalOtherDeductUSD > 0 ? '-' + formatPayCurrency(grandTotalOtherDeductUSD, 'USD') : '$0.00'} = ${grandTotalOtherDeductKHR > 0 ? '-' + formatPayCurrency(grandTotalOtherDeductKHR, 'KHR') : '៛0'}
                    </td>
                    <td colspan="2" class="text-end py-2 px-2 fw-bold text-success fs-6">
                        ${formatPayCurrency(grandTotalNetUSD, 'USD')} = ${formatPayCurrency(grandTotalNetKHR, 'KHR')}
                    </td>
                    <td></td>
                </tr>
            `;
        }

        // Restore user's saved table zoom/scale preference
        setTimeout(() => {
            const savedScale = parseFloat(localStorage.getItem('payrollTableScale')) || 1.0;
            if (typeof window.setPayrollTableScale === 'function') {
                window.setPayrollTableScale(savedScale, true);
            }
        }, 30);

    } catch (err) {
        console.error("Error viewing payroll detail:", err);
        Swal.fire('បញ្ហា', err.message, 'error');
    }
};

window.closePayrollDetail = function() {
    const detailView = document.getElementById('payroll-detail-view');
    if (detailView && detailView.classList.contains('payroll-fullscreen-active')) {
        window.togglePayrollFullscreen();
    }
    currentBatch = null;
    document.getElementById('payroll-detail-view').style.display = 'none';
    document.getElementById('payroll-kpi-cards').style.display = 'flex';
    document.getElementById('payroll-batches-view').style.display = 'block';
    loadPayrollBatches();
};

// ====== RESPONSIVE TABLE SCALE & FULLSCREEN CONTROLS ======
window.setPayrollTableScale = function(val, isDirect = false) {
    const table = document.querySelector('.payroll-detail-table');
    if (!table) return;

    let currentScale = parseFloat(table.getAttribute('data-scale')) || 1.0;
    if (isDirect) {
        currentScale = val;
    } else if (val === 0) {
        currentScale = 1.0;
    } else {
        currentScale = Math.min(1.4, Math.max(0.65, currentScale + val));
    }
    currentScale = Math.round(currentScale * 100) / 100;

    table.setAttribute('data-scale', currentScale);
    table.style.setProperty('--payroll-table-font', `${(0.80 * currentScale).toFixed(3)}rem`);
    table.style.setProperty('--payroll-table-pad-y', `${Math.max(2, Math.round(6 * currentScale))}px`);
    table.style.setProperty('--payroll-table-pad-x', `${Math.max(3, Math.round(6 * currentScale))}px`);

    const indicator = document.getElementById('payroll-scale-indicator');
    if (indicator) {
        indicator.textContent = `${Math.round(currentScale * 100)}%`;
    }
    localStorage.setItem('payrollTableScale', currentScale);
};

window.togglePayrollFullscreen = function() {
    const detailView = document.getElementById('payroll-detail-view');
    if (!detailView) return;

    const isFullscreen = detailView.classList.toggle('payroll-fullscreen-active');
    const btns = document.querySelectorAll('.btn-payroll-fullscreen-toggle');

    if (isFullscreen) {
        btns.forEach(btn => {
            btn.classList.add('active', 'btn-dark');
            btn.classList.remove('btn-outline-dark', 'btn-outline-success');
            btn.innerHTML = '<i class="bi bi-fullscreen-exit me-1"></i> <span>បិទពេញអេក្រង់</span>';
            btn.title = 'ចាកចេញពីពេញអេក្រង់ (Exit Fullscreen - Esc)';
        });

        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        }
    } else {
        btns.forEach(btn => {
            btn.classList.remove('active', 'btn-dark');
            btn.classList.add('btn-outline-dark');
            btn.innerHTML = '<i class="bi bi-arrows-fullscreen me-1"></i> <span>ពេញអេក្រង់</span>';
            btn.title = 'ពង្រីកពេញអេក្រង់ (Full Screen)';
        });

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
    }
};

window.filterPayrollDetailTable = function() {
    const query = (document.getElementById('payrollDetailSearch')?.value || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#payrollDetailItemsList tr');
    
    let currentDeptRow = null;
    let deptHasVisibleEmps = false;

    rows.forEach(tr => {
        if (tr.classList.contains('payroll-dept-header-row')) {
            if (currentDeptRow && !deptHasVisibleEmps && query) {
                currentDeptRow.style.display = 'none';
            }
            currentDeptRow = tr;
            deptHasVisibleEmps = false;
            tr.style.display = '';
        } else {
            const text = tr.textContent.toLowerCase();
            if (!query || text.includes(query)) {
                tr.style.display = '';
                deptHasVisibleEmps = true;
            } else {
                tr.style.display = 'none';
            }
        }
    });

    if (currentDeptRow && !deptHasVisibleEmps && query) {
        currentDeptRow.style.display = 'none';
    }
};

// Global escape key listener to exit fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const detailView = document.getElementById('payroll-detail-view');
        if (detailView && detailView.classList.contains('payroll-fullscreen-active')) {
            window.togglePayrollFullscreen();
        }
    }
});

// Fullscreenchange event listener
document.addEventListener('fullscreenchange', () => {
    const detailView = document.getElementById('payroll-detail-view');
    if (!detailView) return;
    if (!document.fullscreenElement && detailView.classList.contains('payroll-fullscreen-active')) {
        detailView.classList.remove('payroll-fullscreen-active');
        document.querySelectorAll('.btn-payroll-fullscreen-toggle').forEach(btn => {
            btn.classList.remove('active', 'btn-dark');
            btn.classList.add('btn-outline-dark');
            btn.innerHTML = '<i class="bi bi-arrows-fullscreen me-1"></i> <span>ពេញអេក្រង់</span>';
        });
    }
});

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
window.viewPayslip = async function(batchId, empId) {
    let batch = currentBatch;
    if (!batch || String(batch.id) !== String(batchId)) {
        batch = currentPayrollBatches.find(b => String(b.id) === String(batchId));
    }
    if (!batch && typeof db !== 'undefined' && db.payroll) {
        batch = await db.payroll.get(batchId);
    }
    if (!batch) return;

    const item = batch.items.find(it => String(it.empId) === String(empId));
    if (!item) return;

    // Fetch latest employee data to ensure fresh bank QR & details even for older batches
    let emp = null;
    try {
        if (typeof db !== 'undefined' && db.employees) {
            emp = await db.employees.get(empId);
        }
    } catch (e) {
        console.warn('Could not fetch employee details for payslip bank info:', e);
    }

    const bankQr = (emp && emp.bankQr) || item.bankQr || '';
    const bankName = (emp && emp.bankName) || item.bankName || '';
    const bankAccount = (emp && emp.bankAccount) || item.bankAccount || '';
    const bankAccountName = (emp && emp.bankAccountName) || item.bankAccountName || (emp && (emp.nameKh || emp.name)) || item.empName || '';
    const hasBankData = Boolean(bankQr || bankName || bankAccount);

    const reportLogo = localStorage.getItem('cachedReportLogo') || localStorage.getItem('cachedSidebarLogo') || 'assets/images/logo.png';
    const cur = item.currency || 'USD';
    const isPartTime = (item.type === 'Part-Time');
    const exRate = window.sysExchangeRate || parseFloat(localStorage.getItem('sysExchangeRate')) || 4100;
    let netUSD = 0, netKHR = 0;
    if (cur === 'KHR') {
        netKHR = Math.round(item.netSalary || 0);
        netUSD = (item.netSalary || 0) / exRate;
    } else {
        netUSD = parseFloat(item.netSalary) || 0;
        netKHR = Math.round(netUSD * exRate);
    }

    const html = `
        <div class="payslip-wrapper">
            <!-- Header -->
            <div class="payslip-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <img src="${reportLogo}" class="payslip-logo me-3" onerror="this.style.display='none'">
                    <div>
                        <div class="payslip-title">ប័ណ្ណបើកប្រាក់បៀវត្សរ៍</div>
                        <div class="payslip-subtitle">EMPLOYEE PAYSLIP</div>
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
                <div class="row g-1 text-muted" style="font-size: 0.72rem; line-height: 1.35;">
                    <div class="col-7">
                        <strong class="text-dark">វដ្តទូទាត់៖</strong> <span>${batch.title}</span>
                    </div>
                    <div class="col-5 text-end">
                        <strong class="text-dark">កាលបរិច្ឆេទ៖</strong> <span>${formatPayDate(batch.startDate)} ដល់ ${formatPayDate(batch.endDate)}</span>
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
            <div class="payslip-total-box d-flex justify-content-between align-items-center mb-3">
                <div>
                    <div class="text-success fw-bold text-uppercase" style="font-size: 0.85rem; letter-spacing: 0.5px;">ប្រាក់បៀវត្សរ៍សុទ្ធទទួលបាន (NET SALARY)</div>
                    <small class="text-muted">បូកសរុបចំណូល ដកការកាត់អវត្តមាន និងកាត់ផ្សេងៗ (អត្រាប្តូរប្រាក់ 1$ = ${exRate.toLocaleString('en-US')} ៛)</small>
                </div>
                <div class="text-end">
                    <h3 class="mb-0 fw-bold text-success">${formatPayCurrency(netUSD, 'USD')}</h3>
                    <div class="fw-bold text-success fs-6">${formatPayCurrency(netKHR, 'KHR')}</div>
                </div>
            </div>

            <!-- Bank QR Code & Payment Section -->
            <div class="payslip-bank-box p-3 rounded mb-3 ${hasBankData ? '' : 'd-print-none'}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-qr-code text-primary fs-5 me-2"></i>
                        <span class="fw-bold text-dark text-uppercase" style="font-size: 0.82rem; letter-spacing: 0.5px;">ព័ត៌មានគណនីធនាគារ & ស្កេនទូទាត់ (Bank Payment / Scan to Pay)</span>
                    </div>
                    <div class="d-print-none">
                        <button type="button" class="btn btn-sm btn-light border py-0 px-2 text-primary" onclick="openEditBankInfoModal('${batch.id}', '${item.empId}')" title="កែសម្រួលព័ត៌មានធនាគារ">
                            <i class="bi bi-pencil-square me-1"></i>កែព័ត៌មានធនាគារ
                        </button>
                    </div>
                </div>

                <div class="row align-items-center g-3">
                    <!-- Left: QR Code -->
                    <div class="col-auto text-center">
                        ${bankQr ? `
                            <div class="payslip-qr-container bg-white p-1 rounded border shadow-sm d-inline-block">
                                <img src="${bankQr}" class="payslip-qr-img" alt="Bank QR Code">
                            </div>
                        ` : `
                            <div class="payslip-qr-placeholder border border-2 border-dashed rounded d-flex flex-column align-items-center justify-content-center p-2 d-print-none" style="width: 100px; height: 100px; cursor: pointer; background: #ffffff;" onclick="document.getElementById('payslip-qr-file-input-${item.empId}').click()" title="ចុចដើម្បីបញ្ចូល QR Code">
                                <i class="bi bi-qr-code-scan fs-3 text-primary"></i>
                                <span class="small text-muted mt-1" style="font-size: 0.72rem; line-height: 1.1;">+ Bank QR</span>
                            </div>
                        `}
                    </div>

                    <!-- Right: Bank Details & Actions -->
                    <div class="col">
                        <div class="row g-2">
                            <div class="col-sm-6">
                                <div class="small text-muted" style="font-size: 0.75rem;">ធនាគារ (Bank Name):</div>
                                <div class="fw-bold text-dark" style="font-size: 0.88rem;">${bankName || '<span class="text-muted fw-normal fst-italic">មិនទាន់កំណត់</span>'}</div>
                            </div>
                            <div class="col-sm-6">
                                <div class="small text-muted" style="font-size: 0.75rem;">លេខគណនី (Account No):</div>
                                <div class="fw-bold text-primary font-monospace" style="font-size: 0.92rem;">${bankAccount || '<span class="text-muted fw-normal fst-italic">មិនទាន់កំណត់</span>'}</div>
                            </div>
                            <div class="col-12">
                                <div class="small text-muted" style="font-size: 0.75rem;">ឈ្មោះម្ចាស់គណនី (Account Name):</div>
                                <div class="fw-bold text-dark text-uppercase" style="font-size: 0.88rem;">${bankAccountName || item.empName}</div>
                            </div>
                        </div>

                        <!-- Action buttons (d-print-none) -->
                        <div class="mt-2 pt-2 border-top d-flex flex-wrap gap-2 d-print-none">
                            <input type="file" id="payslip-qr-file-input-${item.empId}" accept="image/*" class="d-none" onchange="uploadEmployeeBankQr(event, '${batch.id}', '${item.empId}')">
                            <button type="button" class="btn btn-sm btn-outline-primary py-1 px-2" style="font-size: 0.78rem;" onclick="document.getElementById('payslip-qr-file-input-${item.empId}').click()">
                                <i class="bi bi-cloud-arrow-up me-1"></i>${bankQr ? 'ផ្លាស់ប្តូរ QR Code' : '+ បញ្ចូល Bank QR Code'}
                            </button>
                            ${bankQr ? `
                                <button type="button" class="btn btn-sm btn-outline-danger py-1 px-2" style="font-size: 0.78rem;" onclick="removeEmployeeBankQr('${batch.id}', '${item.empId}')">
                                    <i class="bi bi-trash me-1"></i>លុប QR
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Signatures -->
            <div class="row text-center payslip-signatures">
                <div class="col-4">
                    <div class="payslip-signature-line">រៀបចំដោយ (Prepared By)</div>
                </div>
                <div class="col-4">
                    <div class="payslip-signature-line">អនុម័តដោយ (Approved By)</div>
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

// Image Compression Helper for Bank QR Code
window.compressQrImage = function(file, maxDimension = 600, quality = 0.9) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Fill white background so transparent PNGs/QRs don't turn black
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // JPEG at 0.9 keeps QR crisp and sharp for scanning while keeping size ~30KB-50KB
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

// Upload Bank QR Code directly from Payslip
window.uploadEmployeeBankQr = async function(event, batchId, empId) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        Swal.fire('ឯកសារមិនត្រឹមត្រូវ', 'សូមជ្រើសរើសឯកសាររូបភាព (JPG, PNG) សម្រាប់ QR Code!', 'warning');
        return;
    }

    try {
        Swal.fire({
            title: 'កំពុងបញ្ចូល QR Code...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const compressedBase64 = await window.compressQrImage(file, 600, 0.9);

        // 1. Update Employee in db.employees
        if (typeof db !== 'undefined' && db.employees) {
            await db.employees.update(empId, { bankQr: compressedBase64 });
        }

        // 2. Update Batch in db.payroll if batch exists
        if (batchId) {
            let batch = currentBatch && String(currentBatch.id) === String(batchId) ? currentBatch : null;
            if (!batch && db.payroll) {
                batch = await db.payroll.get(batchId);
            }
            if (batch && Array.isArray(batch.items)) {
                const item = batch.items.find(it => String(it.empId) === String(empId));
                if (item) {
                    item.bankQr = compressedBase64;
                    await db.payroll.update(batch.id, batch);
                }
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ',
            text: 'បានរក្សាទុក Bank QR Code រួចរាល់!',
            timer: 1500,
            showConfirmButton: false
        });

        // Re-render payslip modal to show new QR immediately
        await window.viewPayslip(batchId, empId);

    } catch (err) {
        console.error("Error uploading bank QR:", err);
        Swal.fire('បញ្ហា', 'មិនអាចបញ្ចូល QR Code បានទេ: ' + err.message, 'error');
    }
};

// Remove Bank QR Code directly from Payslip
window.removeEmployeeBankQr = async function(batchId, empId) {
    const confirmRes = await Swal.fire({
        title: 'លុប Bank QR Code?',
        text: 'តើអ្នកពិតជាចង់លុបរូបភាព QR Code នេះមែនទេ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'បាទ/ចាស លុបចេញ',
        cancelButtonText: 'បោះបង់'
    });

    if (!confirmRes.isConfirmed) return;

    try {
        // 1. Update Employee in db.employees
        if (typeof db !== 'undefined' && db.employees) {
            await db.employees.update(empId, { bankQr: '' });
        }

        // 2. Update Batch in db.payroll
        if (batchId) {
            let batch = currentBatch && String(currentBatch.id) === String(batchId) ? currentBatch : null;
            if (!batch && db.payroll) {
                batch = await db.payroll.get(batchId);
            }
            if (batch && Array.isArray(batch.items)) {
                const item = batch.items.find(it => String(it.empId) === String(empId));
                if (item) {
                    item.bankQr = '';
                    await db.payroll.update(batch.id, batch);
                }
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'បានលុបរួចរាល់',
            timer: 1200,
            showConfirmButton: false
        });

        // Re-render payslip
        await window.viewPayslip(batchId, empId);

    } catch (err) {
        console.error("Error removing bank QR:", err);
        Swal.fire('បញ្ហា', err.message, 'error');
    }
};

// Open Quick Edit Bank Info Modal from Payslip
window.openEditBankInfoModal = async function(batchId, empId) {
    try {
        let emp = null;
        if (typeof db !== 'undefined' && db.employees) {
            emp = await db.employees.get(empId);
            if (!emp) {
                const allEmps = await db.employees.toArray();
                emp = allEmps.find(e => String(e.id) === String(empId) || String(e.code) === String(empId));
            }
        }
        let batchItem = null;
        if (currentBatch && Array.isArray(currentBatch.items)) {
            batchItem = currentBatch.items.find(it => String(it.empId) === String(empId));
        }

        const currentBankName = (emp && emp.bankName) || (batchItem && batchItem.bankName) || '';
        const currentAccount = (emp && emp.bankAccount) || (batchItem && batchItem.bankAccount) || '';
        const currentAccName = (emp && emp.bankAccountName) || (batchItem && batchItem.bankAccountName) || (emp && (emp.nameKh || emp.name)) || (batchItem && batchItem.empName) || '';

        // Temporarily remove tabindex on payslipModal to guarantee focus is never blocked
        const pModal = document.getElementById('payslipModal');
        if (pModal) {
            pModal.removeAttribute('tabindex');
        }

        const { value: formValues } = await Swal.fire({
            title: 'ព័ត៌មានគណនីធនាគារ',
            html: `
                <div class="text-start px-2">
                    <div class="mb-3">
                        <label class="form-label small fw-bold">ឈ្មោះធនាគារ (Bank Name)</label>
                        <input id="swal-bank-name" list="swal-bank-suggestions" class="form-control" placeholder="ឧ. ABA Bank, ACLEDA, Canadia, Wing..." value="${currentBankName.replace(/"/g, '&quot;')}">
                        <datalist id="swal-bank-suggestions">
                            <option value="ABA Bank">
                            <option value="ACLEDA Bank">
                            <option value="Canadia Bank">
                            <option value="Wing Bank">
                            <option value="Sathapana Bank">
                            <option value="Vattanac Bank">
                            <option value="Chip Mong Bank">
                            <option value="J Trust Royal Bank">
                            <option value="Prince Bank">
                            <option value="TrueMoney">
                            <option value="Bakong">
                        </datalist>
                    </div>
                    <div class="mb-3">
                        <label class="form-label small fw-bold">លេខគណនី (Account Number)</label>
                        <input id="swal-bank-account" class="form-control font-monospace" placeholder="ឧ. 000 123 456" value="${currentAccount.replace(/"/g, '&quot;')}">
                    </div>
                    <div class="mb-2">
                        <label class="form-label small fw-bold">ឈ្មោះម្ចាស់គណនី (Account Name)</label>
                        <input id="swal-bank-acc-name" class="form-control text-uppercase" placeholder="ឧ. SOK CHANTHA" value="${currentAccName.replace(/"/g, '&quot;')}">
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-check2 me-1"></i>រក្សាទុក',
            cancelButtonText: 'បោះបង់',
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            didOpen: () => {
                const bName = document.getElementById('swal-bank-name');
                const bAcc = document.getElementById('swal-bank-account');
                const bAccName = document.getElementById('swal-bank-acc-name');
                if (bName) {
                    setTimeout(() => bName.focus(), 150);
                }
                const onEnter = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        Swal.clickConfirm();
                    }
                };
                if (bName) bName.addEventListener('keydown', onEnter);
                if (bAcc) bAcc.addEventListener('keydown', onEnter);
                if (bAccName) bAccName.addEventListener('keydown', onEnter);
            },
            preConfirm: () => {
                return {
                    bankName: document.getElementById('swal-bank-name') ? document.getElementById('swal-bank-name').value.trim() : '',
                    bankAccount: document.getElementById('swal-bank-account') ? document.getElementById('swal-bank-account').value.trim() : '',
                    bankAccountName: document.getElementById('swal-bank-acc-name') ? document.getElementById('swal-bank-acc-name').value.trim() : ''
                };
            }
        });

        if (!formValues) return;

        // 1. Update employee in db.employees
        if (typeof db !== 'undefined' && db.employees) {
            const targetId = (emp && emp.id) ? emp.id : empId;
            await db.employees.update(targetId, formValues);
        }

        // 2. Update batch item in db.payroll
        if (batchId) {
            let batch = currentBatch && String(currentBatch.id) === String(batchId) ? currentBatch : null;
            if (!batch && db.payroll) {
                batch = await db.payroll.get(batchId);
            }
            if (batch && Array.isArray(batch.items)) {
                const item = batch.items.find(it => String(it.empId) === String(empId));
                if (item) {
                    item.bankName = formValues.bankName;
                    item.bankAccount = formValues.bankAccount;
                    item.bankAccountName = formValues.bankAccountName;
                    await db.payroll.update(batch.id, batch);
                }
            }
        }

        // 3. Keep in-memory batches in sync
        if (Array.isArray(window.currentPayrollBatches)) {
            const cachedB = window.currentPayrollBatches.find(b => String(b.id) === String(batchId));
            if (cachedB && Array.isArray(cachedB.items)) {
                const it = cachedB.items.find(i => String(i.empId) === String(empId));
                if (it) {
                    it.bankName = formValues.bankName;
                    it.bankAccount = formValues.bankAccount;
                    it.bankAccountName = formValues.bankAccountName;
                }
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'រក្សាទុកជោគជ័យ',
            timer: 1200,
            showConfirmButton: false
        });

        await window.viewPayslip(batchId, empId);

    } catch (err) {
        console.error("Error updating bank info:", err);
        Swal.fire('បញ្ហា', err.message, 'error');
    }
};

function executePayrollPrint(elementId, orientation = 'landscape') {
    let style = document.getElementById('dynamic-print-orientation');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-print-orientation';
        document.head.appendChild(style);
    }
    style.innerHTML = `@media print { @page { size: A4 ${orientation}; margin: 8mm; } }`;

    document.querySelectorAll('.print-container').forEach(el => el.classList.remove('print-template'));
    const target = document.getElementById(elementId);
    if (target) {
        target.classList.add('print-template');
    }

    const cleanup = () => {
        document.querySelectorAll('.print-container').forEach(el => {
            el.classList.remove('print-template');
        });
        ['print-area-payroll-master', 'print-area-payslip'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
        window.print();
        setTimeout(cleanup, 2000);
    }, 250);
}

window.triggerPrintCurrentPayslip = function() {
    const payslipContainer = document.getElementById('payslip-render-container');
    if (!payslipContainer) return;

    const printArea = document.getElementById('print-area-payslip');
    if (!printArea) return;

    printArea.innerHTML = payslipContainer.innerHTML;
    executePayrollPrint('print-area-payslip', 'portrait');
};

// Purge print area when payslip modal is closed
const pModalEl = document.getElementById('payslipModal');
if (pModalEl) {
    pModalEl.addEventListener('hidden.bs.modal', () => {
        const printArea = document.getElementById('print-area-payslip');
        if (printArea) {
            printArea.classList.remove('print-template');
            printArea.innerHTML = '';
        }
    });
}

// ====== 10. PRINT MASTER PAYROLL SHEET (A4 LANDSCAPE) ======
window.printPayrollMaster = async function(batchId) {
    let batch = currentBatch;
    if (!batch || (batchId && batch.id !== batchId)) {
        batch = await db.payroll.get(batchId);
    }
    if (!batch) return;

    const reportLogo = localStorage.getItem('cachedReportLogo') || localStorage.getItem('cachedSidebarLogo') || 'assets/images/logo.png';
    const exRate = window.sysExchangeRate || parseFloat(localStorage.getItem('sysExchangeRate')) || 4100;

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

    let sumBaseUSD = 0, sumBaseKHR = 0;
    let sumPeriodBaseUSD = 0, sumPeriodBaseKHR = 0;
    let sumAbsenceDeductUSD = 0, sumAbsenceDeductKHR = 0;
    let sumAllowanceUSD = 0, sumAllowanceKHR = 0;
    let sumOtherDeductUSD = 0, sumOtherDeductKHR = 0;
    let sumNetUSD = 0, sumNetKHR = 0;
    let gTotP = 0, gTotL = 0, gTotA = 0;

    sortedDeptNames.forEach(dept => {
        const emps = deptMap[dept];
        emps.sort((a, b) => (a.empName || '').localeCompare(b.empName || '', 'km'));

        tbodyRows += `
            <tr class="master-dept-row">
                <td colspan="21" style="background-color: #f1f5f9; font-weight: bold; text-align: left; padding: 4px 8px;">
                    ផ្នែក៖ ${dept} (${emps.length} នាក់)
                </td>
            </tr>
        `;

        emps.forEach(it => {
            const isPartTime = (it.type === 'Part-Time');
            const cur = it.currency || 'USD';
            const dRate = parseFloat(it.dailyRate) || (isPartTime ? (parseFloat(it.baseSalary) || 0) : ((parseFloat(it.baseSalary) || 0) / 30));
            const b = isPartTime ? (dRate * 30) : (parseFloat(it.baseSalary) || 0);
            const pb = parseFloat(it.periodBaseSalary) || 0;
            const ad = parseFloat(it.absenceDeduction) || 0;
            const al = parseFloat(it.allowance) || 0;
            const od = parseFloat(it.otherDeduction) || 0;
            const net = parseFloat(it.netSalary) || 0;

            if (cur === 'KHR') {
                sumBaseKHR += b;
                sumPeriodBaseKHR += pb;
                sumAbsenceDeductKHR += ad;
                sumAllowanceKHR += al;
                sumOtherDeductKHR += od;
                sumNetKHR += net;
            } else {
                sumBaseUSD += b;
                sumPeriodBaseUSD += pb;
                sumAbsenceDeductUSD += ad;
                sumAllowanceUSD += al;
                sumOtherDeductUSD += od;
                sumNetUSD += net;
            }

            gTotP += (it.presentDays || 0);
            gTotL += (it.leaveDays || 0);
            gTotA += (it.absentDays || 0);

            const baseNote = isPartTime ? `<br><small style="color: #64748b; font-size: 6.8px;">(${formatPayCurrency(dRate, cur)}/ថ្ងៃ×30)</small>` : '';
            const baseUSD = cur === 'USD' ? `${formatPayCurrency(b, 'USD')}${baseNote}` : '<span style="color: #94a3b8;">-</span>';
            const baseKHR = cur === 'KHR' ? `${formatPayCurrency(b, 'KHR')}${baseNote}` : '<span style="color: #94a3b8;">-</span>';

            const periodNote = isPartTime ? `<br><small style="color: #64748b; font-size: 6.8px;">(${it.workedDays} ថ្ងៃ)</small>` : '';
            const periodUSD = cur === 'USD' ? `${formatPayCurrency(pb, 'USD')}${periodNote}` : '<span style="color: #94a3b8;">-</span>';
            const periodKHR = cur === 'KHR' ? `${formatPayCurrency(pb, 'KHR')}${periodNote}` : '<span style="color: #94a3b8;">-</span>';

            let deductUSD = '<span style="color: #94a3b8;">-</span>';
            let deductKHR = '<span style="color: #94a3b8;">-</span>';
            if (ad > 0) {
                if (cur === 'USD') deductUSD = `-${formatPayCurrency(ad, 'USD')}`;
                else deductKHR = `-${formatPayCurrency(ad, 'KHR')}`;
            }

            let allowUSD = '<span style="color: #94a3b8;">-</span>';
            let allowKHR = '<span style="color: #94a3b8;">-</span>';
            if (al > 0) {
                if (cur === 'USD') allowUSD = `+${formatPayCurrency(al, 'USD')}`;
                else allowKHR = `+${formatPayCurrency(al, 'KHR')}`;
            }

            let otherUSD = '<span style="color: #94a3b8;">-</span>';
            let otherKHR = '<span style="color: #94a3b8;">-</span>';
            if (od > 0) {
                if (cur === 'USD') otherUSD = `-${formatPayCurrency(od, 'USD')}`;
                else otherKHR = `-${formatPayCurrency(od, 'KHR')}`;
            }

            const netUSD = cur === 'USD' ? formatPayCurrency(net, 'USD') : '<span style="color: #94a3b8;">-</span>';
            const netKHR = cur === 'KHR' ? formatPayCurrency(net, 'KHR') : '<span style="color: #94a3b8;">-</span>';

            tbodyRows += `
                <tr>
                    <td>${seq++}</td>
                    <td style="text-align: left; padding-left: 6px;">
                        <strong>${it.empName}</strong>
                        ${it.empLatinName ? `<br><small style="color: #64748b;">${it.empLatinName}</small>` : ''}
                    </td>
                    <td>${it.position || ''}</td>
                    <td>${it.type}</td>
                    <td style="text-align: right;">${baseUSD}</td>
                    <td style="text-align: right;">${baseKHR}</td>
                    <td style="font-weight: bold; color: #15803d;">${it.presentDays}</td>
                    <td style="font-weight: bold; color: #b45309;">${it.leaveDays}</td>
                    <td style="font-weight: bold; color: #b91c1c;">${it.absentDays}</td>
                    <td style="text-align: right;">${periodUSD}</td>
                    <td style="text-align: right;">${periodKHR}</td>
                    <td style="text-align: right; color: #b91c1c;">${deductUSD}</td>
                    <td style="text-align: right; color: #b91c1c;">${deductKHR}</td>
                    <td style="text-align: right; color: #0284c7;">${allowUSD}</td>
                    <td style="text-align: right; color: #0284c7;">${allowKHR}</td>
                    <td style="text-align: right; color: #b45309;">${otherUSD}</td>
                    <td style="text-align: right; color: #b45309;">${otherKHR}</td>
                    <td style="text-align: right; font-weight: bold; color: #15803d; font-size: 8.8px;">${netUSD}</td>
                    <td style="text-align: right; font-weight: bold; color: #15803d; font-size: 8.8px;">${netKHR}</td>
                </tr>
            `;
        });
    });

    const grandTotalBaseUSD = sumBaseUSD + (sumBaseKHR / exRate);
    const grandTotalBaseKHR = (sumBaseUSD * exRate) + sumBaseKHR;

    const grandTotalPeriodUSD = sumPeriodBaseUSD + (sumPeriodBaseKHR / exRate);
    const grandTotalPeriodKHR = (sumPeriodBaseUSD * exRate) + sumPeriodBaseKHR;

    const grandTotalAbsenceUSD = sumAbsenceDeductUSD + (sumAbsenceDeductKHR / exRate);
    const grandTotalAbsenceKHR = (sumAbsenceDeductUSD * exRate) + sumAbsenceDeductKHR;

    const grandTotalAllowanceUSD = sumAllowanceUSD + (sumAllowanceKHR / exRate);
    const grandTotalAllowanceKHR = (sumAllowanceUSD * exRate) + sumAllowanceKHR;

    const grandTotalOtherDeductUSD = sumOtherDeductUSD + (sumOtherDeductKHR / exRate);
    const grandTotalOtherDeductKHR = (sumOtherDeductUSD * exRate) + sumOtherDeductKHR;

    const grandTotalNetUSD = sumNetUSD + (sumNetKHR / exRate);
    const grandTotalNetKHR = (sumNetUSD * exRate) + sumNetKHR;

    const printHtml = `
        <div style="font-family: 'Battambang', sans-serif; padding: 5px;">
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #198754; padding-bottom: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center;">
                    ${reportLogo ? `<img src="${reportLogo}" style="max-height: 85px; max-width: 250px; object-fit: contain; margin-right: 18px;">` : ''}
                    <div>
                        <h4 style="margin: 0; font-family: 'Khmer OS Muol Light', cursive; font-size: 1.25rem; color: #0f5132;">តារាងទូទាត់ប្រាក់បៀវត្សរ៍បុគ្គលិក (MASTER PAYROLL SHEET)</h4>
                        <div style="font-size: 9px; color: #475569; margin-top: 4px;">
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
            <table class="payroll-master-print-table" style="width: 100%; border-collapse: collapse; font-size: 7.8px;">
                <thead>
                    <tr style="background-color: #198754; color: #ffffff;">
                        <th rowspan="2" style="width: 25px; vertical-align: middle;">ល.រ</th>
                        <th rowspan="2" style="text-align: left; min-width: 110px; vertical-align: middle;">ឈ្មោះបុគ្គលិក</th>
                        <th rowspan="2" style="width: 60px; vertical-align: middle;">តួនាទី</th>
                        <th rowspan="2" style="width: 50px; vertical-align: middle;">ប្រភេទ</th>
                        <th colspan="2" style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.3); padding: 2px 0;">ប្រាក់ខែគោល</th>
                        <th colspan="3" style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.3); padding: 2px 0;">វត្តមាន</th>
                        <th colspan="2" style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.3); padding: 2px 0;">ប្រាក់គោលកន្លះខែ</th>
                        <th colspan="2" style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.3); padding: 2px 0;">កាត់អវត្តមាន</th>
                        <th colspan="2" style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.3); padding: 2px 0;">ប្រាក់បន្ថែម</th>
                        <th colspan="2" style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.3); padding: 2px 0;">កាត់ផ្សេងៗ</th>
                        <th colspan="2" style="text-align: center; border-bottom: 1px solid rgba(255,255,255,0.3); padding: 2px 0;">ប្រាក់សុទ្ធ (Net Salary)</th>
                    </tr>
                    <tr style="background-color: #146c43; color: #ffffff;">
                        <th style="width: 50px; text-align: right; padding: 2px 3px;">ប្រាក់ ($)</th>
                        <th style="width: 60px; text-align: right; padding: 2px 3px;">ប្រាក់ (៛)</th>
                        <th style="width: 25px; text-align: center; padding: 2px 2px; background-color: #15803d; color: #fff;">P</th>
                        <th style="width: 25px; text-align: center; padding: 2px 2px; background-color: #b45309; color: #fff;">L</th>
                        <th style="width: 25px; text-align: center; padding: 2px 2px; background-color: #b91c1c; color: #fff;">A</th>
                        <th style="width: 50px; text-align: right; padding: 2px 3px;">ប្រាក់ ($)</th>
                        <th style="width: 60px; text-align: right; padding: 2px 3px;">ប្រាក់ (៛)</th>
                        <th style="width: 50px; text-align: right; padding: 2px 3px;">ប្រាក់ ($)</th>
                        <th style="width: 60px; text-align: right; padding: 2px 3px;">ប្រាក់ (៛)</th>
                        <th style="width: 50px; text-align: right; padding: 2px 3px;">ប្រាក់ ($)</th>
                        <th style="width: 60px; text-align: right; padding: 2px 3px;">ប្រាក់ (៛)</th>
                        <th style="width: 50px; text-align: right; padding: 2px 3px;">ប្រាក់ ($)</th>
                        <th style="width: 60px; text-align: right; padding: 2px 3px;">ប្រាក់ (៛)</th>
                        <th style="width: 55px; text-align: right; padding: 2px 3px;">ប្រាក់ ($)</th>
                        <th style="width: 65px; text-align: right; padding: 2px 3px;">ប្រាក់ (៛)</th>
                    </tr>
                </thead>
                <tbody>
                    ${tbodyRows}
                </tbody>
                <tfoot>
                    <tr style="background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #000;">
                        <td colspan="4" style="text-align: center;">សរុបតាមរូបិយប័ណ្ណ (${batch.items.length} នាក់)</td>
                        <td style="text-align: right;">${formatPayCurrency(sumBaseUSD, 'USD')}</td>
                        <td style="text-align: right;">${formatPayCurrency(sumBaseKHR, 'KHR')}</td>
                        <td>${gTotP}</td>
                        <td>${gTotL}</td>
                        <td>${gTotA}</td>
                        <td style="text-align: right;">${formatPayCurrency(sumPeriodBaseUSD, 'USD')}</td>
                        <td style="text-align: right;">${formatPayCurrency(sumPeriodBaseKHR, 'KHR')}</td>
                        <td style="text-align: right; color: #b91c1c;">${sumAbsenceDeductUSD > 0 ? '-' + formatPayCurrency(sumAbsenceDeductUSD, 'USD') : '$0.00'}</td>
                        <td style="text-align: right; color: #b91c1c;">${sumAbsenceDeductKHR > 0 ? '-' + formatPayCurrency(sumAbsenceDeductKHR, 'KHR') : '៛0'}</td>
                        <td style="text-align: right; color: #0284c7;">${sumAllowanceUSD > 0 ? '+' + formatPayCurrency(sumAllowanceUSD, 'USD') : '$0.00'}</td>
                        <td style="text-align: right; color: #0284c7;">${sumAllowanceKHR > 0 ? '+' + formatPayCurrency(sumAllowanceKHR, 'KHR') : '៛0'}</td>
                        <td style="text-align: right; color: #b45309;">${sumOtherDeductUSD > 0 ? '-' + formatPayCurrency(sumOtherDeductUSD, 'USD') : '$0.00'}</td>
                        <td style="text-align: right; color: #b45309;">${sumOtherDeductKHR > 0 ? '-' + formatPayCurrency(sumOtherDeductKHR, 'KHR') : '៛0'}</td>
                        <td style="text-align: right; color: #15803d; font-size: 8.8px;">${formatPayCurrency(sumNetUSD, 'USD')}</td>
                        <td style="text-align: right; color: #15803d; font-size: 8.8px;">${formatPayCurrency(sumNetKHR, 'KHR')}</td>
                    </tr>
                    <tr style="background-color: #d1fae5; font-weight: bold; border-top: 1px solid #10b981; border-bottom: 2px solid #0f5132;">
                        <td colspan="4" style="text-align: center; color: #065f46; font-size: 8px;">
                            សរុបរួមស្មើនឹង ($ និង ៛) <br><span style="font-weight: normal; color: #475569; font-size: 7.2px;">(អត្រា 1$ = ${exRate.toLocaleString('en-US')} ៛)</span>
                        </td>
                        <td colspan="2" style="text-align: right; color: #0f5132; font-size: 8.2px; padding-right: 4px;">
                            ${formatPayCurrency(grandTotalBaseUSD, 'USD')} = ${formatPayCurrency(grandTotalBaseKHR, 'KHR')}
                        </td>
                        <td colspan="3" style="text-align: center; color: #94a3b8;">-</td>
                        <td colspan="2" style="text-align: right; color: #0f5132; font-size: 8.2px; padding-right: 4px;">
                            ${formatPayCurrency(grandTotalPeriodUSD, 'USD')} = ${formatPayCurrency(grandTotalPeriodKHR, 'KHR')}
                        </td>
                        <td colspan="2" style="text-align: right; color: #b91c1c; font-size: 8.2px; padding-right: 4px;">
                            ${grandTotalAbsenceUSD > 0 ? '-' + formatPayCurrency(grandTotalAbsenceUSD, 'USD') : '$0.00'} = ${grandTotalAbsenceKHR > 0 ? '-' + formatPayCurrency(grandTotalAbsenceKHR, 'KHR') : '៛0'}
                        </td>
                        <td colspan="2" style="text-align: right; color: #0284c7; font-size: 8.2px; padding-right: 4px;">
                            ${grandTotalAllowanceUSD > 0 ? '+' + formatPayCurrency(grandTotalAllowanceUSD, 'USD') : '$0.00'} = ${grandTotalAllowanceKHR > 0 ? '+' + formatPayCurrency(grandTotalAllowanceKHR, 'KHR') : '៛0'}
                        </td>
                        <td colspan="2" style="text-align: right; color: #b45309; font-size: 8.2px; padding-right: 4px;">
                            ${grandTotalOtherDeductUSD > 0 ? '-' + formatPayCurrency(grandTotalOtherDeductUSD, 'USD') : '$0.00'} = ${grandTotalOtherDeductKHR > 0 ? '-' + formatPayCurrency(grandTotalOtherDeductKHR, 'KHR') : '៛0'}
                        </td>
                        <td colspan="2" style="text-align: right; color: #047857; font-size: 9px; font-weight: bold; padding-right: 4px;">
                            ${formatPayCurrency(grandTotalNetUSD, 'USD')} = ${formatPayCurrency(grandTotalNetKHR, 'KHR')}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <!-- Signatures Footer -->
            <div style="display: flex; justify-content: space-between; margin-top: 35px; text-align: center; font-size: 8.5px;">
                <div style="width: 25%;">
                    <div style="border-top: 1px dashed #475569; padding-top: 5px;">រៀបចំដោយ (Prepared By)</div>
                </div>
                <div style="width: 25%;">
                    <div style="border-top: 1px dashed #475569; padding-top: 5px;">ត្រួតពិនិត្យដោយ (Checked By)</div>
                </div>
                <div style="width: 25%;">
                    <div style="border-top: 1px dashed #475569; padding-top: 5px;">អនុម័តដោយ (Approved By)</div>
                </div>
            </div>
        </div>
    `;

    const printContainer = document.getElementById('print-area-payroll-master');
    if (!printContainer) return;

    printContainer.innerHTML = printHtml;
    executePayrollPrint('print-area-payroll-master', 'landscape');
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
        "ប្រាក់ខែគោល ($)",
        "ប្រាក់ខែគោល (៛)",
        "វត្តមាន P (ថ្ងៃ)",
        "ច្បាប់ L (ថ្ងៃ)",
        "អវត្តមាន A (ថ្ងៃ)",
        "ថ្ងៃធ្វើការសរុប",
        "ប្រាក់គោលកន្លះខែ ($)",
        "ប្រាក់គោលកន្លះខែ (៛)",
        "ប្រាក់កាត់អវត្តមាន ($)",
        "ប្រាក់កាត់អវត្តមាន (៛)",
        "ប្រាក់បន្ថែម ($)",
        "ប្រាក់បន្ថែម (៛)",
        "មូលហេតុបន្ថែម",
        "ប្រាក់កាត់ផ្សេងៗ ($)",
        "ប្រាក់កាត់ផ្សេងៗ (៛)",
        "មូលហេតុការកាត់",
        "ប្រាក់សុទ្ធ ($)",
        "ប្រាក់សុទ្ធ (៛)"
    ];

    let csvContent = "\uFEFF" + headers.join(",") + "\n";
    const exRate = window.sysExchangeRate || parseFloat(localStorage.getItem('sysExchangeRate')) || 4100;
    
    let sumBaseUSD = 0, sumBaseKHR = 0;
    let sumPeriodUSD = 0, sumPeriodKHR = 0;
    let sumAbsUSD = 0, sumAbsKHR = 0;
    let sumAllowUSD = 0, sumAllowKHR = 0;
    let sumOtherUSD = 0, sumOtherKHR = 0;
    let sumNetUSD = 0, sumNetKHR = 0;

    batch.items.forEach((it, idx) => {
        const cur = it.currency || 'USD';
        const isPartTime = (it.type === 'Part-Time');
        const dRate = parseFloat(it.dailyRate) || (isPartTime ? (parseFloat(it.baseSalary) || 0) : ((parseFloat(it.baseSalary) || 0) / 30));
        const b = isPartTime ? (dRate * 30) : (parseFloat(it.baseSalary) || 0);
        const pb = parseFloat(it.periodBaseSalary) || 0;
        const ad = parseFloat(it.absenceDeduction) || 0;
        const al = parseFloat(it.allowance) || 0;
        const od = parseFloat(it.otherDeduction) || 0;
        const net = parseFloat(it.netSalary) || 0;

        let baseUSD = "", baseKHR = "";
        let periodUSD = "", periodKHR = "";
        let absUSD = "", absKHR = "";
        let allowUSD = "", allowKHR = "";
        let otherUSD = "", otherKHR = "";
        let netUSD = "", netKHR = "";

        if (cur === 'KHR') {
            baseKHR = b;
            sumBaseKHR += b;

            periodKHR = pb;
            sumPeriodKHR += pb;

            if (ad > 0) {
                absKHR = ad;
                sumAbsKHR += ad;
            }

            if (al > 0) {
                allowKHR = al;
                sumAllowKHR += al;
            }

            if (od > 0) {
                otherKHR = od;
                sumOtherKHR += od;
            }

            netKHR = net;
            sumNetKHR += net;
        } else {
            baseUSD = b;
            sumBaseUSD += b;

            periodUSD = pb;
            sumPeriodUSD += pb;

            if (ad > 0) {
                absUSD = ad;
                sumAbsUSD += ad;
            }

            if (al > 0) {
                allowUSD = al;
                sumAllowUSD += al;
            }

            if (od > 0) {
                otherUSD = od;
                sumOtherUSD += od;
            }

            netUSD = net;
            sumNetUSD += net;
        }

        const row = [
            idx + 1,
            `"${it.empCode || ''}"`,
            `"${(it.empName || '').replace(/"/g, '""')}"`,
            `"${(it.empLatinName || '').replace(/"/g, '""')}"`,
            `"${(it.department || '').replace(/"/g, '""')}"`,
            `"${(it.position || '').replace(/"/g, '""')}"`,
            `"${it.type || ''}"`,
            `"${cur}"`,
            baseUSD !== "" ? baseUSD : "",
            baseKHR !== "" ? baseKHR : "",
            it.presentDays || 0,
            it.leaveDays || 0,
            it.absentDays || 0,
            it.workedDays || 0,
            periodUSD !== "" ? periodUSD : "",
            periodKHR !== "" ? periodKHR : "",
            absUSD !== "" ? absUSD : "",
            absKHR !== "" ? absKHR : "",
            allowUSD !== "" ? allowUSD : "",
            allowKHR !== "" ? allowKHR : "",
            `"${(it.allowanceNote || '').replace(/"/g, '""')}"`,
            otherUSD !== "" ? otherUSD : "",
            otherKHR !== "" ? otherKHR : "",
            `"${(it.deductionNote || '').replace(/"/g, '""')}"`,
            netUSD !== "" ? netUSD : "",
            netKHR !== "" ? netKHR : ""
        ];
        csvContent += row.join(",") + "\n";
    });

    const gtBaseUSD = sumBaseUSD + (sumBaseKHR / exRate);
    const gtBaseKHR = (sumBaseUSD * exRate) + sumBaseKHR;

    const gtPeriodUSD = sumPeriodUSD + (sumPeriodKHR / exRate);
    const gtPeriodKHR = (sumPeriodUSD * exRate) + sumPeriodKHR;

    const gtAbsUSD = sumAbsUSD + (sumAbsKHR / exRate);
    const gtAbsKHR = (sumAbsUSD * exRate) + sumAbsKHR;

    const gtAllowUSD = sumAllowUSD + (sumAllowKHR / exRate);
    const gtAllowKHR = (sumAllowUSD * exRate) + sumAllowKHR;

    const gtOtherUSD = sumOtherUSD + (sumOtherKHR / exRate);
    const gtOtherKHR = (sumOtherUSD * exRate) + sumOtherKHR;

    const gtNetUSD = sumNetUSD + (sumNetKHR / exRate);
    const gtNetKHR = (sumNetUSD * exRate) + sumNetKHR;

    // Subtotal Row
    csvContent += `\n"","","","","","","","សរុបតាមរូបិយប័ណ្ណ",${sumBaseUSD},${sumBaseKHR},"","","",${sumPeriodUSD},${sumPeriodKHR},${sumAbsUSD},${sumAbsKHR},${sumAllowUSD},${sumAllowKHR},"",${sumOtherUSD},${sumOtherKHR},"",${sumNetUSD},${sumNetKHR}\n`;
    
    // Grand Total Converted Row
    csvContent += `"","","","","","","","សរុបរួម (1$ = ${exRate} ៛)","${formatPayCurrency(gtBaseUSD, 'USD')} = ${formatPayCurrency(gtBaseKHR, 'KHR')}","","","","","${formatPayCurrency(gtPeriodUSD, 'USD')} = ${formatPayCurrency(gtPeriodKHR, 'KHR')}","","${formatPayCurrency(gtAbsUSD, 'USD')} = ${formatPayCurrency(gtAbsKHR, 'KHR')}","","${formatPayCurrency(gtAllowUSD, 'USD')} = ${formatPayCurrency(gtAllowKHR, 'KHR')}","","","${formatPayCurrency(gtOtherUSD, 'USD')} = ${formatPayCurrency(gtOtherKHR, 'KHR')}","","","${formatPayCurrency(gtNetUSD, 'USD')} = ${formatPayCurrency(gtNetKHR, 'KHR')}"\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Payroll_${batch.code}_${batch.startDate}_to_${batch.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
