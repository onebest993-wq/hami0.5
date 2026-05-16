import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai';
// --- INFRASTRUCTURE IMPORTS ---
import { Pinecone } from "npm:@pinecone-database/pinecone";
import twilio from "npm:twilio";

import * as kv from './kv_store.tsx';

const app = new Hono();
const AI_STRICT_MODE =
    String(Deno.env.get('AI_STRICT_MODE') || '').toLowerCase() === 'true' ||
    String(Deno.env.get('APP_ENV') || '').toLowerCase() === 'production' ||
    Boolean(Deno.env.get('DENO_DEPLOYMENT_ID'));

// --- MIDDLEWARE ---
app.use('*', logger(console.log));
app.use('*', cors());

// --- 1. PINECONE VECTOR ROUTE (RAG MEMORY) ---
app.post('/make-server-f09713ba/legal-memory-search', async (c) => {
    try {
        const pineconeKey = Deno.env.get('PINECONE_API_KEY');
        const indexHost = Deno.env.get('PINECONE_INDEX_HOST'); 
        const openaiKey = Deno.env.get('OPENAI_API_KEY');

        if (!pineconeKey || !indexHost || !openaiKey) {
            return c.json({ matches: [], count: 0, warning: "Search disabled: Missing keys" });
        }

        const pc = new Pinecone({ apiKey: pineconeKey });
        const index = pc.index(Deno.env.get('PINECONE_INDEX_NAME') || 'legal-vectors', indexHost);
        const openai = new OpenAI({ apiKey: openaiKey });

        const { query, filter, topK = 5 } = await c.req.json();

        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: query,
        });
        const vector = embeddingResponse.data[0].embedding;

        const queryResponse = await index.query({
            vector: vector,
            topK: topK,
            includeMetadata: true,
            filter: filter
        });

        return c.json({ 
            matches: queryResponse.matches,
            count: queryResponse.matches.length
        });

    } catch (e: any) {
        console.error("Pinecone/OpenAI Error:", e);
        return c.json({ error: e.message }, 500);
    }
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
app.post('/make-server-f09713ba/kv-proxy', async (c) => {
    try {
        const { action, key, value, prefix } = await c.req.json();
        let result;

        switch (action) {
            case 'set': await kv.set(key, value); result = { success: true }; break;
            case 'get': result = await kv.get(key); break;
            case 'getByPrefix': result = await kv.getByPrefix(prefix); break;
            case 'del': await kv.del(key); result = { success: true }; break;
            default: throw new Error(`Unknown action: ${action}`);
        }
        if (result === undefined) result = null;
        return c.json(result);
    } catch (e: any) {
        console.error("KV Proxy Error:", e.message);
        return c.json({ error: e.message }, 500);
    }
});

// --- SUPABASE CLIENT ---
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// --- OPENAI HELPERS ---
const transcribeWithWhisper = async (openai: OpenAI, audioBase64: string, mimeType: string) => {
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const file = new File([bytes], "recording.webm", { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "ar",
        prompt: "Legal terminology, Iraqi dialect"
    });
    return transcription.text;
};

