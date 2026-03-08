let faceMesh;
let camera;
let cameraVideo;
let isTracking = false;
let overlayCanvas;
let overlayCtx;
let resizeHandler;

// Smoothing
const SMOOTHING = 0.25;         // exponential factor after median filter
const HISTORY_SIZE = 9;         // frames in median window (~300ms at 30fps)
let gazeHistory = [];
let smoothedGaze = null;

// Calibration
let isCalibrating = false;
let calibrationStep = 0;
let calibrationSamples = [];
let calibration = null;

const SAMPLES_PER_STEP = 90;    // ~3 seconds at 30fps

const CALIBRATION_STEPS = [
    { label: 'Look at the dot on the LEFT',    dotX: 0.05, dotY: 0.5,  axis: 'x', type: 'min' },
    { label: 'Look at the dot on the RIGHT',   dotX: 0.95, dotY: 0.5,  axis: 'x', type: 'max' },
    { label: 'Look at the dot at the TOP',     dotX: 0.5,  dotY: 0.05, axis: 'y', type: 'min' },
    { label: 'Look at the dot at the BOTTOM',  dotX: 0.5,  dotY: 0.95, axis: 'y', type: 'max' },
];

// ── Face mesh ────────────────────────────────────────────────────────────────

async function initFaceMesh() {
    faceMesh = new FaceMesh({
        locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onResults);
}

// ── Camera ───────────────────────────────────────────────────────────────────

async function initCamera() {
    cameraVideo = document.createElement('video');
    cameraVideo.style.display = 'none';
    document.body.appendChild(cameraVideo);

    camera = new Camera(cameraVideo, {
        onFrame: async () => {
            if (isTracking) await faceMesh.send({ image: cameraVideo });
        },
        width: 640,
        height: 480
    });
    await camera.start();
}

// ── Overlay canvas ───────────────────────────────────────────────────────────

function initOverlay() {
    overlayCanvas = document.getElementById('overlay');
    overlayCtx = overlayCanvas.getContext('2d');
    resizeHandler = () => {
        overlayCanvas.width  = window.innerWidth;
        overlayCanvas.height = window.innerHeight;
    };
    resizeHandler();
    window.addEventListener('resize', resizeHandler);
}

// ── Raw gaze signal ──────────────────────────────────────────────────────────
//
// Instead of iris-in-eye (small denominator → noisy), use:
//   iris offset from nose tip, normalised by inter-ocular distance (IOD).
//
// • Nose tip (landmark 4) is a stable anchor that moves with the head,
//   so the offset captures eye rotation rather than head translation.
// • IOD auto-scales for camera distance.

function computeRawGaze(landmarks) {
    const leftIris  = landmarks[468];   // left  iris centre
    const rightIris = landmarks[473];   // right iris centre
    const noseTip   = landmarks[4];     // nose tip

    if (!leftIris || !rightIris || !noseTip) return null;

    const irisX = (leftIris.x + rightIris.x) / 2;
    const irisY = (leftIris.y + rightIris.y) / 2;

    const iod = Math.hypot(rightIris.x - leftIris.x, rightIris.y - leftIris.y);
    if (iod < 0.005) return null;   // face too small / edge case

    return {
        x: (irisX - noseTip.x) / iod,
        y: (irisY - noseTip.y) / iod,
    };
}

// ── Gaze → screen mapping ────────────────────────────────────────────────────

function rawToScreen(raw) {
    const ref = calibration || { minX: -0.6, maxX: 0.6, minY: -0.8, maxY: 0.2 };
    return {
        x: Math.max(0, Math.min(1, (raw.x - ref.minX) / (ref.maxX - ref.minX))),
        y: Math.max(0, Math.min(1, (raw.y - ref.minY) / (ref.maxY - ref.minY))),
    };
}

// ── Filtering ────────────────────────────────────────────────────────────────
//
// 1. Median filter over HISTORY_SIZE frames  → removes spikes (blinks, jitter)
// 2. Exponential moving average on top       → fluid motion

function applyFilters(newRaw) {
    gazeHistory.push(newRaw);
    if (gazeHistory.length > HISTORY_SIZE) gazeHistory.shift();

    // Median
    const xs = gazeHistory.map(p => p.x).slice().sort((a, b) => a - b);
    const ys = gazeHistory.map(p => p.y).slice().sort((a, b) => a - b);
    const mid = Math.floor(gazeHistory.length / 2);
    const median = { x: xs[mid], y: ys[mid] };

    // EMA
    if (!smoothedGaze) {
        smoothedGaze = median;
    } else {
        smoothedGaze = {
            x: smoothedGaze.x + SMOOTHING * (median.x - smoothedGaze.x),
            y: smoothedGaze.y + SMOOTHING * (median.y - smoothedGaze.y),
        };
    }
    return smoothedGaze;
}

// ── Calibration dot ──────────────────────────────────────────────────────────

function drawCalibrationDot() {
    const step = CALIBRATION_STEPS[calibrationStep];
    const x = step.dotX * overlayCanvas.width;
    const y = step.dotY * overlayCanvas.height;

    overlayCtx.fillStyle = 'red';
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, 16, 0, Math.PI * 2);
    overlayCtx.fill();

    // Progress ring
    const progress = calibrationSamples.length / SAMPLES_PER_STEP;
    overlayCtx.strokeStyle = 'white';
    overlayCtx.lineWidth = 4;
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    overlayCtx.stroke();
}

