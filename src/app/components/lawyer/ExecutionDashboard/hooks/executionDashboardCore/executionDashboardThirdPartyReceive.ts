/** استلام أموال محجوزة لدى الغير — منطق نقي (موجة 8) */
import type { ThirdPartySeizureAsset } from '@/app/types/execution';
import { parseAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';

export type ThirdPartyReceiveValidation =
    | { ok: true; amountIqd: number }
    | { ok: false; message: string };

export function validateThirdPartyReceiveAmount(raw: string): ThirdPartyReceiveValidation {
    const amtRaw = String(raw || '').trim();
    if (!amtRaw) {
        return { ok: false, message: 'أدخل المبلغ الفعلي المستلم' };
    }
    const parsed = parseAmount(amtRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return { ok: false, message: 'أدخل مبلغاً صحيحاً' };
    }
    return { ok: true, amountIqd: parsed };
}

export function mapThirdPartyAssetToReceived(
    row: ThirdPartySeizureAsset,
    amountIqd: number,
    today: string,
    nowIso: string,
): ThirdPartySeizureAsset {
    return {
        ...row,
        status: 'received',
        record_locked: true,
        actualReceivedAmountIqd: amountIqd,
        received_at_iso: nowIso,
        archived_at_ymd: today,
        awaiting_receive: false,
        receive_amount_draft: '',
    };
}

export function buildThirdPartyReceiveTimelineDescription(
    thirdPartyName: string,
    amountIqd: number,
    trustCredited: boolean,
): string {
    const base = `الجهة: ${thirdPartyName}\nالمبلغ المستلم: ${amountIqd.toLocaleString('ar-IQ')} د.ع`;
    if (!trustCredited) return base;
    return `${base}\n\nتم إيداع ${amountIqd.toLocaleString('ar-IQ')} د.ع في الأمانات — ويُخصم من المتبقي.`;
}