// --- MOCK ENGINE (SIMULATION MODE) ---
// This runs when Google API is disabled/broken to prevent app crash
const getMockLegalResponse = (userParts: any[]) => {
    if (AI_STRICT_MODE) {
        throw new Error("AI strict mode enabled: mock responses are disabled in production.");
    }
    // Extract text from parts
    const text = userParts.map(p => p.text || "").join(" ").toLowerCase();
    
    console.log(">>> ENGAGING SIMULATION MODE (MOCK AI) <<<");

    // 1. DRAFT REQUESTS
    if (text.includes("drafttemplate") || text.includes("user scenario")) {
        if (text.includes("طلاق") || text.includes("تفريق") || text.includes("divorce")) {
            return JSON.stringify({
                detectedType: "دعوى تفريق للضرر",
                title: "عريضة دعوى تفريق (محاكاة)",
                legalContext: "استناداً لأحكام المادة 40 من قانون الأحوال الشخصية العراقي.",
                requiredFields: [{ key: "defendant", label: "اسم المدعى عليه", required: true }],
                draftTemplate: "السيد قاضي محكمة الأحوال الشخصية المحترم\n\nم/ تفريق للضرر\n\nالمدعي: الموكل\nالمدعى عليه: {defendant}\n\nجهة الدعوى:\nان المدعى عليه زوج موكلتنا الداخل بها شرعاً وقانوناً، وقد اضر بها ضرراً يتعذر معه استمرار الحياة الزوجية والمتمثل بـ [ذكر الضرر]...\n\nلذا نطلب دعوتكم للمرافعة والحكم بالتفريق.\n\nو. المدعي"
            });
        }
        
        return JSON.stringify({
            detectedType: "عريضة عامة (محاكاة)",
            title: "عريضة قانونية",
            legalContext: "نموذج عام (النظام يعمل في وضع المحاكاة لعدم تفعيل API)",
            requiredFields: [{ key: "subject", label: "الموضوع", required: true }],
            draftTemplate: "السيد القاضي المحترم\n\nم/ {subject}\n\nتحية طيبة...\n\nنرجو من عدالتكم الموقرة النظر في طلبنا هذا وفق القانون.\n\nو. المدعي"
        });
    }

    // 2. CHAT / CONSULTATION
    return JSON.stringify({
        summary: ["⚠️ تنبيه: خدمة الذكاء الاصطناعي غير مفعلة في حساب Google Cloud الخاص بك."],
        actions: [],
        legalWarnings: ["أنت تعمل الآن في وضع المحاكاة (Simulation Mode).", "يرجى زيارة console.developers.google.com لتفعيل Generative Language API."],
        reply: "عذراً، خدمة الذكاء الاصطناعي (Gemini API) غير مفعلة في مشروع Google Cloud الخاص بك (الخطأ 403). لقد قمت بالرد عليك من نظام المحاكاة الداخلي لضمان استمرار عمل التطبيق. يرجى تفعيل الخدمة للحصول على ردود حقيقية."
    });
};

// --- RAW GEMINI API CLIENT (SMART DISCOVERY) ---

const listModelsRaw = async (apiKey: string): Promise<string[]> => {
    const cleanKey = apiKey.trim();
    // Try v1beta first
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
    try {
        const res = await fetch(url);
        if (res.status === 403) throw new Error("API_DISABLED"); // Catch disabled API immediately
        if (!res.ok) return []; 
        const data = await res.json();
        if (!data.models) return [];
        
        return data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
            .map((m: any) => m.name.replace('models/', ''));
    } catch (e: unknown) {
        const error = e as Error;
        if (error.message === "API_DISABLED") throw e; // Re-throw to handle in main loop
        console.log("[INFO] Model discovery failed:", error.message);
        return [];
    }
};

const callGeminiRaw = async (apiKey: string, payload: any, model: string, version: string = 'v1beta') => {
    const cleanKey = apiKey.trim();
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${cleanKey}`;
    
    console.log(`[Direct API] Calling ${model} on ${version}...`);
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} | ${errorText}`);
    }

    const data = await response.json();
    try {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("No text content in response");
        return text;
    } catch (e) {
        console.error("Raw Response parsing failed:", JSON.stringify(data));
        throw e;
    }
};

