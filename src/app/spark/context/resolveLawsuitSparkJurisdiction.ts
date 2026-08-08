import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import type { SparkJurisdiction } from '@/app/spark/types';

export function resolveLawsuitSparkJurisdiction(file: Record<string, unknown>): SparkJurisdiction {
    if (isPersonalStatusFile(file as { lawsuitJurisdiction?: string; selectedType?: string })) {
        return 'personal';
    }
    const raw = String(file.lawsuitJurisdiction ?? file.selectedType ?? file.jurisdiction ?? '')
        .trim()
        .toLowerCase();
    if (raw === 'criminal' || raw === 'جزائي' || raw === 'القضاء الجزائي') {
        return 'criminal';
    }
    if (raw === 'civil' || raw === 'مدني' || raw === 'القضاء المدني' || raw === 'personal') {
        return raw === 'personal' ? 'personal' : 'civil';
    }
    return 'civil';
}
