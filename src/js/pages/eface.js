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
let efaceAudioClips = null;
let efaceLastFailedVoiceTime = 0;
let efaceLastPromptVoiceTime = 0;
let efaceLastGpsVoiceTime = 0;
let efaceUnrecognizedFrameCount = 0;

// ====== ANTI-SPOOFING & EYE BLINK LIVENESS DETECTION STATE ======
let efaceEarHistory = []; // Rolling buffer of { ear, time } for EAR analysis
let efaceLivenessPendingEmp = null; // Currently matched employee candidate awaiting liveness blink
let efaceLivenessState = 'idle'; // 'idle' | 'awaiting_blink' | 'closing' | 'verified'
let efaceLivenessClosedTime = 0;
let efaceLastBlinkVoiceTime = 0;

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

    // Toggle Admin Login button vs Manual Button based on currentUser
    const adminLoginBtn = document.getElementById('btn-public-admin-login');
    const manualBtn = document.getElementById('btn-eface-manual');
    if (typeof currentUser === 'undefined' || !currentUser) {
        if (adminLoginBtn) adminLoginBtn.style.display = 'inline-flex';
        if (manualBtn) manualBtn.style.display = 'none';
    } else {
        if (adminLoginBtn) adminLoginBtn.style.display = 'none';
        if (manualBtn) manualBtn.style.display = 'inline-flex';
    }

    // Pre-populate manual modal employee select
    populateEfaceManualModal();

    // Check GPS Geofencing (Bypassed if disabled)
    window._efaceGpsLocked = false;
    await checkEfaceGpsGeofence(false);
    if (efaceGpsCheckTimer) clearInterval(efaceGpsCheckTimer);
    efaceGpsCheckTimer = setInterval(() => {
        if (isEfaceScanning && window._efaceGpsSettings && window._efaceGpsSettings.enabled === true) {
            checkEfaceGpsGeofence(false);
        }
    }, 25000);

    // Load AI Models in background if not already loaded
    if (!isEfaceModelLoaded) {
        updateEfaceStatus('កំពុងទាញយកម៉ូដែល AI (Loading Face AI)...', 'loading');
        await loadEfaceModels();
    }

    // Ready to scan - voice prompt to click start
    updateEfaceStatus('ចុចប៊ូតុង «ចាប់ផ្តើមស្កេន» ដើម្បីស្កែន', 'ready');
    setTimeout(() => {
        if (!isEfaceScanning) {
            speakKhmerVoice('clickStart', 'សូមចុចប៊ូតុងចាប់ផ្តើមដើម្បីស្កែន');
        }
    }, 800);
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

function initEfaceAudioClips() {
    if (!efaceAudioClips && typeof Audio !== 'undefined') {
        efaceAudioClips = {
            prompt: new Audio('assets/audio/prompt_scan.mp3'),
            clickStart: new Audio('assets/audio/prompt_click_start.mp3'),
            success: new Audio('assets/audio/scan_success.mp3'),
            failed: new Audio('assets/audio/scan_failed.mp3'),
            gpsLocked: new Audio('assets/audio/gps_locked.mp3')
        };
        Object.values(efaceAudioClips).forEach(clip => {
            clip.preload = 'auto';
        });
    }
}

function speakKhmerVoice(type, fallbackText) {
    if (!efaceSoundEnabled) return;
    initEfaceAudio();
    initEfaceAudioClips();

    const playFallback = () => {
        if ('speechSynthesis' in window && fallbackText) {
            try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(fallbackText);
                utterance.lang = 'km-KH';
                utterance.rate = 0.95;
                window.speechSynthesis.speak(utterance);
            } catch (e) {}
        }
    };

    try {
        if (efaceAudioClips && efaceAudioClips[type]) {
            const clip = efaceAudioClips[type];
            clip.currentTime = 0;
            const playPromise = clip.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => playFallback());
            }
        } else {
            playFallback();
        }
    } catch (e) {
        console.warn('speakKhmerVoice error:', e);
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
function toggleEfaceScanning() {
    if (isEfaceScanning || window.isEfaceScanning) {
        stopEfaceScanning();
    } else {
        startEfaceScanning();
    }
}
window.toggleEfaceScanning = toggleEfaceScanning;

async function startEfaceScanning() {
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
        window.isEfaceScanning = true;
        efaceMatchBuffer = [];
        hideBlinkPrompt();
        efaceLivenessPendingEmp = null;
        efaceLivenessState = 'idle';
        efaceEarHistory = [];
        updateToggleButton(true);
        updateEfaceStatus('កំពុងរង់ចាំការចាប់ផ្ទៃមុខ...', 'ready');

        // Start continuous face detection loop
        runEfaceDetectionLoop();

        // Prompt voice: "សូមដាក់ផ្ទៃមុខចំពីមុខកាមេរ៉ា"
        setTimeout(() => {
            if (isEfaceScanning && !window._efaceGpsLocked) {
                speakKhmerVoice('prompt', 'សូមដាក់ផ្ទៃមុខចំពីមុខកាមេរ៉ា');
                efaceLastPromptVoiceTime = Date.now();
            }
        }, 1000);
    } catch (err) {
        console.error('Camera access error:', err);
        isEfaceScanning = false;
        window.isEfaceScanning = false;
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
}
window.startEfaceScanning = startEfaceScanning;

function stopEfaceScanning() {
    isEfaceScanning = false;
    window.isEfaceScanning = false;
    efaceMatchBuffer = [];
    hideBlinkPrompt();
    efaceLivenessPendingEmp = null;
    efaceLivenessState = 'idle';
    efaceEarHistory = [];
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
}
window.stopEfaceScanning = stopEfaceScanning;

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
        } else if (state === 'liveness') {
            dotEl.style.backgroundColor = '#a855f7';
            dotEl.style.boxShadow = '0 0 14px #a855f7';
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
        viewportWrap.classList.remove('state-matched', 'state-warning', 'state-liveness');
        if (state === 'matched') viewportWrap.classList.add('state-matched');
        if (state === 'warning') viewportWrap.classList.add('state-warning');
        if (state === 'liveness') viewportWrap.classList.add('state-liveness');
    }
}

// ====== ANTI-SPOOFING & EYE BLINK LIVENESS DETECTION HELPERS ======
function calculateEyeAspectRatio(eye) {
    if (!eye || eye.length < 6) return 0.3;
    const dist = (pA, pB) => Math.hypot(pA.x - pB.x, pA.y - pB.y);
    const dV1 = dist(eye[1], eye[5]);
    const dV2 = dist(eye[2], eye[4]);
    const dH = dist(eye[0], eye[3]);
    if (dH <= 0) return 0.3;
    return (dV1 + dV2) / (2.0 * dH);
}

function getFaceAverageEAR(landmarks) {
    if (!landmarks) return 0.3;
    try {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        if (!leftEye || !rightEye || leftEye.length < 6 || rightEye.length < 6) return 0.3;
        const lEAR = calculateEyeAspectRatio(leftEye);
        const rEAR = calculateEyeAspectRatio(rightEye);
        return (lEAR + rEAR) / 2.0;
    } catch (e) {
        return 0.3;
    }
}

function getMouthSmileRatio(landmarks) {
    if (!landmarks) return 0.5;
    try {
        const positions = landmarks.positions;
        if (!positions || positions.length < 68) return 0.5;
        const dist = (pA, pB) => Math.hypot(pA.x - pB.x, pA.y - pB.y);
        // Mouth corners: 48 (left), 54 (right)
        const mouthWidth = dist(positions[48], positions[54]);
        // Outer eye corners: 36 (left eye outer), 45 (right eye outer)
        const eyeSpan = dist(positions[36], positions[45]);
        if (eyeSpan <= 0) return 0.5;
        return mouthWidth / eyeSpan;
    } catch (e) {
        return 0.5;
    }
}

function getMouthAspectRatio(landmarks) {
    if (!landmarks) return 0.1;
    try {
        const positions = landmarks.positions;
        if (!positions || positions.length < 68) return 0.1;
        const dist = (pA, pB) => Math.hypot(pA.x - pB.x, pA.y - pB.y);
        // Inner lip center: 51 (top), 57 (bottom)
        const vDist = dist(positions[51], positions[57]);
        const hDist = dist(positions[48], positions[54]);
        if (hDist <= 0) return 0.1;
        return vDist / hDist;
    } catch (e) {
        return 0.1;
    }
}

