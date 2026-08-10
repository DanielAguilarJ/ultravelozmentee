/**
 * Captura de correo — stage 'recurso'.
 *
 * Contexto: hasta ahora el sitio no capturaba un solo correo (0 páginas
 * con input type="email"). Todo el tráfico del blog dependía de que el
 * visitante hiciera clic en WhatsApp o se perdía para siempre. Sin lista
 * no hay audiencias personalizadas en Meta/Google Ads ni remarketing.
 *
 * Estos tests fijan el contrato del stage nuevo para que no se rompa:
 * pide correo, NO pide teléfono, y no toca el contrato de las citas.
 */
const test = require('node:test');
const assert = require('node:assert');

const leads = require('../js/leads');

/* ── Validación de correo ────────────────────────────────────── */

test('acepta correos normales', () => {
    for (const ok of [
        'ana@gmail.com',
        'ana.lopez@worldbrain.com.mx',
        'ana+curso@sub.dominio.mx',
        'a_b-c@dominio.edu.mx'
    ]) {
        assert.ok(leads.isValidEmail(ok), 'debería aceptar ' + ok);
    }
});

test('rechaza correos mal escritos', () => {
    for (const bad of [
        '', 'ana', 'ana@', '@gmail.com', 'ana@gmail',
        'ana gomez@gmail.com',      // espacio
        'ana@gmail..com',           // punto doble
        'ana@dominio.c',            // TLD de una letra
        'ana@gmail.com, b@x.com',   // dos direcciones
        'a'.repeat(250) + '@x.com'  // pasa de 254
    ]) {
        assert.ok(!leads.isValidEmail(bad), 'debería rechazar ' + JSON.stringify(bad));
    }
});

test('normaliza a minusculas y sin espacios', () => {
    assert.equal(leads.normalizeEmail('  Ana.Lopez@GMAIL.com '), 'ana.lopez@gmail.com');
});

test('normalizeEmail no rompe con entradas no string', () => {
    assert.equal(leads.normalizeEmail(undefined), '');
    assert.equal(leads.normalizeEmail(null), '');
    assert.equal(leads.normalizeEmail(42), '');
});

/* ── Stage 'recurso' ─────────────────────────────────────────── */

test('una descarga solo necesita correo y material', () => {
    const res = leads.validateLead({
        stage: 'recurso',
        email: 'Ana@Gmail.com',
        resource: 'guia-tecnicas-de-estudio'
    });

    assert.ok(res.ok, 'debería validar: ' + JSON.stringify(res.errors));
    assert.equal(res.value.stage, 'recurso');
    assert.equal(res.value.email, 'ana@gmail.com');
    assert.equal(res.value.resource, 'guia-tecnicas-de-estudio');
});

test('una descarga NO exige telefono ni nombre', () => {
    const res = leads.validateLead({
        stage: 'recurso',
        email: 'ana@gmail.com',
        resource: 'guia'
    });

    assert.ok(res.ok);
    assert.equal(res.value.phone, '');
    assert.equal(res.value.name, '');
});

test('una descarga sin correo se rechaza', () => {
    const res = leads.validateLead({ stage: 'recurso', resource: 'guia' });

    assert.ok(!res.ok);
    assert.ok(res.errors.includes('email'));
});

test('una descarga sin material se rechaza', () => {
    const res = leads.validateLead({ stage: 'recurso', email: 'ana@gmail.com' });

    assert.ok(!res.ok);
    assert.ok(res.errors.includes('resource'));
});

test('el correo se sanea igual que el resto: sin saltos de linea', () => {
    /* Un \n metido a mano rompería el JSONL y contaminaría la
       siguiente línea del archivo de leads. */
    const res = leads.validateLead({
        stage: 'recurso',
        email: 'ana@gmail.com\nfalso@x.com',
        resource: 'guia'
    });

    if (res.ok) {
        assert.ok(!res.value.email.includes('\n'));
    } else {
        assert.ok(res.errors.includes('email'));
    }
});

/* ── No romper el contrato anterior ──────────────────────────── */

test('una cita sigue exigiendo telefono', () => {
    const res = leads.validateLead({
        stage: 'contacto',
        name: 'Ana',
        email: 'ana@gmail.com'   // tener correo no exime del teléfono
    });

    assert.ok(!res.ok);
    assert.ok(res.errors.includes('phone'));
});

test('en una cita el correo es opcional', () => {
    const res = leads.validateLead({
        stage: 'contacto',
        name: 'Ana Lopez',
        phone: '4491234567'
    });

    assert.ok(res.ok, 'debería validar sin correo');
    assert.equal(res.value.email, '');
});

test('en una cita un correo mal escrito se reporta', () => {
    const res = leads.validateLead({
        stage: 'contacto',
        name: 'Ana Lopez',
        phone: '4491234567',
        email: 'ana@gmail'
    });

    assert.ok(!res.ok);
    assert.ok(res.errors.includes('email'));
});

test('un stage inventado cae en contacto, no en recurso', () => {
    /* Importante: si un stage desconocido cayera en 'recurso', un
       cliente podría saltarse la exigencia de teléfono. */
    const res = leads.validateLead({ stage: 'loquesea', email: 'a@b.com' });

    assert.ok(!res.ok);
    assert.ok(res.errors.includes('phone'));
});

/* ── Aviso ───────────────────────────────────────────────────── */

test('el aviso de descarga no ofrece WhatsApp vacio', () => {
    const msg = leads.formatMessage({
        stage: 'recurso',
        email: 'ana@gmail.com',
        resource: 'guia-tecnicas-de-estudio',
        name: '',
        phone: '',
        course: 'No especificado',
        page: '/blog-x'
    });

    assert.ok(msg.includes('ana@gmail.com'));
    assert.ok(msg.includes('guia-tecnicas-de-estudio'));
    assert.ok(!msg.includes('WhatsApp'));
    assert.ok(!msg.includes('wa.me'));
});

test('el aviso de cita incluye el correo cuando existe', () => {
    const msg = leads.formatMessage({
        stage: 'confirmado',
        name: 'Ana',
        phone: '4491234567',
        email: 'ana@gmail.com',
        course: 'Fotolectura',
        date: '2026-09-01',
        time: '10:00',
        page: '/fotolectura'
    });

    assert.ok(msg.includes('Correo: ana@gmail.com'));
    assert.ok(msg.includes('WhatsApp'));
});
