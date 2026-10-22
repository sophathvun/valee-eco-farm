// ====== E-FACE BIOMETRIC ATTENDANCE SCANNER ======

let efaceVideo = null;
let efaceCanvas = null;
let efaceStream = null;
let isEfaceScanning = false;
let isEfaceModelLoaded = false;
let efaceCameraFacing = 'user'; // 'user' (front) or 'environment' (back)
let efaceSoundEnabled = true;
let efaceAudioCtx = null;
let efaceMatcher = null;
let efaceEnrolledEmployees = [];
let efaceDetectionTimer = null;
let efaceClockTimer = null;
let efaceLastScanned = {}; // empId -> timestamp to prevent rapid duplicate scans
let efaceResultCardTimeout = null;
let efaceMatchBuffer = []; // Rolling buffer of { label, distance, time } for multi-frame confirmation
window._efaceCurrentThreshold = 0.40; // Default strict threshold (0.40 prevents false positives)
window._efaceGpsLocked = false;
window._efaceCurrentGpsDistance = null;
window._efaceGpsSettings = null;
let efaceGpsCheckTimer = null;
let efaceLastGpsCheckTime = 0;

const EFACE_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

// ====== INITIALIZATION ======
window.initEface = async function() {
    efaceVideo = document.getElementById('eface-video');
    efaceCanvas = document.getElementById('eface-canvas');

    // Start Live Clock
    startEfaceClock();

    // Load Branding / Logo
    loadEfaceBranding();

    // Populate stats and recent scans for today
    loadEfaceRecentScans();

    // Pre-populate manual modal employee select
    populateEfaceManualModal();

    // Check GPS Geofencing
    await checkEfaceGpsGeofence(false);
    if (efaceGpsCheckTimer) clearInterval(efaceGpsCheckTimer);
    efaceGpsCheckTimer = setInterval(() => {
        if (isEfaceScanning && window._efaceGpsSettings && window._efaceGpsSettings.enabled) {
            checkEfaceGpsGeofence(false);
        }
    }, 25000);

    // Load AI Models in background if not already loaded
    if (!isEfaceModelLoaded) {
        updateEfaceStatus('កំពុងទាញយកម៉ូដែល AI (Loading Face AI)...', 'loading');
        await loadEfaceModels();
    }

    // Auto-start scanning if camera available and user is on this view
    if (isEfaceModelLoaded && !isEfaceScanning) {
        startEfaceScanning();
    }
};

// ====== CLOCK & SHIFT TIMER ======
function startEfaceClock() {
    if (efaceClockTimer) clearInterval(efaceClockTimer);

    const updateClock = async () => {
        const timeEl = document.getElementById('eface-clock-time');
        const dateEl = document.getElementById('eface-clock-date');
        const shiftEl = document.getElementById('eface-shift-name');
        if (!timeEl || !dateEl) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        timeEl.innerText = timeStr;

        const days = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
        const dayKh = days[now.getDay()];
        const d = String(now.getDate()).padStart(2, '0');
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        dateEl.innerText = `${dayKh}, ${d}-${m}-${y}`;

        // Determine Shift
        if (shiftEl) {
            const shifts = await getEfaceWorkShifts();
            const hour = now.getHours();
            if (hour < 12) {
                shiftEl.innerText = `🌅 វេនព្រឹក (${shifts.morningIn} - ${shifts.morningOut})`;
            } else {
                shiftEl.innerText = `🌇 វេនរសៀល (${shifts.afternoonIn} - ${shifts.afternoonOut})`;
            }
        }
    };

    updateClock();
    efaceClockTimer = setInterval(updateClock, 1000);
}

async function getEfaceWorkShifts() {
    try {
        if (typeof db !== 'undefined' && db.workShifts) {
            const s = await db.workShifts.first();
            if (s) return s;
        }
    } catch (e) {}
    return { morningIn: '07:00', morningOut: '11:00', afternoonIn: '13:00', afternoonOut: '17:00' };
}

async function loadEfaceBranding() {
    try {
        if (typeof db !== 'undefined' && db.telegramSettings) {
            const t = await db.telegramSettings.first();
            if (t && t.farmName) window.efaceCampusName = t.farmName;
        }
    } catch(e){}
    try {
        const logoEl = document.getElementById('eface-logo');
        if (logoEl && typeof db !== 'undefined' && db.brandSettings) {
            const brand = await db.brandSettings.first();
            if (brand && (brand.sidebarLogo || brand.loginLogo)) {
                logoEl.src = brand.sidebarLogo || brand.loginLogo;
            }
        }
    } catch (e) {}
}

// ====== AUDIO FEEDBACK (WEB AUDIO API CHIMES) ======
function initEfaceAudio() {
    if (!efaceAudioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            efaceAudioCtx = new AudioContextClass();
        }
    }
    if (efaceAudioCtx && efaceAudioCtx.state === 'suspended') {
        efaceAudioCtx.resume();
    }
}

function playEfaceSuccessChime() {
    if (!efaceSoundEnabled) return;
    try {
        initEfaceAudio();
        if (!efaceAudioCtx) return;

        const now = efaceAudioCtx.currentTime;

        // Note 1: A5 (880 Hz)
        const osc1 = efaceAudioCtx.createOscillator();
        const gain1 = efaceAudioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.01, now);
        gain1.gain.exponentialRampToValueAtTime(0.3, now + 0.03);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc1.connect(gain1);
        gain1.connect(efaceAudioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.2);

        // Note 2: E6 (1318.5 Hz) harmonic resonance
        const osc2 = efaceAudioCtx.createOscillator();
        const gain2 = efaceAudioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.5, now + 0.1);
        gain2.gain.setValueAtTime(0.01, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.13);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
        osc2.connect(gain2);
        gain2.connect(efaceAudioCtx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.6);
    } catch (e) {
        console.warn('Audio chime error:', e);
    }
}

function playEfaceNoticeSound() {
    if (!efaceSoundEnabled) return;
    try {
        initEfaceAudio();
        if (!efaceAudioCtx) return;
        const now = efaceAudioCtx.currentTime;
        const osc = efaceAudioCtx.createOscillator();
        const gain = efaceAudioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(efaceAudioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.26);
    } catch (e) {}
}