// --- GEMINI CONTROLLER (ADAPTIVE + MOCK FALLBACK) ---
const generateContentWithFallback = async (apiKey: string, systemInstruction: string, userParts: any[]) => {
    const cleanKey = apiKey.trim();
    
    const payload = {
        contents: [{ role: "user", parts: userParts }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { responseMimeType: "application/json" }
    };

    // 1. DYNAMIC DISCOVERY
    let strategies = [];
    try {
        const availableModels = await listModelsRaw(cleanKey);
        console.log(`[Discovery] Key has access to: ${availableModels.join(', ') || 'Unknown'}`);

        if (availableModels.length > 0) {
            const preferFlash = availableModels.find(m => m.includes('gemini-1.5-flash'));
            const preferPro15 = availableModels.find(m => m.includes('gemini-1.5-pro'));
            const preferPro10 = availableModels.find(m => m.includes('gemini-pro') || m.includes('gemini-1.0-pro'));

            if (preferFlash) strategies.push({ model: preferFlash, version: 'v1beta' });
            if (preferPro15) strategies.push({ model: preferPro15, version: 'v1beta' });
            if (preferPro10) strategies.push({ model: preferPro10, version: 'v1beta' });
            
             availableModels.forEach(m => {
                if (!strategies.find(s => s.model === m)) strategies.push({ model: m, version: 'v1beta' });
            });
        }
    } catch (e: any) {
        if (e.message === "API_DISABLED") {
            console.error("CRITICAL: API DISABLED. Switching to Mock Mode.");
            if (AI_STRICT_MODE) throw new Error("API disabled and mock fallback is blocked by strict mode.");
            return getMockLegalResponse(userParts);
        }
    }

    if (strategies.length === 0) {
        // Fallback Strategies
        strategies = [
            { model: "gemini-1.5-flash", version: "v1beta" },
            { model: "gemini-1.5-pro", version: "v1beta" },
            { model: "gemini-pro", version: "v1" }
        ];
    }

    // 2. EXECUTE STRATEGIES
    let lastErrorDetails = "";
    for (const strat of strategies) {
        try {
            return await callGeminiRaw(cleanKey, payload, strat.model, strat.version);
        } catch (e: unknown) {
            const error = e as Error;
            console.log(`[INFO] Strategy [${strat.model}/${strat.version}] failed: ${error.message}`);
            lastErrorDetails = e.message;
            
            // IF PERMISSION DENIED -> FAIL FAST TO MOCK
            if (e.message.includes("403") || e.message.includes("PERMISSION_DENIED") || e.message.includes("SERVICE_DISABLED")) {
                 console.error("API Permission Denied. Switching to Mock.");
                 if (AI_STRICT_MODE) throw new Error("Gemini permission denied and mock fallback is blocked by strict mode.");
                 return getMockLegalResponse(userParts);
            }
        }
    }

    // 3. FINAL FALLBACK TO MOCK (Don't Crash)
    console.error(`All models failed. Last Error: ${lastErrorDetails}. Engaging Mock Mode.`);
    if (AI_STRICT_MODE) throw new Error("All models failed and mock fallback is blocked by strict mode.");
    return getMockLegalResponse(userParts);
};

const cleanAndParseJSON = (text: string) => {
    try {
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '');
        const firstOpenBrace = cleanText.indexOf('{');
        if (firstOpenBrace !== -1) cleanText = cleanText.substring(firstOpenBrace);
        const lastCloseBrace = cleanText.lastIndexOf('}');
        if (lastCloseBrace !== -1) cleanText = cleanText.substring(0, lastCloseBrace + 1);
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parse Failed. Raw Text:", text);
        // Fallback for chat responses that might not be JSON
        return { reply: text, summary: [], actions: [] };
    }
};

// --- KNOWLEDGE BASE ---
const LEGAL_KNOWLEDGE_BASE = `
# التقرير المرجعي الشامل: هندسة البنية المعرفية للنظام القضائي العراقي
(تم دمج المحتوى الكامل للقوانين العراقية...)
`;

const IRAQI_LEGAL_CONSTITUTION = `
أنت مساعد قانوني محايد.
التزم بالوقائع والنصوص المتاحة داخل الطلب فقط.
يُمنع التأليف أو ادعاء نصوص غير موجودة.
إذا لم تتوفر معلومات كافية، اذكر ذلك بوضوح.
`;

// --- ROUTES ---

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

