/**
 * OpenRouter streaming proxy — قانون التنفيذ العراقي (تحليل معمق).
 * في التطوير: يُستدعى عبر وسيط Vite على ‎/api/legal-analysis‎.
 */

import { SecureAPIClient, SecureFetchError } from '../../services/SecureAPIClient';
import {
    extractUserTokenFromRequest,
    isTokenAuthorized,
    verifyWifeSignature,
    wifeForbiddenResponse,
    wifeUnauthorizedResponse,
} from '../security/wifeValidator';
import { sanitizePayload } from '../security/sanitizer';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** افتراضي: نموذج مجاني على OpenRouter؛ يُستبدل بـ OPENROUTER_MODEL عند الحاجة */
const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';

/** تلميح إضافي عند «بحث أعمق» — دون إجبار ربط أو أرقام مواد وهمية */
const DEEP_MODE_SUFFIX =
    '🚨 [بحث أعمق]: وسّع التفصيل في الأقسام التي تملك عنها معلومات يقينية فقط؛ التزم بسياسة عدم الهلوسة وعدم تأليف أرقام مواد أو قرارات.';

const SYSTEM_PROMPT = `أنت "مُحلّل حامي"، العقل القانوني السيبراني الأول في العراق. تخصصك الدقيق: قانون التنفيذ العراقي رقم 45 لسنة 1980.
مهمتك: تحليل المادة القانونية المرسلة إليك بدقة جراحية وبناءً على التشريع العراقي الحقيقي فقط.

⚠️ [قاعدة الموت البرمجية - ZERO HALLUCINATION POLICY]:

النماذج اللغوية تميل لاختلاق أرقام مواد عند إجبارها على الربط. أنا أمنعك منعاً باتاً وتاريخياً من كتابة أي "رقم مادة" من أي قانون آخر (كالمرافعات أو المدني) ما لم تكن متأكداً منه 1000%.

إذا كنت لا تحفظ رقم المادة الخادمة، لا تخترع رقماً! الأمانة العلمية تقتضي أن تقول: "تخضع للقواعد العامة في قانون المرافعات" دون ذكر أرقام.

تذكر: تنفيذ الأحكام الأجنبية يخضع لقانون رقم 30 لسنة 1928 وليس لقانون المرافعات.

استخدم منهجية "التشريح القضائي" الآتية (تخطي أي قسم لا تملك معلومات يقينية عنه):

🏛️ الغاية التشريعية (الفلسفة): لماذا شرع المشرع العراقي هذا النص؟

🔗 الشبكة القانونية (الربط - شرطي واختياري):

هل ترتبط هذه المادة بقانون آخر (مدني، مرافعات، إثبات)؟

إذا كنت متأكداً 100%: اذكر الربط والقاعدة.

إذا لم تكن متأكداً: اكتب حرفياً: "تُطبق هذه المادة استناداً لأحكامها الذاتية في قانون التنفيذ، مع مراعاة القواعد العامة للتشريع العراقي." (إياك وتأليف أرقام).

⚖️ المبادئ التمييزية (فقط إن وجدت حقيقةً):

ابحث عن قرارات محكمة التمييز الاتحادية ما بعد 2015.

إذا لم تجد في ذاكرتك قراراً مطابقاً، اكتب حرفياً: "لم تُسجل ذاكرتي التدريبية مبدأً تمييزياً حديثاً (ما بعد 2015) يخص هذا الإجراء الدقيق." (لا تؤلف قراراً).

📋 الواقع الميداني (أمام المنفذ العدل): كيف تُطبق هذه المادة حرفياً على مكتب "المنفذ العدل" وما هي الإجراءات الورقية؟

💡 الاستراتيجية الماكرة (التكتيك الذهبي): قدم نصيحة تكتيكية للمحامي في مديرية التنفيذ وكيف يتعامل مع هذه المادة.

التنسيق: Markdown احترافي، بدون مقدمات أو خاتمة.`;

function getModel(): string {
    return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

export async function POST(request: Request): Promise<Response> {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) {
        return wifeUnauthorizedResponse();
    }
    if (!(await verifyWifeSignature(request, userToken))) {
        return wifeForbiddenResponse();
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY غير مضبوط على الخادم' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    }

    let payload: unknown;
    try {
        payload = sanitizePayload(await request.json());
    } catch {
        return new Response(JSON.stringify({ error: 'جسم الطلب ليس JSON صالحاً' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    }

    const body = payload as {
        articleTitle?: string;
        articleContent?: string;
        isDeepSearch?: boolean;
    };
    const articleTitle = typeof body.articleTitle === 'string' ? body.articleTitle.trim() : '';
    const articleContent = typeof body.articleContent === 'string' ? body.articleContent.trim() : '';
    const isDeepSearch = body.isDeepSearch === true;
    const maxTokens = isDeepSearch ? 4000 : 2000;
    const temperature = 0.0;
    const systemContent = isDeepSearch ? `${SYSTEM_PROMPT}\n\n${DEEP_MODE_SUFFIX}` : SYSTEM_PROMPT;

    if (!articleTitle || !articleContent) {
        return new Response(
            JSON.stringify({ error: 'مطلوب articleTitle و articleContent كنصوص غير فارغة' }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }
        );
    }

    const referer = process.env.OPENROUTER_HTTP_REFERER?.trim() || 'http://localhost:8080';
    const title = process.env.OPENROUTER_APP_TITLE?.trim() || 'Hami Legal App';

    try {
        const data = await SecureAPIClient.fetchSecure(
            OPENROUTER_URL,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': referer,
                    'X-Title': title,
                },
                body: JSON.stringify({
                    model: getModel(),
                    stream: false,
                    max_tokens: maxTokens,
                    temperature,
                    messages: [
                        { role: 'system', content: systemContent },
                        {
                            role: 'user',
                            content: `قم بالبحث والتحليل المعمق لهذه المادة: ${articleTitle}\n${articleContent}`,
                        },
                    ],
                }),
            },
            '127.0.0.1',
        );

        return new Response(JSON.stringify(data ?? {}), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    } catch (e) {
        if (e instanceof SecureFetchError) {
            return new Response(e.bodyText || JSON.stringify({ error: 'فشل طلب OpenRouter' }), {
                status: e.status,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }
        return new Response(JSON.stringify({ error: 'فشل طلب OpenRouter' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
    }
}