window.toggleEfaceSound = function() {
    efaceSoundEnabled = !efaceSoundEnabled;
    const icon = document.getElementById('eface-sound-icon');
    if (icon) {
        icon.className = efaceSoundEnabled ? 'bi bi-volume-up fs-6' : 'bi bi-volume-mute fs-6 text-danger';
    }
    if (efaceSoundEnabled) initEfaceAudio();
};

window.toggleEfaceKioskMode = function() {
    document.body.classList.toggle('eface-kiosk-mode');
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    } else {
        document.documentElement.requestFullscreen().catch(() => {});
    }
};

window.toggleEfaceCameraFacing = async function() {
    efaceCameraFacing = (efaceCameraFacing === 'user') ? 'environment' : 'user';
    if (isEfaceScanning) {
        stopEfaceScanning();
        await startEfaceScanning();
    }
};

// ====== FACE-API MODELS & MATCHER ======
async function loadEfaceModels() {
    try {
        if (typeof faceapi === 'undefined') {
            throw new Error('face-api.js library not loaded yet!');
        }

        updateEfaceStatus('កំពុងទាញយកម៉ូដែល AI ស្គាល់ផ្ទៃមុខ...', 'loading');

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(EFACE_MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(EFACE_MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(EFACE_MODEL_URL)
        ]);

        isEfaceModelLoaded = true;
        updateEfaceStatus('ម៉ូដែល AI ត្រៀមរួចរាល់។ កំពុងផ្ទុកទិន្នន័យបុគ្គលិក...', 'ready');

        // Build Face Matcher from registered employees
        await buildEfaceMatcher();

        updateEfaceStatus('ប្រព័ន្ធត្រៀមរួចរាល់! សូមឈរមុខកាមេរ៉ា', 'ready');
    } catch (err) {
        console.error('Failed to load Face-API models:', err);
        updateEfaceStatus('បរាជ័យក្នុងការផ្ទុក AI: ' + err.message, 'error');
    }
}

// Build Face Matcher from db.employees
window.buildEfaceMatcher = async function() {
    try {
        if (typeof db === 'undefined' || !db.employees) return;
        const employees = await db.employees.toArray();
        efaceEnrolledEmployees = employees;

        // Fetch configured security threshold (default 0.40 - strict)
        let threshold = 0.40;
        try {
            if (db.telegramSettings) {
                const s = await db.telegramSettings.first();
                if (s && s.faceMatchThreshold) {
                    threshold = parseFloat(s.faceMatchThreshold) || 0.40;
                }
            }
        } catch (e) {}
        window._efaceCurrentThreshold = threshold;

        const labeledDescriptors = [];
        let autoEnrolledCount = 0;

        for (const emp of employees) {
            // Check if employee has explicitly stored valid faceDescriptor (128 float numbers)
            if (emp.faceDescriptor && Array.isArray(emp.faceDescriptor) && emp.faceDescriptor.length === 128 && !emp.faceDescriptor.some(isNaN)) {
                const descriptorFloat32 = new Float32Array(emp.faceDescriptor);
                labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(String(emp.id), [descriptorFloat32]));
            } else if (emp.photo && emp.photo.startsWith('data:image') && !emp.photo.includes('default-avatar.svg')) {
                // Auto-enroll from existing base64 photo ONLY if high quality frontal face with score >= 0.85
                try {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.src = emp.photo;
                    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

                    if (img.naturalWidth >= 120 && img.naturalHeight >= 120) {
                        const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.75 }))
                            .withFaceLandmarks()
                            .withFaceDescriptor();

                        if (detection && detection.detection && detection.detection.score >= 0.85 && detection.descriptor) {
                            labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(String(emp.id), [detection.descriptor]));
                            // Cache valid descriptor in Firestore so next startup is immediate
                            db.employees.update(emp.id, { faceDescriptor: Array.from(detection.descriptor) }).catch(() => {});
                            autoEnrolledCount++;
                        }
                    }
                } catch (imgErr) {
                    // ignore photo decode errors
                }
            }
        }

        if (labeledDescriptors.length > 0) {
            efaceMatcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
            console.log(`E-Face matcher ready with ${labeledDescriptors.length} enrolled employees (Threshold: ${threshold}, Auto-enrolled: ${autoEnrolledCount}).`);
        } else {
            efaceMatcher = null;
            console.warn('E-Face: No employees with registered face descriptors or clear profile photos found.');
        }
    } catch (err) {
        console.error('Error building face matcher:', err);
    }
};

// ====== CAMERA & SCANNING CONTROL ======
window.toggleEfaceScanning = function() {
    if (isEfaceScanning) {
        stopEfaceScanning();
    } else {
        startEfaceScanning();
    }
};

