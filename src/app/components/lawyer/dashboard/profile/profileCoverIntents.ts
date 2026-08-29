/** نوايا من صفحة الفتح الفورية — تُستهلك عند اعتماد الشجرة الحية */

import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

let pendingEdit = false;
let pendingStudio = false;
let pendingCustomization: ProfilePageCustomization | null = null;
const intentListeners = new Set<() => void>();

function notifyProfileCoverIntents(): void {
    intentListeners.forEach((listener) => listener());
}

/** الشجرة الحية قد تُركَّب قبل نقر الغطاء — الاشتراك يلتقط النية دون انتظار إعادة mount */
export function subscribeProfileCoverIntents(listener: () => void): () => void {
    intentListeners.add(listener);
    return () => {
        intentListeners.delete(listener);
    };
}

export function queueProfileCoverEdit(): void {
    pendingEdit = true;
    notifyProfileCoverIntents();
}

export function queueProfileCoverStudio(): void {
    pendingStudio = true;
    notifyProfileCoverIntents();
}

export function queueProfileCoverCustomization(next: ProfilePageCustomization): void {
    pendingCustomization = next;
    notifyProfileCoverIntents();
}

export function consumeProfileCoverEdit(): boolean {
    const next = pendingEdit;
    pendingEdit = false;
    return next;
}

export function consumeProfileCoverStudio(): boolean {
    const next = pendingStudio;
    pendingStudio = false;
    return next;
}

export function consumeProfileCoverCustomization(): ProfilePageCustomization | null {
    const next = pendingCustomization;
    pendingCustomization = null;
    return next;
}

export function resetProfileCoverIntents(): void {
    pendingEdit = false;
    pendingStudio = false;
    pendingCustomization = null;
}

export function resetProfileCoverIntentsForTests(): void {
    resetProfileCoverIntents();
}
