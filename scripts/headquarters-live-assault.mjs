#!/usr/bin/env node
/**
 * Live HQ assault — loopback only. Unsigned / foreign-origin / spoof-cookie probes.
 * Expect 401/403/429 (or anonymous session 200). Never treats 2xx HQ mutation as success.
 *
 *   node scripts/headquarters-live-assault.mjs
 */
const base = (process.env.HQ_ASSAULT_BASE_URL || 'http://127.0.0.1:8080').trim().replace(/\/$/, '');
const host = new URL(base).hostname;
if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    console.error('Refusing non-loopback host');
    process.exit(1);
}

/** @type {{ id: string; ok: boolean; detail: string }[]} */
const results = [];

function denied(status) {
    return status === 401 || status === 403 || status === 429;
}

async function hit(id, path, init, assertFn) {
    try {
        const res = await fetch(`${base}${path}`, init);
        let body = null;
        try {
            body = await res.json();
        } catch {
            body = null;
        }
        const ok = assertFn(res, body);
        results.push({ id, ok, detail: `status=${res.status}` });
        console.log(`${ok ? '✓' : '✗'}  ${id}: status=${res.status}`);
        return { res, body };
    } catch (err) {
        results.push({ id, ok: false, detail: String(err) });
        console.log(`✗  ${id}: ${err}`);
        return { res: null, body: null };
    }
}

function jsonInit(method, body, extraHeaders = {}) {
    return {
        method,
        headers: {
            Accept: 'application/json',
            ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
            ...extraHeaders,
        },
        body: method === 'GET' || body === undefined ? undefined : JSON.stringify(body),
    };
}

const EVIL = { Origin: 'https://evil.example' };
const LOCAL = { Origin: `${base}` };
const SPOOF = {
    Origin: 'https://evil.example',
    Cookie: 'hami_access_token=eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.x',
    'x-wife-device-id': 'spoofed-device-01',
};