window.startEfaceScanning = async function() {
    initEfaceAudio();

    if (!isEfaceModelLoaded) {
        await loadEfaceModels();
    }

    if (!efaceVideo) {
        efaceVideo = document.getElementById('eface-video');
        efaceCanvas = document.getElementById('eface-canvas');
    }
    if (!efaceVideo) return;

    try {
        const constraints = {
            video: {
                facingMode: efaceCameraFacing,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        efaceStream = await navigator.mediaDevices.getUserMedia(constraints);
        efaceVideo.srcObject = efaceStream;

        // Handle mirror orientation
        if (efaceCameraFacing === 'environment') {
            efaceVideo.classList.add('no-mirror');
            if (efaceCanvas) efaceCanvas.classList.add('no-mirror');
        } else {
            efaceVideo.classList.remove('no-mirror');
            if (efaceCanvas) efaceCanvas.classList.remove('no-mirror');
        }

        await new Promise(resolve => {
            efaceVideo.onloadedmetadata = () => {
                efaceVideo.play();
                resolve();
            };
        });

        isEfaceScanning = true;
        efaceMatchBuffer = [];
        updateToggleButton(true);
        updateEfaceStatus('កំពុងរង់ចាំការចាប់ផ្ទៃមុខ...', 'ready');

        // Start continuous face detection loop
        runEfaceDetectionLoop();
    } catch (err) {
        console.error('Camera access error:', err);
        isEfaceScanning = false;
        updateToggleButton(false);
        let errorMsg = 'មិនអាចបើកកាមេរ៉ាបានទេ!';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            errorMsg = 'សូមអនុញ្ញាត (Allow) សិទ្ធិប្រើកាមេរ៉ាលើ Browser!';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            errorMsg = 'រកមិនឃើញឧបករណ៍កាមេរ៉ាលើម៉ាស៊ីននេះទេ!';
        }
        updateEfaceStatus(errorMsg, 'error');
        Swal.fire({
            icon: 'warning',
            title: 'បញ្ហាកាមេរ៉ា',
            text: errorMsg,
            confirmButtonText: 'យល់ព្រម'
        });
    }
};

window.stopEfaceScanning = function() {
    isEfaceScanning = false;
    efaceMatchBuffer = [];
    if (efaceDetectionTimer) {
        clearTimeout(efaceDetectionTimer);
        efaceDetectionTimer = null;
    }
    if (efaceStream) {
        efaceStream.getTracks().forEach(track => track.stop());
        efaceStream = null;
    }
    if (efaceVideo) {
        efaceVideo.srcObject = null;
    }
    if (efaceCanvas) {
        const ctx = efaceCanvas.getContext('2d');
        ctx.clearRect(0, 0, efaceCanvas.width, efaceCanvas.height);
    }
    const guide = document.getElementById('eface-guide');
    if (guide) guide.classList.remove('active');
    updateToggleButton(false);
    updateEfaceStatus('ការស្កែនត្រូវបានផ្អាក', 'paused');
};

function updateToggleButton(active) {
    const btn = document.getElementById('btn-eface-toggle');
    const icon = document.getElementById('eface-toggle-icon');
    const text = document.getElementById('eface-toggle-text');
    if (!btn || !icon || !text) return;

    if (active) {
        btn.classList.remove('btn-eface-primary');
        btn.classList.add('btn-danger');
        icon.className = 'bi bi-stop-circle-fill fs-5';
        text.innerText = 'បញ្ឈប់ (Stop)';
    } else {
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-eface-primary');
        icon.className = 'bi bi-play-circle-fill fs-5';
        text.innerText = 'ចាប់ផ្តើមស្កេន (Start)';
    }
}

function updateEfaceStatus(message, state) {
    const textEl = document.getElementById('eface-status-text');
    const dotEl = document.getElementById('eface-status-dot');
    const viewportWrap = document.getElementById('eface-viewport-wrap');
    if (!textEl) return;

    textEl.innerText = message;

    if (dotEl) {
        if (state === 'matched') {
            dotEl.style.backgroundColor = 'var(--eface-neon-green)';
            dotEl.style.boxShadow = '0 0 12px var(--eface-neon-green)';
        } else if (state === 'error' || state === 'paused') {
            dotEl.style.backgroundColor = 'var(--eface-neon-red)';
            dotEl.style.boxShadow = '0 0 12px var(--eface-neon-red)';
        } else if (state === 'loading') {
            dotEl.style.backgroundColor = 'var(--eface-neon-amber)';
            dotEl.style.boxShadow = '0 0 12px var(--eface-neon-amber)';
        } else if (state === 'warning') {
            dotEl.style.backgroundColor = 'var(--eface-neon-amber)';
            dotEl.style.boxShadow = '0 0 12px var(--eface-neon-amber)';
        } else {
            dotEl.style.backgroundColor = 'var(--eface-neon-cyan)';
            dotEl.style.boxShadow = '0 0 12px var(--eface-neon-cyan)';
        }
    }

    if (viewportWrap) {
        viewportWrap.classList.remove('state-matched', 'state-warning');
        if (state === 'matched') viewportWrap.classList.add('state-matched');
        if (state === 'warning') viewportWrap.classList.add('state-warning');
    }
}

// ====== CONTINUOUS DETECTION LOOP WITH MULTI-FRAME CONFIRMATION ======
async function runEfaceDetectionLoop() {
    if (!isEfaceScanning || !efaceVideo || efaceVideo.paused || efaceVideo.ended) {
        return;
    }
    if (window._efaceGpsLocked) {
        if (efaceCanvas) {
            const ctx = efaceCanvas.getContext('2d');
            ctx.clearRect(0, 0, efaceCanvas.width, efaceCanvas.height);
        }
        const guide = document.getElementById('eface-guide');
        if (guide) guide.classList.remove('active');
        efaceMatchBuffer = [];
        if (isEfaceScanning) {
            efaceDetectionTimer = setTimeout(runEfaceDetectionLoop, 1000);
        }
        return;
    }

    try {
        if (efaceVideo.readyState === 4 && efaceVideo.videoWidth > 0) {
            // Match canvas dimensions to video
            if (efaceCanvas.width !== efaceVideo.videoWidth || efaceCanvas.height !== efaceVideo.videoHeight) {
                efaceCanvas.width = efaceVideo.videoWidth;
                efaceCanvas.height = efaceVideo.videoHeight;
            }

            // Run Face Detection with 68 Landmarks
            const detection = await faceapi.detectSingleFace(
                efaceVideo,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.55 })
            ).withFaceLandmarks().withFaceDescriptor();

            const ctx = efaceCanvas.getContext('2d');
            ctx.clearRect(0, 0, efaceCanvas.width, efaceCanvas.height);
            const guide = document.getElementById('eface-guide');

            if (detection) {
                if (guide) guide.classList.add('active');

                const box = detection.detection.box;
                drawBiometricBoundingBox(ctx, box);

                // Check Face Size: Face must be sufficiently close to camera (at least 100x100px)
                if (box.width < 100 || box.height < 100) {
                    efaceMatchBuffer = [];
                    updateEfaceStatus('សូមខិតចូលជិតកាមេរ៉ាបន្តិច (Please move closer)', 'warning');
                } else if (efaceMatcher && detection.descriptor) {
                    const threshold = window._efaceCurrentThreshold || 0.40;
                    const match = efaceMatcher.findBestMatch(detection.descriptor);
                    const distance = match.distance;

                    // Strictly check threshold <= 0.40
                    if (match.label !== 'unknown' && distance <= threshold) {
                        const now = Date.now();
                        efaceMatchBuffer.push({ label: match.label, distance: distance, time: now });

                        // Filter to keep only recent frames within 1200ms matching this same employee
                        efaceMatchBuffer = efaceMatchBuffer.filter(m => (now - m.time) < 1200 && m.label === match.label);
                        const count = efaceMatchBuffer.length;

                        // Require at least 3 matching frames of the SAME employee
                        if (count >= 3) {
                            const emp = efaceEnrolledEmployees.find(e => String(e.id) === String(match.label));
                            efaceMatchBuffer = [];
                            if (emp) {
                                await handleEfaceMatch(emp, detection);
                            }
                        } else {
                            const similarity = Math.round(Math.max(0, (1 - distance / 0.55)) * 100);
                            updateEfaceStatus(`កំពុងផ្ទៀងផ្ទាត់... (${count}/3) [ស្រដៀង ${similarity}%]`, 'loading');
                        }
                    } else {
                        // Reset buffer when face does not match any registered employee
                        efaceMatchBuffer = [];
                        const distStr = distance ? distance.toFixed(2) : '--';
                        updateEfaceStatus(`មិនស្គាល់អត្តសញ្ញាណ (Unregistered Face: ${distStr})`, 'warning');
                    }
                } else {
                    efaceMatchBuffer = [];
                    updateEfaceStatus('មិនទាន់មានទិន្នន័យផ្ទៃមុខបុគ្គលិកក្នុងប្រព័ន្ធ', 'warning');
                }
            } else {
                efaceMatchBuffer = [];
                if (guide) guide.classList.remove('active');
                updateEfaceStatus('កំពុងស្វែងរកផ្ទៃមុខ...', 'ready');
            }
        }
    } catch (loopErr) {
        console.warn('Detection loop notice:', loopErr);
    }

    // Schedule next frame with 200ms cadence (smooth & responsive)
    if (isEfaceScanning) {
        efaceDetectionTimer = setTimeout(runEfaceDetectionLoop, 200);
    }
}

