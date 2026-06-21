import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  assertWifeSignatureRequest,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../security/wifeValidator.ts';
import { consumeRateLimitSlot } from '../security/wifeRateLimitStore.ts';
import { sanitizePayload } from '../security/sanitizer.ts';
import { wifeJsonResponse } from '../security/wifeSecurityHeaders.ts';

const MAX_MESSAGE_LENGTH = 1600;
const ALLOWED_CHANNELS = new Set(['sms', 'whatsapp']);

function getEnv(name: string): string {
  const raw = process.env[name];
  return typeof raw === 'string' ? raw.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/** Iraqi local 07XXXXXXXXX or E.164 +9647XXXXXXXXX */
function validateCommsPhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.replace(/\s+/g, '').trim();
  if (!normalized) return null;

  if (/^07[3-9]\d{8}$/.test(normalized)) {
    return `+964${normalized.slice(1)}`;
  }
  if (/^\+9647[3-9]\d{8}$/.test(normalized)) {
    return normalized;
  }
  if (/^9647[3-9]\d{8}$/.test(normalized)) {
    return `+${normalized}`;
  }
  return null;
}

async function dispatchTwilio(params: {
  to: string;
  message: string;
  channel: 'sms' | 'whatsapp';
}): Promise<{ success: true; sid: string; warning?: string }> {
  const accountSid = getEnv('TWILIO_ACCOUNT_SID');
  const authToken = getEnv('TWILIO_AUTH_TOKEN');
  const fromNumber = getEnv('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: true,
      sid: `SM${Date.now()}MOCK`,
      warning: 'Mock Mode: Twilio keys missing',
    };
  }

  const body = new URLSearchParams();
  if (params.channel === 'whatsapp') {
    body.set('From', `whatsapp:${fromNumber}`);
    body.set('To', `whatsapp:${params.to}`);
  } else {
    body.set('From', fromNumber);
    body.set('To', params.to);
  }
  body.set('Body', params.message);

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const basic = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = (await res.json().catch(() => null)) as { sid?: string; message?: string } | null;
  if (!res.ok) {
    throw new Error(data?.message ?? `Twilio HTTP ${res.status}`);
  }
  return { success: true, sid: String(data?.sid ?? `SM${Date.now()}`) };
}

/**
 * WIFE-protected comms BFF — replaces direct Edge calls with anon key.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
      return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    }
        const wifeBlock = await assertWifeSignatureRequest(request, userToken);
    if (wifeBlock) return wifeBlock;

    const subject = await getVerifiedTokenSubject(userToken);
    if (!subject) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

    const allowed = await consumeRateLimitSlot(subject, {
      scope: 'comms',
      maxRequests: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!allowed) {
      return wifeJsonResponse(429, { ok: false, error: 'Rate limit exceeded for comms' });
    }

    const rawPayload = (await request.json().catch(() => null)) as unknown;
    if (!isRecord(rawPayload)) {
      return wifeJsonResponse(400, { ok: false, error: 'Invalid JSON body' });
    }

    const sanitized = sanitizePayload(rawPayload) as Record<string, unknown>;
    const to = validateCommsPhone(sanitized.to);
    if (!to) {
      return wifeJsonResponse(400, { ok: false, error: 'Invalid Iraqi phone number' });
    }

    const channelRaw = typeof sanitized.channel === 'string' ? sanitized.channel.trim().toLowerCase() : 'sms';
    if (!ALLOWED_CHANNELS.has(channelRaw)) {
      return wifeJsonResponse(400, { ok: false, error: 'Invalid channel' });
    }
    const channel = channelRaw as 'sms' | 'whatsapp';

    let message = typeof sanitized.message === 'string' ? sanitized.message.trim() : '';
    if (!message) {
      return wifeJsonResponse(400, { ok: false, error: 'Message required' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      message = message.slice(0, MAX_MESSAGE_LENGTH);
    }

    const result = await dispatchTwilio({ to, message, channel });
    return wifeJsonResponse(200, { ok: true, success: true, sid: result.sid, warning: result.warning });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal comms error';
    return wifeJsonResponse(500, { ok: false, error: message });
  }
}