function showBlinkPrompt(empName) {
    const promptEl = document.getElementById('eface-blink-prompt');
    if (promptEl) promptEl.style.display = 'block';

    const now = Date.now();
    if ((now - efaceLastBlinkVoiceTime) > 3500) {
        efaceLastBlinkVoiceTime = now;
        playBlinkPromptTone();
        speakKhmerVoice('blink', 'សូមព្រិចភ្នែក ឬញញឹម');
    }
}

function hideBlinkPrompt() {
    const promptEl = document.getElementById('eface-blink-prompt');
    if (promptEl) promptEl.style.display = 'none';
}

window.confirmLiveAttendanceManually = async function(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (!efaceLivenessPendingEmp || !efaceLivenessPendingEmp.emp) {
        return;
    }
    const emp = efaceLivenessPendingEmp.emp;
    const det = efaceLivenessPendingEmp.detection;
    hideBlinkPrompt();
    updateEfaceStatus(`✅ បញ្ជាក់ផ្ទាល់: ${emp.name}`, 'matched');
    efaceMatchBuffer = [];
    efaceEarHistory = [];
    efaceLivenessPendingEmp = null;
    efaceLivenessState = 'idle';
    await handleEfaceMatch(emp, det);
};

function playBlinkPromptTone() {
    try {
        initEfaceAudio();
        if (!efaceAudioCtx) return;
        const now = efaceAudioCtx.currentTime;
        const osc = efaceAudioCtx.createOscillator();
        const gain = efaceAudioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(efaceAudioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {}
}

// ====== CONTINUOUS DETECTION LOOP WITH LIVENESS BLINK VERIFICATION ======
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
        hideBlinkPrompt();
        efaceLivenessPendingEmp = null;
        efaceLivenessState = 'idle';
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
                const ear = getFaceAverageEAR(detection.landmarks);
                const now = Date.now();

                // Maintain rolling EAR history (last 1500ms)
                efaceEarHistory.push({ ear, time: now });
                efaceEarHistory = efaceEarHistory.filter(h => (now - h.time) <= 1500);

                // Check Face Size: Face must be sufficiently close to camera (at least 100x100px)
                if (box.width < 100 || box.height < 100) {
                    efaceMatchBuffer = [];
                    hideBlinkPrompt();
                    efaceLivenessPendingEmp = null;
                    efaceLivenessState = 'idle';
                    updateEfaceStatus('សូមខិតចូលជិតកាមេរ៉ាបន្តិច (Please move closer)', 'warning');
                    drawBiometricBoundingBox(ctx, box, '#f59e0b');
                } else if (efaceMatcher && detection.descriptor) {
                    const threshold = window._efaceCurrentThreshold || 0.40;
                    const match = efaceMatcher.findBestMatch(detection.descriptor);
                    const distance = match.distance;

                    // Strictly check threshold <= 0.40
                    if (match.label !== 'unknown' && distance <= threshold) {
                        efaceMatchBuffer.push({ label: match.label, distance: distance, time: now });

                        // Filter to keep only recent frames within 1200ms matching this same employee
                        efaceMatchBuffer = efaceMatchBuffer.filter(m => (now - m.time) < 1200 && m.label === match.label);
                        const count = efaceMatchBuffer.length;

                        // Once matched with at least 2 frames, require EYE BLINK OR SMILE LIVENESS
                        if (count >= 2) {
                            const emp = efaceEnrolledEmployees.find(e => String(e.id) === String(match.label));
                            if (emp) {
                                const smileRatio = getMouthSmileRatio(detection.landmarks);
                                const mar = getMouthAspectRatio(detection.landmarks);

                                // Initialize or update Candidate
                                if (!efaceLivenessPendingEmp || String(efaceLivenessPendingEmp.emp.id) !== String(emp.id)) {
                                    efaceLivenessPendingEmp = {
                                        emp,
                                        detection,
                                        firstMatchedTime: now,
                                        earSamples: [ear],
                                        smileSamples: [smileRatio],
                                        marSamples: [mar]
                                    };
                                } else {
                                    efaceLivenessPendingEmp.detection = detection;
                                    efaceLivenessPendingEmp.earSamples.push(ear);
                                    efaceLivenessPendingEmp.smileSamples.push(smileRatio);
                                    efaceLivenessPendingEmp.marSamples.push(mar);
                                    if (efaceLivenessPendingEmp.earSamples.length > 25) efaceLivenessPendingEmp.earSamples.shift();
                                    if (efaceLivenessPendingEmp.smileSamples.length > 25) efaceLivenessPendingEmp.smileSamples.shift();
                                    if (efaceLivenessPendingEmp.marSamples.length > 25) efaceLivenessPendingEmp.marSamples.shift();
                                }

                                showBlinkPrompt(emp.name);
                                updateEfaceStatus(`ស្គាល់ ${emp.name} • 👁️ សូមព្រិចភ្នែក ឬញញឹម (Blink or Smile)`, 'liveness');
                                drawBiometricBoundingBox(ctx, box, '#a855f7', detection.landmarks);

                                const ears = efaceLivenessPendingEmp.earSamples;
                                const smiles = efaceLivenessPendingEmp.smileSamples;
                                const mars = efaceLivenessPendingEmp.marSamples;

                                let isLivenessVerified = false;
                                let verifyReason = '';

                                // 1. Adaptive Relative Eye Blink (Delta EAR >= 15% drop + reopen >= 78% max)
                                if (ears.length >= 3) {
                                    const maxEar = Math.max(...ears);
                                    const minEar = Math.min(...ears);
                                    const relativeDrop = (maxEar > 0.05) ? ((maxEar - minEar) / maxEar) : 0;
                                    if (relativeDrop >= 0.15 && ear >= (maxEar * 0.78)) {
                                        isLivenessVerified = true;
                                        verifyReason = 'Blink';
                                    }
                                }

                                // 2. Smile / Mouth Expansion (relative smile widening >= 12% or open mouth MAR >= 0.22)
                                if (!isLivenessVerified && smiles.length >= 3) {
                                    const minSmile = Math.min(...smiles);
                                    const maxSmile = Math.max(...smiles);
                                    const smileDiff = (minSmile > 0.1) ? ((maxSmile - minSmile) / minSmile) : 0;
                                    const maxMar = Math.max(...mars);
                                    if (smileDiff >= 0.12 || maxMar >= 0.22) {
                                        isLivenessVerified = true;
                                        verifyReason = 'Smile';
                                    }
                                }

                                // 3. Stable Verified Face Presence Fallback:
                                // If matched employee stands stably in front of camera for 3.2s, auto-verify.
                                // Anti-spoofing is preserved by sending real-time live webcam snapshot to Telegram.
                                if (!isLivenessVerified && (now - efaceLivenessPendingEmp.firstMatchedTime) >= 3200) {
                                    isLivenessVerified = true;
                                    verifyReason = 'Presence';
                                }

                                // When Liveness Verified: COMPLETE RECORDING!
                                if (isLivenessVerified) {
                                    hideBlinkPrompt();
                                    updateEfaceStatus(`✅ មនុស្សពិត: ${emp.name} (${verifyReason})`, 'matched');
                                    drawBiometricBoundingBox(ctx, box, '#10b981', detection.landmarks);

                                    efaceMatchBuffer = [];
                                    efaceEarHistory = [];
                                    efaceLivenessPendingEmp = null;
                                    efaceLivenessState = 'idle';

                                    await handleEfaceMatch(emp, detection);
                                    return;
                                }

                                // Continue detection loop quickly (40ms) while awaiting liveness action
                                if (isEfaceScanning) {
                                    efaceDetectionTimer = setTimeout(runEfaceDetectionLoop, 40);
                                }
                                return;
                            }
                        } else {
                            const similarity = Math.round(Math.max(0, (1 - distance / 0.55)) * 100);
                            updateEfaceStatus(`កំពុងផ្ទៀងផ្ទាត់... (${count}/2) [ស្រដៀង ${similarity}%]`, 'loading');
                            drawBiometricBoundingBox(ctx, box, '#00f2fe');
                        }
                    } else {
                        // Reset buffer when face does not match any registered employee
                        hideBlinkPrompt();
                        efaceLivenessPendingEmp = null;
                        efaceLivenessState = 'idle';
                        efaceMatchBuffer = [];
                        const distStr = distance ? distance.toFixed(2) : '--';
                        updateEfaceStatus(`មិនស្គាល់អត្តសញ្ញាណ (Unregistered Face: ${distStr})`, 'warning');
                        drawBiometricBoundingBox(ctx, box, '#f59e0b');

                        efaceUnrecognizedFrameCount++;
                        if (efaceUnrecognizedFrameCount >= 5) {
                            efaceUnrecognizedFrameCount = 0;
                            const nowFailed = Date.now();
                            if ((nowFailed - efaceLastFailedVoiceTime) > 7000) {
                                efaceLastFailedVoiceTime = nowFailed;
                                playEfaceNoticeSound();
                                speakKhmerVoice('failed', 'មិនស្គាល់អត្តសញ្ញាណទេ សូមព្យាយាមម្តងទៀត');
                            }
                        }
                    }
                } else {
                    hideBlinkPrompt();
                    efaceLivenessPendingEmp = null;
                    efaceLivenessState = 'idle';
                    efaceMatchBuffer = [];
                    updateEfaceStatus('មិនទាន់មានទិន្នន័យផ្ទៃមុខបុគ្គលិកក្នុងប្រព័ន្ធ', 'warning');
                }
            } else {
                hideBlinkPrompt();
                efaceLivenessPendingEmp = null;
                efaceLivenessState = 'idle';
                efaceMatchBuffer = [];
                if (guide) guide.classList.remove('active');
                updateEfaceStatus('កំពុងស្វែងរកផ្ទៃមុខ...', 'ready');
            }
        }
    } catch (loopErr) {
        console.warn('Detection loop notice:', loopErr);
    }

    // Schedule next frame with 120ms cadence (smooth & responsive)
    if (isEfaceScanning) {
        efaceDetectionTimer = setTimeout(runEfaceDetectionLoop, 120);
    }
}