// Draw stylish high-tech brackets around detected face
function drawBiometricBoundingBox(ctx, box) {
    const x = box.x;
    const y = box.y;
    const w = box.width;
    const h = box.height;
    const r = Math.min(20, w * 0.15);
    const corner = Math.min(25, w * 0.2);

    ctx.save();
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 12;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x, y + corner);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + corner, y);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + w - corner, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + corner);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x, y + h - corner);
    ctx.lineTo(x, y + h - r);
    ctx.quadraticCurveTo(x, y + h, x + r, y + h);
    ctx.lineTo(x + corner, y + h);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + w - corner, y + h);
    ctx.lineTo(x + w - r, y + h);
    ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    ctx.lineTo(x + w, y + h - corner);
    ctx.stroke();

    ctx.restore();
}

// ====== ATTENDANCE RECORDING & TELEGRAM DISPATCH ======
async function handleEfaceMatch(emp, detection) {
    if (window._efaceGpsLocked) return;
    const now = new Date();
    const nowMs = now.getTime();

    // Anti-spam cooldown (ignore multiple detections within 60s for same employee)
    if (efaceLastScanned[emp.id] && (nowMs - efaceLastScanned[emp.id]) < 60000) {
        return;
    }
    efaceLastScanned[emp.id] = nowMs;

    // Visual & Sound Feedback
    playEfaceSuccessChime();
    updateEfaceStatus(`ស្គាល់អត្តសញ្ញាណ: ${emp.name}`, 'matched');

    const shifts = await getEfaceWorkShifts();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    const hour = now.getHours();
    const min = now.getMinutes();
    const currentMinFromMidnight = hour * 60 + min;

    let shift = 'morning';
    let shiftKh = 'វេនព្រឹក (Morning)';
    let shiftTargetTime = shifts.morningIn || '07:00';

    if (hour >= 12) {
        shift = 'afternoon';
        shiftKh = 'វេនរសៀល (Afternoon)';
        shiftTargetTime = shifts.afternoonIn || '13:00';
    }

    const [tHour, tMin] = shiftTargetTime.split(':').map(n => parseInt(n, 10));
    const targetMinFromMidnight = tHour * 60 + tMin;

    // Grace period of 5 minutes
    let isLate = false;
    let lateMins = 0;
    if (currentMinFromMidnight > (targetMinFromMidnight + 5)) {
        isLate = true;
        lateMins = currentMinFromMidnight - targetMinFromMidnight;
    }

    const attStatus = isLate ? 'L' : 'P';

    // Save/Update in db.attendance
    try {
        const allAtt = await db.attendance.toArray();
        const existing = allAtt.find(r => r.date === dateStr && String(r.empId) === String(emp.id));

        if (existing) {
            const updateData = {};
            if (shift === 'morning') {
                updateData.morning = attStatus;
                updateData.scanTimeMorning = timeStr;
            } else {
                updateData.afternoon = attStatus;
                updateData.scanTimeAfternoon = timeStr;
            }
            if (isLate) {
                updateData.note = (existing.note ? existing.note + '; ' : '') + `Late ${lateMins}m (${shift})`;
            }
            await db.attendance.update(existing.id, updateData);
        } else {
            const newRecord = {
                date: dateStr,
                empId: emp.id,
                empName: emp.name,
                morning: shift === 'morning' ? attStatus : '',
                afternoon: shift === 'afternoon' ? attStatus : '',
                scanTimeMorning: shift === 'morning' ? timeStr : '',
                scanTimeAfternoon: shift === 'afternoon' ? timeStr : '',
                note: isLate ? `Late ${lateMins}m (${shift})` : 'On-Time'
            };
            await db.attendance.add(newRecord);
        }
    } catch (dbErr) {
        console.error('Error saving attendance:', dbErr);
    }

    // Capture live photo snapshot from video for Telegram alert & display
    let snapshotBlob = null;
    try {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = efaceVideo.videoWidth || 640;
        snapCanvas.height = efaceVideo.videoHeight || 480;
        const snapCtx = snapCanvas.getContext('2d');
        if (efaceCameraFacing === 'user') {
            snapCtx.translate(snapCanvas.width, 0);
            snapCtx.scale(-1, 1);
        }
        snapCtx.drawImage(efaceVideo, 0, 0, snapCanvas.width, snapCanvas.height);
        snapshotBlob = await new Promise(resolve => snapCanvas.toBlob(resolve, 'image/jpeg', 0.85));
    } catch (snapErr) {
        console.warn('Snapshot capture notice:', snapErr);
    }

    // Dispatch Telegram Alert
    dispatchEfaceTelegramAlert(emp, shiftKh, timeStr, dateStr, isLate, lateMins, snapshotBlob);

    // Show Result Card
    displayEfaceResultCard(emp, timeStr, shiftKh, isLate, lateMins);

    // Refresh Recent Scans List & Stats
    loadEfaceRecentScans();
}

