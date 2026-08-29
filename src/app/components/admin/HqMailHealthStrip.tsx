import React from 'react';
import { cn } from '@/app/components/ui/utils';

export type HqMailHealth = {
    configured: boolean;
    channel: 'resend' | 'smtp' | 'webhook' | 'none' | string;
    mailboxMasked: string;
};

const CHANNEL_LABEL: Record<string, string> = {
    resend: 'Resend',
    smtp: 'SMTP',
    webhook: 'Webhook',
    none: 'غير مضبوط',
};

function channelLabel(raw: string): string {
    return CHANNEL_LABEL[raw] ?? '—';
}

export function HqMailHealthStrip({
    mail,
    checking = false,
    gated = false,
    variant = 'panel',
}: {
    mail?: HqMailHealth | null;
    checking?: boolean;
    gated?: boolean;
    variant?: 'panel' | 'cell';
}) {
    const pending = (checking || gated) && !mail;
    const configured = Boolean(mail?.configured);
    const channel = channelLabel(mail?.channel ?? 'none');
    const mailbox = mail?.mailboxMasked || '—';

    let title = configured ? 'قناة الإرسال جاهزة' : 'قناة الإرسال غير مضبوطة';
    let badge = configured ? 'جاهز' : 'يحتاج ضبط';
    let tone: 'ok' | 'warn' = configured ? 'ok' : 'warn';
    if (pending) {
        title = gated ? 'لم تُفحص قناة الإرسال' : 'جاري التحقق من قناة الإرسال';
        badge = gated ? 'بلا جلسة' : 'جاري التحقق';
        tone = 'warn';
    }

    const detail = pending
        ? 'يُستخدم لإرسال رمز دخول المقر فقط — لا تُرسل كلمات مرور.'
        : `${mailbox} · ${channel}`;

    if (variant === 'cell') {
        return (
            <div
                className={cn('hq-ops-pulse-cell', tone === 'ok' ? 'hq-ops-pulse-ok' : 'hq-ops-pulse-warn')}
                data-testid="hq-mail-health"
            >
                <p className="hq-ops-pulse-label">البريد الرسمي</p>
                <p className="hq-ops-pulse-value">{badge}</p>
                <p className="hq-ops-pulse-detail">{title}</p>
                <p className="hq-ops-pulse-detail" dir={pending ? undefined : 'ltr'}>
                    {detail}
                </p>
            </div>
        );
    }

    return (
        <div className="hq-panel flex flex-wrap items-center justify-between gap-3 p-4" data-testid="hq-mail-health">
            <div>
                <p className="hq-kicker">البريد الرسمي</p>
                <p className="mt-1 text-sm font-bold text-white">{title}</p>
                {pending ? null : (
                    <p className="mt-1 text-xs text-white/45" dir="ltr">
                        {mailbox} · {channel}
                    </p>
                )}
                <p className="mt-1 text-xs text-white/45">
                    يُستخدم لإرسال رمز دخول المقر فقط — لا تُرسل كلمات مرور.
                </p>
            </div>
            <span
                className={
                    pending
                        ? 'rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-bold text-gray-400'
                        : configured
                          ? 'rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400'
                          : 'rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400'
                }
            >
                {badge}
            </span>
        </div>
    );
}
