import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LegalRequest } from '@/app/types/admin-types';
import { RequestStatus } from '@/app/types/admin-types';
import { ClientRequestService } from '@/app/services/ClientRequestService';
import { getCommunityPosts, type CommunityPost } from '@/app/services/lawyer-cloud';

export type SecretaryAlertType = 'HEARING' | 'NOTE' | 'TASK' | 'REQUEST';
export type SecretaryAlertTarget = 'schedule' | 'notepad' | 'client_requests' | 'transactions' | 'community';

export interface SecretaryAlert {
  id: string;
  type: SecretaryAlertType;
  title: string;
  summary: string;
  dueAt?: string;
  suggestedAction?: string;
  aiDeepDive: string;
  target: SecretaryAlertTarget;
  priority: number;
  request?: LegalRequest;
  clientName?: string;
}

type RawNote = {
  id: string | number;
  title?: unknown;
  body?: unknown;
  text?: unknown;
  content?: unknown;
  isPinned?: unknown;
  date?: unknown;
  apptDate?: unknown;
  reminder_at?: unknown;
  createdAt?: unknown;
};

function normalizeDigits(input: string): string {
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
  };
  let out = '';
  for (const ch of input) out += map[ch] ?? ch;
  return out;
}

function parseDmyDate(value: string): number | null {
  const cleaned = normalizeDigits(value).replace(/[\u200e\u200f\u061c]/g, '').trim();
  const m = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s.*)?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const yearRaw = Number(m[3]);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function parseYmdDate(value: string): number | null {
  const cleaned = normalizeDigits(value).replace(/[\u200e\u200f\u061c]/g, '').trim();
  const m = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s.*)?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function parseDate(value: unknown): number | null {
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const ms = value < 10_000_000_000 ? value * 1000 : value;
    return ms;
  }
  if (typeof value !== 'string') return null;
  const cleaned = normalizeDigits(value).replace(/[\u200e\u200f\u061c]/g, '').trim();
  const iso = Date.parse(cleaned);
  if (!Number.isNaN(iso)) return iso;
  return parseYmdDate(cleaned) ?? parseDmyDate(cleaned);
}