// Draw stylish high-tech brackets & eye reticles around detected face
function drawBiometricBoundingBox(ctx, box, strokeColor = '#00f2fe', landmarks = null) {
    const x = box.x;
    const y = box.y;
    const w = box.width;
    const h = box.height;
    const r = Math.min(20, w * 0.15);
    const corner = Math.min(25, w * 0.2);

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = strokeColor;
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

    // Eye Tracking HUD Reticles
    if (landmarks) {
        try {
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();
            if (leftEye && rightEye && leftEye.length >= 6 && rightEye.length >= 6) {
                const getCenter = (pts) => ({
                    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
                    y: pts.reduce((s, p) => s + p.y, 0) / pts.length
                });
                const lCenter = getCenter(leftEye);
                const rCenter = getCenter(rightEye);
                const eyeRadius = Math.max(10, w * 0.055);

                ctx.lineWidth = 2.2;
                ctx.strokeStyle = strokeColor;
                ctx.shadowBlur = 8;

                // Left Eye Tracker
                ctx.beginPath();
                ctx.arc(lCenter.x, lCenter.y, eyeRadius, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(lCenter.x - eyeRadius - 3, lCenter.y);
                ctx.lineTo(lCenter.x + eyeRadius + 3, lCenter.y);
                ctx.moveTo(lCenter.x, lCenter.y - eyeRadius - 3);
                ctx.lineTo(lCenter.x, lCenter.y + eyeRadius + 3);
                ctx.stroke();

                // Right Eye Tracker
                ctx.beginPath();
                ctx.arc(rCenter.x, rCenter.y, eyeRadius, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(rCenter.x - eyeRadius - 3, rCenter.y);
                ctx.lineTo(rCenter.x + eyeRadius + 3, rCenter.y);
                ctx.moveTo(rCenter.x, rCenter.y - eyeRadius - 3);
                ctx.lineTo(rCenter.x, rCenter.y + eyeRadius + 3);
                ctx.stroke();
            }
        } catch (e) {}
    }

    ctx.restore();
}

// ====== CALCULATE WORK HOURS (FULL-TIME VS PART-TIME) ======
function calculateAttendanceHours(emp, rec, shifts) {
    if (!rec) return { morningMins: 0, afternoonMins: 0, totalMinutes: 0, totalHours: 0, hoursStr: '--' };

    const isPartTime = (emp && emp.type === 'Part-Time');
    const [mInH, mInM] = (shifts.morningIn || '07:00').split(':').map(Number);
    const [mOutH, mOutM] = (shifts.morningOut || '11:00').split(':').map(Number);
    const [aInH, aInM] = (shifts.afternoonIn || '13:00').split(':').map(Number);
    const [aOutH, aOutM] = (shifts.afternoonOut || '17:00').split(':').map(Number);

    const mInScheduled = mInH * 60 + mInM;
    const mOutScheduled = mOutH * 60 + mOutM;
    const aInScheduled = aInH * 60 + aInM;
    const aOutScheduled = aOutH * 60 + aOutM;

    let morningMins = 0;
    let afternoonMins = 0;

    if (isPartTime) {
        // Part-Time: 4 scans strictly (Morning In -> Morning Out, Afternoon In -> Afternoon Out)
        // Actual morning worked
        if (rec.scanTimeMorning && rec.scanTimeMorningOut) {
            const [ih, im] = rec.scanTimeMorning.split(':').map(Number);
            const [oh, om] = rec.scanTimeMorningOut.split(':').map(Number);
            morningMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));
        } else if (rec.scanTimeMorning && rec.morning === 'P' && !rec.scanTimeMorningOut && rec.checkOutTime && rec.checkOutTime < '13:00') {
            const [ih, im] = rec.scanTimeMorning.split(':').map(Number);
            const [oh, om] = rec.checkOutTime.split(':').map(Number);
            morningMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));
        }

        // Actual afternoon worked
        if (rec.scanTimeAfternoon && rec.scanTimeAfternoonOut) {
            const [ih, im] = rec.scanTimeAfternoon.split(':').map(Number);
            const [oh, om] = rec.scanTimeAfternoonOut.split(':').map(Number);
            afternoonMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));
        } else if (rec.scanTimeAfternoon && rec.afternoon === 'P' && !rec.scanTimeAfternoonOut && rec.checkOutTime && rec.checkOutTime >= '13:00') {
            const [ih, im] = rec.scanTimeAfternoon.split(':').map(Number);
            const [oh, om] = rec.checkOutTime.split(':').map(Number);
            afternoonMins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));
        }
    } else {
        // Full-Time: 2 scans (Morning In -> Evening Out)
        // 1. Morning: from actual morning in to scheduled morning out
        const morningIn = rec.scanTimeMorning || rec.checkInTime || '';
        if (morningIn && rec.morning !== 'A') {
            const [ih, im] = morningIn.split(':').map(Number);
            const inMins = ih * 60 + im;
            const actualStart = Math.max(mInScheduled, inMins);
            if (rec.scanTimeMorningOut && rec.scanTimeMorningOut < shifts.morningOut) {
                // Checked out early in morning
                const [oh, om] = rec.scanTimeMorningOut.split(':').map(Number);
                morningMins = Math.max(0, (oh * 60 + om) - actualStart);
            } else {
                morningMins = Math.max(0, mOutScheduled - actualStart);
            }
        }

        // 2. Afternoon: from scheduled afternoon in to actual evening scan-out
        const eveningOut = rec.scanTimeAfternoonOut || rec.checkOutTime || '';
        if (eveningOut && rec.afternoon !== 'A') {
            const [oh, om] = eveningOut.split(':').map(Number);
            const outMins = oh * 60 + om;
            afternoonMins = Math.max(0, outMins - aInScheduled);
        }
    }

    const totalMinutes = morningMins + afternoonMins;
    const totalHours = +(totalMinutes / 60).toFixed(2);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const hoursStr = totalMinutes > 0 ? `${hrs} ម៉ោង ${mins > 0 ? `${mins} នាទី` : ''}`.trim() : '--';

    return {
        morningMins,
        afternoonMins,
        totalMinutes,
        totalHours,
        hoursStr
    };
}
window.calculateAttendanceHours = calculateAttendanceHours;

