// ── tracker-core.js ───────────────────────────────────────────────────────────
//
// Pure, stateless functions shared between the gaze demo and watch.html.
// No DOM access. No module-level mutable state.
// Each function that needs state receives it as a parameter and returns new state.

// ── MediaPipe factory helpers ─────────────────────────────────────────────────

function createFaceMesh(onResultsCallback) {
    const fm = new FaceMesh({
        locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    fm.onResults(onResultsCallback);
    return fm;
}

// isActiveCallback: () => bool  — checked before each frame send
function createCamera(videoEl, faceMesh, isActiveCallback) {
    return new Camera(videoEl, {
        onFrame: async () => {
            if (isActiveCallback()) await faceMesh.send({ image: videoEl });
        },
        width: 640,
        height: 480
    });
}

// ── Raw gaze signal ───────────────────────────────────────────────────────────
//
// Iris offset from nose tip, normalised by inter-ocular distance (IOD).
// Captures eye rotation, not head translation. IOD auto-scales for distance.

function computeRawGaze(landmarks) {
    const leftIris  = landmarks[468];   // left  iris centre
    const rightIris = landmarks[473];   // right iris centre
    const noseTip   = landmarks[4];     // nose tip

    if (!leftIris || !rightIris || !noseTip) return null;

    const irisX = (leftIris.x + rightIris.x) / 2;
    const irisY = (leftIris.y + rightIris.y) / 2;

    const iod = Math.hypot(rightIris.x - leftIris.x, rightIris.y - leftIris.y);
    if (iod < 0.005) return null;

    return {
        x: (irisX - noseTip.x) / iod,
        y: (irisY - noseTip.y) / iod,
    };
}

// ── Gaze → screen mapping ─────────────────────────────────────────────────────

// calibration: { minX, maxX, minY, maxY } or null (uses defaults)
function rawToScreen(raw, calibration) {
    const ref = calibration || { minX: -0.6, maxX: 0.6, minY: -0.8, maxY: 0.2 };
    return {
        x: Math.max(0, Math.min(1, (raw.x - ref.minX) / (ref.maxX - ref.minX))),
        y: Math.max(0, Math.min(1, (raw.y - ref.minY) / (ref.maxY - ref.minY))),
    };
}

// ── Filtering ─────────────────────────────────────────────────────────────────
//
// Stateless version: receives state, returns new state.
// { smoothedGaze, gazeHistory } = applyFilters(raw, gazeHistory, smoothedGaze)

const FILTER_HISTORY_SIZE = 9;
const FILTER_SMOOTHING    = 0.25;

function applyFilters(newRaw, gazeHistory, smoothedGaze) {
    const history = [...gazeHistory, newRaw].slice(-FILTER_HISTORY_SIZE);

    const xs = history.map(p => p.x).slice().sort((a, b) => a - b);
    const ys = history.map(p => p.y).slice().sort((a, b) => a - b);
    const mid = Math.floor(history.length / 2);
    const median = { x: xs[mid], y: ys[mid] };

    const next = smoothedGaze
        ? {
            x: smoothedGaze.x + FILTER_SMOOTHING * (median.x - smoothedGaze.x),
            y: smoothedGaze.y + FILTER_SMOOTHING * (median.y - smoothedGaze.y),
          }
        : median;

    return { smoothedGaze: next, gazeHistory: history };
}

// ── Blink detection ───────────────────────────────────────────────────────────
//
// Stateless version.
// { blinked, eyeClosedFrames } = detectBlink(landmarks, eyeClosedFrames)

const BLINK_THRESHOLD       = 0.25;
const REQUIRED_CLOSED_FRAMES = 3;

function calculateEAR(eyeTop, eyeBottom, eyeLeft, eyeRight) {
    const vert = Math.hypot(eyeTop.x - eyeBottom.x, eyeTop.y - eyeBottom.y);
    const horiz = Math.hypot(eyeLeft.x - eyeRight.x, eyeLeft.y - eyeRight.y);
    return vert / horiz;
}

function detectBlink(landmarks, eyeClosedFrames) {
    const leftEAR  = calculateEAR(landmarks[159], landmarks[145], landmarks[133], landmarks[33]);
    const rightEAR = calculateEAR(landmarks[386], landmarks[374], landmarks[362], landmarks[263]);
    const ear = (leftEAR + rightEAR) / 2;

    if (ear < BLINK_THRESHOLD) {
        return { blinked: false, eyeClosedFrames: eyeClosedFrames + 1 };
    }

    if (eyeClosedFrames >= REQUIRED_CLOSED_FRAMES) {
        return { blinked: true, eyeClosedFrames: 0 };
    }

    return { blinked: false, eyeClosedFrames: 0 };
}
