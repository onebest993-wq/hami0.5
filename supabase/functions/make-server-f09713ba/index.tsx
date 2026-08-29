import { Hono, type Context, type Next } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';

const app = new Hono();
const serverLog = (...args: unknown[]) => globalThis.console.log(...args);

type ConnectionInfoRequest = Request & {
    connInfo?: {
        remoteAddr?: {
            hostname?: string;
        };
    };
};

// --- MIDDLEWARE ---
app.use('*', logger(serverLog));
app.use('*', cors());

// KV proxy permanently retired on Edge. Same-origin /api/kv-proxy + WIFE only.
app.post('/make-server-f09713ba/kv-proxy', (c) => {
    return c.json(
        { error: 'Edge kv-proxy deprecated. Use same-origin /api/kv-proxy with WIFE signing.' },
        410,
    );
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
    const connInfo = (request as ConnectionInfoRequest).connInfo;
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
    
    serverLog(`🛡️ [W.I.F.E] ${action}: ${ip} → ${route}`);
}

/**
 * Middleware: Block restricted IPs
 */
async function wifeProtectionMiddleware(c: Context, next: Next) {
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
 * 🔍 ADMIN ROUTE: View Access Log (Protected — requires ADMIN_ACCESS_KEY env)
 */
app.get('/make-server-f09713ba/wife-diagnostics', (c) => {
    const adminKey = Deno.env.get('ADMIN_ACCESS_KEY')?.trim();
    if (!adminKey) {
        return c.json({ error: 'Admin diagnostics disabled (ADMIN_ACCESS_KEY not configured)' }, 503);
    }

    const authHeader = c.req.header('Authorization');
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
 * 🔓 ADMIN ROUTE: Unblock IP (requires ADMIN_ACCESS_KEY env)
 */
app.post('/make-server-f09713ba/unblock-ip', async (c) => {
    const adminKey = Deno.env.get('ADMIN_ACCESS_KEY')?.trim();
    if (!adminKey) {
        return c.json({ error: 'Admin unblock disabled (ADMIN_ACCESS_KEY not configured)' }, 503);
    }

    const authHeader = c.req.header('Authorization');
    if (authHeader !== `Bearer ${adminKey}`) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const { ip } = await c.req.json();
    
    if (blockedIPs.has(ip)) {
        blockedIPs.delete(ip);
        serverLog(`🔓 [W.I.F.E] Unblocked IP: ${ip}`);
        return c.json({ success: true, message: `IP ${ip} unblocked` });
    }
    
    return c.json({ success: false, message: 'IP not found in blocklist' });
});

// === END W.I.F.E PROTOCOL ===

// --- AUTO-SYNC (deprecated — was unauthenticated; client uses local SecureStore only) ---
app.post('/make-server-f09713ba/sync', (c) =>
    c.json(
        { error: 'Edge auto-sync deprecated and disabled. Use local SecureStore / WIFE-protected /api/kv-proxy.' },
        410,
    ),
);

app.get('/make-server-f09713ba/sync/:key', (c) =>
    c.json(
        { error: 'Edge auto-sync deprecated and disabled. Use local SecureStore / WIFE-protected /api/kv-proxy.' },
        410,
    ),
);

Deno.serve(app.fetch);