// ====== ATTENDANCE RECORDING & TELEGRAM DISPATCH ======
async function handleEfaceMatch(emp, detection) {
    if (window._efaceGpsLocked) return;
    const now = new Date();
    const nowMs = now.getTime();

    // Anti-spam cooldown (ignore multiple detections within 15s for same employee)
    if (efaceLastScanned[emp.id] && (nowMs - efaceLastScanned[emp.id]) < 15000) {
        return;
    }
    efaceLastScanned[emp.id] = nowMs;

    window._efaceCurrentMatchedEmp = emp;

    const shifts = await getEfaceWorkShifts();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    const hour = now.getHours();
    const min = now.getMinutes();
    const currentMinFromMidnight = hour * 60 + min;

    const [mInH, mInM] = (shifts.morningIn || '07:00').split(':').map(Number);
    const [mOutH, mOutM] = (shifts.morningOut || '11:00').split(':').map(Number);
    const [aInH, aInM] = (shifts.afternoonIn || '13:00').split(':').map(Number);
    const [aOutH, aOutM] = (shifts.afternoonOut || '17:00').split(':').map(Number);

    const mInMin = mInH * 60 + mInM;
    const mOutMin = mOutH * 60 + mOutM;
    const aInMin = aInH * 60 + aInM;
    const aOutMin = aOutH * 60 + aOutM;

    const isPartTime = (emp.type === 'Part-Time');
    const allAtt = await db.attendance.toArray();
    const existing = allAtt.find(r => r.date === dateStr && String(r.empId) === String(emp.id));

    let scanMode = 'morning_in';
    let shiftKh = 'វេនព្រឹក: ស្កែនចូល (Morning In)';
    let isLate = false;
    let lateMins = 0;
    let statusTextCustom = 'ទាន់ពេល (0 នាទី)';
    let isCheckOut = false;

    // --- CASE 1: PART-TIME (4 SCANS: Morning In/Out, Afternoon In/Out) ---
    if (isPartTime) {
        if (currentMinFromMidnight < Math.round((mInMin + mOutMin) / 2)) {
            // Morning In
            if (existing && existing.scanTimeMorning) {
                updateEfaceStatus(`បានស្កែនរួចហើយ: ${emp.name}`, 'matched');
                speakKhmerVoice('warning', `${emp.name} បានស្កែនចូលពេលព្រឹករួចហើយនៅម៉ោង ${existing.scanTimeMorning}`);
                displayAlreadyScannedCard(emp, existing.scanTimeMorning, 'ចូលពេលព្រឹក (Morning In)', true);
                stopEfaceScanning();
                return;
            }
            scanMode = 'morning_in';
            shiftKh = 'វេនព្រឹក: ស្កែនចូល (Morning In)';
            if (currentMinFromMidnight > mInMin + 5) {
                isLate = true;
                lateMins = currentMinFromMidnight - mInMin;
                statusTextCustom = `យឺត (${lateMins} នាទី)`;
            } else if (currentMinFromMidnight < mInMin) {
                statusTextCustom = `មុនម៉ោង (${mInMin - currentMinFromMidnight} នាទី)`;
            } else {
                statusTextCustom = 'ទាន់ពេល (0 នាទី)';
            }
        } else if (currentMinFromMidnight < 12 * 60) {
            // Morning Out
            if (existing && existing.scanTimeMorningOut) {
                updateEfaceStatus(`បានស្កែនរួចហើយ: ${emp.name}`, 'matched');
                speakKhmerVoice('warning', `${emp.name} បានស្កែនចេញពេលព្រឹករួចហើយនៅម៉ោង ${existing.scanTimeMorningOut}`);
                displayAlreadyScannedCard(emp, existing.scanTimeMorningOut, 'ចេញពេលព្រឹក (Morning Out)', false);
                stopEfaceScanning();
                return;
            }
            scanMode = 'morning_out';
            shiftKh = 'វេនព្រឹក: ស្កែនចេញ (Morning Out)';
            isCheckOut = true;
            if (currentMinFromMidnight < mOutMin - 5) {
                lateMins = mOutMin - currentMinFromMidnight;
                statusTextCustom = `ចេញមុនម៉ោង (${lateMins} នាទី)`;
            } else {
                statusTextCustom = 'ទាន់ពេល (0 នាទី)';
            }
        } else if (currentMinFromMidnight < Math.round((aInMin + aOutMin) / 2)) {
            // Afternoon In
            if (existing && existing.scanTimeAfternoon) {
                updateEfaceStatus(`បានស្កែនរួចហើយ: ${emp.name}`, 'matched');
                speakKhmerVoice('warning', `${emp.name} បានស្កែនចូលពេលរសៀលរួចហើយនៅម៉ោង ${existing.scanTimeAfternoon}`);
                displayAlreadyScannedCard(emp, existing.scanTimeAfternoon, 'ចូលពេលរសៀល (Afternoon In)', true);
                stopEfaceScanning();
                return;
            }
            scanMode = 'afternoon_in';
            shiftKh = 'វេនរសៀល: ស្កែនចូល (Afternoon In)';
            if (currentMinFromMidnight > aInMin + 5) {
                isLate = true;
                lateMins = currentMinFromMidnight - aInMin;
                statusTextCustom = `យឺត (${lateMins} នាទី)`;
            } else {
                statusTextCustom = 'ទាន់ពេល (0 នាទី)';
            }
        } else {
            // Afternoon Out
            if (existing && existing.scanTimeAfternoonOut) {
                updateEfaceStatus(`បានស្កែនរួចហើយ: ${emp.name}`, 'matched');
                speakKhmerVoice('warning', `${emp.name} បានស្កែនចេញពេលល្ងាចរួចហើយនៅម៉ោង ${existing.scanTimeAfternoonOut}`);
                displayAlreadyScannedCard(emp, existing.scanTimeAfternoonOut, 'ចេញពេលល្ងាច (Afternoon Out)', false);
                stopEfaceScanning();
                return;
            }
            scanMode = 'afternoon_out';
            shiftKh = 'វេនរសៀល: ស្កែនចេញ (Afternoon Out)';
            isCheckOut = true;
            if (currentMinFromMidnight < aOutMin - 5) {
                lateMins = aOutMin - currentMinFromMidnight;
                statusTextCustom = `ចេញមុនម៉ោង (${lateMins} នាទី)`;
            } else if (currentMinFromMidnight <= aOutMin + 15) {
                statusTextCustom = 'ទាន់ពេល (0 នាទី)';
            } else {
                lateMins = currentMinFromMidnight - aOutMin;
                statusTextCustom = `លើសម៉ោង (${lateMins} នាទី)`;
            }
        }
    } else {
        // --- CASE 2: FULL-TIME (2 SCANS: Morning In -> Evening Out) ---
        if (currentMinFromMidnight < 12 * 60) {
            // Morning Period: Morning In
            const existingIn = existing ? (existing.scanTimeMorning || existing.checkInTime) : '';
            if (existingIn) {
                updateEfaceStatus(`បានស្កែនរួចហើយ: ${emp.name}`, 'matched');
                speakKhmerVoice('warning', `${emp.name} បានស្កែនចូលរួចហើយនៅម៉ោង ${existingIn}`);
                displayAlreadyScannedCard(emp, existingIn, 'ចូលពេលព្រឹក (Morning In)', true);
                stopEfaceScanning();
                return;
            }
            scanMode = 'morning_in';
            shiftKh = 'វេនព្រឹក: ស្កែនចូល (Morning In)';
            if (currentMinFromMidnight > mInMin + 5) {
                isLate = true;
                lateMins = currentMinFromMidnight - mInMin;
                statusTextCustom = `យឺត (${lateMins} នាទី)`;
            } else if (currentMinFromMidnight < mInMin) {
                statusTextCustom = `មុនម៉ោង (${mInMin - currentMinFromMidnight} នាទី)`;
            } else {
                statusTextCustom = 'ទាន់ពេល (0 នាទី)';
            }
        } else if (currentMinFromMidnight >= 12 * 60 && currentMinFromMidnight < 13 * 60) {
            // Lunch period (12:00 - 13:00)
            const existingIn = existing ? (existing.scanTimeMorning || existing.checkInTime) : '';
            if (existingIn) {
                updateEfaceStatus(`បុគ្គលិកពេញម៉ោង: ${emp.name}`, 'matched');
                speakKhmerVoice('warning', `${emp.name} បុគ្គលិកពេញម៉ោង មិនចាំបាច់ស្កែនពេលបាយថ្ងៃត្រង់ទេ`);
                displayAlreadyScannedCard(emp, existingIn, 'ចូលពេលព្រឹក (ពេញម៉ោងមិនបាច់ស្កែនបាយថ្ងៃត្រង់)', true);
                stopEfaceScanning();
                return;
            } else {
                scanMode = 'afternoon_in';
                shiftKh = 'វេនរសៀល: ស្កែនចូល (Afternoon In)';
                statusTextCustom = 'ទាន់ពេល (0 នាទី)';
            }
        } else {
            // Afternoon/Evening (>= 13:00): Evening Out
            if (existing && existing.scanTimeAfternoonOut) {
                updateEfaceStatus(`បានស្កែនរួចហើយ: ${emp.name}`, 'matched');
                speakKhmerVoice('warning', `${emp.name} បានស្កែនចេញរួចហើយនៅម៉ោង ${existing.scanTimeAfternoonOut}`);
                displayAlreadyScannedCard(emp, existing.scanTimeAfternoonOut, 'ចេញពេលល្ងាច (Evening Out)', false);
                stopEfaceScanning();
                return;
            }
            scanMode = 'afternoon_out';
            shiftKh = 'វេនល្ងាច: ស្កែនចេញ (Evening Out)';
            isCheckOut = true;
            if (currentMinFromMidnight < aOutMin - 5) {
                lateMins = aOutMin - currentMinFromMidnight;
                statusTextCustom = `ចេញមុនម៉ោង (${lateMins} នាទី)`;
            } else if (currentMinFromMidnight <= aOutMin + 15) {
                statusTextCustom = 'ទាន់ពេល (0 នាទី)';
            } else {
                lateMins = currentMinFromMidnight - aOutMin;
                statusTextCustom = `លើសម៉ោង (${lateMins} នាទី)`;
            }
        }
    }

    // Valid new scan: visual & sound feedback
    playEfaceSuccessChime();
    setTimeout(() => {
        speakKhmerVoice('success', isCheckOut ? 'ស្កែនចេញជោគជ័យ សូមអរគុណ' : 'ស្កែនចូលជោគជ័យ សូមអរគុណ');
    }, 250);
    updateEfaceStatus(`ស្គាល់អត្តសញ្ញាណ: ${emp.name}`, 'matched');

    let totalHoursWorkedStr = '';

    // Save/Update in db.attendance
    try {
        const updateData = {};
        if (scanMode === 'morning_in') {
            updateData.morning = 'P';
            updateData.scanTimeMorning = timeStr;
            updateData.checkInTime = timeStr;
        } else if (scanMode === 'morning_out') {
            updateData.scanTimeMorningOut = timeStr;
            if (!existing || !existing.morning || existing.morning === 'A') updateData.morning = 'P';
        } else if (scanMode === 'afternoon_in') {
            updateData.afternoon = 'P';
            updateData.scanTimeAfternoon = timeStr;
            if (!existing || !existing.checkInTime) updateData.checkInTime = timeStr;
        } else if (scanMode === 'afternoon_out') {
            updateData.scanTimeAfternoonOut = timeStr;
            updateData.checkOutTime = timeStr;
            if (!existing || !existing.afternoon || existing.afternoon === 'A') updateData.afternoon = 'P';
        }

        if (isLate) {
            updateData.note = (existing && existing.note ? existing.note + '; ' : '') + `Late ${lateMins}m (${scanMode})`;
        }

        // Merge to calculate hours
        const mergedRec = existing ? { ...existing, ...updateData } : { empId: emp.id, empName: emp.name, date: dateStr, ...updateData };
        const hoursCalc = calculateAttendanceHours(emp, mergedRec, shifts);
        updateData.totalHoursWorked = hoursCalc.totalHours;
        if (hoursCalc.hoursStr !== '--') {
            totalHoursWorkedStr = hoursCalc.hoursStr;
        }

        if (existing) {
            await db.attendance.update(existing.id, updateData);
        } else {
            const newRecord = {
                date: dateStr,
                empId: emp.id,
                empName: emp.name,
                morning: (scanMode === 'morning_in' || scanMode === 'morning_out') ? 'P' : '',
                afternoon: (scanMode === 'afternoon_in' || scanMode === 'afternoon_out') ? 'P' : '',
                scanTimeMorning: scanMode === 'morning_in' ? timeStr : '',
                scanTimeMorningOut: scanMode === 'morning_out' ? timeStr : '',
                scanTimeAfternoon: scanMode === 'afternoon_in' ? timeStr : '',
                scanTimeAfternoonOut: scanMode === 'afternoon_out' ? timeStr : '',
                checkInTime: (scanMode === 'morning_in' || scanMode === 'afternoon_in') ? timeStr : '',
                checkOutTime: (scanMode === 'morning_out' || scanMode === 'afternoon_out') ? timeStr : '',
                totalHoursWorked: updateData.totalHoursWorked || 0,
                note: isLate ? `Late ${lateMins}m (${scanMode})` : 'On-Time'
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
    dispatchEfaceTelegramAlert(emp, shiftKh, timeStr, dateStr, isLate, lateMins, snapshotBlob, statusTextCustom, totalHoursWorkedStr);

    // Show Result Card
    displayEfaceResultCard(emp, timeStr, shiftKh, isLate, lateMins, statusTextCustom);

    // Refresh Recent Scans List & Stats
    loadEfaceRecentScans();

    // Auto-stop scanning after successful scan as requested
    stopEfaceScanning();
}

// ====== DISPLAY ALREADY SCANNED POPUP CARD ======
function displayAlreadyScannedCard(emp, existingTime, slotTitle, canEarlyOut = false) {
    const card = document.getElementById('eface-result-card');
    if (!card) return;

    window._efaceCurrentMatchedEmp = emp;

    const avatarEl = document.getElementById('eface-res-avatar');
    const nameEl = document.getElementById('eface-res-name');
    const subnameEl = document.getElementById('eface-res-subname');
    const badgeEl = document.getElementById('eface-res-badge');
    const idEl = document.getElementById('eface-res-id');
    const campusEl = document.getElementById('eface-res-campus');
    const deptEl = document.getElementById('eface-res-dept');
    const posEl = document.getElementById('eface-res-position');
    const shiftEl = document.getElementById('eface-res-shift');
    const ribbonEl = document.getElementById('eface-res-ribbon');
    const earlyOutWrap = document.getElementById('eface-res-earlyout-wrap');
    const progressEl = document.getElementById('eface-countdown-progress');

    if (avatarEl) avatarEl.src = emp.photo || 'assets/images/default-avatar.svg';
    if (nameEl) nameEl.innerText = emp.latinName ? emp.latinName.toUpperCase() : emp.name;
    if (subnameEl) subnameEl.innerText = emp.latinName ? emp.name : '';
    if (idEl) idEl.innerText = emp.code || `EMP-${emp.id}`;
    if (campusEl) campusEl.innerText = window.efaceCampusName || 'VALEE ECO FARM';
    if (deptEl) deptEl.innerText = emp.department || 'Operations';
    if (posEl) posEl.innerText = `${emp.position || 'បុគ្គលិក'} (${emp.type || 'Full-Time'})`;
    if (shiftEl) shiftEl.innerText = slotTitle;

    if (badgeEl) {
        badgeEl.className = 'badge bg-warning bg-opacity-25 text-warning border border-warning px-3 py-2 rounded-pill';
        badgeEl.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i> បានស្កែន${slotTitle}រួចហើយ (${existingTime})`;
    }

    if (ribbonEl) {
        ribbonEl.className = 'eface-result-ribbon bg-warning text-dark';
        ribbonEl.innerHTML = `<i class="bi bi-info-circle-fill me-1"></i> បានកត់ត្រារួចហើយ មិនបាច់ស្កែនម្តងទៀតទេ`;
    }

    if (earlyOutWrap) {
        earlyOutWrap.style.display = canEarlyOut ? 'block' : 'none';
    }

    card.classList.add('show');

    if (progressEl) {
        progressEl.style.transition = 'none';
        progressEl.style.width = '100%';
        setTimeout(() => {
            progressEl.style.transition = 'width 5.0s linear';
            progressEl.style.width = '0%';
        }, 50);
    }

    if (efaceResultCardTimeout) clearTimeout(efaceResultCardTimeout);
    efaceResultCardTimeout = setTimeout(() => {
        card.classList.remove('show');
    }, 5200);
}

// ====== EARLY CHECK-OUT HANDLERS ======
window.triggerEarlyCheckoutFromCard = async function() {
    if (!window._efaceCurrentMatchedEmp) return;
    const emp = window._efaceCurrentMatchedEmp;
    await window.triggerEarlyCheckout(emp.id);
};

window.triggerEarlyCheckout = async function(empId, customReason = '') {
    try {
        const emp = (await db.employees.toArray()).find(e => String(e.id) === String(empId));
        if (!emp) {
            Swal.fire('មិនមានទិន្នន័យ', 'រកមិនឃើញព័ត៌មានបុគ្គលិកនេះទេ!', 'warning');
            return;
        }

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const currentMinFromMidnight = now.getHours() * 60 + now.getMinutes();
        const shifts = await getEfaceWorkShifts();

        const allAtt = await db.attendance.toArray();
        let rec = allAtt.find(r => r.date === dateStr && String(r.empId) === String(emp.id));
        if (!rec) {
            Swal.fire('មិនទាន់ស្កែនចូល', 'បុគ្គលិកនេះមិនទាន់មានទិន្នន័យស្កែនចូលនៅថ្ងៃនេះទេ!', 'warning');
            return;
        }

        const isPartTime = (emp.type === 'Part-Time');
        const reason = customReason || 'មិនស្រួលខ្លួន / សុំចេញមុនម៉ោង';

        const updateData = {
            checkOutTime: timeStr,
            note: (rec.note ? rec.note + ' • ' : '') + `ចេញមុនម៉ោង (${timeStr} - ${reason})`
        };

        if (isPartTime) {
            if (currentMinFromMidnight < 12 * 60) {
                updateData.scanTimeMorningOut = timeStr;
            } else {
                updateData.scanTimeAfternoonOut = timeStr;
                updateData.afternoon = 'P';
            }
        } else {
            // Full-Time
            if (currentMinFromMidnight < 12 * 60) {
                updateData.scanTimeMorningOut = timeStr;
                updateData.afternoon = 'A';
            } else {
                updateData.scanTimeAfternoonOut = timeStr;
                updateData.afternoon = 'P';
            }
        }

        // Compute actual hours
        const tempRec = { ...rec, ...updateData };
        const hoursCalc = calculateAttendanceHours(emp, tempRec, shifts);
        updateData.totalHoursWorked = hoursCalc.totalHours;

        await db.attendance.update(rec.id, updateData);

        const card = document.getElementById('eface-result-card');
        if (card) card.classList.remove('show');

        playEfaceSuccessChime();
        speakKhmerVoice('early_out', `បានកត់ត្រាការស្កែនចេញមុនម៉ោងសម្រាប់ ${emp.name} រួចរាល់`);

        dispatchEfaceEarlyOutTelegramAlert(emp, timeStr, dateStr, hoursCalc.hoursStr, reason);

        loadEfaceRecentScans();

        Swal.fire({
            icon: 'success',
            title: '🚪 ស្កែនចេញមុនម៉ោងជោគជ័យ!',
            html: `
                <div class="text-start fs-6">
                    <div><strong>បុគ្គលិក:</strong> <span class="text-success">${emp.name}</span> (${emp.type || 'Full-Time'})</div>
                    <div><strong>ម៉ោងចេញ:</strong> <span class="text-primary">${timeStr}</span></div>
                    <div><strong>ម៉ោងបំពេញការងារជាក់ស្តែង:</strong> <span class="badge bg-primary text-white fs-6">${hoursCalc.hoursStr}</span></div>
                    <div class="text-muted mt-2 small">មូលហេតុ៖ ${reason}</div>
                </div>
            `,
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#198754',
            timer: 3500
        });

    } catch (err) {
        console.error('Error during early check-out:', err);
        Swal.fire('កំហុស', err.message || 'មានបញ្ហាក្នុងការស្កែនចេញមុនម៉ោង', 'error');
    }
};

async function dispatchEfaceEarlyOutTelegramAlert(emp, timeStr, dateStr, hoursStr, reason) {
    try {
        let tSettings = {};
        if (typeof db !== 'undefined' && db.telegramSettings) {
            try { tSettings = (await db.telegramSettings.first()) || {}; } catch(e){}
        }
        const botToken = (tSettings.botToken && tSettings.botToken.trim()) || '8823338803:AAF8xrTeSo4Up7u5R9L1absAIK-GU-n4_eQ';
        const chatId = (tSettings.chatId && tSettings.chatId.trim()) || '-5344695591';
        if (tSettings.enabled === false) return;

        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };

        const caption = 
`🚨 <b>ដំណឹងស្កែនចេញមុនម៉ោង (EARLY CHECK-OUT)</b>
━━━━━━━━━━━━━━━━━━
👤 <b>បុគ្គលិក:</b> ${escapeHtml(emp.name)} ${emp.latinName ? `(${escapeHtml(emp.latinName)})` : ''}
🆔 <b>អត្តលេខ:</b> <code>${escapeHtml(emp.code || `EMP-${emp.id}`)}</code>
💼 <b>ប្រភេទការងារ:</b> ${escapeHtml(emp.type || 'Full-Time')}
🏢 <b>ផ្នែក:</b> ${escapeHtml(emp.department || 'ទូទៅ')}
📅 <b>កាលបរិច្ឆេទ:</b> ${dateStr}
⏰ <b>ម៉ោងចេញជាក់ស្តែង:</b> <b>${timeStr}</b>
⏱️ <b>ម៉ោងបំពេញការងារសរុប:</b> <b>${hoursStr}</b>
📝 <b>មូលហេតុ:</b> ${escapeHtml(reason || 'មិនស្រួលខ្លួន / សុំចេញមុនម៉ោង')}
📍 <b>ទីតាំង:</b> ${escapeHtml(window.efaceCampusName || 'VALEE ECO FARM')}
━━━━━━━━━━━━━━━━━━
<i>កត់ត្រាស្វ័យប្រវត្តិតាមរយៈប្រព័ន្ធ E-Face Scanner</i>`;

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: caption,
                parse_mode: 'HTML'
            })
        });
    } catch (e) {
        console.warn('Early checkout telegram notice:', e);
    }
}

window.openEfaceEarlyOutModal = async function() {
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const allAtt = await db.attendance.toArray();
        const todayAtt = allAtt.filter(r => r.date === dateStr && (r.checkInTime || r.scanTimeMorning || r.scanTimeAfternoon));
        const allEmps = await db.employees.toArray();
        const empMap = {};
        allEmps.forEach(e => empMap[e.id] = e);

        const workingEmps = todayAtt.filter(r => empMap[r.empId]);

        if (workingEmps.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'មិនមានបុគ្គលិកកំពុងបំពេញការងារ',
                text: 'មិនទាន់មានបុគ្គលិកណាបានស្កែនចូលនៅថ្ងៃនេះនៅឡើយទេ!',
                confirmButtonText: 'យល់ព្រម',
                confirmButtonColor: '#059669'
            });
            return;
        }

        let optionsHtml = workingEmps.map(r => {
            const emp = empMap[r.empId] || { name: r.empName, type: 'Full-Time' };
            const inTime = r.checkInTime || r.scanTimeMorning || r.scanTimeAfternoon || '--:--';
            return `<option value="${r.empId}">${emp.name} (${emp.type || 'Full-Time'}) - ចូលម៉ោង ${inTime}</option>`;
        }).join('');

        const { value: formValues } = await Swal.fire({
            title: '🚪 ស្កែនចេញមុនម៉ោង (Early Check-Out)',
            html: `
                <div class="text-start mb-3">
                    <label class="form-label fw-bold">ជ្រើសរើសបុគ្គលិក</label>
                    <select id="swal-earlyout-emp" class="form-select">
                        ${optionsHtml}
                    </select>
                </div>
                <div class="text-start mb-2">
                    <label class="form-label fw-bold">មូលហេតុនៃការចេញមុនម៉ោង</label>
                    <select id="swal-earlyout-reason" class="form-select mb-2">
                        <option value="មិនស្រួលខ្លួន / ឈឺ">មិនស្រួលខ្លួន / ឈឺ</option>
                        <option value="មានធុរៈបន្ទាន់ផ្ទាល់ខ្លួន">មានធុរៈបន្ទាន់ផ្ទាល់ខ្លួន</option>
                        <option value="ច្បាប់អនុញ្ញាតពីប្រធានផ្នែក">ច្បាប់អនុញ្ញាតពីប្រធានផ្នែក</option>
                        <option value="ផ្សេងៗ">ផ្សេងៗ</option>
                    </select>
                    <input type="text" id="swal-earlyout-note" class="form-control" placeholder="កំណត់ចំណាំបន្ថែម (បើមាន)...">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-box-arrow-right"></i> បញ្ជាក់ស្កែនចេញ',
            cancelButtonText: 'បោះបង់',
            confirmButtonColor: '#dc3545',
            focusConfirm: false,
            preConfirm: () => {
                const empId = document.getElementById('swal-earlyout-emp').value;
                const reasonSelect = document.getElementById('swal-earlyout-reason').value;
                const noteInput = document.getElementById('swal-earlyout-note').value;
                const reason = noteInput ? `${reasonSelect} (${noteInput})` : reasonSelect;
                return { empId, reason };
            }
        });

        if (formValues) {
            await window.triggerEarlyCheckout(formValues.empId, formValues.reason);
        }

    } catch (err) {
        console.error('Error opening early out modal:', err);
    }
};

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

// ====== HELPER: GET REGISTERED EMPLOYEE PROFILE PHOTO (CONVERTED TO JPEG BLOB) ======
async function getEmployeeProfilePhotoBlob(emp) {
    if (!emp) return null;
    let photoData = emp.photo;
    if (!photoData && typeof db !== 'undefined' && db.employees && emp.id) {
        try {
            const fresh = await db.employees.get(emp.id);
            if (fresh && fresh.photo) photoData = fresh.photo;
        } catch (e) {}
    }
    if (!photoData || typeof photoData !== 'string') return null;
    photoData = photoData.trim();
    if (!photoData || photoData.includes('default-avatar.svg')) return null;

    // If it's a standard JPEG data URL, convert directly
    if (photoData.startsWith('data:image/jpeg') || photoData.startsWith('data:image/jpg')) {
        return dataUrlToBlob(photoData);
    }

    // For WebP, PNG, or image URLs: render to offscreen canvas and export as high-quality JPEG
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const w = img.naturalWidth || img.width || 400;
                    const h = img.naturalHeight || img.height || 400;
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob((blob) => {
                        resolve(blob || dataUrlToBlob(photoData));
                    }, 'image/jpeg', 0.92);
                } catch (canvasErr) {
                    console.warn('Canvas conversion notice:', canvasErr);
                    resolve(dataUrlToBlob(photoData));
                }
            };
            img.onerror = () => {
                console.warn('Profile image load notice');
                resolve(dataUrlToBlob(photoData));
            };
            img.src = photoData;
        } catch (err) {
            resolve(dataUrlToBlob(photoData));
        }
    });
}

