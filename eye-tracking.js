let faceMesh;
let camera;
let isTracking = false;
let sessionStartTime;
let gazePoints = [];
let heatmapCanvas;
let heatmapCtx;
let sessionTimer;
let cityscapeImage;

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
    
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

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
    
    // Wait for video to be ready
    await new Promise((resolve) => {
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            resolve();
        };
    });
}

// Initialize the heatmap
function initHeatmap() {
    heatmapCanvas = document.getElementById('heatmap');
    heatmapCtx = heatmapCanvas.getContext('2d');
    
    // Set heatmap size to match image
    const image = document.getElementById('cityscape');
    heatmapCanvas.width = image.naturalWidth;
    heatmapCanvas.height = image.naturalHeight;
    
    // Clear the heatmap with a semi-transparent background
    heatmapCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    heatmapCtx.fillRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
}

// Process face mesh results
function onResults(results) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const image = document.getElementById('cityscape');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw cityscape image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            // Draw face mesh
            drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, {color: '#C0C0C070', lineWidth: 1});
            drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0', lineWidth: 2});
            drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30', lineWidth: 2});
            drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, {color: '#30FF30', lineWidth: 2});

            // Calculate gaze point
            const leftEye = landmarks[33];  // Left eye center
            const rightEye = landmarks[263]; // Right eye center
            
            if (leftEye && rightEye) {
                const gazePoint = {
                    x: (leftEye.x + rightEye.x) / 2,
                    y: (leftEye.y + rightEye.y) / 2
                };
                
                // Add gaze point to array
                gazePoints.push(gazePoint);
                document.getElementById('gazePoints').textContent = gazePoints.length;
                
                // Update heatmap
                updateHeatmap(gazePoint);
            }
        }
    }
}

// Update heatmap with new gaze point
function updateHeatmap(point) {
    const radius = 30; // Reduced radius for more precise heatmap
    const gradient = heatmapCtx.createRadialGradient(
        point.x * heatmapCanvas.width,
        point.y * heatmapCanvas.height,
        0,
        point.x * heatmapCanvas.width,
        point.y * heatmapCanvas.height,
        radius
    );
    
    // More intense colors for better visibility
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    heatmapCtx.fillStyle = gradient;
    heatmapCtx.fillRect(
        point.x * heatmapCanvas.width - radius,
        point.y * heatmapCanvas.height - radius,
        radius * 2,
        radius * 2
    );
}

// Start tracking
async function startTracking() {
    if (!faceMesh) {
        await initFaceMesh();
    }
    
    if (!camera) {
        await initCamera();
    }
    
    if (!heatmapCanvas) {
        initHeatmap();
    }
    
    isTracking = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('status').textContent = 'Tracking active';
    
    // Start session timer
    sessionStartTime = Date.now();
    sessionTimer = setInterval(updateSessionTime, 1000);
}

// Stop tracking
function stopTracking() {
    isTracking = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('status').textContent = 'Tracking stopped';
    
    // Stop session timer
    clearInterval(sessionTimer);
}

// Clear heatmap
function clearHeatmap() {
    heatmapCtx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
    // Reset background
    heatmapCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    heatmapCtx.fillRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
    gazePoints = [];
    document.getElementById('gazePoints').textContent = '0';
}

// Update session time display
function updateSessionTime() {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('sessionTime').textContent = `${minutes}:${seconds}`;
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
        clearHeatmap();
    }
});

// Initialize on page load
window.onload = async () => {
    try {
        await initFaceMesh();
    } catch (error) {
        document.getElementById('error').textContent = 'Error initializing face mesh: ' + error.message;
        document.getElementById('error').style.display = 'block';
    }
}; 