app.get('/make-server-f09713ba/ai-health', async (c) => {
    const hasGemini = Boolean(Deno.env.get('GEMINI_API_KEY'));
    const hasOpenAi = Boolean(Deno.env.get('OPENAI_API_KEY'));
    return c.json({
        ok: hasGemini || hasOpenAi,
        strictMode: AI_STRICT_MODE,
        providers: {
            gemini: hasGemini,
            openai: hasOpenAi,
        },
        timestamp: new Date().toISOString(),
    });
});

app.post('/make-server-f09713ba/ai-legal-brain', async (c) => {
    try {
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            return c.json(
                { error: 'GEMINI_API_KEY is missing. AI service is unavailable in strict mode.' },
                503
            );
        }

        const body = await c.req.json();
        const { type, content } = body;
        
        let prompt = "";
        let userParts = [];

        if (type === 'text') {
            prompt = `
            ${IRAQI_LEGAL_CONSTITUTION}
            Task: Analyze based on Iraqi Law. Text: "${content}"
            Output JSON only: { "summary": [], "actions": [], "legalWarnings": [] }
            `;
            userParts.push({ text: prompt });
        }
        else if (type === 'image') {
            if (content === 'mock_image_data') {
                if (AI_STRICT_MODE) {
                    return c.json(
                        { error: 'Mock image payload is blocked in strict mode.' },
                        400
                    );
                }
                return c.json({
                    text: "نص تجريبي (Mock)",
                    docType: "وثيقة تجريبية",
                    suggestedFilename: "تجريبي.jpg",
                    actions: [],
                    legalWarnings: ["وضع تجريبي"]
                });
            }
            userParts.push({ text: `${IRAQI_LEGAL_CONSTITUTION}\nTask: OCR & Classify. Output JSON only.` });
            userParts.push({ inline_data: { mime_type: "image/jpeg", data: content } });
        }
        else if (type === 'draft_request') {
             prompt = `
            ${IRAQI_LEGAL_CONSTITUTION}
            User Scenario: "${content}"
            Output JSON only: { "detectedType": "...", "title": "...", "legalContext": "...", "requiredFields": [], "draftTemplate": "..." }
            `;
            userParts.push({ text: prompt });
        }

        const rawText = await generateContentWithFallback(apiKey, IRAQI_LEGAL_CONSTITUTION, userParts);
        return c.json(cleanAndParseJSON(rawText));

    } catch (e: any) {
        console.error("Server Error:", e);
        return c.json({ error: e.message }, 500);
    }
});