const HQ_SURFACE = [
    ['GET', '/api/admin/users'],
    ['GET', '/api/admin/stats'],
    ['GET', '/api/admin/status'],
    ['GET', '/api/admin/audit'],
    ['GET', '/api/admin/devices'],
    ['GET', '/api/admin/consultations'],
    ['GET', '/api/admin/verify'],
    ['GET', '/api/admin/otp/csrf'],
    ['GET', '/api/admin/otp/status?deviceFingerprint=livedevice1'],
    ['GET', '/api/forum/stats'],
    ['GET', '/api/forum/reports'],
    ['GET', '/api/forum/ban'],
    ['GET', '/api/auth/lawyer-verification?scope=pending'],
    ['POST', '/api/admin/ban', { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', updates: { is_banned: true } }],
    ['POST', '/api/admin/role', { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', role: 'admin' }],
    ['POST', '/api/admin/consultations', { postId: 'p1' }],
    ['POST', '/api/admin/consultations', { postId: 'p1', action: 'pin' }],
    ['POST', '/api/admin/devices', { action: 'revoke', deviceId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }],
    ['POST', '/api/forum/ban', { action: 'ban', userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', userName: 'x', reason: 'x' }],
    ['POST', '/api/forum/ban', { action: 'unban', userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }],
    ['POST', '/api/forum/reports', { action: 'dismiss', reportId: 'r1' }],
    ['POST', '/api/forum/reports', { action: 'dismiss_comment', reportId: 'cr1' }],
    ['POST', '/api/laws/add', { law_name: 'قانون التنفيذ', article_number: '1', content: 'x' }],
    ['POST', '/api/laws/clear', { law_name: 'قانون التنفيذ' }],
    ['POST', '/api/laws/import-bundle', { law_name: 'قانون التنفيذ', articles: [{ article_number: '1', content: 'x' }] }],
    ['POST', '/api/admin/otp/request', { deviceFingerprint: 'livedevice1' }],
    ['POST', '/api/admin/otp/verify', { deviceFingerprint: 'livedevice1', code: '000000' }],
    ['POST', '/api/audit/log', { action: 'hq:user.freeze' }],
    ['PATCH', '/api/auth/lawyer-verification', { userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', status: 'active' }],
];

async function probeSurface(label, headers) {
    for (const row of HQ_SURFACE) {
        const [method, path, body] = row;
        await hit(
            `${label} ${method} ${path}`,
            path,
            jsonInit(method, body, headers),
            (res, body) => {
                if (method === 'GET' && String(path).startsWith('/api/admin/otp/status')) {
                    if (denied(res.status)) return true;
                    return (
                        res.status === 200 &&
                        Boolean(body) &&
                        body.trusted === false &&
                        body.sessionRequired === true
                    );
                }
                return denied(res.status);
            },
        );
    }
}

async function main() {
    console.log(`\n== phase 0: anonymous session ==`);
    await hit('session-anonymous-evil-origin', '/api/auth/session', jsonInit('GET', undefined, EVIL), (res, body) => {
        return res.status === 200 && body && body.ok === true && body.user == null && !body.userId;
    });

    console.log(`\n== phase 1: foreign origin unsigned ==`);
    await probeSurface('evil', EVIL);

    console.log(`\n== phase 2: same-origin unsigned ==`);
    await probeSurface('local', LOCAL);

    console.log(`\n== phase 3: spoof cookie + device ==`);
    await hit(
        'spoof GET /api/admin/users',
        '/api/admin/users',
        jsonInit('GET', undefined, SPOOF),
        (res) => denied(res.status),
    );
    await hit(
        'spoof POST /api/admin/ban',
        '/api/admin/ban',
        jsonInit('POST', { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }, SPOOF),
        (res) => denied(res.status),
    );
    await hit(
        'spoof POST /api/admin/otp/request',
        '/api/admin/otp/request',
        jsonInit('POST', { deviceFingerprint: 'spoofed-device-01' }, SPOOF),
        (res) => denied(res.status),
    );

    console.log(`\n== phase 4: mixed parallel flood 80 ==`);
    const floodPaths = [
        ['POST', '/api/admin/ban', { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }],
        ['POST', '/api/admin/role', { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', role: 'admin' }],
        ['POST', '/api/laws/import-bundle', { law_name: 'قانون التنفيذ', articles: [{ article_number: '1', content: 'x' }] }],
        ['PATCH', '/api/auth/lawyer-verification', { userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', status: 'active' }],
    ];
    const flood = await Promise.all(
        Array.from({ length: 80 }, (_, i) => {
            const [method, path, body] = floodPaths[i % floodPaths.length];
            return fetch(`${base}${path}`, jsonInit(method, body, EVIL)).then((res) => res.status);
        }),
    );
    const floodOk = flood.every(denied);
    results.push({
        id: 'parallel-mixed-flood-80',
        ok: floodOk,
        detail: `statuses=${[...new Set(flood)].sort().join(',')}`,
    });
    console.log(`${floodOk ? '✓' : '✗'}  parallel-mixed-flood-80: ${[...new Set(flood)].join(',')}`);

    const blocked = (status) =>
        denied(status) || status === 400 || status === 404 || status === 405 || status === 413 || status === 415 || status === 501;

    console.log(`\n== phase 5: verb / content-type / origin-omission ==`);
    await hit('PUT /api/admin/ban', '/api/admin/ban', jsonInit('PUT', { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }, EVIL), (res) => blocked(res.status) && res.status !== 200);
    await hit('DELETE /api/admin/users', '/api/admin/users', jsonInit('DELETE', undefined, EVIL), (res) => blocked(res.status) && res.status !== 200);
    await hit(
        'POST ban text/plain',
        '/api/admin/ban',
        {
            method: 'POST',
            headers: { ...EVIL, 'Content-Type': 'text/plain', Accept: 'application/json' },
            body: JSON.stringify({ targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', updates: { is_banned: true } }),
        },
        (res) => blocked(res.status) && res.status !== 200,
    );
    await hit(
        'POST ban no-origin',
        '/api/admin/ban',
        jsonInit('POST', { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }, {}),
        (res) => denied(res.status),
    );
    await hit(
        'POST ban referer-only-evil',
        '/api/admin/ban',
        jsonInit('POST', { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }, { Referer: 'https://evil.example/steal' }),
        (res) => denied(res.status),
    );
    await hit(
        'POST ban method-override',
        '/api/admin/ban',
        jsonInit('POST', { targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }, { ...EVIL, 'X-HTTP-Method-Override': 'GET' }),
        (res) => denied(res.status),
    );
    await hit(
        'POST ban array-json',
        '/api/admin/ban',
        jsonInit('POST', ['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'], EVIL),
        (res) => denied(res.status),
    );

    console.log(`\n== phase 6: unicode audit / impersonation / traversal ==`);
    await hit(
        'audit fullwidth hq',
        '/api/audit/log',
        jsonInit('POST', { action: 'ｈｑ：user.freeze' }, EVIL),
        (res) => denied(res.status) || res.status === 400,
    );
    await hit(
        'verification POST spoof userId',
        '/api/auth/lawyer-verification',
        jsonInit('POST', { userId: 'a2532b41-add9-463f-9447-b6f933a79fea', hasIdFront: true, idFrontPreview: `data:image/jpeg;base64,${'A'.repeat(80)}` }, EVIL),
        (res) => denied(res.status),
    );
    await hit(
        'path traversal users',
        '/api/admin/users/../stats',
        jsonInit('GET', undefined, EVIL),
        (res) => blocked(res.status) && res.status !== 200,
    );
    await hit(
        'laws list unsigned',
        '/api/laws/list',
        jsonInit('POST', { law_name: 'قانون التنفيذ' }, EVIL),
        (res) => denied(res.status),
    );

    console.log(`\n== phase 7: oversized JSON ==`);
    const oversized = {
        targetUserId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        updates: { is_banned: true },
        junk: 'x'.repeat(180_000),
    };
    await hit(
        'POST ban 180kb',
        '/api/admin/ban',
        jsonInit('POST', oversized, EVIL),
        (res) => blocked(res.status) && res.status !== 200,
    );

    const failed = results.filter((row) => !row.ok);
    const passed = results.length - failed.length;
    console.log(`\nHQ live assault: ${passed}/${results.length} denied as expected`);
    if (failed.length) {
        for (const row of failed) console.error(`  fail ${row.id}: ${row.detail}`);
        process.exit(1);
    }
}

main();
