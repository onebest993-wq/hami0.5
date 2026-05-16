import type { CaseEvent } from '../types';

const pad2 = (n: number) => String(n).padStart(2, '0');
const formatDmy = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

export function formatDateText(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') {
        const isoOrYmd = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoOrYmd) {
            const [y, m, d] = isoOrYmd[1].split('-');
            return `${d}/${m}/${y}`;
        }
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-');
        return `${d}/${m}/${y}`;
    }
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return formatDmy(d);
}

export function formatDateTimeText(value: unknown): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return `${formatDmy(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatTimeText(value: unknown): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(d.getTime())) return '';
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function eventDayKey(value: unknown): string {
    const d = value instanceof Date ? value : new Date(String(value || ''));
    if (Number.isNaN(d.getTime())) return 'unknown';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function eventKindMeta(kind: CaseEvent['kind']) {
    if (kind === 'system') {
        return {
            label: 'نظام',
            badge: 'bg-violet-500/15 border-violet-500/25 text-violet-100',
            dot: 'bg-violet-400 ring-violet-400/30',
        };
    }
    if (kind === 'edit') {
        return {
            label: 'تعديل',
            badge: 'bg-cyan-500/15 border-cyan-500/25 text-cyan-100',
            dot: 'bg-cyan-400 ring-cyan-400/30',
        };
    }
    return {
        label: 'إجراء',
        badge: 'bg-amber-500/15 border-amber-500/25 text-amber-100',
        dot: 'bg-amber-400 ring-amber-400/30',
    };
}

export function cassationDecisionText(v: unknown): string {
    const s = String(v || '').trim();
    if (s === 'confirmed') return 'تصديق القرار';
    if (s === 'canceled' || s === 'modified') return 'نقض القرار';
    return '—';
}

export function formatRequestNumberText(rawNumber: unknown, rawRequestDate: unknown): string {
    const raw = String(rawNumber ?? '').trim();
    if (!raw) return '';
    const dateText = String(rawRequestDate ?? '').trim();
    const yearFromDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? dateText.split('-')[0] : '';
    const tokens = raw
        .split(/[\/\-]/g)
        .map((t) => t.trim())
        .filter(Boolean);
    const yearToken = tokens.find((t) => /^\d{4}$/.test(t)) || yearFromDate;
    const numberToken = [...tokens].reverse().find((t) => /^\d+$/.test(t));
    if (!yearToken || !numberToken) return raw;
    return `${String(Number(numberToken))} / ولائي / ${yearToken}`;
}
