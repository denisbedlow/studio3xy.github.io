let faceMesh;
let camera;
let cameraVideo;
let isTracking = false;
let overlayCanvas;
let overlayCtx;
let resizeHandler;
let smoothedGaze = null;

// Lower = smoother but more lag, higher = more responsive but jittery
const SMOOTHING = 0.15;

// --- Calibration state ---
let isCalibrating = false;
let calibrationStep = 0;
let calibrationSamples = [];
let calibration = null; // { minX, maxX, minY, maxY } set after calibration

const SAMPLES_PER_STEP = 60; // frames to average (~2s at 30fps)

const CALIBRATION_STEPS = [
    { label: 'Look at the dot on the LEFT',   dotX: 0.05, dotY: 0.5,  axis: 'x', type: 'min' },
    { label: 'Look at the dot on the RIGHT',  dotX: 0.95, dotY: 0.5,  axis: 'x', type: 'max' },
    { label: 'Look at the dot at the TOP',    dotX: 0.5,  dotY: 0.05, axis: 'y', type: 'min' },
    { label: 'Look at the dot at the BOTTOM', dotX: 0.5,  dotY: 0.95, axis: 'y', type: 'max' },
];

// Initialize the face mesh model
async function initFaceMesh() {
    faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onResults);
}

// Initialize the camera
async function initCamera() {
    cameraVideo = document.createElement('video');
    cameraVideo.style.display = 'none';
    document.body.appendChild(cameraVideo);

    camera = new Camera(cameraVideo, {
        onFrame: async () => {
            if (isTracking) {
                await faceMesh.send({image: cameraVideo});
            }
        },
        width: 640,
        height: 480
    });

    await camera.start();
}

// Initialize the overlay
function initOverlay() {
    overlayCanvas = document.getElementById('overlay');
    overlayCtx = overlayCanvas.getContext('2d');

    resizeHandler = () => {
        overlayCanvas.width = window.innerWidth;
        overlayCanvas.height = window.innerHeight;
    };

    resizeHandler();
    window.addEventListener('resize', resizeHandler);
}

// Compute raw iris ratio within the eye socket (not yet mapped to screen)
function computeRawIrisRatio(landmarks) {
    const leftIris  = landmarks[468]; // left iris center
    const rightIris = landmarks[473]; // right iris center
    if (!leftIris || !rightIris) return null;

    // Left eye corners (33=lateral, 133=medial, 159=top, 145=bottom)
    const leftMinX  = Math.min(landmarks[33].x,  landmarks[133].x);
    const leftMaxX  = Math.max(landmarks[33].x,  landmarks[133].x);
    const leftMinY  = Math.min(landmarks[159].y, landmarks[145].y);
    const leftMaxY  = Math.max(landmarks[159].y, landmarks[145].y);

    // Right eye corners (263=lateral, 362=medial, 386=top, 374=bottom)
    const rightMinX = Math.min(landmarks[263].x, landmarks[362].x);
    const rightMaxX = Math.max(landmarks[263].x, landmarks[362].x);
    const rightMinY = Math.min(landmarks[386].y, landmarks[374].y);
    const rightMaxY = Math.max(landmarks[386].y, landmarks[374].y);

    const leftGazeX  = (leftIris.x  - leftMinX)  / (leftMaxX  - leftMinX);
    const leftGazeY  = (leftIris.y  - leftMinY)  / (leftMaxY  - leftMinY);
    const rightGazeX = (rightIris.x - rightMinX) / (rightMaxX - rightMinX);
    const rightGazeY = (rightIris.y - rightMinY) / (rightMaxY - rightMinY);

    return {
        x: (leftGazeX + rightGazeX) / 2,
        y: (leftGazeY + rightGazeY) / 2,
    };
}

// Map raw iris ratio to screen coordinates using calibration or fallback
function estimateGaze(rawGaze) {
    const ref = calibration || { minX: 0.2, maxX: 0.8, minY: 0.2, maxY: 0.8 };
    return {
        x: Math.max(0, Math.min(1, (rawGaze.x - ref.minX) / (ref.maxX - ref.minX))),
        y: Math.max(0, Math.min(1, (rawGaze.y - ref.minY) / (ref.maxY - ref.minY))),
    };
}

