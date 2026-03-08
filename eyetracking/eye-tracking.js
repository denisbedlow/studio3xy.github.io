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

// Iris typically sits in this range within the eye when looking at screen edges
const GAZE_MIN = 0.2;
const GAZE_MAX = 0.8;

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

    // Set canvas size to match window size
    resizeHandler = () => {
        overlayCanvas.width = window.innerWidth;
        overlayCanvas.height = window.innerHeight;
    };

    // Initial resize
    resizeHandler();

    // Handle window resize
    window.addEventListener('resize', resizeHandler);
}

// Estimate where on screen the user is looking by computing iris
// offset within the eye socket, then mapping that to screen coordinates.
function estimateGaze(landmarks) {
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

    // Iris ratio within each eye (0 = at left edge, 1 = at right edge)
    const leftGazeX  = (leftIris.x  - leftMinX)  / (leftMaxX  - leftMinX);
    const leftGazeY  = (leftIris.y  - leftMinY)  / (leftMaxY  - leftMinY);
    const rightGazeX = (rightIris.x - rightMinX) / (rightMaxX - rightMinX);
    const rightGazeY = (rightIris.y - rightMinY) / (rightMaxY - rightMinY);

    const rawX = (leftGazeX + rightGazeX) / 2;
    const rawY = (leftGazeY + rightGazeY) / 2;

    // Remap from iris-in-eye range to 0–1 screen range and clamp
    const screenX = Math.max(0, Math.min(1, (rawX - GAZE_MIN) / (GAZE_MAX - GAZE_MIN)));
    const screenY = Math.max(0, Math.min(1, (rawY - GAZE_MIN) / (GAZE_MAX - GAZE_MIN)));

    return { x: screenX, y: screenY };
}

// Process face mesh results
function onResults(results) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

    const gaze = estimateGaze(results.multiFaceLandmarks[0]);
    if (!gaze) return;

    // Exponential moving average to smooth out jitter
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
    
    // Draw horizontal line
    overlayCtx.beginPath();
    overlayCtx.moveTo(x - size, y);
    overlayCtx.lineTo(x + size, y);
    overlayCtx.stroke();
    
    // Draw vertical line
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
    document.getElementById('status').textContent = 'Tracking active';
}

// Stop tracking
function stopTracking() {
    isTracking = false;
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
    document.getElementById('status').textContent = 'Tracking stopped';
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