app.post('/make-server-f09713ba/predict-role', async (c) => {
    try {
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const { party1, court } = await c.req.json();

        if (!apiKey) return c.json({ legalReasoning: "No Key", firstPartyCorrection: party1, secondParty: "الطرف الثاني", caseType: "عام" });

        const prompt = `
        ${IRAQI_LEGAL_CONSTITUTION}
        Predict counterpart/case type. Party1: "${party1}", Court: "${court}".
        Output JSON only: { "legalReasoning": "...", "firstPartyCorrection": "...", "secondParty": "...", "caseType": "...", "sourceLink": "" }
        `;
        
        const rawText = await generateContentWithFallback(apiKey, IRAQI_LEGAL_CONSTITUTION, [{ text: prompt }]);
        return c.json(cleanAndParseJSON(rawText));
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

app.post('/make-server-f09713ba/chat', async (c) => {
    try {
        const geminiKey = Deno.env.get('GEMINI_API_KEY');
        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

        const body = await c.req.json();
        const { message, image, audio, audio_mime_type, caseContext, history, screen_type } = body;

        let systemPrompt = IRAQI_LEGAL_CONSTITUTION;
        
        // FORCE JSON OUTPUT FORMAT
        systemPrompt += `
        
        CRITICAL OUTPUT INSTRUCTION:
        You MUST return a raw JSON object only. No markdown formatting like \`\`\`json.
        Required JSON Structure:
        {
          "reply": "The detailed response text here",
          "summary": ["Key point 1", "Key point 2"],
          "actions": [{"id": "next_step", "label": "Suggested Action"}],
          "isDocument": false
        }
        `;

        if (screen_type === 'guard') systemPrompt += `\n\n[MODE: VISION SCANNER]`;
        else if (audio) systemPrompt += `\n\n[MODE: TRANSCRIPTION]`;
        else systemPrompt += `\n\n[MODE: LEGAL CONSULTANT] Context: ${JSON.stringify(caseContext || {})}`;

        // OpenAI Path
        if (openai) {
             try {
                if (audio) {
                    const transcript = await transcribeWithWhisper(openai, audio, audio_mime_type || "audio/webm");
                    const completion = await openai.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: `Transcribed: ${transcript}\n\nTask: Format as legal note.` }
                        ],
                        model: "gpt-4o",
                        response_format: { type: "json_object" }
                    });
                    return c.json(JSON.parse(completion.choices[0].message.content || "{}"));
                } else if (image || message) {
                     const messages: any[] = [{ role: "system", content: systemPrompt }];
                     if (history) history.forEach((h: any) => messages.push({ role: h.role, content: h.content }));
                     const contentParts: any[] = [];
                     if (message) contentParts.push({ type: "text", text: message });
                     if (image) contentParts.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } });
                     messages.push({ role: "user", content: contentParts });

                     const completion = await openai.chat.completions.create({
                        messages: messages,
                        model: "gpt-4o",
                        response_format: { type: "json_object" }
                    });
                    return c.json(JSON.parse(completion.choices[0].message.content || "{}"));
                }
            } catch (openaiError: unknown) {
                const error = openaiError as Error;
                console.log("[INFO] OpenAI Failed, falling back to Gemini:", error.message);
            }
        }

        // Gemini Path
        if (!geminiKey) {
             return c.json(
                { error: 'GEMINI_API_KEY is missing. Chat AI is unavailable in strict mode.' },
                503
             );
        }

        let conversationContext = "";
        if (history && history.length > 0) {
            conversationContext = "History:\n" + history.map((h: any) => `${h.role}: ${h.content}`).join("\n") + "\n\n";
        }

        const userParts = [];
        if (conversationContext) userParts.push({ text: conversationContext });
        if (message) userParts.push({ text: message });
        if (image) userParts.push({ inline_data: { mime_type: "image/jpeg", data: image } });
        if (audio) userParts.push({ inline_data: { mime_type: audio_mime_type || "audio/webm", data: audio } });

        const rawText = await generateContentWithFallback(geminiKey, systemPrompt, userParts);
        
        try { return c.json(cleanAndParseJSON(rawText)); } 
        catch { return c.json({ reply: rawText }); }

    } catch (e: any) {
        console.error("Chat Error:", e);
        return c.json({ error: e.message }, 500);
    }
});

// --- GEMINI LEGAL WIZARD ENDPOINT (for Client Wizard) ---
app.post('/make-server-f09713ba/gemini-legal-wizard', async (c) => {
    try {
        const apiKey = c.req.header('x-gemini-api-key') || Deno.env.get('GEMINI_API_KEY');
        const { message } = await c.req.json();

        if (!apiKey) {
            return c.json(
                { response: 'خدمة الذكاء الاصطناعي غير مفعّلة حالياً لعدم توفر المفتاح.', mockMode: false },
                503
            );
        }

        // Real Gemini Call
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `أنت مساعد قانوني عراقي متخصص. ساعد الموكل في شرح قضيته وتوجيهه.
الرسالة: ${message}

قدم إجابة مفيدة وواضحة باللغة العربية.`
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API Error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم أتمكن من فهم طلبك.';

        return c.json({ response: text, mockMode: false });

    } catch (e: any) {
        console.error('[Gemini Legal Wizard] Error:', e);
        return c.json({
            response: 'حدث خطأ في المعالجة. الرجاء المحاولة مرة أخرى.',
            error: e.message,
            mockMode: true
        }, 500);
    }
});

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