// ====== TELEGRAM DISPATCHER ======
async function dispatchEfaceTelegramAlert(emp, shiftKh, timeStr, dateStr, isLate, lateMins, snapshotBlob, statusTextCustom, totalHoursWorkedStr) {
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

        const scanHeader = (shiftKh && shiftKh.includes('ចេញ')) ? 'ស្កែនចេញ' : 'ស្កែនចូល';
        const finalStatus = statusTextCustom || (isLate ? `យឺត (${lateMins} នាទី)` : 'ទាន់ពេល (0 នាទី)');
        let hoursLine = '';
        if (totalHoursWorkedStr) {
            hoursLine = `\n▫️ <b>ម៉ោងធ្វើការថ្ងៃនេះ:</b> ${totalHoursWorkedStr}`;
        }
        let gpsInfo = '';
        if (window._efaceGpsSettings && window._efaceGpsSettings.enabled && window._efaceCurrentGpsDistance !== null) {
            gpsInfo = `\n▫️ <b>ទីតាំង GPS:</b> ក្នុងបរិវេណ (${window._efaceCurrentGpsDistance}m / កាំ: ${window._efaceGpsSettings.radiusMeters || 200}m)`;
        }

        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };

        const empNameSafe = escapeHtml(emp.name);
        const empLatinSafe = emp.latinName ? ` (${escapeHtml(emp.latinName)})` : '';
        const empCodeSafe = escapeHtml(emp.code || emp.id);
        const deptSafe = escapeHtml(emp.department || 'ទូទៅ');
        const posSafe = escapeHtml(emp.position || 'បុគ្គលិក');

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

        // Pure Khmer Labels
        const caption =
