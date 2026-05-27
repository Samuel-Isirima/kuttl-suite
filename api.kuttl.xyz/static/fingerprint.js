// Kuttl Browser Fingerprinting Script
// This script generates a unique fingerprint for browser sessions

(function() {
    'use strict';

    // Generate browser fingerprint
    function generateFingerprint() {
        const components = [];
        
        // Screen information
        if (window.screen) {
            components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
            components.push(`avail:${screen.availWidth}x${screen.availHeight}`);
        }
        
        // Timezone
        try {
            components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
            components.push(`tzOffset:${new Date().getTimezoneOffset()}`);
        } catch (e) {
            // Fallback for older browsers
            components.push(`tzOffset:${new Date().getTimezoneOffset()}`);
        }
        
        // Language
        components.push(`lang:${navigator.language || navigator.userLanguage}`);
        components.push(`langs:${(navigator.languages || []).join(',')}`);
        
        // Platform
        components.push(`platform:${navigator.platform}`);
        
        // Hardware concurrency
        if (navigator.hardwareConcurrency) {
            components.push(`cores:${navigator.hardwareConcurrency}`);
        }
        
        // Memory (if available)
        if (navigator.deviceMemory) {
            components.push(`memory:${navigator.deviceMemory}`);
        }
        
        // Cookie enabled
        components.push(`cookies:${navigator.cookieEnabled}`);
        
        // Do not track
        components.push(`dnt:${navigator.doNotTrack || 'unknown'}`);
        
        // Canvas fingerprint
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Kuttl fingerprint test', 2, 2);
            components.push(`canvas:${canvas.toDataURL().slice(22, 32)}`);
        } catch (e) {
            components.push('canvas:error');
        }
        
        // WebGL fingerprint
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const renderer = gl.getParameter(gl.RENDERER);
                const vendor = gl.getParameter(gl.VENDOR);
                components.push(`webgl:${vendor}_${renderer}`.substring(0, 50));
            }
        } catch (e) {
            components.push('webgl:error');
        }
        
        // Audio context fingerprint
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const analyser = audioCtx.createAnalyser();
            const gain = audioCtx.createGain();
            
            oscillator.connect(analyser);
            analyser.connect(gain);
            gain.connect(audioCtx.destination);
            
            oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
            const frequencyData = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(frequencyData);
            
            const audioFingerprint = Array.from(frequencyData.slice(0, 10)).join('');
            components.push(`audio:${audioFingerprint.substring(0, 10)}`);
            
            audioCtx.close();
        } catch (e) {
            components.push('audio:error');
        }
        
        // Join all components and create hash
        const fingerprintString = components.sort().join('|');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprintString.length; i++) {
            const char = fingerprintString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(16);
    }

    // Store fingerprint
    let fingerprint = null;
    
    // Get or generate fingerprint
    function getFingerprint() {
        if (!fingerprint) {
            // Try to get from sessionStorage first
            fingerprint = sessionStorage.getItem('kuttl_fingerprint');
            if (!fingerprint) {
                fingerprint = generateFingerprint();
                sessionStorage.setItem('kuttl_fingerprint', fingerprint);
            }
        }
        return fingerprint;
    }

    // Override fetch to include fingerprint
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // Only add fingerprint to Kuttl API calls
        if (typeof url === 'string' && (url.includes('/api/') || url.includes('kuttl'))) {
            options.headers = options.headers || {};
            options.headers['X-Browser-Fingerprint'] = getFingerprint();
            
            // Add screen info
            if (window.screen) {
                options.headers['X-Screen-Info'] = `${screen.width}x${screen.height}x${screen.colorDepth}`;
            }
            
            // Add timezone
            try {
                options.headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
            } catch (e) {
                // Ignore if not supported
            }
        }
        
        return originalFetch.call(this, url, options);
    };

    // Override XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._kuttlUrl = url;
        return originalOpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
        if (typeof this._kuttlUrl === 'string' && (this._kuttlUrl.includes('/api/') || this._kuttlUrl.includes('kuttl'))) {
            this.setRequestHeader('X-Browser-Fingerprint', getFingerprint());
            
            if (window.screen) {
                this.setRequestHeader('X-Screen-Info', `${screen.width}x${screen.height}x${screen.colorDepth}`);
            }
            
            try {
                this.setRequestHeader('X-Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
            } catch (e) {
                // Ignore if not supported
            }
        }
        
        return originalSend.call(this, data);
    };

    // Expose fingerprint globally
    window.KuttlFingerprint = {
        get: getFingerprint,
        generate: generateFingerprint
    };

    console.log('Kuttl fingerprinting initialized:', getFingerprint());
})();