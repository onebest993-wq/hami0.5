import { InsightType } from "../stores/ghostStore";

interface AnalysisResult {
  found: boolean;
  title?: string;
  message?: string;
  type?: InsightType;
  correction?: string;
}

const LOCAL_RULES = [
  {
    keywords: ['حكم غيابي', 'غيابيا'],
    title: 'تنبيه قانوني: مدد الطعن',
    message: 'الحكم الغيابي يخضع للاعتراض خلال 10 أيام من تاريخ التبليغ، أو الاستئناف خلال 15 يوماً إذا سقط حق الاعتراض.',
    type: 'info' as InsightType
  },
  {
    keywords: ['منع معارضة', 'مستأجر'],
    title: 'تدقيق الاختصاص',
    message: 'إذا كان العقار مؤجراً، فالأصح إقامة دعوى "تخلية مأجور" وليس "منع معارضة" وفق القانون المدني.',
    type: 'suggestion' as InsightType,
    correction: 'تخلية مأجور'
  }
];

/** Rule-based legal hints only (V1 — no external AI). */
export async function analyzeLegalText(text: string): Promise<AnalysisResult> {
  for (const rule of LOCAL_RULES) {
    if (rule.keywords.every(kw => text.includes(kw))) {
      return {
        found: true,
        title: rule.title,
        message: rule.message,
        type: rule.type,
        correction: rule.correction
      };
    }
  }

  return { found: false };
}
