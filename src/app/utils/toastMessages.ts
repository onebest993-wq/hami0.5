/**
 * Toast Messages System
 * نظام رسائل Toast منظم وواضح (بدون تأثير على التصميم)
 */

import { SmartToast } from '@/app/components/ui/SmartToast';

/**
 * رسائل نظام التنفيذ
 */
export const ExecutionToasts = {
  // ✅ نجاح
  success: {
    fileSaved: () => SmartToast.success('✅ تم حفظ ملف التنفيذ بنجاح'),
    
    paymentRecorded: (amount: number) => 
      SmartToast.success(`💰 تم تسجيل دفعة بمبلغ ${amount.toLocaleString('ar-IQ')} د.ع`),
    
    gracePeriodStarted: () => 
      SmartToast.success('⏰ بدأت المهلة القانونية (7 أيام)'),
    
    gracePeriodEnded: () => 
      SmartToast.warning('⚠️ انتهت المهلة القانونية - يمكن اتخاذ إجراءات إكراهية'),
    
    debtorNotified: () => 
      SmartToast.info('📧 تم تبليغ المدين بالإضبارة'),
    
    assetSeized: (assetName: string) => 
      SmartToast.success(`🔒 تم حجز: ${assetName}`),
    
    assetReleased: (assetName: string) => 
      SmartToast.info(`🔓 تم فك حجز: ${assetName}`),
    
    auctionScheduled: (date: string) => 
      SmartToast.success(`📅 تم تحديد موعد المزاد: ${date}`),
    
    settlementReached: () => 
      SmartToast.success('🤝 تم التوصل إلى تسوية'),
    
    debtFullyPaid: () => 
      SmartToast.success('🎉 تم سداد الدين بالكامل!'),
  },

  // ❌ أخطاء
  error: {
    loadFailed: () => SmartToast.error('❌ فشل تحميل بيانات التنفيذ'),
    
    saveFailed: () => SmartToast.error('❌ فشل حفظ البيانات'),
    
    invalidAmount: () => SmartToast.error('❌ المبلغ المُدخل غير صحيح'),
    
    missingData: (field: string) => SmartToast.error(`❌ الحقل مطلوب: ${field}`),
    
    paymentFailed: () => SmartToast.error('❌ فشل تسجيل الدفعة'),
    
    seizureFailed: () => SmartToast.error('❌ فشل حجز الأصل'),
  },

  // ⚠️ تحذيرات
  warning: {
    gracePeriodExpiring: (daysLeft: number) => 
      SmartToast.warning(`⏰ باقي ${daysLeft} يوم على انتهاء المهلة القانونية`),
    
    debtNotPaid: () => 
      SmartToast.warning('⚠️ لم يتم سداد الدين بعد'),
    
    incompleteData: () => 
      SmartToast.warning('⚠️ بعض الحقول غير مكتملة'),
    
    lowPaymentAmount: () => 
      SmartToast.warning('⚠️ المبلغ المدفوع أقل من المطلوب'),
  },

  // ℹ️ معلومات
  info: {
    calculationUpdated: () => 
      SmartToast.info('🔄 تم تحديث الحسابات'),
    
    documentGenerated: () => 
      SmartToast.info('📄 تم إنشاء المستند'),
    
    reminderSet: (date: string) => 
      SmartToast.info(`⏰ تم تعيين تذكير لـ ${date}`),
  }
};

/**
 * رسائل نظام الدعاوى
 */
export const LawsuitToasts = {
  success: {
    fileSaved: () => SmartToast.success('✅ تم حفظ ملف الدعوى بنجاح'),
    
    stageTransitioned: (stageName: string) => 
      SmartToast.success(`🔄 تم الانتقال إلى مرحلة: ${stageName}`),
    
    judgmentRecorded: () => 
      SmartToast.success('⚖️ تم تسجيل الحكم'),
    
    documentUploaded: () => 
      SmartToast.success('📎 تم رفع المستند'),
  },

  error: {
    loadFailed: () => SmartToast.error('❌ فشل تحميل ملف الدعوى'),
    
    saveFailed: () => SmartToast.error('❌ فشل حفظ البيانات'),
    
    invalidDate: () => SmartToast.error('❌ التاريخ غير صحيح'),
  },

  warning: {
    deadlineApproaching: (days: number) => 
      SmartToast.warning(`⏰ باقي ${days} يوم على الموعد النهائي`),
    
    missingDocument: () => 
      SmartToast.warning('⚠️ مستند مفقود'),
  }
};

/**
 * رسائل عامة للنظام
 */
export const SystemToasts = {
  success: {
    dataSaved: () => SmartToast.success('✅ تم حفظ البيانات'),
    
    dataSynced: () => SmartToast.success('☁️ تمت المزامنة مع السحابة'),
    
    operationComplete: () => SmartToast.success('✅ تمت العملية بنجاح'),
  },

  error: {
    networkError: () => SmartToast.error('❌ خطأ في الاتصال بالإنترنت'),
    
    unknownError: () => SmartToast.error('❌ حدث خطأ غير متوقع'),
    
    permissionDenied: () => SmartToast.error('❌ ليس لديك صلاحية لهذا الإجراء'),
  },

  warning: {
    unsavedChanges: () => 
      SmartToast.warning('⚠️ لديك تغييرات غير محفوظة'),
    
    slowConnection: () => 
      SmartToast.warning('⚠️ الاتصال بالإنترنت بطيء'),
  },

  info: {
    loading: () => SmartToast.info('⏳ جاري التحميل...'),
    
    processing: () => SmartToast.info('⚙️ جاري المعالجة...'),
  }
};

/**
 * دالة مساعدة لرسالة نجاح مخصصة
 */
export const showSuccessToast = (message: string, icon?: string) => {
  SmartToast.success(icon ? `${icon} ${message}` : message);
};

/**
 * دالة مساعدة لرسالة خطأ مخصصة
 */
export const showErrorToast = (message: string, icon?: string) => {
  SmartToast.error(icon ? `${icon} ${message}` : message);
};

/**
 * دالة مساعدة لرسالة تحذير مخصصة
 */
export const showWarningToast = (message: string, icon?: string) => {
  SmartToast.warning(icon ? `${icon} ${message}` : message);
};

/**
 * دالة مساعدة لرسالة معلومات مخصصة
 */
export const showInfoToast = (message: string, icon?: string) => {
  SmartToast.info(icon ? `${icon} ${message}` : message);
};