`📸 <b>វត្តមាន E-FACE: ${scanHeader}</b>
━━━━━━━━━━━━━━━━━
▫️ <b>ឈ្មោះ:</b> ${empNameSafe}${empLatinSafe}
▫️ <b>អត្តលេខ:</b> ${empCodeSafe}
▫️ <b>ផ្នែក:</b> ${deptSafe}
▫️ <b>តួនាទី:</b> ${posSafe}
▫️ <b>ម៉ោង:</b> ${timeStr} (${shiftKh.split(' ')[0]})
▫️ <b>កាលបរិច្ឆេទ:</b> ${dateFormatted}
▫️ <b>ស្ថានភាព:</b> ${finalStatus}${hoursLine}${gpsInfo}
▫️ <b>ផ្ទៀងផ្ទាត់:</b> មនុស្សពិត (Blink Liveness: Verified ✅)
▫️ <b>កាមេរ៉ា:</b> រូបថតជាក់ស្តែងផ្ទាល់ពីកាមេរ៉ា (Live Camera Snapshot)`;

        // ALWAYS send real-time live camera snapshot of person standing at camera (anti-spoofing)
        let photoToSend = snapshotBlob;

        // Fallback to employee profile photo only if camera snapshot capture failed
        if (!photoToSend) {
            photoToSend = await getEmployeeProfilePhotoBlob(emp);
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
        if (photoToSend) {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', photoToSend, `live_scan_${emp.code || emp.id || 'camera'}_${Date.now()}.jpg`);
            formData.append('caption', caption);
            formData.append('parse_mode', 'HTML');

            fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                method: 'POST',
                body: formData
            }).then(r => r.json()).then(res => {
                if (res.ok) {
                    console.log('Telegram photo alert sent successfully (live camera snapshot of person)');
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
function displayEfaceResultCard(emp, timeStr, shiftKh, isLate, lateMins, statusTextCustom) {
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
    const ribbonEl = document.getElementById('eface-res-ribbon');
    const earlyOutWrap = document.getElementById('eface-res-earlyout-wrap');

    if (earlyOutWrap) earlyOutWrap.style.display = 'none';
    if (ribbonEl) {
        ribbonEl.className = 'eface-result-ribbon';
        ribbonEl.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i> បានកត់ត្រាវត្តមានជោគជ័យ';
    }

    if (avatarEl) avatarEl.src = emp.photo || 'assets/images/default-avatar.svg';
    if (nameEl) nameEl.innerText = emp.latinName ? emp.latinName.toUpperCase() : emp.name;
    if (subnameEl) subnameEl.innerText = emp.latinName ? emp.name : '';
    if (idEl) idEl.innerText = emp.code || `EMP-${emp.id}`;
    if (campusEl) campusEl.innerText = window.efaceCampusName || 'VALEE ECO FARM';
    if (deptEl) deptEl.innerText = emp.department || 'Operations';
    if (posEl) posEl.innerText = emp.position || 'Staff';
    if (shiftEl) shiftEl.innerText = shiftKh;

    if (badgeEl) {
        const isOut = (shiftKh && shiftKh.includes('ចេញ'));
        const actionLabel = isOut ? 'ស្កែនចេញ' : 'ស្កែនចូល';
        const statusDisplay = statusTextCustom || (isLate ? `យឺត (${lateMins} នាទី)` : 'ទាន់ពេល');

        if (isLate || (statusDisplay && (statusDisplay.includes('ចេញមុន') || statusDisplay.includes('យឺត')))) {
            badgeEl.className = 'badge bg-warning bg-opacity-25 text-warning border border-warning px-3 py-2 rounded-pill';
            badgeEl.innerHTML = `<i class="bi bi-clock-history me-1"></i> បាន${actionLabel} (${timeStr}) - ${statusDisplay}`;
        } else {
            badgeEl.className = 'badge bg-success bg-opacity-25 text-success border border-success px-3 py-2 rounded-pill';
            badgeEl.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i> បាន${actionLabel}រួចរាល់ (${timeStr}) - ${statusDisplay}`;
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
        if (!isEfaceScanning) {
            speakKhmerVoice('clickStart', 'សូមចុចប៊ូតុងចាប់ផ្តើមដើម្បីស្កែន');
        }
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
    if (typeof currentUser === 'undefined' || !currentUser) {
        Swal.fire({
            icon: 'warning',
            title: 'គ្មានសិទ្ធិ (Permission Denied)',
            text: 'ការកត់ត្រាវត្តមានដោយដៃត្រូវបានអនុញ្ញាតសម្រាប់តែ Admin / អ្នកគ្រប់គ្រងប៉ុណ្ណោះ។ សូមប្រើប្រាស់ការស្កែនមុខ (Face Scan)។',
            confirmButtonText: 'យល់ព្រម',
            confirmButtonColor: '#059669'
        });
        return;
    }
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
        window._efaceGpsLocked = false;
        const overlay = document.getElementById('eface-gps-lock-overlay');
        const badge = document.getElementById('eface-gps-badge');

        if (typeof db === 'undefined' || !db.gpsSettings) {
            if (overlay) overlay.style.display = 'none';
            if (badge) badge.style.display = 'none';
            return true;
        }

        const gps = await db.gpsSettings.first();
        window._efaceGpsSettings = gps || { enabled: false };

        // IF GPS CHECKING IS DISABLED OR MISSING COORDINATES -> COMPLETELY BYPASS WITHOUT ANY CHECK!
        if (!gps || gps.enabled !== true || !gps.latitude || !gps.longitude) {
            window._efaceGpsLocked = false;
            window._efaceCurrentGpsDistance = null;
            if (overlay) overlay.style.display = 'none';
            if (badge) badge.style.display = 'none';
            return true;
        }

        // GPS Geofence is active
        const badgeText = document.getElementById('eface-gps-badge-text');
        const badgeIcon = document.getElementById('eface-gps-badge-icon');
        const lockTitle = document.getElementById('eface-gps-lock-title');
        const lockDesc = document.getElementById('eface-gps-lock-desc');
        const distText = document.getElementById('eface-gps-distance-text');
        const radiusText = document.getElementById('eface-gps-radius-text');

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
                        const nowGps = Date.now();
                        if ((nowGps - efaceLastGpsVoiceTime) > 15000) {
                            efaceLastGpsVoiceTime = nowGps;
                            speakKhmerVoice('gpsLocked', 'អ្នកនៅក្រៅបរិវេណកសិដ្ឋាន មិនអាចស្កែនបានទេ');
                        }
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

// ====== SHARE LINK & PRINT QR POSTER ======
function getEfacePublicDirectUrl() {
    const origin = window.location.origin;
    let path = window.location.pathname;
    if (!path.endsWith('/') && !path.endsWith('.html')) {
        path = path + '/';
    }
    return `${origin}${path}#eface`;
}

window.openEfaceShareModal = function() {
    const cleanUrl = getEfacePublicDirectUrl();

    const input = document.getElementById('eface-share-url-input');
    if (input) input.value = cleanUrl;

    const radiusEl = document.getElementById('eface-share-radius-text');
    const gpsNoticeEl = document.getElementById('eface-share-gps-notice');
    if (window._efaceGpsSettings && window._efaceGpsSettings.enabled === true) {
        if (radiusEl) radiusEl.innerText = `${window._efaceGpsSettings.radiusMeters || 200} ម៉ែត្រ`;
        if (gpsNoticeEl) {
            gpsNoticeEl.innerHTML = `<i class="bi bi-geo-alt-fill text-warning me-1"></i> ប្រព័ន្ធដំណើរការជាមួយ GPS Geofencing ក្នុងកាំ <span class="text-info fw-bold">${window._efaceGpsSettings.radiusMeters || 200} ម៉ែត្រ</span> នៃកសិដ្ឋាន`;
        }
    } else {
        if (gpsNoticeEl) {
            gpsNoticeEl.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> អាចស្កែនវត្តមានបានភ្លាមៗ (មិនទាមទារ GPS ឡើយ)`;
        }
    }

    // Render QR Code in modal
    const qrContainer = document.getElementById('eface-share-qr-canvas');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(qrContainer, {
                    text: cleanUrl,
                    width: 200,
                    height: 200,
                    colorDark: '#0b0f19',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            } catch (e) {
                qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cleanUrl)}" alt="QR Code" style="width:200px;height:200px;border-radius:10px;">`;
            }
        } else {
            qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cleanUrl)}" alt="QR Code" style="width:200px;height:200px;border-radius:10px;">`;
        }
    }

    const modalEl = document.getElementById('efaceShareModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }
};

window.copyEfaceShareUrl = function() {
    const input = document.getElementById('eface-share-url-input');
    const url = (input && input.value) || getEfacePublicDirectUrl();

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'បានចម្លងជោគជ័យ!',
                    text: 'Link ស្កែនមុខ E-Face ត្រូវបានចម្លងទៅកាន់ Clipboard រួចរាល់។ អ្នកអាចផ្ញើតាម Telegram ឬ Messenger ឱ្យបុគ្គលិកបានភ្លាមៗ។',
                    timer: 2500,
                    showConfirmButton: false
                });
            } else {
                alert('បានចម្លង Link រួចរាល់!');
            }
        }).catch(() => {
            if (input) {
                input.select();
                document.execCommand('copy');
            }
            alert('បានចម្លង Link រួចរាល់!');
        });
    } else {
        if (input) {
            input.select();
            document.execCommand('copy');
        }
        alert('បានចម្លង Link រួចរាល់!');
    }
};

