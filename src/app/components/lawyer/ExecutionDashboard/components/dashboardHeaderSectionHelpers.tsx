import React, { memo } from 'react';
import type { DossierHeaderResolved } from '@/app/utils/executionDossierHeaderFields';

export interface DashboardHeaderStatuteStatus {
    daysRemaining: number;
    yearsRemaining: number;
    isCritical: boolean;
    isExpired: boolean;
}

export function isHeaderFieldsLike(value: unknown): value is Partial<DossierHeaderResolved> {
    return Boolean(value) && typeof value === 'object';
}

export function mergeHeaderFields(
    primary: Partial<DossierHeaderResolved> | null | undefined,
    fallback: Partial<DossierHeaderResolved> | null | undefined,
): DossierHeaderResolved {
    const safeFallback = isHeaderFieldsLike(fallback) ? fallback : {};
    const source = isHeaderFieldsLike(primary) ? primary : safeFallback;
    return {
        directorate: source.directorate || safeFallback.directorate || '',
        fileNumber: source.fileNumber || safeFallback.fileNumber || '',
        fileYear: source.fileYear || safeFallback.fileYear || '',
        fileRefDisplay: source.fileRefDisplay || safeFallback.fileRefDisplay || '—',
        docType: source.docType || safeFallback.docType || '',
        claimType: source.claimType || safeFallback.claimType || '',
        classification: source.classification || safeFallback.classification || '',
        classificationDisplay:
            source.classificationDisplay || safeFallback.classificationDisplay || '',
        claimTypeDisplay: source.claimTypeDisplay || safeFallback.claimTypeDisplay || '',
        docNumber: source.docNumber || safeFallback.docNumber || '',
        judgmentDate: source.judgmentDate || safeFallback.judgmentDate || '',
        specificDeliveryItemName:
            source.specificDeliveryItemName || safeFallback.specificDeliveryItemName || '',
        specificDeliveryItemNature:
            source.specificDeliveryItemNature || safeFallback.specificDeliveryItemNature || '',
        specificDeliveryItemNatureDisplay:
            source.specificDeliveryItemNatureDisplay ||
            safeFallback.specificDeliveryItemNatureDisplay ||
            '',
    };
}

export function shouldBypassHeaderToggle(
    target: EventTarget | null,
    currentTarget: HTMLElement,
): boolean {
    if (!(target instanceof Element)) {
        return false;
    }
    const interactiveAncestor = target.closest(
        'button, a, input, textarea, select, [role="button"], [data-exec-interactive="true"]',
    );
    return Boolean(interactiveAncestor && interactiveAncestor !== currentTarget);
}

export const DashboardHeaderDetailCell = memo(function DashboardHeaderDetailCell({
    label,
    value,
    className = '',
    valueClassName = '',
}: {
    label: string;
    value: string;
    className?: string;
    valueClassName?: string;
}) {
    if (!value || value === '—') return null;
    return (
        <div
            className={`rounded-md border border-amber-500/22 bg-[#0B1120]/50 px-2 py-1 text-right leading-snug ${className}`}
            dir="rtl"
        >
            <p className="text-[10px] leading-none text-amber-200/55">{label}</p>
            <p
                className={`mt-0.5 text-[12px] font-semibold text-white whitespace-normal [unicode-bidi:plaintext] [word-break:keep-all] [overflow-wrap:normal] ${valueClassName}`}
            >
                {value}
            </p>
        </div>
    );
});
