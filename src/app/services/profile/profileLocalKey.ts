/** بادئة التخزين المحلي لملف المحامي — مفتاح لكل userId */
export const LAWYER_PROFILE_LOCAL_KEY_PREFIX = 'hami:profile:v1:';

export function getLawyerProfileLocalKey(userId: string): string {
    return `${LAWYER_PROFILE_LOCAL_KEY_PREFIX}${userId.trim()}`;
}
