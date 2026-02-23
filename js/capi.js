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

        // ── Separar user_data, custom_data y root event fields ──
        // Meta requiere que los campos PII vayan dentro de arreglos (ej. "em": ["hash"])
        const piiFields = ['em', 'ph', 'fn', 'ln', 'ge', 'db', 'ct', 'st', 'zp', 'country', 'external_id'];

        // metadataFields van dentro de user_data pero NO son arreglos (Strings puros)
        const metadataFields = [
            'fbc', 'fbp', 'client_ip_address', 'client_user_agent',
            'subscription_id', 'fb_login_id', 'lead_id', 'anon_id', 'madid',
            'page_id', 'page_scoped_user_id', 'ctwa_clid', 'ig_account_id', 'ig_sid'
        ];

        // rootEventFields van directamente al mismo nivel que event_name
        const rootEventFields = [
            'attribution_data', 'original_event_data', 'opt_out',
            'data_processing_options', 'data_processing_options_country',
            'data_processing_options_state', 'referrer_url', 'customer_segmentation'
        ];

        const customData = {};
        const piiData = {};
        const rootData = {};

        // 1. Extraer rootEventFields
        for (const field of rootEventFields) {
            if (enhancedUserData[field] !== undefined) {
                rootData[field] = enhancedUserData[field];
                delete enhancedUserData[field];
            }
        }

        // 2. Extraer el resto de PII, Metadata Local y Custom Data
        for (const [key, value] of Object.entries(enhancedUserData)) {
            if (piiFields.includes(key)) {
                // PII siempre en array (a menos que no se proporcione)
                piiData[key] = Array.isArray(value) ? value : [value];
            } else if (metadataFields.includes(key)) {
                // Metadata como subscription_id, fb_login_id NO llevan array
                piiData[key] = value;
            } else {
                // Todo lo demás a custom_data (e.g., currency, value, content_name)
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
            },
            ...rootData
        };

        // Solo agregar custom_data si tiene algún valor
        if (Object.keys(customData).length > 0) {
            eventPayload.custom_data = customData;
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
