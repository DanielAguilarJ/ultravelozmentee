'use strict';

const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────
// CONFIG — todo por variables de entorno. NUNCA hardcodear
// tokens en el código (el anterior quedó expuesto en GitHub:
// debe rotarse en Meta Events Manager).
// ─────────────────────────────────────────────────────────────
const PIXEL_ID = process.env.META_PIXEL_ID || '280967147554736';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || null; // opcional: para probar en Events Manager
const GRAPH_VERSION = 'v21.0';
const CAPI_TIMEOUT_MS = 5000; // Meta lento ≠ sitio lento

let warnedNoToken = false;

/**
 * SHA256 fallback si ParamBuilder no está disponible
 */
function hashData(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(String(data).trim().toLowerCase()).digest('hex');
}

/**
 * Verifica si un valor ya está hasheado en SHA256 (64 chars hex)
 */
function isHashed(value) {
    return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

/**
 * Normaliza y hashea PII con ParamBuilder si existe; fallback a SHA256 manual.
 */
function normalizePII(pb, value, type) {
    if (!value || isHashed(value)) return value;
    if (pb?.getNormalizedAndHashedPII) {
        try {
            return pb.getNormalizedAndHashedPII(value, type);
        } catch (e) { /* fallback abajo */ }
    }
    return hashData(value);
}

/**
 * Envía un evento a la API de Conversiones de Meta.
 * - fetch nativo (Node 18+), sin dependencias externas
 * - timeout con AbortController: nunca bloquea el request del usuario
 * - fail-safe: cualquier error se loggea y se devuelve null, jamás crashea
 */
async function sendCapiEvent(eventName, req, userData = {}, eventId = null) {
    if (!ACCESS_TOKEN) {
        if (!warnedNoToken) {
            console.warn('⚠️ META_ACCESS_TOKEN no configurado: eventos CAPI deshabilitados.');
            warnedNoToken = true;
        }
        return null;
    }

    try {
        const pb = req.paramBuilder;

        // ── fbc, fbp, client_ip: ParamBuilder primero, fallback a cookies/req ──
        const fbc = pb?.getFbc?.() || req.cookies?._fbc || null;
        const fbp = pb?.getFbp?.() || req.cookies?._fbp || null;
        const clientIp = pb?.getClientIpAddress?.() || req.ip;

        // ── Normalizar y hashear PII ──
        const enhancedUserData = { ...userData };
        const piiTypes = { em: 'email', ph: 'phone', fn: 'first_name', ln: 'last_name' };
        for (const [key, type] of Object.entries(piiTypes)) {
            if (enhancedUserData[key]) {
                enhancedUserData[key] = normalizePII(pb, enhancedUserData[key], type);
            }
        }

        // ── Clasificación de campos ──
        const piiFields = ['em', 'ph', 'fn', 'ln', 'ge', 'db', 'ct', 'st', 'zp', 'country', 'external_id'];

        const metadataFields = [
            'fbc', 'fbp', 'client_ip_address', 'client_user_agent',
            'subscription_id', 'fb_login_id', 'lead_id', 'anon_id', 'madid',
            'page_id', 'page_scoped_user_id', 'ctwa_clid', 'ig_account_id', 'ig_sid'
        ];

        const rootEventFields = [
            'attribution_data', 'original_event_data', 'opt_out',
            'data_processing_options', 'data_processing_options_country',
            'data_processing_options_state', 'referrer_url', 'customer_segmentation'
        ];

        const customData = {};
        const piiData = {};
        const rootData = {};

        for (const field of rootEventFields) {
            if (enhancedUserData[field] !== undefined) {
                rootData[field] = enhancedUserData[field];
                delete enhancedUserData[field];
            }
        }

        for (const [key, value] of Object.entries(enhancedUserData)) {
            if (piiFields.includes(key)) {
                piiData[key] = Array.isArray(value) ? value : [value]; // PII siempre en array
            } else if (metadataFields.includes(key)) {
                piiData[key] = value; // metadata: string plano
            } else {
                customData[key] = value; // currency, value, content_name...
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
                fbc,
                fbp,
                ...piiData
            },
            ...rootData
        };

        if (Object.keys(customData).length > 0) {
            eventPayload.custom_data = customData;
        }

        const payload = { data: [eventPayload] };
        if (TEST_EVENT_CODE) payload.test_event_code = TEST_EVENT_CODE;

        // ── fetch nativo con timeout ──
        const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), CAPI_TIMEOUT_MS);

        let responseData;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(`Meta ${response.status}: ${JSON.stringify(responseData?.error || responseData)}`);
            }
        } finally {
            clearTimeout(timer);
        }

        console.log(`✅ CAPI '${eventName}' [fbc: ${fbc ? '✓' : '✗'} | fbp: ${fbp ? '✓' : '✗'} | ip: ${clientIp ? '✓' : '✗'}]`);
        return responseData;
    } catch (error) {
        const msg = error.name === 'AbortError'
            ? `timeout tras ${CAPI_TIMEOUT_MS}ms`
            : error.message;
        console.error(`❌ CAPI '${eventName}': ${msg}`);
        return null; // nunca propagar: analytics jamás tira el sitio
    }
}

module.exports = { sendCapiEvent };
