import type { LegalRequestAIMetadata } from '@/app/types/admin-types';

export class AILegalAssistant {
  static async analyzeRequest(text: string): Promise<LegalRequestAIMetadata> {
    const normalized = text.trim();
    const hay = normalized.toLowerCase();
    const isCritical =
      hay.includes('عاجل') ||
      hay.includes('غدا') ||
      hay.includes('غداً') ||
      hay.includes('طرد') ||
      hay.includes('سجن') ||
      hay.includes('محكمة');

    if (isCritical) {
      return {
        summary: 'طلب عالي الحساسية يتطلب إجراء فوري لتفادي ضرر قانوني.',
        urgency: 'CRITICAL',
        suggested_action: 'قبول فوري + تواصل سريع مع الموكل',
      };
    }

    return {
      summary: 'استشارة قانونية عادية قابلة للمتابعة ضمن الجدول.',
      urgency: 'NORMAL',
      suggested_action: 'مراجعة أولية ثم تحديد الخطوة التالية',
    };
  }
}