function isSameDay(ts: number, now: Date): boolean {
  const d = new Date(ts);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isPinned(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function safeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t ? t : null;
}

function inferClientName(clientId: string): string {
  const names = ['عبد الله المنصور', 'شركة الأفق', 'سارة العزاوي', 'أحمد الجبوري', 'مجموعة الرافدين'];
  let hash = 0;
  for (let i = 0; i < clientId.length; i += 1) {
    hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0;
  }
  return names[hash % names.length] ?? 'موكل';
}

function buildHearingAlerts(files: FileData[], now: Date): SecretaryAlert[] {
  const nowMs = now.getTime();
  const within24h = nowMs + 24 * 60 * 60 * 1000;
  const out: SecretaryAlert[] = [];

  for (const f of files) {
    if (f.type !== 'lawsuit' || f.status !== 'active') continue;
    const candidates: Array<{ ts: number; label: string }> = [];

    const nextDateTs = parseDate(f.nextDate);
    if (nextDateTs !== null) candidates.push({ ts: nextDateTs, label: 'جلسة قريبة' });

    for (const h of f.history ?? []) {
      const dateTs = parseDate(h.date);
      if (dateTs === null) continue;
      const marker = `${h.stage} ${h.result}`.toLowerCase();
      if (marker.includes('جلس')) candidates.push({ ts: dateTs, label: h.stage || 'جلسة' });
    }

    const nearest = candidates
      .filter((c) => c.ts >= nowMs && c.ts <= within24h)
      .sort((a, b) => a.ts - b.ts)[0];
    if (!nearest) continue;

    out.push({
      id: `hearing:${f.id}:${nearest.ts}`,
      type: 'HEARING',
      title: `جلسة خلال 24 ساعة - ${f.caseNo}`,
      summary: `⚖️ ${f.court} • ${nearest.label}`,
      dueAt: new Date(nearest.ts).toISOString(),
      suggestedAction: 'مراجعة ملف الدعوى قبل الجلسة',
      aiDeepDive: `يوصي السكرتير الذكي بفتح ملف القضية ${f.caseNo} ومراجعة آخر المرافعات والمرفقات قبل موعد الجلسة.`,
      target: 'schedule',
      priority: 1,
    });
  }

  return out;
}

function buildTaskAlerts(files: FileData[], now: Date): SecretaryAlert[] {
  const out: SecretaryAlert[] = [];
  for (const f of files) {
    for (const t of f.tasks ?? []) {
      if (t.isCompleted) continue;
      const dueTs = parseDate(t.dueDate);
      if (dueTs === null) continue;
      if (!isSameDay(dueTs, now)) continue;
      out.push({
        id: `task:${f.id}:${t.id}`,
        type: 'TASK',
        title: `مهمة اليوم - ${f.caseNo}`,
        summary: t.title,
        dueAt: new Date(dueTs).toISOString(),
        suggestedAction: 'تنفيذ المهمة وتحديث الحالة',
        aiDeepDive: `هذه مهمة مرتبطة بالملف ${f.caseNo}. الأولوية متوسطة ويُفضّل إنجازها اليوم لتجنّب تراكم المهام.`,
        target: 'schedule',
        priority: 4,
      });
    }
  }
  return out;
}

function buildPinnedNotesAlerts(notes: RawNote[], now: Date): SecretaryAlert[] {
  const out: SecretaryAlert[] = [];
  for (const n of notes) {
    if (!isPinned(n.isPinned)) continue;
    const ts = parseDate(n.reminder_at ?? n.apptDate ?? n.date ?? n.createdAt);
    if (ts === null || !isSameDay(ts, now)) continue;
    const title = safeText(n.title) ?? 'ملاحظة مثبتة';
    const body = safeText(n.body) ?? safeText(n.text) ?? safeText(n.content) ?? 'تذكير يومي';
    out.push({
      id: `note:${String(n.id)}`,
      type: 'NOTE',
      title,
      summary: body,
      dueAt: new Date(ts).toISOString(),
      suggestedAction: 'فتح الملاحظات ومتابعة الإجراء',
      aiDeepDive: `هذه الملاحظة مثبتة ومجدولة لليوم. يوصى بالانتقال إلى قسم الملاحظات وتحديثها بعد التنفيذ.`,
      target: 'notepad',
      priority: 3,
    });
  }
  return out;
}

function buildTransactionAlerts(files: FileData[]): SecretaryAlert[] {
  const out: SecretaryAlert[] = [];
  for (const f of files) {
    if (f.type !== 'transaction' || f.status === 'deleted') continue;
    const hasMissingDocs = (f.images ?? []).length === 0;
    const isPaused = f.status === 'paused';
    if (!hasMissingDocs && !isPaused) continue;
    out.push({
      id: `tx:${f.id}`,
      type: 'TASK',
      title: `تنبيه معاملة - ${f.caseNo}`,
      summary: hasMissingDocs ? 'نقص مستندات في المعاملة' : 'المعاملة متوقفة وتحتاج متابعة',
      suggestedAction: hasMissingDocs ? 'رفع المستندات المطلوبة' : 'مراجعة سبب التوقف',
      aiDeepDive: `رصد السكرتير الذكي أن معاملة ${f.caseNo} تحتاج تدخلًا سريعًا لإكمال المستندات أو استئناف الحالة.`,
      target: 'transactions',
      priority: 4,
    });
  }
  return out;
}

function buildRequestAlerts(requests: LegalRequest[]): SecretaryAlert[] {
  return requests
    .filter((r) => r.status === RequestStatus.PENDING)
    .map((r) => ({
      id: `request:${r.id}`,
      type: 'REQUEST' as const,
      title: r.title || 'طلب توكيل جديد',
      summary: r.ai_metadata?.summary || r.smart_summary || 'طلب جديد ينتظر الرد',
      dueAt: r.ai_metadata?.deadline ?? r.due_at,
      suggestedAction: r.ai_metadata?.suggested_action ?? 'المراجعة والرد السريع',
      aiDeepDive: `تحليل أولي: ${r.ai_metadata?.summary ?? 'طلب جديد'}. التوصية: ${r.ai_metadata?.suggested_action ?? 'مراجعة الطلب وتحديد الإجراء المناسب'}.`,
      target: 'client_requests',
      priority: 2,
      request: r,
      clientName: inferClientName(r.client_id),
    }));
}

type CommunityPostLike = {
  id: string;
  content: string;
  upvotes: number;
  comments: Array<unknown>;
  isReported: boolean;
};

function clampText(value: string, maxLen: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1)}…`;
}

function scoreCommunityPost(p: CommunityPostLike): number {
  const reportedBoost = p.isReported ? 10_000 : 0;
  return reportedBoost + p.upvotes * 2 + p.comments.length * 3;
}

function toCommunityAlert(posts: CommunityPostLike[]): SecretaryAlert[] {
  const hot = posts
    .filter((p) => p.upvotes >= 10 || p.comments.length >= 5 || p.isReported === true)
    .sort((a, b) => scoreCommunityPost(b) - scoreCommunityPost(a))[0];
  if (!hot) return [];
  const snippet = hot.content ? clampText(hot.content, 80) : 'منشور ذو تفاعل مرتفع';
  const reasons = [
    hot.upvotes >= 10 ? `👍 ${hot.upvotes}` : null,
    hot.comments.length >= 5 ? `💬 ${hot.comments.length}` : null,
    hot.isReported ? '🚩 مُبلّغ عنه' : null,
  ].filter((x): x is string => x !== null);
  const reasonText = reasons.length ? reasons.join(' • ') : 'تفاعل مرتفع';
  return [
    {
      id: `community:${hot.id}`,
      type: 'TASK',
      title: 'نقاش ساخن في المنتدى',
      summary: `${reasonText} — ${snippet}`,
      suggestedAction: 'فتح المنتدى ومراجعة النقاش',
      aiDeepDive: `لوحظ تفاعل مرتفع على منشور مجتمعي. يُنصح بمراجعة الردود لتحديث الرأي القانوني وإدارة المخاطر المعرفية.`,
      target: 'community',
      priority: 4,
    },
  ];
}

function sortAlerts(alerts: SecretaryAlert[]): SecretaryAlert[] {
  return [...alerts].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ta = parseDate(a.dueAt) ?? Number.MAX_SAFE_INTEGER;
    const tb = parseDate(b.dueAt) ?? Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
}

export class SecretaryOrchestrator {
  static async getUnifiedAlerts(params: {
    lawyerId: string;
    files: FileData[];
    notes: RawNote[];
  }): Promise<SecretaryAlert[]> {
    const now = new Date();
    const [requests, communityRaw] = await Promise.all([
      ClientRequestService.getLawyerRequests(params.lawyerId).catch((): LegalRequest[] => []),
      getCommunityPosts().catch((): CommunityPost[] => []),
    ]);

    const community: CommunityPostLike[] = communityRaw.map((p) => {
      const upvotes = Array.isArray(p.upvoterIds) ? p.upvoterIds.length : 0;
      const comments = Array.isArray(p.comments) ? (p.comments as Array<unknown>) : [];
      const isReported = (() => {
        const x = p as unknown as Record<string, unknown>;
        if (x.isReported === true || x.isReported === 1) return true;
        if (typeof x.reportedCount === 'number' && Number.isFinite(x.reportedCount) && x.reportedCount > 0) return true;
        return false;
      })();
      return { id: p.id, content: p.content, upvotes, comments, isReported };
    });

    const alerts = [
      ...buildHearingAlerts(params.files, now),
      ...buildRequestAlerts(requests),
      ...buildPinnedNotesAlerts(params.notes, now),
      ...buildTaskAlerts(params.files, now),
      ...buildTransactionAlerts(params.files),
      ...toCommunityAlert(community),
    ];

    return sortAlerts(alerts);
  }
}
