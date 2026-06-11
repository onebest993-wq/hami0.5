import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import twilio from "npm:twilio";

import * as kv from './kv_store.tsx';

const app = new Hono();

// --- MIDDLEWARE ---
app.use('*', logger(console.log));
app.use('*', cors());

// --- RAG MEMORY (disabled in V1 — returns empty matches) ---
app.post('/make-server-f09713ba/legal-memory-search', async (c) => {
    return c.json({ matches: [], count: 0, disabled: true });
});

// --- 2. TWILIO COMMS ROUTE (WITH MOCK) ---
app.post('/make-server-f09713ba/comms-dispatcher', async (c) => {
    try {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

        const { to, message, channel } = await c.req.json();

        if (!accountSid || !authToken || !fromNumber) {
            console.log(`[Mock SMS] Sending to ${to}: ${message}`);
            await new Promise(r => setTimeout(r, 1000));
            return c.json({ 
                success: true, 
                sid: `SM${Date.now()}MOCK`, 
                warning: "Mock Mode: Twilio keys missing" 
            });
        }

        const client = twilio(accountSid, authToken);
        
        let result;
        if (channel === 'sms') {
            result = await client.messages.create({ body: message, from: fromNumber, to: to });
        } else if (channel === 'whatsapp') {
            result = await client.messages.create({ body: message, from: `whatsapp:${fromNumber}`, to: `whatsapp:${to}` });
        }

        return c.json({ success: true, sid: result.sid });

    } catch (e: any) {
        console.error("Twilio Error:", e);
        return c.json({ error: e.message }, 500);
    }
});


// --- KV PROXY (BRIDGE TO DATABASE) ---
// 🔐 محمي بـ JWT + key scoping منذ الإصلاح الأمني.
// كل مفتاح/prefix يجب أن يخص المستخدم نفسه؛ يُمنع الوصول لمفاتيح أي شخص آخر
// أو لمفاتيح عامة غير مُعرَّفة في الـ whitelist.
const kvProxySupabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * فحص ملكية المفتاح. نقسّمها لثلاث فئات:
 *
 *   PRIVATE (يجب احتواء userId): يُسمح فقط إن كان المفتاح يحوي userId الخاص بالمستخدم في الموضع المتوقع.
 *   - `user:${u}:...`, `calendar:${u}:...`, `lawyer_files:${u}:...`
 *   - `urgentActions:${u}:...`, `transactions:${u}:...`, `transactionsThreading:${u}:...`
 *   - `notifications:${u}:...`, `notifications_${u}`
 *   - `vault:docs:${u}:...` (authorId)
 *   - `follow:${u}:${otherUserId}` (followerId === u)
 *   - `hami:push:${u}`, `hami:calendar:events:${u}:v1`
 *
 *   READABLE_GLOBAL (مُتاح للجميع للقراءة، الكتابة محمية بطبقة API منفصلة):
 *   - `community:posts:...`, `community:reports:...`
 *   - `repository:docs:...`
 *   - `banned:users:...` (للأدمن يقرأ، حالياً نمنع كتابة عبر هذا proxy)
 */
function isKeyOwnedBy(rawKey: unknown, userId: string, op: 'read' | 'write'): boolean {
    if (typeof rawKey !== 'string' || !rawKey || !userId) return false;
    const k = rawKey;
    const u = userId;

    // PRIVATE keys — يجب احتواء userId
    if (k.startsWith(`user:${u}:`)) return true;
    if (k.startsWith(`calendar:${u}:`)) return true;
    if (k.startsWith(`lawyer_files:${u}:`)) return true;
    if (k.startsWith(`urgentActions:${u}:`)) return true;
    if (k.startsWith(`transactions:${u}:`)) return true;
    if (k.startsWith(`transactionsThreading:${u}:`)) return true;
    if (k.startsWith(`notifications:${u}:`)) return true;
    if (k === `notifications_${u}`) return true;
    if (k.startsWith(`vault:docs:${u}:`)) return true;
    if (k === `hami:push:${u}`) return true;
    if (k === `hami:calendar:events:${u}:v1`) return true;
    // follow:${followerId}:${followingId} — الكتابة فقط لو المُتابِع هو نفسه
    if (k.startsWith(`follow:${u}:`)) return true;

    // READABLE_GLOBAL — قراءة فقط
    if (op === 'read') {
        if (k.startsWith('community:posts:')) return true;
        if (k.startsWith('community:reports:')) return true;
        if (k.startsWith('repository:docs:')) return true;
        if (k.startsWith('banned:users:')) return true;
        // قراءة follow لطرف ثانٍ (للتحقق إن كان X يتابع Y)
        if (k.startsWith('follow:')) return true;
    }

    return false;
}