// ====== HELPER: CONVERT BASE64 DATA URL TO BLOB ======
function dataUrlToBlob(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes(',')) return null;
    try {
        const parts = dataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.warn('dataUrlToBlob error:', e);
        return null;
    }
}

// ====== TELEGRAM DISPATCHER ======
async function dispatchEfaceTelegramAlert(emp, shiftKh, timeStr, dateStr, isLate, lateMins, snapshotBlob) {
    try {
        let tSettings = {};
        if (typeof db !== 'undefined' && db.telegramSettings) {
            try {
                tSettings = (await db.telegramSettings.first()) || {};
            } catch (e) {
                console.warn('Could not read telegramSettings:', e);
            }
        }
        
        const botToken = (tSettings.botToken && tSettings.botToken.trim()) || '8823338803:AAF8xrTeSo4Up7u5R9L1absAIK-GU-n4_eQ';
        const chatId = (tSettings.chatId && tSettings.chatId.trim()) || '-5344695591';
        
        // Only skip if explicitly set to false
        if (tSettings.enabled === false) {
            console.log('Telegram attendance alert is disabled in settings.');
            return;
        }

        const statusText = isLate ? `Late (${lateMins} mins)` : 'On-Time (0 mins)';
        let gpsInfo = '';
        if (window._efaceGpsSettings && window._efaceGpsSettings.enabled && window._efaceCurrentGpsDistance !== null) {
            gpsInfo = `\n▫️ <b>GPS:</b> ក្នុងបរិវេណ (${window._efaceCurrentGpsDistance}m / កាំ: ${window._efaceGpsSettings.radiusMeters || 200}m)`;
        }

        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };

        const empNameSafe = escapeHtml(emp.name);
        const empLatinSafe = emp.latinName ? ` (${escapeHtml(emp.latinName)})` : '';
        const empCodeSafe = escapeHtml(emp.code || emp.id);
        const deptSafe = escapeHtml(emp.department || 'General');
        const posSafe = escapeHtml(emp.position || 'Staff');

        // Format Date as DD-Mon-YYYY (e.g. 22-Oct-2026)
        let dateFormatted = dateStr;
        try {
            const dateObj = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
            if (!isNaN(dateObj.getTime())) {
                const day = String(dateObj.getDate()).padStart(2, '0');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const month = months[dateObj.getMonth()];
                const year = dateObj.getFullYear();
                dateFormatted = `${day}-${month}-${year}`;
            }
        } catch (e) {}

        // Compact sleek icons & removed footer line
        const caption =
`🟢 <b>E-FACE ATTENDANCE: CHECK-IN</b>
━━━━━━━━━━━━━━━━━
▫️ <b>Name:</b> ${empNameSafe}${empLatinSafe}
▫️ <b>ID:</b> ${empCodeSafe}
▫️ <b>Department:</b> ${deptSafe}
▫️ <b>Position:</b> ${posSafe}
▫️ <b>Time:</b> ${timeStr} (${shiftKh.split(' ')[0]})
▫️ <b>Date:</b> ${dateFormatted}
▫️ <b>Status:</b> ${statusText}${gpsInfo}`;

        // If no snapshot from live camera, fallback to employee's registered photo
        if (!snapshotBlob && emp.photo) {
            snapshotBlob = dataUrlToBlob(emp.photo);
        }

        const sendTextFallback = () => {
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: caption,
                    parse_mode: 'HTML'
                })
            }).then(r => r.json()).then(res => {
                if (res.ok) {
                    console.log('Telegram text alert sent successfully');
                } else {
                    console.warn('Telegram sendMessage error:', res.description);
                }
            }).catch(err => console.warn('Telegram network error:', err));
        };

        // Try sending photo first if available, otherwise fallback to text alert
        if (snapshotBlob) {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', snapshotBlob, `attendance_${emp.id}_${Date.now()}.jpg`);
            formData.append('caption', caption);
            formData.append('parse_mode', 'HTML');

            fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                method: 'POST',
                body: formData
            }).then(r => r.json()).then(res => {
                if (res.ok) {
                    console.log('Telegram photo alert sent successfully');
                } else {
                    console.warn('Telegram sendPhoto failed, retrying with text alert:', res.description);
                    sendTextFallback();
                }
            }).catch(err => {
                console.warn('Telegram photo network error, falling back to text:', err);
                sendTextFallback();
            });
        } else {
            sendTextFallback();
        }
    } catch (e) {
        console.warn('Telegram dispatcher notice:', e);
    }
}

