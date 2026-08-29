/**
 * قراءة متغيّرات بريد المقر من ملفات .env عند كل طلب (ليس في الاختبار).
 * حتى يعمل لصق EMAIL_SMTP_PASS دون إعادة تشغيل Vite.
 */
import fs from 'node:fs';
import path from 'node:path';

const MAILER_ENV_KEYS = [
    'RESEND_API_KEY',
    'EMAIL_HQ_DELIVER_TO',
    'EMAIL_FROM',
    'EMAIL_WEBHOOK_URL',
    'EMAIL_WEBHOOK_TOKEN',
    'EMAIL_SMTP_HOST',
    'EMAIL_SMTP_PORT',
    'EMAIL_SMTP_USER',
    'EMAIL_SMTP_PASS',
    'EMAIL_SMTP_SECURE',
    'ADMIN_MASTER_EMAIL',
    'VITE_ADMIN_MASTER_EMAIL',
    'WHATSAPP_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_OTP_TEMPLATE',
    'WHATSAPP_OTP_TEMPLATE_LANG',
    'WHATSAPP_GRAPH_VERSION',
    'WHATSAPP_WEBHOOK_URL',
    'WHATSAPP_WEBHOOK_TOKEN',
    'WHATSAPP_VIA_EMAIL_WEBHOOK',
    'HAMI_SUPPORT_WHATSAPP',
    'VITE_SUPPORT_WHATSAPP',
    'AUTH_OTP_PEPPER',
    'ADMIN_OTP_PEPPER',
] as const;

const ENV_FILES = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.development.local',
    '.env.production.local',
];

function parseEnvFile(contents: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const rawLine of contents.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

function isHqMailerEnvFileOverlayForbidden(): boolean {
    return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}

export function applyHqMailerEnvFromFiles(): void {
    if (isHqMailerEnvFileOverlayForbidden()) return;
    const merged: Record<string, string> = {};
    for (const rel of ENV_FILES) {
        const abs = path.join(process.cwd(), rel);
        try {
            if (!fs.existsSync(abs)) continue;
            Object.assign(merged, parseEnvFile(fs.readFileSync(abs, 'utf8')));
        } catch {
            /* ignore unreadable env files */
        }
    }
    for (const key of MAILER_ENV_KEYS) {
        if (Object.prototype.hasOwnProperty.call(merged, key)) {
            process.env[key] = merged[key];
        }
    }
}

export function readHqMailerEnv(name: string): string {
    applyHqMailerEnvFromFiles();
    const raw = process.env[name];
    return typeof raw === 'string' ? raw.trim() : '';
}
