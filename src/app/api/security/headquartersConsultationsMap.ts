export const HEADQUARTERS_CONSULTATIONS_CAP = 80;
export const HEADQUARTERS_CONSULTATION_REPLY_SCAN_CAP = 2000;
const CONTENT_PREVIEW_MAX = 2500;

export type HeadquartersConsultation = {
    id: string;
    name: string;
    content: string;
    time: string;
    isLawyer: boolean;
    pinned: boolean;
    locked: boolean;
    replyCount: number;
    offers: Array<{ lawyerName: string; price: number }>;
};

function clipText(value: unknown, max: number): string {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()
        .slice(0, Math.max(0, max));
}

function formatConsultationTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    try {
        return new Intl.DateTimeFormat('ar-IQ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(date);
    } catch {
        return date.toLocaleDateString('ar');
    }
}

export function mapHeadquartersConsultation(post: {
    id?: unknown;
    authorName?: unknown;
    isAnonymous?: unknown;
    content?: unknown;
    createdAt?: unknown;
    pinned?: unknown;
    locked?: unknown;
    comments?: unknown;
    replyCount?: unknown;
}): HeadquartersConsultation | null {
    const id = String(post.id ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim();
    if (!id || id.length > 80) return null;
    const anonymous = post.isAnonymous === true;
    const name = anonymous ? 'مجهول' : clipText(post.authorName, 80) || '—';
    const content = clipText(post.content, CONTENT_PREVIEW_MAX);
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const offers: HeadquartersConsultation['offers'] = [];
    for (const comment of comments) {
        if (!comment || typeof comment !== 'object') continue;
        const lawyerName = clipText((comment as { authorName?: unknown }).authorName, 80);
        offers.push({ lawyerName: lawyerName || '—', price: 0 });
    }
    const replyFromField = Number(post.replyCount);
    const replyCount =
        Number.isFinite(replyFromField) && replyFromField >= 0
            ? Math.min(Math.floor(replyFromField), 10_000)
            : offers.length;
    return {
        id,
        name,
        content,
        time: formatConsultationTime(String(post.createdAt ?? '')),
        isLawyer: false,
        pinned: post.pinned === true,
        locked: post.locked === true,
        replyCount,
        offers,
    };
}
