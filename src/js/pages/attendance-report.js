// ====== ATTENDANCE REPORT & TIMESHEET ======

let currentAttReportTab = 'timesheet'; // 'timesheet' or 'matrix'

function formatReportDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const mIdx = parseInt(m, 10) - 1;
    const mName = months[mIdx] || m;
    return `${d}-${mName}-${y}`;
}

window.loadAttendanceReportLogo = async function() {
    const logoEl1 = document.getElementById('brand-logo-report-att');
    const logoEl2 = document.getElementById('brand-logo-timesheet');
    const applyLogo = (url) => {
        if (logoEl1) { logoEl1.src = url; logoEl1.style.display = 'block'; }
        if (logoEl2) { logoEl2.src = url; logoEl2.style.display = 'block'; }
    };

    // 1. Try local storage cache for instant rendering
    const cached = localStorage.getItem('cachedReportLogo');
    if (cached) {
        applyLogo(cached);
    }
    
    // 2. Fetch from Firebase brandSettings
    try {
        if (typeof db !== 'undefined') {
            if (!db.brandSettings) db.brandSettings = new FirebaseStore('brandSettings');
            const brand = await db.brandSettings.get(1);
            if (brand) {
                const logoUrl = brand.reportLogo || brand.sidebarLogo || 'assets/images/logo.png';
                if (logoUrl) {
                    applyLogo(logoUrl);
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

window.switchAttReportTab = function(tabId) {
    currentAttReportTab = tabId;
    const tabTimesheet = document.getElementById('att-tab-timesheet');
    const tabMatrix = document.getElementById('att-tab-matrix');
    const btnTimesheet = document.getElementById('tab-btn-timesheet');
    const btnMatrix = document.getElementById('tab-btn-matrix');

    if (tabId === 'timesheet') {
        if (tabTimesheet) tabTimesheet.style.display = 'block';
        if (tabMatrix) tabMatrix.style.display = 'none';
        if (btnTimesheet) {
            btnTimesheet.className = 'btn btn-sm btn-primary fw-bold d-flex align-items-center gap-2 px-3 py-2 rounded-2';
        }
        if (btnMatrix) {
            btnMatrix.className = 'btn btn-sm btn-outline-success fw-bold d-flex align-items-center gap-2 px-3 py-2 rounded-2';
        }
        generateTimesheetReport();
    } else {
        if (tabTimesheet) tabTimesheet.style.display = 'none';
        if (tabMatrix) tabMatrix.style.display = 'block';
        if (btnTimesheet) {
            btnTimesheet.className = 'btn btn-sm btn-outline-primary fw-bold d-flex align-items-center gap-2 px-3 py-2 rounded-2';
        }
        if (btnMatrix) {
            btnMatrix.className = 'btn btn-sm btn-success fw-bold d-flex align-items-center gap-2 px-3 py-2 rounded-2';
        }
        generateAttendanceReport();
    }
};

window.setTimesheetPreset = function(preset) {
    document.querySelectorAll('.ts-preset-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`ts-btn-${preset.replace('_', '-')}`);
    if (btn) btn.classList.add('active');

    const fromInput = document.getElementById('tsFromDate');
    const toInput = document.getElementById('tsToDate');
    if (!fromInput || !toInput) return;

    const now = new Date();
    const toYMD = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    if (preset === 'today') {
        fromInput.value = toYMD(now);
        toInput.value = toYMD(now);
    } else if (preset === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        fromInput.value = toYMD(yest);
        toInput.value = toYMD(yest);
    } else if (preset === '7days') {
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 6);
        fromInput.value = toYMD(d7);
        toInput.value = toYMD(now);
    } else if (preset === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        fromInput.value = toYMD(firstDay);
        toInput.value = toYMD(now);
    }

    generateTimesheetReport();
};

window.loadTimesheetDepartmentFilter = async function() {
    const deptSelect = document.getElementById('tsDeptFilter');
    if (!deptSelect) return;
    
    try {
        let departments = [];
        if (typeof db !== 'undefined') {
            if (db.departments) {
                const depts = await db.departments.toArray();
                departments = depts.map(d => d.name).filter(Boolean);
            }
            if (departments.length === 0 && db.employees) {
                const emps = await db.employees.toArray();
                const set = new Set();
                emps.forEach(e => { if (e.department) set.add(e.department); });
                departments = Array.from(set);
            }
        }
        
        const current = deptSelect.value;
        let html = '<option value="all">គ្រប់ផ្នែកទាំងអស់ (All)</option>';
        departments.sort((a, b) => a.localeCompare(b, 'km')).forEach(d => {
            html += `<option value="${d}">${d}</option>`;
        });
        deptSelect.innerHTML = html;
        if (current) deptSelect.value = current;
    } catch (e) {
        console.warn('Error loading departments for timesheet filter:', e);
    }
};

window.initAttendanceReport = function() {
    // 1. Init Matrix Dates
    const fromInput = document.getElementById('repAttFrom');
    const toInput = document.getElementById('repAttTo');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
    
    if (fromInput && !fromInput.value) fromInput.value = `${yyyy}-${mm}-01`;
    if (toInput && !toInput.value) toInput.value = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;

    // 2. Init Timesheet Dates (Default: Today)
    const tsFrom = document.getElementById('tsFromDate');
    const tsTo = document.getElementById('tsToDate');
    if (tsFrom && !tsFrom.value) tsFrom.value = `${yyyy}-${mm}-${dd}`;
    if (tsTo && !tsTo.value) tsTo.value = `${yyyy}-${mm}-${dd}`;

    loadAttendanceReportLogo();
    loadTimesheetDepartmentFilter();

    // Default to Timesheet tab
    switchAttReportTab('timesheet');
};

// ====== COMPREHENSIVE TIMESHEET REPORT LOGIC ======
window.generateTimesheetReport = async function() {
    const tbody = document.getElementById('tsTableBody');
    const fromInput = document.getElementById('tsFromDate');
    const toInput = document.getElementById('tsToDate');
    const deptFilter = document.getElementById('tsDeptFilter')?.value || 'all';
    const statusFilter = document.getElementById('tsStatusFilter')?.value || 'all';
    const searchQuery = (document.getElementById('tsSearchInput')?.value || '').trim().toLowerCase();
    const subtitle = document.getElementById('tsDateRangeSubtitle');

    if (!fromInput || !toInput || !tbody) return;

    const from = fromInput.value;
    const to = toInput.value;

    if (!from || !to) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-warning">សូមជ្រើសរើសកាលបរិច្ឆេទ!</td></tr>';
        return;
    }

    if (from > to) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-danger">ថ្ងៃចាប់ផ្តើមមិនអាចធំជាងថ្ងៃបញ្ចប់បានទេ!</td></tr>';
        return;
    }

    if (subtitle) {
        if (from === to) {
            subtitle.innerText = `សម្រាប់កាលបរិច្ឆេទ៖ ${formatReportDate(from)}`;
        } else {
            subtitle.innerText = `គិតចាប់ពីថ្ងៃទី ${formatReportDate(from)} ដល់ថ្ងៃទី ${formatReportDate(to)}`;
        }
    }

    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div> កំពុងទាញយកទិន្នន័យស្កែន...</td></tr>';

    try {
        if (typeof db === 'undefined' || !db.attendance || !db.employees) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-danger">រកមិនឃើញមូលដ្ឋានទិន្នន័យ (Database) ទេ!</td></tr>';
            return;
        }

        // 1. Fetch work shifts configuration
        let shifts = { morningIn: '07:00', morningOut: '11:00', afternoonIn: '13:00', afternoonOut: '17:00' };
        if (db.workShifts) {
            try {
                const s = await db.workShifts.first();
                if (s) shifts = Object.assign(shifts, s);
            } catch (e) {}
        }

        const [mInH, mInM] = (shifts.morningIn || '07:00').split(':').map(Number);
        const [mOutH, mOutM] = (shifts.morningOut || '11:00').split(':').map(Number);
        const [aInH, aInM] = (shifts.afternoonIn || '13:00').split(':').map(Number);
        const [aOutH, aOutM] = (shifts.afternoonOut || '17:00').split(':').map(Number);

        const mInMinutes = mInH * 60 + mInM;
        const mOutMinutes = mOutH * 60 + mOutM;
        const aInMinutes = aInH * 60 + aInM;
        const aOutMinutes = aOutH * 60 + aOutM;

        // 2. Fetch Employees & Map
        const employees = await db.employees.toArray();
        const empMap = {};
        employees.forEach(e => { empMap[e.id] = e; });

        // 3. Fetch Attendance records in range
        const allAtt = await db.attendance.toArray();

        // Auto-migrate legacy scan records where status was mistakenly recorded as 'L' instead of 'P'
        try {
            const legacyRecords = allAtt.filter(r => 
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
            console.warn('Attendance scan migration error in timesheet:', migErr);
        }

        const existingRecords = allAtt.filter(r => r.date && r.date >= from && r.date <= to);
        const existingMap = new Map();
        existingRecords.forEach(r => existingMap.set(`${r.empId}_${r.date}`, r));

        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
        const currentHour = todayObj.getHours();

        const combinedRecords = [...existingRecords];

        // Synthesize unscanned staff records for past dates/shifts (Default to 'A' Absent)
        let curD = new Date(from);
        const endD = new Date(to);
        while (curD <= endD) {
            const dStr = curD.toISOString().split('T')[0];
            if (dStr <= todayStr) {
                const isMorningPast = (dStr < todayStr) || (dStr === todayStr && currentHour >= 12);
                const isAfternoonPast = (dStr < todayStr) || (dStr === todayStr && currentHour >= 18);

                if (isMorningPast || isAfternoonPast) {
                    employees.forEach(emp => {
                        // Skip if date is before employee start date!
                        if (emp.startDate && dStr < emp.startDate) {
                            return;
                        }
                        const key = `${emp.id}_${dStr}`;
                        if (!existingMap.has(key)) {
                            combinedRecords.push({
                                id: `unscanned_${emp.id}_${dStr}`,
                                date: dStr,
                                empId: emp.id,
                                empName: emp.name,
                                morning: isMorningPast ? 'A' : '',
                                afternoon: isAfternoonPast ? 'A' : '',
                                scanTimeMorning: '',
                                scanTimeMorningOut: '',
                                scanTimeAfternoon: '',
                                scanTimeAfternoonOut: '',
                                checkInTime: '',
                                checkOutTime: '',
                                totalHoursWorked: 0,
                                note: 'អវត្តមាន (មិនបានស្កែន)',
                                isSynthetic: true
                            });
                        }
                    });
                }
            }
            curD.setDate(curD.getDate() + 1);
        }

        if (combinedRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-4 d-block mb-1"></i>មិនមានទិន្នន័យស្កែនក្នុងចន្លោះកាលបរិច្ឆេទនេះទេ!</td></tr>';
            updateTimesheetKpis([], shifts);
            return;
        }

        // 4. Process each attendance record
        const processedList = [];

        combinedRecords.forEach(r => {
            const emp = empMap[r.empId] || { name: r.empName || 'បុគ្គលិក', code: `EMP-${r.empId}`, photo: '', department: 'ទូទៅ', position: 'បុគ្គលិក' };

            // Skip records before employee start date if no scan
            if (emp.startDate && r.date && r.date < emp.startDate) {
                const hasScan = r.checkInTime || r.scanTimeMorning || r.scanTimeAfternoon || r.checkOutTime || r.scanTimeMorningOut || r.scanTimeAfternoonOut;
                if (!hasScan) return;
            }

            // Department filter
            if (deptFilter !== 'all' && (emp.department || '').trim() !== deptFilter.trim()) {
                return;
            }

            // Search filter
            if (searchQuery) {
                const textTarget = `${emp.name || ''} ${emp.latinName || ''} ${emp.code || ''} ${emp.department || ''} ${emp.position || ''}`.toLowerCase();
                if (!textTarget.includes(searchQuery)) return;
            }

            // Determine Check-In Time
            let checkIn = r.checkInTime || r.scanTimeMorning || r.scanTimeAfternoon || '';
            // Determine Check-Out Time
            let checkOut = r.checkOutTime || r.scanTimeAfternoonOut || '';
            if (!checkOut && r.scanTimeMorningOut && !r.scanTimeAfternoon) {
                checkOut = r.scanTimeMorningOut;
            } else if (!checkOut && r.scanTimeAfternoon && r.scanTimeMorning) {
                checkOut = r.scanTimeAfternoon;
            }

            // If checkIn === checkOut and only one scan exists, checkOut is pending
            if (checkIn && checkOut && checkIn === checkOut) {
                // If scanned after 15:00, it's checkout without checkin
                const [h] = checkIn.split(':').map(Number);
                if (h >= 15) {
                    checkIn = '';
                } else {
                    checkOut = '';
                }
            }

            // --- Analyze Check-In Status ---
            let inStatus = 'none';
            let inStatusText = '--';
            let inBadgeClass = 'bg-secondary';
            let inMinsDiff = 0;

            if (checkIn) {
                const [inH, inM] = checkIn.split(':').map(Number);
                const inMinFromMid = inH * 60 + inM;

                let targetInMin = mInMinutes;
                if (inH >= 12) targetInMin = aInMinutes;

                if (inMinFromMid <= targetInMin) {
                    inStatus = 'early';
                    inMinsDiff = targetInMin - inMinFromMid;
                    inStatusText = inMinsDiff > 0 ? `មុន ${inMinsDiff} នាទី` : 'ទាន់ពេល';
                    inBadgeClass = 'bg-success bg-opacity-15 text-success border border-success';
                } else if (inMinFromMid <= targetInMin + 5) {
                    inStatus = 'ontime';
                    inStatusText = 'ទាន់ពេល';
                    inBadgeClass = 'bg-success bg-opacity-15 text-success border border-success';
                } else {
                    inStatus = 'late';
                    inMinsDiff = inMinFromMid - targetInMin;
                    inStatusText = `យឺត ${inMinsDiff} នាទី`;
                    inBadgeClass = 'bg-warning bg-opacity-25 text-warning border border-warning';
                }
            } else {
                if (r.morning === 'A' || r.isSynthetic) {
                    inStatus = 'absent';
                    inStatusText = 'អវត្តមាន (A)';
                    inBadgeClass = 'bg-danger bg-opacity-15 text-danger border border-danger';
                } else {
                    inStatusText = 'មិនបានស្កែនចូល';
                    inBadgeClass = 'bg-secondary bg-opacity-25 text-muted';
                }
            }

            // --- Analyze Check-Out Status ---
            let outStatus = 'none';
            let outStatusText = '--';
            let outBadgeClass = 'bg-secondary';
            let outMinsDiff = 0;

            if (checkOut) {
                const [outH, outM] = checkOut.split(':').map(Number);
                const outMinFromMid = outH * 60 + outM;

                let targetOutMin = aOutMinutes;
                if (outH < 13 && r.scanTimeMorningOut) targetOutMin = mOutMinutes;

                if (outMinFromMid < targetOutMin - 5) {
                    outStatus = 'early_out';
                    outMinsDiff = targetOutMin - outMinFromMid;
                    outStatusText = `ចេញមុន ${outMinsDiff} នាទី`;
                    outBadgeClass = 'bg-danger bg-opacity-15 text-danger border border-danger';
                } else if (outMinFromMid <= targetOutMin + 15) {
                    outStatus = 'ontime';
                    outStatusText = 'ទាន់ពេល';
                    outBadgeClass = 'bg-success bg-opacity-15 text-success border border-success';
                } else {
                    outStatus = 'overtime';
                    outMinsDiff = outMinFromMid - targetOutMin;
                    outStatusText = `លើស ${outMinsDiff} នាទី (OT)`;
                    outBadgeClass = 'bg-primary bg-opacity-15 text-primary border border-primary';
                }
            } else {
                const isToday = (r.date === todayStr);
                if (isToday && checkIn) {
                    outStatus = 'working';
                    outStatusText = 'កំពុងបំពេញការងារ';
                    outBadgeClass = 'bg-info bg-opacity-15 text-info border border-info';
                } else if (r.afternoon === 'A' || r.isSynthetic) {
                    outStatus = 'absent';
                    outStatusText = 'អវត្តមាន (A)';
                    outBadgeClass = 'bg-danger bg-opacity-15 text-danger border border-danger';
                } else {
                    outStatus = 'no_checkout';
                    outStatusText = 'មិនបានស្កែនចេញ';
                    outBadgeClass = 'bg-secondary bg-opacity-25 text-muted';
                }
            }

            // --- Calculate Hours Worked ---
            let netWorkedMinutes = 0;
            let hoursStr = '--';
            let percentOf8h = 0;

            if (checkIn && checkOut) {
                const [inH, inM] = checkIn.split(':').map(Number);
                const [outH, outM] = checkOut.split(':').map(Number);
                const startM = inH * 60 + inM;
                const endM = outH * 60 + outM;

                if (endM > startM) {
                    let rawSpan = endM - startM;
                    // Deduct 2h (120m) lunch if spanned across 11:00 - 13:00
                    if (startM < 12 * 60 && endM > 13 * 60) {
                        netWorkedMinutes = Math.max(0, rawSpan - 120);
                    } else {
                        netWorkedMinutes = rawSpan;
                    }
                }
            } else if (checkIn && !checkOut) {
                // Single session estimate
                netWorkedMinutes = 240; // ~4 hours
            }

            if (r.totalHoursWorked) {
                netWorkedMinutes = Math.round(r.totalHoursWorked * 60);
            }

            if (netWorkedMinutes > 0) {
                const hrs = Math.floor(netWorkedMinutes / 60);
                const mins = netWorkedMinutes % 60;
                hoursStr = `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim();
                percentOf8h = Math.min(100, Math.round((netWorkedMinutes / 480) * 100));
            }

            // Filter by Status Dropdown
            if (statusFilter === 'ontime' && inStatus !== 'ontime' && inStatus !== 'early') return;
            if (statusFilter === 'late' && inStatus !== 'late') return;
            if (statusFilter === 'early_out' && outStatus !== 'early_out') return;
            if (statusFilter === 'overtime' && outStatus !== 'overtime') return;
            if (statusFilter === 'absent' && inStatus !== 'absent' && outStatus !== 'absent') return;

            processedList.push({
                record: r,
                emp,
                checkIn,
                inStatus,
                inStatusText,
                inBadgeClass,
                inMinsDiff,
                checkOut,
                outStatus,
                outStatusText,
                outBadgeClass,
                outMinsDiff,
                netWorkedMinutes,
                hoursStr,
                percentOf8h
            });
        });

        // 5. Sort processed items: Date descending, then Dept, then Khmer Name
        processedList.sort((a, b) => {
            if (b.record.date !== a.record.date) return b.record.date.localeCompare(a.record.date);
            const deptCompare = (a.emp.department || '').localeCompare(b.emp.department || '', 'km');
            if (deptCompare !== 0) return deptCompare;
            return (a.emp.name || '').localeCompare(b.emp.name || '', 'km');
        });

        // 6. Update Summary KPI Cards
        updateTimesheetKpis(processedList, shifts);

        const canEdit = typeof canEditAttendance === 'function' ? canEditAttendance() : true;
        const canDel = typeof canDeleteAttendance === 'function' ? canDeleteAttendance() : true;

        if (processedList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted"><i class="bi bi-filter fs-4 d-block mb-1"></i>មិនមានទិន្នន័យត្រូវនឹងតម្រងស្វែងរកនេះទេ!</td></tr>';
            return;
        }

        // 7. Render Table Rows
        let html = '';
        processedList.forEach((item, idx) => {
            const { record: r, emp, checkIn, inStatusText, inBadgeClass, checkOut, outStatusText, outBadgeClass, hoursStr, percentOf8h } = item;

            const morningBreakdown = (r.scanTimeMorning || '--') + (r.scanTimeMorningOut ? ` ➔ ${r.scanTimeMorningOut}` : '');
            const afternoonBreakdown = (r.scanTimeAfternoon || '--') + (r.scanTimeAfternoonOut ? ` ➔ ${r.scanTimeAfternoonOut}` : '');

            let progressBarColor = 'bg-success';
            if (percentOf8h < 50) progressBarColor = 'bg-danger';
            else if (percentOf8h < 90) progressBarColor = 'bg-warning';

            const editBtn = canEdit ? `
                <button class="btn btn-outline-primary btn-sm py-0 px-2" onclick="openEditAttendanceModal('${r.id}')" title="កែប្រែទិន្នន័យ">
                    <i class="bi bi-pencil-square"></i>
                </button>
            ` : '';
            const delBtn = (canDel && !r.isSynthetic) ? `
                <button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="deleteAttendanceRecord('${r.id}')" title="លុបទិន្នន័យ">
                    <i class="bi bi-trash"></i>
                </button>
            ` : '';

            const actionCell = (canEdit || canDel) ? `
                <td class="col-actions text-center">
                    <div class="d-flex justify-content-center gap-1">
                        ${editBtn}
                        ${delBtn}
                    </div>
                </td>
            ` : '<td class="col-actions text-center text-muted small">-</td>';

            html += `
            <tr>
                <td class="text-center fw-bold text-muted">${idx + 1}</td>
                <td class="text-nowrap small fw-semibold text-dark">${formatReportDate(r.date)}</td>
                <td class="text-start">
                    <div class="d-flex align-items-center">
                        <img src="${emp.photo || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" class="rounded-circle me-2 border flex-shrink-0" style="width: 30px; height: 30px; object-fit: cover;">
                        <div style="line-height: 1.3;">
                            <div class="fw-bold text-dark emp-name-km">${emp.name}</div>
                            <div class="text-muted small">${emp.latinName || emp.code || ''}</div>
                        </div>
                    </div>
                </td>
                <td class="text-start small">
                    <span class="badge bg-light text-dark border px-2 py-1 mb-1 d-inline-block">${emp.department || 'ទូទៅ'}</span>
                    <div class="text-muted small">${emp.position || 'បុគ្គលិក'}</div>
                </td>
                <td>
                    <div class="fw-bold text-dark font-monospace">${checkIn || '--:--'}</div>
                    <span class="badge ${inBadgeClass} rounded-pill px-2 py-1 mt-1" style="font-size: 0.7rem;">${inStatusText}</span>
                </td>
                <td>
                    <div class="fw-bold text-dark font-monospace">${checkOut || '--:--'}</div>
                    <span class="badge ${outBadgeClass} rounded-pill px-2 py-1 mt-1" style="font-size: 0.7rem;">${outStatusText}</span>
                </td>
                <td>
                    <div class="fw-bold text-primary font-monospace fs-6">${hoursStr}</div>
                    ${percentOf8h > 0 ? `
                    <div class="progress mt-1" style="height: 5px; width: 80px; margin: 0 auto;" title="${percentOf8h}% នៃម៉ោងស្តង់ដារ ៨ ម៉ោង">
                        <div class="progress-bar ${progressBarColor}" role="progressbar" style="width: ${percentOf8h}%;"></div>
                    </div>
                    ` : ''}
                </td>
                <td class="small text-start font-monospace" style="font-size: 0.75rem;">
                    <div><span class="text-muted">ព្រឹក:</span> ${morningBreakdown}</div>
                    <div><span class="text-muted">រសៀល:</span> ${afternoonBreakdown}</div>
                </td>
                <td class="small text-muted text-start" style="font-size: 0.75rem;">
                    <div>${r.note || 'វត្តមានប្រចាំថ្ងៃ'}</div>
                    ${r.gpsDistance ? `<div class="text-info"><i class="bi bi-geo-alt"></i> ${r.gpsDistance}m</div>` : ''}
                </td>
                ${actionCell}
            </tr>`;
        });

        tbody.innerHTML = html;

    } catch (err) {
        console.error('Error generating timesheet report:', err);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-danger">កំហុសក្នុងការទាញយកទិន្នន័យ៖ ${err.message}</td></tr>`;
    }
};

function updateTimesheetKpis(list) {
    const pEl = document.getElementById('ts-stat-present');
    const hEl = document.getElementById('ts-stat-hours');
    const ontimeEl = document.getElementById('ts-stat-ontime');
    const lateEl = document.getElementById('ts-stat-late');
    const lateMinsEl = document.getElementById('ts-stat-late-mins');
    const earlyOutEl = document.getElementById('ts-stat-early-out');
    const earlyMinsEl = document.getElementById('ts-stat-early-mins');
    const otEl = document.getElementById('ts-stat-overtime');
    const otMinsEl = document.getElementById('ts-stat-ot-mins');

    if (!pEl) return;

    const presentEmps = new Set(list.filter(i => i.checkIn || i.record.morning === 'P' || i.record.afternoon === 'P').map(i => i.emp.id || i.record.empId));
    let totalMinutes = 0;
    let ontimeCount = 0;
    let lateCount = 0;
    let totalLateMins = 0;
    let earlyOutCount = 0;
    let totalEarlyMins = 0;
    let otCount = 0;
    let totalOtMins = 0;

    list.forEach(i => {
        totalMinutes += i.netWorkedMinutes;
        if (i.inStatus === 'ontime' || i.inStatus === 'early') ontimeCount++;
        if (i.inStatus === 'late') {
            lateCount++;
            totalLateMins += i.inMinsDiff;
        }
        if (i.outStatus === 'early_out') {
            earlyOutCount++;
            totalEarlyMins += i.outMinsDiff;
        }
        if (i.outStatus === 'overtime') {
            otCount++;
            totalOtMins += i.outMinsDiff;
        }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remMins = totalMinutes % 60;

    pEl.innerText = presentEmps.size;
    hEl.innerText = `${totalHours}h ${remMins > 0 ? `${remMins}m` : ''}`.trim() || '0h';
    ontimeEl.innerText = ontimeCount;
    lateEl.innerText = lateCount;
    if (lateMinsEl) lateMinsEl.innerText = `${totalLateMins}m`;
    earlyOutEl.innerText = earlyOutCount;
    if (earlyMinsEl) earlyMinsEl.innerText = `${totalEarlyMins}m`;
    otEl.innerText = otCount;
    if (otMinsEl) otMinsEl.innerText = `${totalOtMins}m`;
}

// ====== PRINT TIMESHEET ======
window.printTimesheetReport = async function() {
    await loadAttendanceReportLogo();

    let style = document.getElementById('dynamic-print-timesheet');
    if (!style) {
        style = document.createElement('style');
        style.id = 'dynamic-print-timesheet';
        document.head.appendChild(style);
    }
    style.innerHTML = '@page { size: A4 landscape; margin: 8mm; } @media print { @page { size: A4 landscape; margin: 8mm; } }';
    
    document.body.classList.add('printing-timesheet');

    const cleanup = () => {
        document.body.classList.remove('printing-timesheet');
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
        window.print();
    }, 250);
};

// ====== EXPORT TIMESHEET AS CSV / EXCEL ======
window.exportTimesheetCSV = function() {
    const table = document.getElementById('tsTableBody');
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    if (rows.length === 0 || rows[0].innerText.includes('មិនមានទិន្នន័យ')) {
        Swal.fire('បម្រាម', 'មិនមានទិន្នន័យសម្រាប់ Export ទេ!', 'warning');
        return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Khmer support
    csvContent += 'ល.រ,កាលបរិច្ឆេទ,អត្តលេខ,ឈ្មោះបុគ្គលិក,ឈ្មោះឡាតាំង,ផ្នែក,តួនាទី,ម៉ោងស្កែនចូល,ស្ថានភាពចូល,ម៉ោងស្កែនចេញ,ស្ថានភាពចេញ,ម៉ោងធ្វើការសរុប,វេនព្រឹក,វេនរសៀល,កំណត់ចំណាំ\n';

    rows.forEach(tr => {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 9) {
            const no = tds[0].innerText.trim();
            const date = tds[1].innerText.trim();
            const nameEl = tds[2].querySelector('.emp-name-km');
            const subEl = tds[2].querySelector('.text-muted');
            const name = nameEl ? nameEl.innerText.trim() : '';
            const codeOrLatin = subEl ? subEl.innerText.trim() : '';
            const dept = (tds[3].querySelector('.badge')?.innerText || '').trim();
            const pos = (tds[3].querySelector('.text-muted')?.innerText || '').trim();
            const inTime = (tds[4].querySelector('.font-monospace')?.innerText || '').trim();
            const inStatus = (tds[4].querySelector('.badge')?.innerText || '').trim();
            const outTime = (tds[5].querySelector('.font-monospace')?.innerText || '').trim();
            const outStatus = (tds[5].querySelector('.badge')?.innerText || '').trim();
            const hours = (tds[6].querySelector('.font-monospace')?.innerText || '').trim();
            const shiftsText = tds[7].innerText.replace(/\n/g, ' ').trim();
            const notes = tds[8].innerText.replace(/\n/g, ' ').trim();

            const clean = (txt) => `"${(txt || '').replace(/"/g, '""')}"`;

            csvContent += [
                clean(no), clean(date), clean(codeOrLatin), clean(name), clean(codeOrLatin),
                clean(dept), clean(pos), clean(inTime), clean(inStatus), clean(outTime), clean(outStatus),
                clean(hours), clean(shiftsText), clean(''), clean(notes)
            ].join(',') + '\n';
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const from = document.getElementById('tsFromDate')?.value || 'From';
    const to = document.getElementById('tsToDate')?.value || 'To';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Timesheet_Report_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ====== PRESERVE ORIGINAL MONTHLY MATRIX REPORT ======
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

        // Group by Department
        const deptMap = {};
        employees.forEach(emp => {
            const dept = (emp.department && emp.department.trim()) ? emp.department.trim() : 'ផ្សេងៗ (Other)';
            if (!deptMap[dept]) deptMap[dept] = [];
            deptMap[dept].push(emp);
        });

        const sortedDeptNames = Object.keys(deptMap).sort((a, b) => a.localeCompare(b, 'km'));
        sortedDeptNames.forEach(dept => {
            deptMap[dept].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'km'));
        });

        // Chunk days into groups of 16
        const chunkedDays = [];
        for (let i = 0; i < daysArray.length; i += 16) {
            chunkedDays.push(daysArray.slice(i, i + 16));
        }

        let finalHtml = '';
        chunkedDays.forEach((chunk, chunkIdx) => {
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
                        
                    let totalP = 0, totalA = 0, totalL = 0;
                    const todayObj = new Date();
                    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
                    const currentHour = todayObj.getHours();
                    const empStartDate = emp.startDate || '';

                    for (let d of daysArray) {
                        if (empStartDate && d < empStartDate) {
                            continue; // Skip pre-hire dates from report totals
                        }
                        const rec = agg[emp.id] ? agg[emp.id][d] : null;
                        let m = (rec && rec.morning) ? rec.morning : '';
                        let a = (rec && rec.afternoon) ? rec.afternoon : '';

                        if (d < todayStr) {
                            if (!m) m = 'A';
                            if (!a) a = 'A';
                        } else if (d === todayStr) {
                            if (currentHour >= 12 && !m) m = 'A';
                            if (currentHour >= 18 && !a) a = 'A';
                        }
                        
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
                        const isBeforeJoin = empStartDate && (dateStr < empStartDate);

                        if (isBeforeJoin) {
                            html += `<td class="col-shift ${dayClass} border-dotted-right p-0"><div class="att-cell att-disabled" style="opacity: 0.35; cursor: not-allowed;" title="មិនទាន់ចូលធ្វើការ (ចូលធ្វើការថ្ងៃ ${empStartDate})">-</div></td>
                                     <td class="col-shift ${dayClass} day-border-right p-0"><div class="att-cell att-disabled" style="opacity: 0.35; cursor: not-allowed;" title="មិនទាន់ចូលធ្វើការ (ចូលធ្វើការថ្ងៃ ${empStartDate})">-</div></td>`;
                        } else {
                            const rec = agg[emp.id] ? agg[emp.id][dateStr] : null;
                            let mVal = (rec && rec.morning) ? rec.morning : '';
                            let aVal = (rec && rec.afternoon) ? rec.afternoon : '';

                            if (dateStr < todayStr) {
                                if (!mVal) mVal = 'A';
                                if (!aVal) aVal = 'A';
                            } else if (dateStr === todayStr) {
                                if (currentHour >= 12 && !mVal) mVal = 'A';
                                if (currentHour >= 18 && !aVal) aVal = 'A';
                            }
                            
                            let mClass = mVal ? mVal : 'none';
                            let aClass = aVal ? aVal : 'none';

                            html += `<td class="col-shift ${dayClass} border-dotted-right p-0"><div class="att-cell att-${mClass}" style="cursor: default;">${mVal}</div></td>
                                     <td class="col-shift ${dayClass} day-border-right p-0"><div class="att-cell att-${aClass}" style="cursor: default;">${aVal}</div></td>`;
                        }
                    });

                    html += `<td class="col-total col-total-p text-success fw-bold p-1">${totalP}</td>
                             <td class="col-total col-total-a text-danger fw-bold p-1">${totalA}</td>
                             <td class="col-total col-total-l text-warning fw-bold p-1">${totalL}</td>
                        </tr>`;
                    
                    tbodyHtml += html;
                });
            });

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
    await loadAttendanceReportLogo();

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
    
    setTimeout(() => {
        window.print();
    }, 250);
};

// Initial load check for logo
setTimeout(() => {
    if (typeof loadAttendanceReportLogo === 'function') {
        loadAttendanceReportLogo();
    }
}, 150);

// ====== SCAN RECORD MODAL HANDLERS (ADD / EDIT / DELETE) ======

window.loadEmployeesForScanModal = async function() {
    const select = document.getElementById('scanEmpSelect');
    if (!select) return;
    try {
        const emps = await db.employees.toArray();
        emps.sort((a, b) => {
            const deptA = (a.department || '').trim();
            const deptB = (b.department || '').trim();
            const deptCompare = deptA.localeCompare(deptB, 'km');
            if (deptCompare !== 0) return deptCompare;
            return (a.name || '').localeCompare(b.name || '', 'km');
        });
        select.innerHTML = '<option value="">-- ជ្រើសរើសបុគ្គលិក --</option>' +
            emps.map(e => `<option value="${e.id}">${e.name} ${e.latinName ? `(${e.latinName})` : ''} - ផ្នែក៖ ${e.department || 'ទូទៅ'}</option>`).join('');
    } catch (e) {
        console.error('Error loading employees for modal:', e);
    }
};

window.autoCalcModalHours = function() {
    const inVal = document.getElementById('scanCheckInInput')?.value;
    const outVal = document.getElementById('scanCheckOutInput')?.value;
    if (!inVal || !outVal) return;
    const [ih, im] = inVal.split(':').map(Number);
    const [oh, om] = outVal.split(':').map(Number);
    let span = (oh * 60 + om) - (ih * 60 + im);
    if (span <= 0) return;
    // Deduct 2h lunch if spanned across noon
    if (ih < 12 && oh > 13) span = Math.max(0, span - 120);
    const hrs = +(span / 60).toFixed(2);
    const hInput = document.getElementById('scanHoursInput');
    if (hInput && (!hInput.value || parseFloat(hInput.value) === 0)) {
        hInput.value = hrs;
    }

    const mStatus = document.getElementById('scanMorningStatus');
    const aStatus = document.getElementById('scanAfternoonStatus');
    if (mStatus && (!mStatus.value || mStatus.value === 'A') && ih < 12) {
        mStatus.value = 'P';
    }
    if (aStatus && (!aStatus.value || aStatus.value === 'A') && oh >= 13) {
        aStatus.value = 'P';
    }
};

window.openAddScanRecordModal = async function() {
    if (typeof canAddAttendance === 'function' && !canAddAttendance()) {
        Swal.fire({
            icon: 'warning',
            title: 'គ្មានសិទ្ធិ',
            text: 'អ្នកមិនមានសិទ្ធិបន្ថែមទិន្នន័យស្កែនវត្តមានទេ!',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#059669'
        });
        return;
    }

    await loadEmployeesForScanModal();

    const todayStr = new Date().toISOString().split('T')[0];
    const idEl = document.getElementById('scanRecordId');
    if (idEl) idEl.value = '';
    const titleEl = document.getElementById('scanModalTitle');
    if (titleEl) titleEl.innerHTML = '<i class="bi bi-plus-circle text-primary me-1"></i> បន្ថែមទិន្នន័យស្កែនវត្តមាន (Add Scan Record)';
    
    const empSelect = document.getElementById('scanEmpSelect');
    if (empSelect) {
        empSelect.value = '';
        empSelect.disabled = false;
    }
    
    const dateInput = document.getElementById('scanDateInput');
    if (dateInput) dateInput.value = todayStr;
    const inInput = document.getElementById('scanCheckInInput');
    if (inInput) inInput.value = '07:30';
    const outInput = document.getElementById('scanCheckOutInput');
    if (outInput) outInput.value = '17:00';
    const mSelect = document.getElementById('scanMorningStatus');
    if (mSelect) mSelect.value = 'P';
    const aSelect = document.getElementById('scanAfternoonStatus');
    if (aSelect) aSelect.value = 'P';
    const hInput = document.getElementById('scanHoursInput');
    if (hInput) hInput.value = '8.0';
    const gInput = document.getElementById('scanGpsInput');
    if (gInput) gInput.value = 'On-Site';
    const nInput = document.getElementById('scanNoteInput');
    if (nInput) nInput.value = 'បញ្ចូលដោយដៃ (Manual Entry)';

    const delBtn = document.getElementById('btnDeleteScanRecord');
    if (delBtn) delBtn.style.display = 'none';

    const modalEl = document.getElementById('editScanRecordModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
};

window.openEditAttendanceModal = async function(recordId) {
    if (typeof canEditAttendance === 'function' && !canEditAttendance()) {
        Swal.fire({
            icon: 'warning',
            title: 'គ្មានសិទ្ធិ',
            text: 'អ្នកមិនមានសិទ្ធិកែប្រែទិន្នន័យស្កែនវត្តមានទេ!',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#059669'
        });
        return;
    }

    await loadEmployeesForScanModal();

    let rec = null;
    let isSynthetic = false;

    if (String(recordId).startsWith('unscanned_')) {
        // Form: unscanned_empId_YYYY-MM-DD
        const parts = String(recordId).split('_');
        const empId = parts[1];
        const dateStr = parts[2];
        const emp = await db.employees.get(Number(empId)) || await db.employees.get(empId);
        rec = {
            id: recordId,
            empId: empId,
            empName: emp ? emp.name : '',
            date: dateStr,
            checkInTime: '',
            checkOutTime: '',
            morning: 'A',
            afternoon: 'A',
            totalHoursWorked: 0,
            note: 'អវត្តមាន (មិនបានស្កែន)'
        };
        isSynthetic = true;
    } else {
        rec = await db.attendance.get(Number(recordId));
        if (!rec) {
            Swal.fire('មិនមានទិន្នន័យ', 'រកមិនឃើញទិន្នន័យកំណត់ត្រានេះទេ!', 'error');
            return;
        }
    }

    const idEl = document.getElementById('scanRecordId');
    if (idEl) idEl.value = rec.id || '';
    const titleEl = document.getElementById('scanModalTitle');
    if (titleEl) titleEl.innerHTML = '<i class="bi bi-pencil-square text-primary me-1"></i> កែប្រែទិន្នន័យស្កែនវត្តមាន (Edit Scan Record)';
    
    const empSelect = document.getElementById('scanEmpSelect');
    if (empSelect) {
        empSelect.value = rec.empId || '';
        empSelect.disabled = false;
    }
    
    const dateInput = document.getElementById('scanDateInput');
    if (dateInput) dateInput.value = rec.date || '';
    const inInput = document.getElementById('scanCheckInInput');
    if (inInput) inInput.value = rec.checkInTime || rec.scanTimeMorning || '';
    const outInput = document.getElementById('scanCheckOutInput');
    if (outInput) outInput.value = rec.checkOutTime || rec.scanTimeAfternoonOut || '';
    const mSelect = document.getElementById('scanMorningStatus');
    if (mSelect) mSelect.value = rec.morning || (rec.checkInTime ? 'P' : 'A');
    const aSelect = document.getElementById('scanAfternoonStatus');
    if (aSelect) aSelect.value = rec.afternoon || (rec.checkOutTime ? 'P' : 'A');
    const hInput = document.getElementById('scanHoursInput');
    if (hInput) hInput.value = rec.totalHoursWorked || '';
    const gInput = document.getElementById('scanGpsInput');
    if (gInput) gInput.value = rec.gpsDistance ? `${rec.gpsDistance}m` : '';
    const nInput = document.getElementById('scanNoteInput');
    if (nInput) nInput.value = rec.note || '';

    const delBtn = document.getElementById('btnDeleteScanRecord');
    if (delBtn) {
        const canDel = typeof canDeleteAttendance === 'function' ? canDeleteAttendance() : true;
        delBtn.style.display = (!isSynthetic && canDel) ? 'block' : 'none';
    }

    const modalEl = document.getElementById('editScanRecordModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
};

window.saveScanRecordModal = async function() {
    if (typeof canEditAttendance === 'function' && !canEditAttendance()) {
        Swal.fire('គ្មានសិទ្ធិ', 'អ្នកមិនមានសិទ្ធិកែប្រែទិន្នន័យវត្តមានទេ!', 'warning');
        return;
    }

    const recId = document.getElementById('scanRecordId').value;
    const empId = document.getElementById('scanEmpSelect').value;
    const dateStr = document.getElementById('scanDateInput').value;

    if (!empId) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើសបុគ្គលិក!', 'warning');
        return;
    }
    if (!dateStr) {
        Swal.fire('បម្រាម', 'សូមជ្រើសរើសកាលបរិច្ឆេទ!', 'warning');
        return;
    }

    const checkIn = document.getElementById('scanCheckInInput').value.trim();
    const checkOut = document.getElementById('scanCheckOutInput').value.trim();
    const morning = document.getElementById('scanMorningStatus').value;
    const afternoon = document.getElementById('scanAfternoonStatus').value;
    let hours = parseFloat(document.getElementById('scanHoursInput').value) || 0;
    const gpsDistance = document.getElementById('scanGpsInput').value.trim();
    const note = document.getElementById('scanNoteInput').value.trim();

    // Auto-compute hours if 0 but in & out exist
    if (hours === 0 && checkIn && checkOut) {
        const [ih, im] = checkIn.split(':').map(Number);
        const [oh, om] = checkOut.split(':').map(Number);
        let span = (oh * 60 + om) - (ih * 60 + im);
        if (span > 0) {
            if (ih < 12 && oh > 13) span = Math.max(0, span - 120);
            hours = +(span / 60).toFixed(2);
        }
    }

    try {
        const emp = await db.employees.get(Number(empId)) || await db.employees.get(empId);
        const data = {
            date: dateStr,
            empId: Number(empId) || empId,
            empName: emp ? emp.name : '',
            checkInTime: checkIn,
            checkOutTime: checkOut,
            scanTimeMorning: (checkIn && checkIn < '12:00') ? checkIn : '',
            scanTimeMorningOut: '',
            scanTimeAfternoon: (checkIn && checkIn >= '12:00') ? checkIn : '',
            scanTimeAfternoonOut: checkOut,
            morning: morning,
            afternoon: afternoon,
            totalHoursWorked: hours,
            note: note,
            gpsDistance: gpsDistance
        };

        if (recId && !String(recId).startsWith('unscanned_')) {
            await db.attendance.update(Number(recId), data);
        } else {
            // Check if record already exists for (empId, date)
            const allAtt = await db.attendance.toArray();
            const existing = allAtt.find(r => r.date === dateStr && String(r.empId) === String(empId));
            if (existing) {
                await db.attendance.update(existing.id, data);
            } else {
                await db.attendance.add(data);
            }
        }

        const modalEl = document.getElementById('editScanRecordModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ!',
            text: 'បានរក្សាទុកទិន្នន័យស្កែនវត្តមានរួចរាល់។',
            timer: 1500,
            showConfirmButton: false
        });

        generateTimesheetReport();
        if (typeof loadAttendance === 'function' && document.getElementById('attendanceMonth')) {
            loadAttendance();
        }
    } catch (err) {
        console.error('Error saving scan record:', err);
        Swal.fire('បរាជ័យ', err.message || 'មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យស្កែន', 'error');
    }
};

window.deleteAttendanceRecord = async function(recordId) {
    if (typeof canDeleteAttendance === 'function' && !canDeleteAttendance()) {
        Swal.fire({
            icon: 'warning',
            title: 'គ្មានសិទ្ធិ',
            text: 'អ្នកមិនមានសិទ្ធិលុបទិន្នន័យស្កែនវត្តមានទេ!',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#059669'
        });
        return;
    }

    if (!recordId || String(recordId).startsWith('unscanned_')) {
        Swal.fire('ព័ត៌មាន', 'កំណត់ត្រានេះមិនទាន់មានក្នុងមូលដ្ឋានទិន្នន័យទេ (អវត្តមានស្វ័យប្រវត្តិ)', 'info');
        return;
    }

    const { isConfirmed } = await Swal.fire({
        title: 'តើអ្នកពិតជាចង់លុបទិន្នន័យស្កែននេះមែនទេ?',
        text: 'ទិន្នន័យដែលបានលុប មិនអាចត្រឡប់មកវិញបានឡើយ!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-trash"></i> បាទ/ចាស លុប',
        cancelButtonText: 'បោះបង់'
    });

    if (isConfirmed) {
        try {
            await db.attendance.delete(Number(recordId));
            
            const modalEl = document.getElementById('editScanRecordModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            Swal.fire({
                icon: 'success',
                title: 'លុបជោគជ័យ!',
                text: 'ទិន្នន័យស្កែនត្រូវបានលុបចេញពីប្រព័ន្ធ។',
                timer: 1500,
                showConfirmButton: false
            });

            generateTimesheetReport();
            if (typeof loadAttendance === 'function' && document.getElementById('attendanceMonth')) {
                loadAttendance();
            }
        } catch (err) {
            console.error('Error deleting scan record:', err);
            Swal.fire('បរាជ័យ', err.message || 'មានបញ្ហាក្នុងការលុបទិន្នន័យ', 'error');
        }
    }
};

window.deleteCurrentScanRecord = function() {
    const id = document.getElementById('scanRecordId')?.value;
    if (id) deleteAttendanceRecord(id);
};
