import React from 'react';
import { hqLiveNameDivergesFromKyc } from '@/app/domain/admin/hqLiveVsKycName';
import { normalizeLegalDisplayName } from '@/app/domain/profile/displayNameCorrection';
import { cn } from '@/app/components/ui/utils';

export function HqNameMismatchAlert({
    liveName,
    kycName,
    className,
}: {
    liveName: string;
    kycName: string;
    className?: string;
}) {
    if (!hqLiveNameDivergesFromKyc(liveName, kycName)) return null;
    const live = normalizeLegalDisplayName(liveName);
    const kyc = normalizeLegalDisplayName(kycName);
    return (
        <p className={cn('hq-dir-caption', className)} data-testid="hq-name-mismatch" role="status">
            الاسم الحي «{live}» يختلف عن اسم طلب التوثيق «{kyc}».
        </p>
    );
}
