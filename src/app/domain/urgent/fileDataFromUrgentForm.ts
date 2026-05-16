import { resolveStoredPathwayType } from '@/app/components/lawyer/Form_Urgent_Actions/constants';
import { uuidv4 } from '@/app/services/urgent-actions-db';
import type { UrgentFormSavePayload } from './types';

/** يجهّز حمولة النموذج لفتح الإضبارة الموحّدة (بدون إنشاء قضية في القائمة) */
export function fileDataFromUrgentForm(data: UrgentFormSavePayload): Record<string, unknown> {
    const specific = String(data.specificActionType ?? '').trim();
    const pathway = resolveStoredPathwayType(specific || String(data.actionType ?? ''));
    const type = pathway === 'state_order' ? 'state_order' : 'urgent_action';
    return {
        ...data,
        id: typeof data.id === 'string' && data.id ? data.id : uuidv4(),
        type,
    };
}
