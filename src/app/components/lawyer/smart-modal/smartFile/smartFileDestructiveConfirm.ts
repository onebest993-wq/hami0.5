/** رسائل تأكيد موحّدة لمسارات الحذف في SmartFile */
export const SMART_FILE_DELETE_EVENT_MESSAGE = 'هل أنت متأكد من نقل هذا العنصر إلى سلة المهملات؟';
export const SMART_FILE_HARD_DELETE_EVENT_MESSAGE =
    'حذف نهائي — لا يمكن التراجع. هل تريد المتابعة؟';
export const SMART_FILE_DELETE_DOCUMENT_MESSAGE = 'هل أنت متأكد من حذف هذا المستند؟';
export const SMART_FILE_DELETE_APPOINTMENT_MESSAGE = 'هل أنت متأكد من حذف هذا الموعد؟';
export const SMART_FILE_DELETE_NOTE_MESSAGE = 'هل أنت متأكد من حذف هذه الملاحظة؟';
export const SMART_FILE_EMPTY_TRASH_MESSAGE = 'هل أنت متأكد من إفراغ سلة المهملات؟';

export function confirmSmartFileDestructiveAction(message: string): boolean {
    if (typeof window === 'undefined') return true;
    return window.confirm(message);
}
