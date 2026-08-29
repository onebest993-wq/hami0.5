/**
 * SMTP لمقر القيادة — Node خالص حتى لا يعتمد الإرسال على حصة بريد Auth.
 * STARTTLS (587) أو TLS مباشر (465). لا يُسجَّل الرمز ولا كلمة المرور.
 */
import net from 'node:net';
import tls from 'node:tls';
import { readHqMailerEnv } from './adminMailerEnv.ts';
import { isResendTestFromAddress } from './adminMailerFrom.ts';

const SMTP_TIMEOUT_MS = 20_000;
const HOST_RE =
    /^(?:localhost|[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+)$/;

function getEnv(name: string): string {
    return readHqMailerEnv(name);
}

export type HqSmtpConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
};

export function extractSmtpMailbox(from: string): string {
    const trimmed = from.trim();
    const angled = trimmed.match(/<([^>]+@[^>]+)>/);
    if (angled?.[1]) return angled[1].trim();
    return trimmed;
}

export function resolveHqMailFrom(): string {
    const smtpUser = getEnv('EMAIL_SMTP_USER');
    const from = getEnv('EMAIL_FROM');
    if (isResendTestFromAddress(from) && smtpUser.includes('@')) {
        return smtpUser.includes('<') ? smtpUser : `Hami <${smtpUser}>`;
    }
    return from || getEnv('ADMIN_MASTER_EMAIL') || getEnv('VITE_ADMIN_MASTER_EMAIL');
}

export function readHqSmtpConfig(): HqSmtpConfig | null {
    const host = getEnv('EMAIL_SMTP_HOST');
    const user = getEnv('EMAIL_SMTP_USER');
    const pass = getEnv('EMAIL_SMTP_PASS');
    const from = resolveHqMailFrom();
    if (!HOST_RE.test(host) || !user || !pass || !from.includes('@')) return null;
    const rawPort = getEnv('EMAIL_SMTP_PORT');
    const port = rawPort ? Number.parseInt(rawPort, 10) : 587;
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
    const secureFlag = getEnv('EMAIL_SMTP_SECURE').toLowerCase();
    const secure = secureFlag === 'true' || secureFlag === '1' || port === 465;
    return { host, port, secure, user, pass, from };
}

export function isHqSmtpConfigured(): boolean {
    return readHqSmtpConfig() !== null;
}

/** Host/user/from جاهزة لكن رمز SMTP فارغ — السبب الحالي لفشل بوابة المقر محلياً. */
export function isHqSmtpMissingPass(): boolean {
    const host = getEnv('EMAIL_SMTP_HOST');
    const user = getEnv('EMAIL_SMTP_USER');
    const pass = getEnv('EMAIL_SMTP_PASS');
    const from = resolveHqMailFrom();
    return HOST_RE.test(host) && Boolean(user) && from.includes('@') && !pass;
}

function rfc2047(value: string): string {
    if (/^[\x20-\x7E]*$/.test(value)) return value;
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function b64Body(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
}

function stuffed(raw: string): string {
    return raw.replace(/^\./gm, '..');
}

export function buildHqSmtpMime(payload: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
}): string {
    const boundary = `hami-hq-${Date.now().toString(36)}`;
    const html = payload.html ?? `<pre>${payload.text}</pre>`;
    const fromHeader = payload.from.includes('<') ? payload.from : payload.from;
    return [
        `From: ${fromHeader}`,
        `To: ${payload.to}`,
        `Subject: ${rfc2047(payload.subject)}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        b64Body(payload.text),
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        b64Body(html),
        `--${boundary}--`,
        '',
    ].join('\r\n');
}

type SmtpReply = { code: number; text: string };

function readReply(socket: net.Socket): Promise<SmtpReply> {
    return new Promise((resolve, reject) => {
        let buf = '';
        const onData = (chunk: Buffer) => {
            buf += chunk.toString('utf8');
            const lines = buf.split(/\r?\n/);
            for (let i = 0; i < lines.length - 1; i += 1) {
                const line = lines[i];
                const match = line.match(/^(\d{3})([\s-])/);
                if (match && match[2] === ' ') {
                    cleanup();
                    resolve({ code: Number(match[1]), text: buf });
                    return;
                }
            }
        };
        const onError = (err: Error) => {
            cleanup();
            reject(err);
        };
        const cleanup = () => {
            socket.off('data', onData);
            socket.off('error', onError);
        };
        socket.on('data', onData);
        socket.once('error', onError);
    });
}

async function expectCode(socket: net.Socket, allowed: number[]): Promise<SmtpReply> {
    const reply = await readReply(socket);
    if (!allowed.includes(reply.code)) {
        throw new Error(`SMTP ${reply.code}`);
    }
    return reply;
}

function writeCmd(socket: net.Socket, line: string): void {
    socket.write(`${line}\r\n`);
}

function connectPlain(host: string, port: number): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
        const sock = net.connect({ host, port }, () => resolve(sock));
        sock.once('error', reject);
    });
}

function connectTls(host: string, port: number, socket?: net.Socket): Promise<tls.TLSSocket> {
    return new Promise((resolve, reject) => {
        const sock = tls.connect(
            socket
                ? { socket, host, servername: host, minVersion: 'TLSv1.2' }
                : { host, port, servername: host, minVersion: 'TLSv1.2' },
            () => resolve(sock),
        );
        sock.once('error', reject);
    });
}

async function authenticate(socket: net.Socket, user: string, pass: string): Promise<void> {
    writeCmd(socket, 'AUTH LOGIN');
    await expectCode(socket, [334]);
    writeCmd(socket, Buffer.from(user, 'utf8').toString('base64'));
    await expectCode(socket, [334]);
    writeCmd(socket, Buffer.from(pass, 'utf8').toString('base64'));
    await expectCode(socket, [235, 250]);
}

async function sendHqSmtpMailUnbound(payload: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}): Promise<void> {
    const cfg = readHqSmtpConfig();
    if (!cfg) throw new Error('SMTP not configured');
    const envelopeFrom = extractSmtpMailbox(cfg.from);
    const mime = stuffed(
        buildHqSmtpMime({
            from: cfg.from,
            to: payload.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
        }),
    );

    let socket: net.Socket | tls.TLSSocket | null = null;
    try {
        socket = cfg.secure
            ? await connectTls(cfg.host, cfg.port)
            : await connectPlain(cfg.host, cfg.port);

        await expectCode(socket, [220]);
        writeCmd(socket, 'EHLO hami-hq');
        await expectCode(socket, [250]);

        if (!cfg.secure) {
            writeCmd(socket, 'STARTTLS');
            await expectCode(socket, [220]);
            socket = await connectTls(cfg.host, cfg.port, socket);
            writeCmd(socket, 'EHLO hami-hq');
            await expectCode(socket, [250]);
        }

        await authenticate(socket, cfg.user, cfg.pass);
        writeCmd(socket, `MAIL FROM:<${envelopeFrom}>`);
        await expectCode(socket, [250]);
        writeCmd(socket, `RCPT TO:<${payload.to}>`);
        await expectCode(socket, [250, 251]);
        writeCmd(socket, 'DATA');
        await expectCode(socket, [354]);
        socket.write(`${mime}\r\n.\r\n`);
        await expectCode(socket, [250]);
        writeCmd(socket, 'QUIT');
        await expectCode(socket, [221, 250]).catch(() => undefined);
    } finally {
        socket?.destroy();
    }
}

export async function sendHqSmtpMail(payload: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        await Promise.race([
            sendHqSmtpMailUnbound(payload),
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error('SMTP timeout')), SMTP_TIMEOUT_MS);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}
