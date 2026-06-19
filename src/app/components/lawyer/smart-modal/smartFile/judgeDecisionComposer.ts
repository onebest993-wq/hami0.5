export interface PetitionDecisionSource {
    requestType?: string;
    subject?: string;
    status?: string;
    type?: string;
    reason?: string;
}

/** Common judge decision snippets — removed from UI; use judgeDecisionTemplates for user-owned chips. */
export function formatPetitionDecisionLine(p: PetitionDecisionSource): string {
    const type = String(p.requestType || p.type || 'طلب مستعجل').trim();
    const subject = String(p.subject || p.reason || '').trim();
    const status = String(p.status || '').trim();
    const core = subject ? `${type}: ${subject}` : type;
    return status ? `⚡ ${core} — ${status}` : `⚡ ${core}`;
}

export interface AttachmentDecisionSource {
    attachedProperty?: string;
    status?: string;
}

export function formatAttachmentDecisionLine(a: AttachmentDecisionSource): string {
    const title = String(a.attachedProperty || 'حجز احتياطي').trim();
    const status = String(a.status || '').trim();
    return status ? `🔒 ${title} — ${status}` : `🔒 ${title}`;
}

export function appendJudgeDecisionLine(current: string, line: string): string {
    const trimmed = String(line ?? '').trim();
    if (!trimmed) return current;
    const base = String(current ?? '').trimEnd();
    if (!base) return trimmed;
    if (base.includes(trimmed)) return base;
    return `${base}\n${trimmed}`;
}
