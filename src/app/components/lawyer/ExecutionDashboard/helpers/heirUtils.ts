import type { ExecutionFile, Party } from '@/app/types/execution';
import { getPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👥 Heir Utilities - دوال مساعدة للورثة
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * دوال مساعدة للتعامل مع بيانات الورثة ومعالجتها
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface HeirDetailRow {
    rowId?: string;
    name: string;
    phone: string;
    address: string;
    isClient?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// HEIR UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * إنشاء معرف فريد لصف الوريث
 */
export function makeHeirRowId(): string {
    return `heir_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * التحقق مما إذا كانت تفاصيل الورثة تتضمن العميل
 */
export function heirsDetailsIncludeClient(heirsDetails: unknown): boolean {
    if (!Array.isArray(heirsDetails)) return false;
    return heirsDetails.some((h) => Boolean((h as { isClient?: boolean })?.isClient));
}

/**
 * حساب درجة اكتمال صف الوريث
 */
export function heirRowCompletenessScore(h: HeirDetailRow): number {
    return (/\S/.test(String(h.phone || '').trim()) ? 2 : 0) +
        (/\S/.test(String(h.address || '').trim()) ? 1 : 0);
}

/**
 * دمج صفوف الورثة: لا يتكرر (الاسم + الهاتف)؛ يُفضَّل الصف الأكمل ثم دمج الحقول الفارغة
 */
export function dedupeHeirDetailRowsByName(rows: HeirDetailRow[]): HeirDetailRow[] {
    const merged = rows.filter((h) => /\S/.test(String(h.name || '').trim()));
    const byNorm = new Map<string, HeirDetailRow>();
    
    for (const raw of merged) {
        const h: HeirDetailRow = {
            name: String(raw.name || '').trim(),
            phone: String(raw.phone || '').trim(),
            address: String(raw.address || '').trim(),
            isClient: Boolean((raw as HeirDetailRow).isClient),
        };
        
        const nk = h.name.toLowerCase().replace(/\s+/g, ' ').trim();
        const prev = byNorm.get(nk);
        
        if (!prev) {
            byNorm.set(nk, h);
            continue;
        }
        
        const sH = heirRowCompletenessScore(h);
        const sP = heirRowCompletenessScore(prev);
        const keep = sH > sP ? h : prev;
        const other = sH > sP ? prev : h;
        
        byNorm.set(nk, {
            name: keep.name,
            phone: keep.phone || other.phone,
            address: keep.address || other.address,
            isClient: Boolean(keep.isClient || other.isClient),
        });
    }
    
    return [...byNorm.values()];
}

/**
 * التحقق مما إذا كان صف الوريث يحتوي على أي نص
 */
export function heirRowHasAnyText(h: { name: string; phone: string; address: string }): boolean {
    return (
        /\S/.test(String(h.name || '')) ||
        /\S/.test(String(h.phone || '')) ||
        /\S/.test(String(h.address || ''))
    );
}

/** يجمع كل مصادر الورثة (الطرف + مسار الوفاة) دون إسقاط أسماء من `heirs[]` */
export function collectPartyHeirDetailRows(
    party: Party | null | undefined,
    file: ExecutionFile | null | undefined,
    partyKind: 'creditor' | 'debtor'
): HeirDetailRow[] {
    const bucket: HeirDetailRow[] = [];

    const push = (raw: Partial<HeirDetailRow>) => {
        const name = String(raw.name || '').trim();
        if (!/\S/.test(name)) return;
        bucket.push({
            name,
            phone: String(raw.phone || '').trim(),
            address: String(raw.address || '').trim(),
            isClient: Boolean(raw.isClient),
        });
    };

    if (party) {
        const details = (party as Party & { heirs_details?: unknown[] }).heirs_details;
        if (Array.isArray(details)) {
            details.forEach((h) => {
                const row = h as { name?: string; phone?: string; address?: string; isClient?: boolean };
                push({
                    name: row?.name,
                    phone: row?.phone,
                    address: row?.address,
                    isClient: row?.isClient,
                });
            });
        }
        (party.heirs || []).forEach((name) => push({ name: String(name || '') }));
    }

    const deathCase = getPartyDeathCaseForRole(file, partyKind);
    if (deathCase) {
        (deathCase.heir_details || []).forEach((h) => {
            push({
                name: h?.name,
                phone: h?.phone,
                address: h?.address,
                isClient: (h as { isClient?: boolean })?.isClient,
            });
        });
        (deathCase.heir_names || []).forEach((name) => push({ name: String(name || '') }));
    }

    return dedupeHeirDetailRowsByName(bucket);
}