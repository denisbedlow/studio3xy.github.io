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
        this.requiredClosedFrames = 3;
        this.debugMode = false;
        this.detectionMethod = 'mediapipe'; // 'mediapipe' or 'manual'
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkLibraries();
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
            } else if (event.code === 'KeyD') {
                // Toggle debug mode with 'D' key
                this.debugMode = !this.debugMode;
                console.log('Debug mode:', this.debugMode ? 'ON' : 'OFF');
            }
        });
    }

    checkLibraries() {
        console.log('Checking MediaPipe libraries...');
        console.log('FaceMesh available:', typeof FaceMesh !== 'undefined');
        console.log('Camera available:', typeof Camera !== 'undefined');
        
        if (typeof FaceMesh === 'undefined') {
            console.warn('MediaPipe FaceMesh not loaded, will use manual detection mode');
            this.detectionMethod = 'manual';
        }
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
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    resolve();
                };
            });

            console.log('Camera initialized, detection method:', this.detectionMethod);

            if (this.detectionMethod === 'mediapipe') {
                await this.initializeMediaPipe();
            } else {
                this.initializeManualDetection();
            }
            
            this.isDetecting = true;
            this.sessionStartTime = Date.now();
            this.startSessionTimer();
            this.updateStatus(`Detection active (${this.detectionMethod}) - Blink to count! Press SPACE to test.`);
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            
        } catch (error) {
            this.showError('Camera access denied or not available. Please allow camera permissions and try again.');
            console.error('Error accessing camera:', error);
        }
    }

    async initializeMediaPipe() {
        try {
            console.log('Initializing MediaPipe...');
            
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
                this.onMediaPipeResults(results);
            });

            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    if (this.isDetecting && this.faceMesh) {
                        await this.faceMesh.send({ image: this.video });
                    }
                },
                width: 640,
                height: 480
            });

            await this.camera.start();
            console.log('MediaPipe initialized successfully');
            
        } catch (error) {
            console.error('MediaPipe initialization failed:', error);
            this.detectionMethod = 'manual';
            this.initializeManualDetection();
        }
    }

    initializeManualDetection() {
        console.log('Using manual detection mode');
        this.updateStatus('Manual mode active - Press SPACE to count blinks');
        
        // Add manual detection instructions
        if (!document.getElementById('manualInstructions')) {
            const instructions = document.createElement('div');
            instructions.id = 'manualInstructions';
            instructions.style.cssText = `
                background: rgba(255, 193, 7, 0.2);
                border: 1px solid rgba(255, 193, 7, 0.5);
                padding: 15px;
                border-radius: 10px;
                margin: 15px 0;
                font-size: 0.9rem;
            `;
            instructions.innerHTML = `
                <strong>Manual Mode Active</strong><br>
                Automatic blink detection is not available. Use the spacebar to manually count your blinks.
            `;
            this.errorElement.parentNode.insertBefore(instructions, this.errorElement.nextSibling);
        }
    }

    onMediaPipeResults(results) {
        if (this.debugMode) {
            console.log('MediaPipe results:', results);
        }

        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            if (this.debugMode) {
                console.log('No face detected');
            }
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];
        
        if (this.debugMode) {
            console.log('Landmarks detected:', landmarks.length);
        }

        const isBlinking = this.detectBlink(landmarks);
        
        if (isBlinking) {
            console.log('Blink detected!');
            this.handleBlink();
        }
    }

    detectBlink(landmarks) {
        try {
            // MediaPipe Face Mesh landmark indices for eyes
            // Left eye landmarks
            const leftEyeTop = landmarks[159];
            const leftEyeBottom = landmarks[145];
            const leftEyeLeft = landmarks[133];
            const leftEyeRight = landmarks[33];

            // Right eye landmarks  
            const rightEyeTop = landmarks[386];
            const rightEyeBottom = landmarks[374];
            const rightEyeLeft = landmarks[362];
            const rightEyeRight = landmarks[263];

            // Calculate eye aspect ratios
            const leftEAR = this.calculateEAR(leftEyeTop, leftEyeBottom, leftEyeLeft, leftEyeRight);
            const rightEAR = this.calculateEAR(rightEyeTop, rightEyeBottom, rightEyeLeft, rightEyeRight);
            const averageEAR = (leftEAR + rightEAR) / 2;

            if (this.debugMode && Math.random() < 0.1) { // Log 10% of the time to avoid spam
                console.log('EAR values - Left:', leftEAR.toFixed(3), 'Right:', rightEAR.toFixed(3), 'Average:', averageEAR.toFixed(3));
            }

            // Detect eye closure
            if (averageEAR < this.blinkThreshold) {
                this.eyeClosedFrames++;
                if (this.debugMode && this.eyeClosedFrames === 1) {
                    console.log('Eyes closed detected, frames:', this.eyeClosedFrames);
                }
            } else {
                if (this.eyeClosedFrames >= this.requiredClosedFrames) {
                    if (this.debugMode) {
                        console.log('Blink completed after', this.eyeClosedFrames, 'closed frames');
                    }
                    this.eyeClosedFrames = 0;
                    return true;
                }
                this.eyeClosedFrames = 0;
            }

            return false;
        } catch (error) {
            console.error('Error in blink detection:', error);
            return false;
        }
    }

    calculateEAR(eyeTop, eyeBottom, eyeLeft, eyeRight) {
        // Calculate vertical distance
        const verticalDist = this.euclideanDistance(eyeTop, eyeBottom);
        // Calculate horizontal distance
        const horizontalDist = this.euclideanDistance(eyeLeft, eyeRight);
        // Return eye aspect ratio
        return verticalDist / horizontalDist;
    }

    euclideanDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) + 
            Math.pow(point1.y - point2.y, 2)
        );
    }

    handleBlink() {
        const currentTime = Date.now();
        // Prevent multiple blinks within 500ms
        if (currentTime - this.lastBlinkTime > 500) {
            this.blinkCount++;
            this.updateCounter();
            this.lastBlinkTime = currentTime;
            console.log('Blink counted! Total:', this.blinkCount);
        } else {
            console.log('Blink ignored (too soon after last blink)');
        }
    }

    simulateBlink() {
        this.blinkCount++;
        this.updateCounter();
        console.log('Manual blink counted! Total:', this.blinkCount);
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
        this.eyeClosedFrames = 0;
        if (this.sessionStartTime) {
            this.sessionStartTime = Date.now();
        }
        this.updateStats();
        const statusText = this.isDetecting ? 
            `Detection active (${this.detectionMethod}) - Blink to count!` : 
            'Click "Start Detection" to begin';
        this.updateStatus(statusText);
        console.log('Counter reset');
    }

    stopDetection() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }

        if (this.faceMesh) {
            this.faceMesh = null;
        }
        
        // Remove manual instructions if they exist
        const instructions = document.getElementById('manualInstructions');
        if (instructions) {
            instructions.remove();
        }
        
        this.video.classList.remove('active');
        this.isDetecting = false;
        this.eyeClosedFrames = 0;
        this.stopSessionTimer();
        this.updateStatus('Detection stopped');
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        console.log('Detection stopped');
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
    console.log('Blink Counter initialized');
    console.log('Press D to toggle debug mode, SPACE to test manual blink');
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (blinkCounter && blinkCounter.isDetecting) {
        blinkCounter.stopDetection();
    }
});