let faceMesh;
let camera;
let isTracking = false;
let overlayCanvas;
let overlayCtx;

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
    const video = document.createElement('video');
    video.style.display = 'none';
    document.body.appendChild(video);

    camera = new Camera(video, {
        onFrame: async () => {
            if (isTracking) {
                await faceMesh.send({image: video});
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
    function resizeCanvas() {
        overlayCanvas.width = window.innerWidth;
        overlayCanvas.height = window.innerHeight;
    }
    
    // Initial resize
    resizeCanvas();
    
    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
}

// Process face mesh results
function onResults(results) {
    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            // Calculate gaze point
            const leftEye = landmarks[33];  // Left eye center
            const rightEye = landmarks[263]; // Right eye center
            
            if (leftEye && rightEye) {
                const gazePoint = {
                    x: (leftEye.x + rightEye.x) / 2,
                    y: (leftEye.y + rightEye.y) / 2
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
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('status').textContent = 'Tracking stopped';
}

// Clear overlay
function clearOverlay() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
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