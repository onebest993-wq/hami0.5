import { InsightType } from "../stores/ghostStore";
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { SecureAPIClient, SecureFetchError } from "../services/SecureAPIClient";

interface AnalysisResult {
  found: boolean;
  title?: string;
  message?: string;
  type?: InsightType;
  correction?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

// 1. FAST LOCAL RULES (Immediate Feedback)
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

export async function analyzeLegalText(text: string): Promise<AnalysisResult> {
  // 1. Apply Local Rules first (Zero Latency)
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

  // 2. If no local rule matches, ask the Server Brain (Deep Analysis)
  // Only for longer texts to save API calls
  if (text.length > 20) {
    try {
        const data = await SecureAPIClient.fetchSecure(
          `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba/ai-legal-brain`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              type: 'text',
              content: text,
              context: 'ghost_observer',
            }),
          },
          '127.0.0.1',
        );

        if (isRecord(data)) {
          const legalWarnings = data.legalWarnings;
          if (Array.isArray(legalWarnings) && legalWarnings.length > 0 && typeof legalWarnings[0] === 'string') {
            return {
              found: true,
              title: 'تنبيه المستشار الذكي',
              message: legalWarnings[0],
              type: 'alert',
            };
          }
        }
    } catch (e) {
        if (e instanceof SecureFetchError) {
          console.error('[Ghost] Upstream error', { status: e.status, url: e.url, body: e.bodyText.slice(0, 800) });
        } else {
          console.error('[Ghost] Upstream error', e);
        }
    }
  }

  return { found: false };
}
