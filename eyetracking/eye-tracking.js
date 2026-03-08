let faceMesh;
let camera;
let cameraVideo;
let isTracking = false;
let overlayCanvas;
let overlayCtx;
let resizeHandler;

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

// Process face mesh results
function onResults(results) {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            // Use iris center landmarks (available with refineLandmarks: true)
            // 468 = left iris center, 473 = right iris center
            const leftIris = landmarks[468];
            const rightIris = landmarks[473];

            if (leftIris && rightIris) {
                const gazePoint = {
                    x: (leftIris.x + rightIris.x) / 2,
                    y: (leftIris.y + rightIris.y) / 2
                };

                // Draw cross at gaze point
                drawCross(gazePoint);
            }
        }
    }
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
    
    isTracking = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('status').textContent = 'Tracking active';
}

// Stop tracking
function stopTracking() {
    isTracking = false;

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