// Draw the calibration dot with a progress ring
function drawCalibrationDot() {
    const step = CALIBRATION_STEPS[calibrationStep];
    const x = step.dotX * overlayCanvas.width;
    const y = step.dotY * overlayCanvas.height;

    overlayCtx.fillStyle = 'red';
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, 16, 0, Math.PI * 2);
    overlayCtx.fill();

    const progress = calibrationSamples.length / SAMPLES_PER_STEP;
    overlayCtx.strokeStyle = 'white';
    overlayCtx.lineWidth = 4;
    overlayCtx.beginPath();
    overlayCtx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    overlayCtx.stroke();
}

// Process face mesh results
function onResults(results) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (isCalibrating) {
        drawCalibrationDot();
    }

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

    const rawGaze = computeRawIrisRatio(results.multiFaceLandmarks[0]);
    if (!rawGaze) return;

    if (isCalibrating) {
        calibrationSamples.push(rawGaze);

        if (calibrationSamples.length >= SAMPLES_PER_STEP) {
            const avgX = calibrationSamples.reduce((s, p) => s + p.x, 0) / calibrationSamples.length;
            const avgY = calibrationSamples.reduce((s, p) => s + p.y, 0) / calibrationSamples.length;

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
                smoothedGaze = null;
                document.getElementById('status').textContent = 'Calibration complete — tracking active';
                document.getElementById('calibrateBtn').disabled = false;
            } else {
                document.getElementById('status').textContent =
                    CALIBRATION_STEPS[calibrationStep].label + '...';
            }
        }
        return; // don't draw gaze cross during calibration
    }

    // Normal tracking
    const gaze = estimateGaze(rawGaze);

    if (!smoothedGaze) {
        smoothedGaze = gaze;
    } else {
        smoothedGaze = {
            x: smoothedGaze.x + SMOOTHING * (gaze.x - smoothedGaze.x),
            y: smoothedGaze.y + SMOOTHING * (gaze.y - smoothedGaze.y),
        };
    }

    drawCross(smoothedGaze);
}

// Draw cross at gaze point
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

// Start tracking
async function startTracking() {
    if (!faceMesh) {
        await initFaceMesh();
    }

    if (!camera) {
        await initCamera();
    }

    if (!overlayCanvas) {
        initOverlay();
    }

    smoothedGaze = null;
    isTracking = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('calibrateBtn').disabled = false;
    document.getElementById('status').textContent = calibration
        ? 'Tracking active'
        : 'Tracking active — click Calibrate for better accuracy';
}

// Stop tracking
function stopTracking() {
    isTracking = false;
    isCalibrating = false;
    smoothedGaze = null;

    if (camera) {
        camera.stop();
        camera = null;
    }

    if (cameraVideo) {
        cameraVideo.remove();
        cameraVideo = null;
    }

    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
    }

    if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('calibrateBtn').disabled = true;
    document.getElementById('status').textContent = 'Tracking stopped';
}

// Start calibration sequence
function startCalibration() {
    if (!isTracking) return;

    isCalibrating = true;
    calibrationStep = 0;
    calibrationSamples = [];
    calibration = null;
    smoothedGaze = null;

    document.getElementById('calibrateBtn').disabled = true;
    document.getElementById('status').textContent =
        CALIBRATION_STEPS[0].label + '...';
}

// Clear overlay
function clearOverlay() {
    if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (isTracking) {
            stopTracking();
        } else {
            startTracking();
        }
    } else if (e.code === 'KeyC') {
        clearOverlay();
    } else if (e.code === 'KeyK') {
        startCalibration();
    }
});

// Initialize on page load
window.onload = async () => {
    try {
        await initFaceMesh();
    } catch (error) {
        document.getElementById('status').textContent = 'Error initializing face mesh: ' + error.message;
    }
};