function isPrefixOwnedBy(rawPrefix: unknown, userId: string): boolean {
    if (typeof rawPrefix !== 'string' || !rawPrefix || !userId) return false;
    const p = rawPrefix;
    const u = userId;
    if (p.startsWith(`user:${u}:`)) return true;
    if (p.startsWith(`calendar:${u}:`)) return true;
    if (p.startsWith(`lawyer_files:${u}:`)) return true;
    if (p.startsWith(`urgentActions:${u}:`)) return true;
    if (p.startsWith(`transactions:${u}:`)) return true;
    if (p.startsWith(`notifications:${u}:`)) return true;
    if (p.startsWith(`vault:docs:${u}:`)) return true;
    // global readable prefixes — للقوائم العامة فقط
    if (p === 'community:posts:' || p.startsWith('community:posts:')) return true;
    if (p === 'community:reports:' || p.startsWith('community:reports:')) return true;
    if (p === 'repository:docs:' || p.startsWith('repository:docs:')) return true;
    return false;
}

async function extractUserIdFromAuth(c: any): Promise<string | null> {
    const authHeader = c.req.header('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    // ملاحظة: نتجاهل anon key (لا يحوي sub) — نطلب JWT حقيقي للمستخدم
    try {
        const { data, error } = await kvProxySupabase.auth.getUser(token);
        if (error || !data?.user?.id) return null;
        return data.user.id;
    } catch {
        return null;
    }
}

app.post('/make-server-f09713ba/kv-proxy', async (c) => {
    try {
        // 1) المصادقة الإجبارية
        const userId = await extractUserIdFromAuth(c);
        if (!userId) {
            return c.json({ error: 'Unauthorized: valid user JWT required' }, 401);
        }

        const { action, key, value, prefix } = await c.req.json();

        // 2) فحص ownership قبل أي عملية
        let result;
        switch (action) {
            case 'set': {
                if (!isKeyOwnedBy(key, userId, 'write')) {
                    return c.json({ error: 'Forbidden: key not owned by current user' }, 403);
                }
                await kv.set(key, value);
                result = { success: true };
                break;
            }
            case 'get': {
                if (!isKeyOwnedBy(key, userId, 'read')) {
                    return c.json({ error: 'Forbidden: key not readable by current user' }, 403);
                }
                result = await kv.get(key);
                break;
            }
            case 'getByPrefix': {
                if (!isPrefixOwnedBy(prefix, userId)) {
                    return c.json({ error: 'Forbidden: prefix not scoped to current user' }, 403);
                }
                result = await kv.getByPrefix(prefix);
                break;
            }
            case 'del': {
                if (!isKeyOwnedBy(key, userId, 'write')) {
                    return c.json({ error: 'Forbidden: key not owned by current user' }, 403);
                }
                await kv.del(key);
                result = { success: true };
                break;
            }
            default:
                return c.json({ error: `Unknown action: ${action}` }, 400);
        }
        if (result === undefined) result = null;
        return c.json(result);
    } catch (e: any) {
        console.error("KV Proxy Error:", e.message);
        return c.json({ error: e.message }, 500);
    }
});

// === 🛡️ W.I.F.E PROTOCOL: DIAGNOSTIC & ACCESS MANAGEMENT ROUTES ===

/**
 * CRITICAL BACKEND LOGIC: ADVANCED TRAFFIC ROUTING & ACCESS MANAGEMENT
 * 
 * Purpose: Automatically detect and restrict unverified automated traffic
 * Strategy: Diagnostic honeypot routes that log and block suspicious IPs
 */

// In-Memory IP Blocklist (In Production: Use Redis/Database)
const blockedIPs = new Set<string>();
const accessLog: Array<{
    ip: string;
    route: string;
    timestamp: string;
    action: 'RESTRICTED' | 'ROUTED_TO_DIAGNOSTICS' | 'ALLOWED';
    headers: Record<string, string>;
}> = [];

/**
 * Extract client IP from request
 */
function getClientIP(request: Request): string {
    // Check common proxy headers first
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP;
    
    // Fallback to connection info (Deno Deploy)
    const connInfo = (request as any).connInfo;
    if (connInfo?.remoteAddr) {
        return connInfo.remoteAddr.hostname || 'unknown';
    }
    
    return 'unknown';
}

/**
 * Log access attempt to diagnostic log
 */
function logAccess(
    ip: string, 
    route: string, 
    action: 'RESTRICTED' | 'ROUTED_TO_DIAGNOSTICS' | 'ALLOWED',
    headers: Headers
) {
    const logEntry = {
        ip,
        route,
        timestamp: new Date().toISOString(),
        action,
        headers: {
            'user-agent': headers.get('user-agent') || 'unknown',
            'referer': headers.get('referer') || 'none',
            'origin': headers.get('origin') || 'none'
        }
    };
    
    accessLog.push(logEntry);
    
    // Keep only last 1000 entries
    if (accessLog.length > 1000) {
        accessLog.shift();
    }
    
    console.log(`🛡️ [W.I.F.E] ${action}: ${ip} → ${route}`);
}

/**
 * Middleware: Block restricted IPs
 */
async function wifeProtectionMiddleware(c: any, next: any) {
    const ip = getClientIP(c.req.raw);
    const path = new URL(c.req.url).pathname;
    
    // Check if IP is blocked
    if (blockedIPs.has(ip)) {
        logAccess(ip, path, 'RESTRICTED', c.req.raw.headers);
        
        // Return 444 No Response (Nginx-style silent drop)
        // In Hono, we simulate this with delayed empty response
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
        return new Response(null, { status: 444 });
    }
    
    await next();
}

// Apply middleware globally
app.use('*', wifeProtectionMiddleware);

/**
 * 🍯 DIAGNOSTIC HONEYPOT ROUTES
 * These routes auto-restrict IPs that access them
 */

// Route 1: System Diagnostics (Suspicious)
app.get('/api/v1/system/diagnostics', (c) => {
    const ip = getClientIP(c.req.raw);
    
    // Add to blocklist
    blockedIPs.add(ip);
    logAccess(ip, '/api/v1/system/diagnostics', 'ROUTED_TO_DIAGNOSTICS', c.req.raw.headers);
    
    // Return fake diagnostic data (200 OK to avoid suspicion)
    return c.json({
        status: 'healthy',
        version: '1.0.0',
        uptime: Math.floor(Math.random() * 86400),
        memory: { used: '125MB', total: '512MB' }
    });
});

// Route 2: Admin Health Check (Suspicious)
app.get('/api/admin/health', (c) => {
    const ip = getClientIP(c.req.raw);
    
    blockedIPs.add(ip);
    logAccess(ip, '/api/admin/health', 'ROUTED_TO_DIAGNOSTICS', c.req.raw.headers);
    
    return c.json({
        status: 'ok',
        timestamp: Date.now(),
        services: {
            database: 'connected',
            cache: 'connected',
            queue: 'running'
        }
    });
});

// Route 3: Environment Check (Critical Honeypot)
app.get('/.env-check', (c) => {
    const ip = getClientIP(c.req.raw);
    
    blockedIPs.add(ip);
    logAccess(ip, '/.env-check', 'ROUTED_TO_DIAGNOSTICS', c.req.raw.headers);
    
    console.error(`🚨 [CRITICAL] IP ${ip} attempted .env access!`);
    
    // Return fake empty response
    return c.text('# Empty config file\n', 200);
});

// Route 4: Database Admin (Honeypot)
app.all('/phpmyadmin', (c) => {
    const ip = getClientIP(c.req.raw);
    
    blockedIPs.add(ip);
    logAccess(ip, '/phpmyadmin', 'ROUTED_TO_DIAGNOSTICS', c.req.raw.headers);
    
    return c.text('404 Not Found', 404);
});

// Route 5: WordPress Admin (Common Bot Target)
app.all('/wp-admin', (c) => {
    const ip = getClientIP(c.req.raw);
    
    blockedIPs.add(ip);
    logAccess(ip, '/wp-admin', 'ROUTED_TO_DIAGNOSTICS', c.req.raw.headers);
    
    return c.text('404 Not Found', 404);
});

/**
 * 🔍 ADMIN ROUTE: View Access Log (Protected)
 */
app.get('/make-server-f09713ba/wife-diagnostics', (c) => {
    const authHeader = c.req.header('Authorization');
    const adminKey = Deno.env.get('ADMIN_ACCESS_KEY') || 'CHANGE_ME_IN_PRODUCTION';
    
    // Simple auth check
    if (authHeader !== `Bearer ${adminKey}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    
    return c.json({
        blockedIPsCount: blockedIPs.size,
        blockedIPs: Array.from(blockedIPs),
        recentAccess: accessLog.slice(-50), // Last 50 entries
        totalLogs: accessLog.length
    });
});

/**
 * 🔓 ADMIN ROUTE: Unblock IP
 */
app.post('/make-server-f09713ba/unblock-ip', async (c) => {
    const authHeader = c.req.header('Authorization');
    const adminKey = Deno.env.get('ADMIN_ACCESS_KEY') || 'CHANGE_ME_IN_PRODUCTION';
    
    if (authHeader !== `Bearer ${adminKey}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { ip } = await c.req.json();
    
    if (blockedIPs.has(ip)) {
        blockedIPs.delete(ip);
        console.log(`🔓 [W.I.F.E] Unblocked IP: ${ip}`);
        return c.json({ success: true, message: `IP ${ip} unblocked` });
    }
    
    return c.json({ success: false, message: 'IP not found in blocklist' });
});

// === END W.I.F.E PROTOCOL ===

// --- AUTO-SYNC ENDPOINT (حماية البيانات) ---
app.post('/make-server-f09713ba/sync', async (c) => {
    try {
        const { key, data, timestamp } = await c.req.json();
        
        if (!key || !data) {
            return c.json({ error: 'Missing key or data' }, 400);
        }

        console.log(`[AutoSync] Receiving sync for key: ${key} at ${new Date(timestamp).toISOString()}`);

        // حفظ البيانات في KV Store
        await kv.set(key, {
            data,
            timestamp,
            syncedAt: Date.now()
        });

        console.log(`[AutoSync] ✅ Successfully synced: ${key}`);

        return c.json({ 
            success: true, 
            key,
            timestamp: Date.now()
        });

    } catch (e: any) {
        console.error('[AutoSync] Error:', e);
        return c.json({ error: e.message }, 500);
    }
});

// --- GET SYNCED DATA ENDPOINT ---
app.get('/make-server-f09713ba/sync/:key', async (c) => {
    try {
        const key = c.req.param('key');
        
        if (!key) {
            return c.json({ error: 'Missing key' }, 400);
        }

        console.log(`[AutoSync] Fetching synced data for key: ${key}`);

        const result = await kv.get(key);

        if (!result) {
            return c.json({ error: 'Key not found' }, 404);
        }

        return c.json({
            success: true,
            data: result.data,
            timestamp: result.timestamp,
            syncedAt: result.syncedAt
        });

    } catch (e: any) {
        console.error('[AutoSync] Error:', e);
        return c.json({ error: e.message }, 500);
    }
});

Deno.serve(app.fetch);