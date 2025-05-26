// Blink Counter Application
class BlinkCounter {
    constructor() {
        this.blinkCount = 0;
        this.isDetecting = false;
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.faceMesh = null;
        this.camera = null;
        this.sessionStartTime = null;
        this.sessionInterval = null;
        this.lastBlinkTime = 0;
        this.blinkThreshold = 0.25;
        this.eyeClosedFrames = 0;
        this.requiredClosedFrames = 2;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.counterElement = document.getElementById('counter');
        this.statusElement = document.getElementById('status');
        this.errorElement = document.getElementById('error');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.sessionTimeElement = document.getElementById('sessionTime');
        this.blinksPerMinElement = document.getElementById('blinksPerMin');
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                if (this.isDetecting) {
                    this.simulateBlink();
                }
            } else if (event.code === 'KeyR') {
                this.resetCounter();
            }
        });
    }

    async startDetection() {
        try {
            this.hideError();
            this.updateStatus('<div class="loading"></div>Initializing camera...');
            
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            
            this.video.srcObject = this.stream;
            this.video.classList.add('active');
            
            // Wait for video to load
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    resolve();
                };
            });

            // Initialize MediaPipe Face Mesh
            await this.initializeFaceMesh();
            
            this.isDetecting = true;
            this.sessionStartTime = Date.now();
            this.startSessionTimer();
            this.updateStatus('Detection active - Blink to count!');
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            
        } catch (error) {
            this.showError('Camera access denied or not available. Please allow camera permissions and try again.');
            console.error('Error accessing camera:', error);
        }
    }

    async initializeFaceMesh() {
        if (typeof FaceMesh === 'undefined') {
            this.showError('Face detection library not loaded. Please refresh the page.');
            return;
        }

        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results) => {
            this.onFaceMeshResults(results);
        });

        // Initialize camera
        this.camera = new Camera(this.video, {
            onFrame: async () => {
                if (this.isDetecting) {
                    await this.faceMesh.send({ image: this.video });
                }
            },
            width: 640,
            height: 480
        });

        this.camera.start();
    }

    onFaceMeshResults(results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];
        const isBlinking = this.detectBlink(landmarks);
        
        if (isBlinking) {
            this.handleBlink();
        }
    }

    detectBlink(landmarks) {
        // Eye landmark indices for MediaPipe Face Mesh
        const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
        const rightEye = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

        const leftEAR = this.calculateEAR(landmarks, leftEye);
        const rightEAR = this.calculateEAR(landmarks, rightEye);
        const averageEAR = (leftEAR + rightEAR) / 2;

        // Detect eye closure
        if (averageEAR < this.blinkThreshold) {
            this.eyeClosedFrames++;
        } else {
            if (this.eyeClosedFrames >= this.requiredClosedFrames) {
                this.eyeClosedFrames = 0;
                return true;
            }
            this.eyeClosedFrames = 0;
        }

        return false;
    }

    calculateEAR(landmarks, eyePoints) {
        // Calculate Eye Aspect Ratio
        if (eyePoints.length < 6) return 1;

        const p1 = landmarks[eyePoints[1]];
        const p2 = landmarks[eyePoints[5]];
        const p3 = landmarks[eyePoints[2]];
        const p4 = landmarks[eyePoints[4]];
        const p5 = landmarks[eyePoints[0]];
        const p6 = landmarks[eyePoints[3]];

        // Calculate distances
        const A = this.euclideanDistance(p2, p6);
        const B = this.euclideanDistance(p3, p5);
        const C = this.euclideanDistance(p1, p4);

        // EAR formula
        const ear = (A + B) / (2.0 * C);
        return ear;
    }

    euclideanDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) + 
            Math.pow(point1.y - point2.y, 2)
        );
    }

    handleBlink() {
        const currentTime = Date.now();
        // Prevent multiple blinks within 300ms
        if (currentTime - this.lastBlinkTime > 300) {
            this.blinkCount++;
            this.updateCounter();
            this.lastBlinkTime = currentTime;
        }
    }

    simulateBlink() {
        this.blinkCount++;
        this.updateCounter();
    }

    updateCounter() {
        this.counterElement.textContent = this.blinkCount;
        
        // Add blink animation
        this.counterElement.classList.add('blink-animation');
        setTimeout(() => {
            this.counterElement.classList.remove('blink-animation');
        }, 300);

        this.updateStats();
    }

    resetCounter() {
        this.blinkCount = 0;
        this.counterElement.textContent = '0';
        this.lastBlinkTime = 0;
        if (this.sessionStartTime) {
            this.sessionStartTime = Date.now();
        }
        this.updateStats();
        this.updateStatus(this.isDetecting ? 'Detection active - Blink to count!' : 'Click "Start Detection" to begin');
    }

    stopDetection() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.camera) {
            this.camera.stop();
        }
        
        this.video.classList.remove('active');
        this.isDetecting = false;
        this.stopSessionTimer();
        this.updateStatus('Detection stopped');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
    }

    startSessionTimer() {
        this.sessionInterval = setInterval(() => {
            this.updateSessionTime();
            this.updateStats();
        }, 1000);
    }

    stopSessionTimer() {
        if (this.sessionInterval) {
            clearInterval(this.sessionInterval);
            this.sessionInterval = null;
        }
    }

    updateSessionTime() {
        if (!this.sessionStartTime) return;
        
        const elapsedMs = Date.now() - this.sessionStartTime;
        const minutes = Math.floor(elapsedMs / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);
        
        this.sessionTimeElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateStats() {
        if (!this.sessionStartTime) {
            this.blinksPerMinElement.textContent = '0';
            return;
        }

        const elapsedMinutes = (Date.now() - this.sessionStartTime) / 60000;
        const blinksPerMinute = elapsedMinutes > 0 ? Math.round(this.blinkCount / elapsedMinutes) : 0;
        this.blinksPerMinElement.textContent = blinksPerMinute.toString();
    }

    updateStatus(message) {
        this.statusElement.innerHTML = message;
    }

    showError(message) {
        this.errorElement.textContent = message;
        this.errorElement.style.display = 'block';
    }

    hideError() {
        this.errorElement.style.display = 'none';
    }
}

// Initialize the application
let blinkCounter;

// Global functions for button clicks
function startDetection() {
    blinkCounter.startDetection();
}

function stopDetection() {
    blinkCounter.stopDetection();
}

function resetCounter() {
    blinkCounter.resetCounter();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    blinkCounter = new BlinkCounter();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (blinkCounter && blinkCounter.isDetecting) {
        blinkCounter.stopDetection();
    }
});