// ── Main result handler ──────────────────────────────────────────────────────

function onResults(results) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (isCalibrating) drawCalibrationDot();

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

    const raw = computeRawGaze(results.multiFaceLandmarks[0]);
    if (!raw) return;

    // ── Calibration mode ──
    if (isCalibrating) {
        calibrationSamples.push(raw);

        if (calibrationSamples.length >= SAMPLES_PER_STEP) {
            // Use median of samples for robustness
            const sxs = calibrationSamples.map(p => p.x).slice().sort((a, b) => a - b);
            const sys = calibrationSamples.map(p => p.y).slice().sort((a, b) => a - b);
            const mid = Math.floor(calibrationSamples.length / 2);
            const avgX = sxs[mid];
            const avgY = sys[mid];

            if (!calibration) calibration = {};
            const step = CALIBRATION_STEPS[calibrationStep];
            if (step.axis === 'x') {
                calibration[step.type === 'min' ? 'minX' : 'maxX'] = avgX;
            } else {
                calibration[step.type === 'min' ? 'minY' : 'maxY'] = avgY;
            }

            calibrationStep++;
            calibrationSamples = [];

            if (calibrationStep >= CALIBRATION_STEPS.length) {
                isCalibrating = false;
                gazeHistory = [];
                smoothedGaze = null;
                document.getElementById('status').textContent = 'Calibration complete — tracking active';
                document.getElementById('calibrateBtn').disabled = false;
            } else {
                document.getElementById('status').textContent =
                    CALIBRATION_STEPS[calibrationStep].label + '...';
            }
        }
        return;
    }

    // ── Normal tracking mode ──
    const filtered = applyFilters(raw);
    drawCross(rawToScreen(filtered));
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function drawCross(point) {
    const size = 20;
    const x = point.x * overlayCanvas.width;
    const y = point.y * overlayCanvas.height;

    overlayCtx.strokeStyle = 'red';
    overlayCtx.lineWidth = 2;

    overlayCtx.beginPath();
    overlayCtx.moveTo(x - size, y);
    overlayCtx.lineTo(x + size, y);
    overlayCtx.stroke();

    overlayCtx.beginPath();
    overlayCtx.moveTo(x, y - size);
    overlayCtx.lineTo(x, y + size);
    overlayCtx.stroke();
}

// ── Controls ─────────────────────────────────────────────────────────────────

async function startTracking() {
    document.getElementById('startBtn').disabled = true;
    document.getElementById('status').textContent = 'Starting...';

    try {
        if (!faceMesh)      await initFaceMesh();
        if (!camera)        await initCamera();
        if (!overlayCanvas) initOverlay();

        gazeHistory  = [];
        smoothedGaze = null;
        isTracking   = true;

        document.getElementById('stopBtn').disabled     = false;
        document.getElementById('calibrateBtn').disabled = false;

        startCalibration();

    } catch (error) {
        document.getElementById('startBtn').disabled = false;
        document.getElementById('status').textContent = 'Error: ' + error.message;
    }
}

function stopTracking() {
    isTracking    = false;
    isCalibrating = false;
    gazeHistory   = [];
    smoothedGaze  = null;

    if (camera)     { camera.stop();    camera     = null; }
    if (cameraVideo){ cameraVideo.remove(); cameraVideo = null; }
    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }
    if (overlayCtx) overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    document.getElementById('startBtn').disabled     = false;
    document.getElementById('stopBtn').disabled      = true;
    document.getElementById('calibrateBtn').disabled = true;
    document.getElementById('status').textContent    = 'Tracking stopped';
}

function startCalibration() {
    if (!isTracking) return;

    isCalibrating      = true;
    calibrationStep    = 0;
    calibrationSamples = [];
    calibration        = null;
    gazeHistory        = [];
    smoothedGaze       = null;

    document.getElementById('calibrateBtn').disabled = true;
    document.getElementById('status').textContent =
        CALIBRATION_STEPS[0].label + '...';
}

function clearOverlay() {
    if (overlayCtx)
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

// ── Keyboard shortcuts ───────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if      (e.code === 'Space') isTracking ? stopTracking()    : startTracking();
    else if (e.code === 'KeyC')  clearOverlay();
    else if (e.code === 'KeyK')  startCalibration();
});

// ── Init ─────────────────────────────────────────────────────────────────────

window.onload = async () => {
    try {
        await initFaceMesh();
    } catch (error) {
        document.getElementById('status').textContent =
            'Error initializing face mesh: ' + error.message;
    }
};