// ====== DISPLAY RESULT CARD ======
function displayEfaceResultCard(emp, timeStr, shiftKh, isLate, lateMins) {
    const card = document.getElementById('eface-result-card');
    if (!card) return;

    // Fill Card Data
    const avatarEl = document.getElementById('eface-res-avatar');
    const nameEl = document.getElementById('eface-res-name');
    const subnameEl = document.getElementById('eface-res-subname');
    const badgeEl = document.getElementById('eface-res-badge');
    const idEl = document.getElementById('eface-res-id');
    const campusEl = document.getElementById('eface-res-campus');
    const deptEl = document.getElementById('eface-res-dept');
    const posEl = document.getElementById('eface-res-position');
    const shiftEl = document.getElementById('eface-res-shift');
    const progressEl = document.getElementById('eface-countdown-progress');

    if (avatarEl) avatarEl.src = emp.photo || 'assets/images/default-avatar.svg';
    if (nameEl) nameEl.innerText = emp.latinName ? emp.latinName.toUpperCase() : emp.name;
    if (subnameEl) subnameEl.innerText = emp.latinName ? emp.name : '';
    if (idEl) idEl.innerText = emp.code || `EMP-${emp.id}`;
    if (campusEl) campusEl.innerText = window.efaceCampusName || 'VALEE ECO FARM';
    if (deptEl) deptEl.innerText = emp.department || 'Operations';
    if (posEl) posEl.innerText = emp.position || 'Staff';
    if (shiftEl) shiftEl.innerText = shiftKh;

    if (badgeEl) {
        if (isLate) {
            badgeEl.className = 'badge bg-warning bg-opacity-25 text-warning border border-warning px-3 py-2 rounded-pill';
            badgeEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> បានបំពេញ (${timeStr}) - Late: ${lateMins}m`;
        } else {
            badgeEl.className = 'badge bg-success bg-opacity-25 text-success border border-success px-3 py-2 rounded-pill';
            badgeEl.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> បានបំពេញរួចរាល់ (${timeStr})`;
        }
    }

    // Show Card with animation
    card.classList.add('show');

    // Trigger Countdown Bar
    if (progressEl) {
        progressEl.style.transition = 'none';
        progressEl.style.width = '100%';
        setTimeout(() => {
            progressEl.style.transition = 'width 3.5s linear';
            progressEl.style.width = '0%';
        }, 50);
    }

    if (efaceResultCardTimeout) clearTimeout(efaceResultCardTimeout);
    efaceResultCardTimeout = setTimeout(() => {
        card.classList.remove('show');
    }, 3800);
}

// ====== RECENT SCANS & STATS ======
window.loadEfaceRecentScans = async function() {
    try {
        if (typeof db === 'undefined' || !db.attendance) return;

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const allAtt = await db.attendance.toArray();
        const todayRecords = allAtt.filter(r => r.date === dateStr);

        let total = 0;
        let ontime = 0;
        let late = 0;

        todayRecords.forEach(r => {
            const hasMorning = r.morning === 'P' || r.morning === 'L';
            const hasAfternoon = r.afternoon === 'P' || r.afternoon === 'L';
            if (hasMorning || hasAfternoon) total++;
            if (r.morning === 'L' || r.afternoon === 'L') late++;
            else if (r.morning === 'P' || r.afternoon === 'P') ontime++;
        });

        const totalEl = document.getElementById('eface-stat-total');
        const ontimeEl = document.getElementById('eface-stat-ontime');
        const lateEl = document.getElementById('eface-stat-late');
        if (totalEl) totalEl.innerText = total;
        if (ontimeEl) ontimeEl.innerText = ontime;
        if (lateEl) lateEl.innerText = late;

        // Render Recent Scans List
        const listEl = document.getElementById('eface-recent-list');
        if (!listEl) return;

        if (todayRecords.length === 0) {
            listEl.innerHTML = '<div class="text-center py-3 text-muted small">មិនទាន់មានការស្កែននៅថ្ងៃនេះនៅឡើយទេ</div>';
            return;
        }

        const employees = await db.employees.toArray();
        const empMap = {};
        employees.forEach(e => { empMap[e.id] = e; });

        // Sort descending
        todayRecords.reverse();
        const recent = todayRecords.slice(0, 5);

        let html = '';
        recent.forEach(r => {
            const emp = empMap[r.empId] || { name: r.empName, photo: 'assets/images/default-avatar.svg' };
            const time = r.scanTimeAfternoon || r.scanTimeMorning || '--:--';
            const isL = (r.morning === 'L' || r.afternoon === 'L');

            html += `
            <div class="eface-recent-item">
                <div class="d-flex align-items-center">
                    <img src="${emp.photo || 'assets/images/default-avatar.svg'}" onerror="this.src='assets/images/default-avatar.svg'" class="rounded-circle me-2 border border-secondary" style="width: 32px; height: 32px; object-fit: cover;">
                    <div>
                        <div class="fw-bold text-white small">${emp.name}</div>
                        <div class="text-muted" style="font-size: 0.7rem;">${emp.code || ''} • ${emp.position || ''}</div>
                    </div>
                </div>
                <div class="text-end">
                    <span class="badge ${isL ? 'bg-warning text-dark' : 'bg-success'} px-2 py-1" style="font-size: 0.72rem;">${time}</span>
                    <div style="font-size: 0.65rem; color: #94a3b8;">${isL ? 'យឺត (Late)' : 'ទាន់ពេល'}</div>
                </div>
            </div>`;
        });
        listEl.innerHTML = html;
    } catch (e) {
        console.error('Error loading recent scans:', e);
    }
};

// ====== MANUAL CHECK-IN MODAL ======
async function populateEfaceManualModal() {
    try {
        const select = document.getElementById('eface-manual-emp-select');
        if (!select || typeof db === 'undefined' || !db.employees) return;

        const employees = await db.employees.toArray();
        employees.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'km'));

        select.innerHTML = '<option value="">-- ជ្រើសរើសបុគ្គលិក --</option>';
        employees.forEach(emp => {
            select.innerHTML += `<option value="${emp.id}">${emp.code ? '[' + emp.code + '] ' : ''}${emp.name} ${emp.latinName ? '(' + emp.latinName + ')' : ''} - ${emp.position || ''}</option>`;
        });
    } catch (e) {}
}

window.openEfaceManualModal = async function() {
    await populateEfaceManualModal();
    const modalEl = document.getElementById('efaceManualModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        m.show();
    }
};

