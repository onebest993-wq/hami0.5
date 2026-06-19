// 🛡️ VALIDATION UTILITIES - للتحقق من البيانات

/**
 * التحقق من صحة التاريخ
 */
export function isValidDate(dateString: string): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}

/**
 * التحقق من أن التاريخ ليس في المستقبل
 */
export function isNotFutureDate(dateString: string): boolean {
    if (!isValidDate(dateString)) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date <= today;
}

/**
 * التحقق من رقم الهاتف العراقي
 */
export function isValidIraqiPhone(phone: string): boolean {
    if (!phone) return true; // optional field
    // Format: 07xxxxxxxxx (11 digits starting with 07)
    const phoneRegex = /^07\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * التحقق من رقم القضية
 */
export function isValidCaseNumber(caseNumber: string): boolean {
    if (!caseNumber) return false;
    // يجب أن يحتوي على أرقام على الأقل
    return /\d+/.test(caseNumber) && caseNumber.trim().length > 0;
}

/**
 * التحقق من المبلغ المالي
 */
export function isValidAmount(amount: number | string): boolean {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(num) && num >= 0;
}

/**
 * التحقق من النص المطلوب
 */
export function isRequiredText(text: string, minLength = 1): boolean {
    return !!text && text.trim().length >= minLength;
}

/**
 * تنظيف النص من المسافات الزائدة
 */
export function sanitizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
}

/**
 * التحقق من البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
    if (!email) return true; // optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * التحقق من أن التاريخ بعد تاريخ آخر
 */
export function isDateAfter(dateStr1: string, dateStr2: string): boolean {
    if (!isValidDate(dateStr1) || !isValidDate(dateStr2)) return false;
    const date1 = new Date(dateStr1);
    const date2 = new Date(dateStr2);
    return date1 > date2;
}

/**
 * حساب الفرق بالأيام بين تاريخين
 */
export function daysBetween(dateStr1: string, dateStr2: string): number {
    if (!isValidDate(dateStr1) || !isValidDate(dateStr2)) return 0;
    const date1 = new Date(dateStr1);
    const date2 = new Date(dateStr2);
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Validation for Task data
 */
export function validateTaskData(data: any): { valid: boolean; error?: string } {
    if (!data.task || !isRequiredText(data.task, 3)) {
        return { valid: false, error: 'يجب إدخال نص المهمة (3 أحرف على الأقل)' };
    }
    if (data.deadline && !isValidDate(data.deadline)) {
        return { valid: false, error: 'تاريخ الموعد غير صحيح' };
    }
    return { valid: true };
}

/**
 * Validation for Payment data
 */
export function validatePaymentData(data: any): { valid: boolean; error?: string } {
    if (!isValidAmount(data.amount) || data.amount <= 0) {
        return { valid: false, error: 'يجب إدخال مبلغ صحيح أكبر من صفر' };
    }
    if (!data.date || !isValidDate(data.date)) {
        return { valid: false, error: 'يجب إدخال تاريخ صحيح' };
    }
    return { valid: true };
}

/**
 * Validation for Document data
 */
export function validateDocumentData(data: any): { valid: boolean; error?: string } {
    if (!data.docName || !isRequiredText(data.docName, 2)) {
        return { valid: false, error: 'يجب إدخال اسم المستند (حرفان على الأقل)' };
    }
    if (!data.docType) {
        return { valid: false, error: 'يجب اختيار نوع المستند' };
    }
    if (!data.date || !isValidDate(data.date)) {
        return { valid: false, error: 'يجب إدخال تاريخ صحيح' };
    }
    return { valid: true };
}

/**
 * Validation for Judgment data
 */
export function validateJudgmentData(data: any): { valid: boolean; error?: string } {
    if (!data.judgmentType) {
        return { valid: false, error: 'يجب اختيار نوع الحكم' };
    }
    const stageName = String(data.stageName ?? '');
    const isAppealOrCassationStage =
        stageName.includes('استئناف') || stageName.includes('تمييز');
    if (!isAppealOrCassationStage && !data.judgmentForm) {
        return { valid: false, error: 'يجب اختيار شكل الحكم' };
    }
    if (!data.judgmentDate || !isValidDate(data.judgmentDate)) {
        return { valid: false, error: 'يجب إدخال تاريخ الحكم' };
    }
    return { valid: true };
}
