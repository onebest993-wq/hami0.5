import { AUTO_REDACTION_TOKEN } from './constants';

export function applyAutoRedaction(input: string) {
  let out = input;
  let changed = false;

  const emailRegex = /([a-zA-Z0-9._%+-]{1,64})@([a-zA-Z0-9.-]{1,253})\.([a-zA-Z]{2,24})/g;
  out = out.replace(emailRegex, () => {
    changed = true;
    return AUTO_REDACTION_TOKEN;
  });

  const iraqMobileRegex = /(?:\+?964|0)?\s*7\d{2}[\s-]?\d{3}[\s-]?\d{4}/g;
  out = out.replace(iraqMobileRegex, () => {
    changed = true;
    return AUTO_REDACTION_TOKEN;
  });

  const longIdRegex = /(?:\d[\s-]?){10,16}/g;
  out = out.replace(longIdRegex, (m) => {
    const digits = m.replace(/[^\d]/g, '');
    if (digits.length < 10 || digits.length > 16) return m;
    changed = true;
    return AUTO_REDACTION_TOKEN;
  });

  return { redacted: out, changed };
}

export function normalizeTagLabel(label: string) {
  return label
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_]+/gu, '');
}

export function deriveTagsFromContent(content: string): string[] {
  const t = content.toLowerCase();
  const tags = new Set<string>();
  const add = (x: string) => tags.add(x.startsWith('#') ? x : `#${x}`);
  if (/(تنفيذ|حجز|بيع|مزايدة|منقول|عقار)/.test(t)) add('تنفيذ');
  if (/(جنائي|تحقيق|توقيف|جناية|جنحة|مخدرات)/.test(t)) add('جنائي');
  if (/(مدني|عقد|تعويض|تمليك|إزالة|شيوع)/.test(t)) add('مدني');
  if (/(أحوال|طلاق|نفقة|حضانة|مهر|ميراث)/.test(t)) add('أحوال_شخصية');
  if (/(شركات|شريك|مدير|مسؤولية|تسجيل)/.test(t)) add('شركات');
  if (/(عقار|عقاري|طابو|أميرية)/.test(t)) add('عقاري');
  return Array.from(tags);
}

export function formatRelativeTime(iso: string) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'الآن';
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `قبل ${d} يوم`;
}