window.submitEfaceManualCheckIn = async function() {
    if (window._efaceGpsLocked) {
        Swal.fire({
            icon: 'error',
            title: 'ក្រៅបរិវេណកសិដ្ឋាន (Out of Range)',
            text: 'លោកអ្នកកំពុងស្ថិតនៅក្រៅបរិវេណកសិដ្ឋាន មិនអាចកត់ត្រាវត្តមានបានឡើយ!',
            confirmButtonColor: '#dc3545'
        });
        return;
    }
    const select = document.getElementById('eface-manual-emp-select');
    const shiftSelect = document.getElementById('eface-manual-shift-select');
    const noteInput = document.getElementById('eface-manual-note');
    if (!select || !select.value) {
        Swal.fire('ខ្វះទិន្នន័យ', 'សូមជ្រើសរើសបុគ្គលិក!', 'warning');
        return;
    }

    const empId = select.value;
    const emp = await db.employees.get(empId);
    if (!emp) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB');
    const dateStr = now.toISOString().split('T')[0];

    let shift = shiftSelect.value;
    if (shift === 'auto') {
        shift = (now.getHours() < 12) ? 'morning' : 'afternoon';
    }

    const note = (noteInput ? noteInput.value.trim() : '') || 'Manual Check-in';

    try {
        const allAtt = await db.attendance.toArray();
        const existing = allAtt.find(r => r.date === dateStr && String(r.empId) === String(emp.id));

        if (existing) {
            const updateData = { note: (existing.note ? existing.note + '; ' : '') + note };
            if (shift === 'morning') {
                updateData.morning = 'P';
                updateData.scanTimeMorning = timeStr;
            } else {
                updateData.afternoon = 'P';
                updateData.scanTimeAfternoon = timeStr;
            }
            await db.attendance.update(existing.id, updateData);
        } else {
            await db.attendance.add({
                date: dateStr,
                empId: emp.id,
                empName: emp.name,
                morning: shift === 'morning' ? 'P' : '',
                afternoon: shift === 'afternoon' ? 'P' : '',
                scanTimeMorning: shift === 'morning' ? timeStr : '',
                scanTimeAfternoon: shift === 'afternoon' ? timeStr : '',
                note: note
            });
        }

        // Close Modal
        const modalEl = document.getElementById('efaceManualModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            const m = bootstrap.Modal.getInstance(modalEl);
            if (m) m.hide();
        }

        playEfaceSuccessChime();
        displayEfaceResultCard(emp, timeStr, shift === 'morning' ? 'វេនព្រឹក (Morning)' : 'វេនរសៀល (Afternoon)', false, 0);
        loadEfaceRecentScans();

        // Dispatch Telegram
        const manualBlob = emp.photo ? dataUrlToBlob(emp.photo) : null;
        dispatchEfaceTelegramAlert(emp, shift === 'morning' ? 'វេនព្រឹក' : 'វេនរសៀល', timeStr, dateStr, false, 0, manualBlob);

        Swal.fire({
            icon: 'success',
            title: 'ជោគជ័យ',
            text: `បានកត់ត្រាវត្តមានសម្រាប់ ${emp.name} រួចរាល់!`,
            timer: 1600,
            showConfirmButton: false
        });
    } catch (err) {
        Swal.fire('បរាជ័យ', err.message || 'មិនអាចកត់ត្រាបានទេ', 'error');
    }
};

// ====== EMPLOYEE MODAL BIOMETRIC ENROLLMENT INTEGRATION ======
window.enrollEmployeeFaceFromForm = async function() {
    const preview = document.getElementById('emp-photo-preview');
    if (!preview || !preview.src || preview.src.includes('default-avatar.svg')) {
        Swal.fire({
            icon: 'warning',
            title: 'គ្មានរូបថត',
            text: 'សូមបញ្ចូលរូបថតបុគ្គលិកជាមុនសិន ទើបអាចចុះឈ្មោះផ្ទៃមុខ E-Face បាន!',
            confirmButtonText: 'យល់ព្រម'
        });
        return;
    }

    if (!isEfaceModelLoaded) {
        Swal.fire({
            title: 'កំពុងផ្ទុកម៉ូដែល AI...',
            text: 'សូមរង់ចាំបន្តិច',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });
        await loadEfaceModels();
        Swal.close();
    }

    try {
        Swal.fire({
            title: 'កំពុងវិភាគផ្ទៃមុខ...',
            text: 'AI កំពុងបង្កើតកូដ Biometric 128-Point...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = preview.src;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

        const detection = await faceapi.detectSingleFace(
            img,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.70 })
        ).withFaceLandmarks().withFaceDescriptor();

        if (!detection || !detection.descriptor) {
            throw new Error('AI រកមិនឃើញផ្ទៃមុខច្បាស់លាស់ក្នុងរូបថតនេះទេ! សូមប្រើរូបថតដែលចំពីមុខ និងមានពន្លឺគ្រប់គ្រាន់។');
        }

        // Store descriptor temporarily on preview element
        preview.dataset.faceDescriptor = JSON.stringify(Array.from(detection.descriptor));

        Swal.fire({
            icon: 'success',
            title: 'ចុះឈ្មោះជោគជ័យ!',
            text: 'ផ្ទៃមុខបុគ្គលិកត្រូវបានវិភាគ និងចុះឈ្មោះ E-Face Biometrics រួចរាល់។ សូមចុច «រក្សាទុក» បុគ្គលិកដើម្បីបញ្ចប់។',
            confirmButtonColor: '#10b981'
        });

        const badge = document.getElementById('emp-eface-status-badge');
        if (badge) {
            badge.className = 'badge bg-success bg-opacity-25 text-success border border-success px-2 py-1';
            badge.innerHTML = '<i class="bi bi-shield-check me-1"></i> បានចុះឈ្មោះផ្ទៃមុខរួច';
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'មិនអាចចុះឈ្មោះបានទេ',
            text: err.message || err,
            confirmButtonColor: '#ef4444'
        });
    }
};

// ====== GPS GEOFENCING VALIDATION ======
function calculateGpsDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const toRad = deg => deg * (Math.PI / 180);
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

