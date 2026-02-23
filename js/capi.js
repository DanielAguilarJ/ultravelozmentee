const axios = require('axios');
const crypto = require('crypto');

const PIXEL_ID = '280967147554736';
const ACCESS_TOKEN = 'EAAFHi6gU8qEBQnBLJRSdKkalE6w9ZA2h4FoinmKf1aKUyIIVdZBQwY5jL3hJrUx28rmqzIF77B32nVJGEvFOmZC9yg3EmdeY1QQItsZBe5fmDdfzRymeV07FSCVqQYpHaeZBoe6Ec6JwbhET0DeFa69eQV3jZCvf2VtpCgfYzArQgtUSECwfiRl2pENYf5WwZDZD';

/**
 * Genera un hash SHA256 de un dato (requerido por Meta para datos PII)
 * Se usa como fallback si ParamBuilder no está disponible
 */
function hashData(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
}

/**
 * Envía un evento a la API de Conversiones de Meta
 * Usa ParamBuilder para obtener valores óptimos de fbc, fbp, client_ip_address
 * y PII normalizado/hasheado cuando está disponible
 */
async function sendCapiEvent(eventName, req, userData = {}, eventId = null) {
    try {
        const pb = req.paramBuilder; // ParamBuilder instance from middleware

        // ── Obtener fbc, fbp, client_ip_address ──
        // Priorizar ParamBuilder, fallback a cookies/req directos
        const fbc = pb?.getFbc?.() || req.cookies?._fbc || null;
        const fbp = pb?.getFbp?.() || req.cookies?._fbp || null;
        const clientIp = pb?.getClientIpAddress?.() || req.ip;

        // ── Normalizar y hashear PII si viene en userData ──
        const enhancedUserData = { ...userData };

        if (pb && userData.em && !isHashed(userData.em)) {
            try {
                enhancedUserData.em = pb.getNormalizedAndHashedPII(userData.em, 'email');
            } catch (e) {
                enhancedUserData.em = hashData(userData.em);
            }
        }

        if (pb && userData.ph && !isHashed(userData.ph)) {
            try {
                enhancedUserData.ph = pb.getNormalizedAndHashedPII(userData.ph, 'phone');
            } catch (e) {
                enhancedUserData.ph = hashData(userData.ph);
            }
        }

        if (pb && userData.fn && !isHashed(userData.fn)) {
            try {
                enhancedUserData.fn = pb.getNormalizedAndHashedPII(userData.fn, 'first_name');
            } catch (e) {
                enhancedUserData.fn = hashData(userData.fn);
            }
        }

        if (pb && userData.ln && !isHashed(userData.ln)) {
            try {
                enhancedUserData.ln = pb.getNormalizedAndHashedPII(userData.ln, 'last_name');
            } catch (e) {
                enhancedUserData.ln = hashData(userData.ln);
            }
        }

        // ── Separar user_data de custom_data y formatear como arreglos ──
        // Meta requiere que los campos PII vayan dentro de arreglos (ej. "em": ["hash"])
        const piiFields = ['em', 'ph', 'fn', 'ln', 'ge', 'db', 'ct', 'st', 'zp', 'country', 'external_id'];
        const metadataFields = ['fbc', 'fbp', 'client_ip_address', 'client_user_agent'];

        const customData = {};
        const piiData = {};

        // Manejar attribution_data y original_event_data si el cliente los envía
        let attributionData = null;
        let originalEventData = null;

        if (enhancedUserData.attribution_data) {
            attributionData = enhancedUserData.attribution_data;
            delete enhancedUserData.attribution_data;
        }
        if (enhancedUserData.original_event_data) {
            originalEventData = enhancedUserData.original_event_data;
            delete enhancedUserData.original_event_data;
        }

        for (const [key, value] of Object.entries(enhancedUserData)) {
            if (piiFields.includes(key)) {
                // Meta requiere que el PII sea un array
                piiData[key] = Array.isArray(value) ? value : [value];
            } else if (metadataFields.includes(key)) {
                // metadata no va en array
                piiData[key] = value;
            } else {
                // todo lo demás va a custom_data
                customData[key] = value;
            }
        }

        const eventPayload = {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_source_url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            event_id: eventId,
            user_data: {
                client_ip_address: clientIp,
                client_user_agent: req.get('user-agent'),
                fbc: fbc,
                fbp: fbp,
                ...piiData
            }
        };

        // Solo agregar custom_data si hay datos
        if (Object.keys(customData).length > 0) {
            eventPayload.custom_data = customData;
        }

        // Agregar attribution_data y original_event_data si existen
        if (attributionData) {
            eventPayload.attribution_data = attributionData;
        }
        if (originalEventData) {
            eventPayload.original_event_data = originalEventData;
        }

        const payload = { data: [eventPayload] };


        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`,
            payload,
            {
                params: { access_token: ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' }
            }
        );

        console.log(`✅ Evento CAPI '${eventName}' enviado [fbc: ${fbc ? '✓' : '✗'} | fbp: ${fbp ? '✓' : '✗'} | ip: ${clientIp ? '✓' : '✗'}]`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al enviar evento CAPI '${eventName}':`, error.response?.data || error.message);
    }
}

/**
 * Verifica si un valor ya está hasheado en SHA256 (64 chars hex)
 */
function isHashed(value) {
    return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

module.exports = { sendCapiEvent };
