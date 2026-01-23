const axios = require('axios');
const crypto = require('crypto');

const PIXEL_ID = '280967147554736';
const ACCESS_TOKEN = 'EAAFHi6gU8qEBQnBLJRSdKkalE6w9ZA2h4FoinmKf1aKUyIIVdZBQwY5jL3hJrUx28rmqzIF77B32nVJGEvFOmZC9yg3EmdeY1QQItsZBe5fmDdfzRymeV07FSCVqQYpHaeZBoe6Ec6JwbhET0DeFa69eQV3jZCvf2VtpCgfYzArQgtUSECwfiRl2pENYf5WwZDZD';

/**
 * Genera un hash SHA256 de un dato (requerido por Meta para datos PII)
 */
function hashData(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

/**
 * Envía un evento a la API de Conversiones de Meta
 */
async function sendCapiEvent(eventName, req, userData = {}) {
    try {
        const payload = {
            data: [
                {
                    event_name: eventName,
                    event_time: Math.floor(Date.now() / 1000),
                    action_source: 'website',
                    event_source_url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
                    user_data: {
                        client_ip_address: req.ip,
                        client_user_agent: req.get('user-agent'),
                        fbc: req.cookies?._fbc || null,
                        fbp: req.cookies?._fbp || null,
                        ...userData
                    }
                }
            ]
        };

        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${PIXEL_ID}/events`,
            payload,
            {
                params: { access_token: ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        );

        console.log(`✅ Evento CAPI '${eventName}' enviado exitosamente:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al enviar evento CAPI '${eventName}':`, error.response?.data || error.message);
    }
}

module.exports = { sendCapiEvent };