window.checkEfaceGpsGeofence = async function(force = false) {
    try {
        if (typeof db === 'undefined' || !db.gpsSettings) return true;
        const gps = await db.gpsSettings.first();
        window._efaceGpsSettings = gps;

        const badge = document.getElementById('eface-gps-badge');
        const badgeText = document.getElementById('eface-gps-badge-text');
        const badgeIcon = document.getElementById('eface-gps-badge-icon');
        const overlay = document.getElementById('eface-gps-lock-overlay');
        const lockTitle = document.getElementById('eface-gps-lock-title');
        const lockDesc = document.getElementById('eface-gps-lock-desc');
        const distText = document.getElementById('eface-gps-distance-text');
        const radiusText = document.getElementById('eface-gps-radius-text');

        // If GPS is disabled in settings
        if (!gps || !gps.enabled || !gps.latitude || !gps.longitude) {
            window._efaceGpsLocked = false;
            if (overlay) overlay.style.display = 'none';
            if (badge) badge.style.display = 'none';
            return true;
        }

        // GPS Geofence is active
        if (badge) badge.style.display = 'inline-flex';
        if (badgeText) badgeText.innerText = 'កំពុងពិនិត្យ GPS...';

        const farmLat = parseFloat(gps.latitude);
        const farmLng = parseFloat(gps.longitude);
        const allowedRadius = parseInt(gps.radiusMeters || '200', 10);
        if (radiusText) radiusText.innerText = `${allowedRadius} ម៉ែត្រ`;

        // Check navigator support
        if (!navigator.geolocation) {
            window._efaceGpsLocked = true;
            if (overlay) overlay.style.display = 'flex';
            if (lockTitle) lockTitle.innerText = '⚠️ មិនគាំទ្រ GPS';
            if (lockDesc) lockDesc.innerText = 'ឧបករណ៍ ឬកម្មវិធីរុករក (Browser) មិនគាំទ្រប្រព័ន្ធកំណត់ទីតាំង GPS ឡើយ។';
            if (distText) distText.innerText = 'N/A';
            if (badge) {
                badge.className = 'badge border px-2 py-2 rounded-3 d-flex align-items-center gap-1 gps-invalid';
                if (badgeIcon) badgeIcon.className = 'bi bi-geo-alt-fill text-danger';
                if (badgeText) badgeText.innerText = 'GPS មិនគាំទ្រ';
            }
            return false;
        }

        // Cache valid for 30 seconds unless forced
        const now = Date.now();
        if (!force && (now - efaceLastGpsCheckTime) < 30000 && window._efaceCurrentGpsDistance !== null) {
            return !window._efaceGpsLocked;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    efaceLastGpsCheckTime = Date.now();
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    const distance = calculateGpsDistance(userLat, userLng, farmLat, farmLng);
                    window._efaceCurrentGpsDistance = distance;

                    const distStr = distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${distance} ម៉ែត្រ`;
                    if (distText) distText.innerText = distStr;

                    if (distance <= allowedRadius) {
                        // In Range -> Allowed
                        window._efaceGpsLocked = false;
                        if (overlay) overlay.style.display = 'none';
                        if (badge) {
                            badge.className = 'badge border px-2 py-2 rounded-3 d-flex align-items-center gap-1 gps-valid';
                            if (badgeIcon) badgeIcon.className = 'bi bi-geo-alt-fill text-success';
                            if (badgeText) badgeText.innerText = `GPS: ${distance}m (ក្នុងកាំ)`;
                        }
                        resolve(true);
                    } else {
                        // Out of Range -> Blocked
                        window._efaceGpsLocked = true;
                        if (overlay) overlay.style.display = 'flex';
                        if (lockTitle) lockTitle.innerText = '⛔ នៅក្រៅបរិវេណកសិដ្ឋាន';
                        if (lockDesc) {
                            lockDesc.innerHTML = `លោកអ្នកកំពុងស្ថិតនៅចម្ងាយ <strong class="text-danger">${distStr}</strong> ពីកសិដ្ឋាន (លើសកាំអនុញ្ញាត ${allowedRadius}m)។ ប្រព័ន្ធមិនអនុញ្ញាតឱ្យស្កែនវត្តមាននៅក្រៅកសិដ្ឋានដាច់ខាត។`;
                        }
                        if (badge) {
                            badge.className = 'badge border px-2 py-2 rounded-3 d-flex align-items-center gap-1 gps-invalid';
                            if (badgeIcon) badgeIcon.className = 'bi bi-geo-alt-fill text-danger';
                            if (badgeText) badgeText.innerText = `GPS: ${distStr} (ក្រៅកាំ)`;
                        }
                        resolve(false);
                    }
                },
                (error) => {
                    window._efaceGpsLocked = true;
                    if (overlay) overlay.style.display = 'flex';
                    let errText = 'សូមបើក Location Service / GPS លើទូរស័ព្ទ ឬ Tablet របស់អ្នក ដើម្បីផ្ទៀងផ្ទាត់វត្តមាន។';
                    if (error.code === 1) {
                        errText = 'លោកអ្នកបានបដិសេធសិទ្ធិចូលប្រើ GPS (Permission Denied)។ សូមបើកសិទ្ធិ Location ក្នុង Browser Setting ដើម្បីបន្ត។';
                    }
                    if (lockTitle) lockTitle.innerText = '⚠️ សូមបើក GPS (Location Required)';
                    if (lockDesc) lockDesc.innerText = errText;
                    if (distText) distText.innerText = 'មិនអាចទាញយក';
                    if (badge) {
                        badge.className = 'badge border px-2 py-2 rounded-3 d-flex align-items-center gap-1 gps-invalid';
                        if (badgeIcon) badgeIcon.className = 'bi bi-geo-alt-fill text-danger';
                        if (badgeText) badgeText.innerText = 'GPS បិទ (Off)';
                    }
                    resolve(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    } catch (err) {
        console.error('Error checking GPS geofence:', err);
        return true;
    }
};

window.recheckEfaceGps = async function(force = true) {
    const btn = document.getElementById('btn-recheck-gps');
    const oldHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> កំពុងពិនិត្យ...';
        btn.disabled = true;
    }
    const ok = await window.checkEfaceGpsGeofence(force);
    if (btn) {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
    if (ok) {
        Swal.fire({
            icon: 'success',
            title: 'ទីតាំងត្រឹមត្រូវ!',
            text: 'អ្នកស្ថិតក្នុងបរិវេណកសិដ្ឋានហើយ។ អាចស្កែនមុខបាន!',
            timer: 1500,
            showConfirmButton: false
        });
    }
};