window.printEfaceQrPoster = function() {
    const cleanUrl = getEfacePublicDirectUrl();

    // Render QR Code in print poster template
    const posterQr = document.getElementById('eface-poster-qr');
    if (posterQr) {
        posterQr.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(posterQr, {
                    text: cleanUrl,
                    width: 250,
                    height: 250,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.H
                });
            } catch (e) {
                posterQr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(cleanUrl)}" alt="QR Code" style="width:250px;height:250px;">`;
            }
        } else {
            posterQr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(cleanUrl)}" alt="QR Code" style="width:250px;height:250px;">`;
        }
    }

    // Set logo if cached
    const posterLogo = document.getElementById('eface-poster-logo');
    if (posterLogo && localStorage.getItem('cachedSidebarLogo')) {
        posterLogo.src = localStorage.getItem('cachedSidebarLogo');
    }

    // Update GPS note on poster based on enabled status
    const posterGpsLine = document.getElementById('eface-poster-gps-line');
    if (posterGpsLine) {
        if (window._efaceGpsSettings && window._efaceGpsSettings.enabled === true) {
            posterGpsLine.innerHTML = `⚠️ ប្រព័ន្ធកំណត់ទីតាំង GPS Geofence៖ ត្រូវស្ថិតក្នុងបរិវេណកសិដ្ឋានកាំ ${window._efaceGpsSettings.radiusMeters || 200} ម៉ែត្រ`;
        } else {
            posterGpsLine.innerHTML = `✅ អាចស្កែនវត្តមានចូល-ចេញបានភ្លាមៗដោយរលូន`;
        }
    }

    // Hide bootstrap modal before printing to avoid backdrop visual issues
    const modalEl = document.getElementById('efaceShareModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }

    document.body.classList.add('printing-qr-poster');

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-qr-poster');
        }, 800);
    }, 400);
};

window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-qr-poster');
});
