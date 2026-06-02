import { hasOpenRouterKey } from '@/app/services/ai-service';

const DEFAULT_VISION_MODEL = 'google/gemini-2.0-flash-lite-001';
const OCR_TIMEOUT_MS = 45_000;

type OcrResult = { text: string; source: 'ai' | 'fallback' };

async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('فشل قراءة الصورة'));
        reader.readAsDataURL(blob);
    });
}

async function resolveDataUrl(image: Blob | string): Promise<string> {
    if (typeof image === 'string') return image;
    return blobToDataUrl(image);
}

/** استخراج نص عربي من صورة مستند عبر نموذج رؤية (OpenRouter) */
export async function extractTextFromDocumentImage(image: Blob | string): Promise<OcrResult> {
    if (!hasOpenRouterKey()) {
        return {
            text: '',
            source: 'fallback',
        };
    }

    const dataUrl = await resolveDataUrl(image);
    const model =
        (import.meta.env.VITE_OPENROUTER_VISION_MODEL as string | undefined)?.trim() ||
        DEFAULT_VISION_MODEL;

    const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

    try {
        const result = await SecureAPIClient.fetchSecure(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${(import.meta.env.VITE_OPENROUTER_API_KEY as string).trim()}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'HTTP-Referer':
                        typeof window !== 'undefined' && window.location?.origin
                            ? `${window.location.origin}/`
                            : 'http://localhost:8080/',
                    'X-Title': 'Hami',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model,
                    temperature: 0,
                    max_tokens: 2000,
                    messages: [
                        {
                            role: 'system',
                            content:
                                'أنت نظام OCR قانوني. استخرج النص العربي من الصورة كما هو دون شرح. إن لم يوجد نص، أعد سلسلة فارغة فقط.',
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'استخرج كل النص الظاهر في هذه الوثيقة (عربي/أرقام) بنفس ترتيب السطور:',
                                },
                                { type: 'image_url', image_url: { url: dataUrl } },
                            ],
                        },
                    ],
                }),
            },
            '127.0.0.1',
        );

        const data = result as {
            choices?: Array<{ message?: { content?: string | null } }>;
        };
        const raw = data?.choices?.[0]?.message?.content;
        const text = typeof raw === 'string' ? raw.trim() : '';
        return { text, source: text ? 'ai' : 'fallback' };
    } catch {
        return { text: '', source: 'fallback' };
    } finally {
        clearTimeout(timer);
    }
}

export function ocrFallbackMessage(uploaded: boolean): string {
    if (uploaded) {
        return 'تم حفظ الصورة في المخزن — لم يُستخرج نص (فعّل مفتاح OpenRouter للتعرف النصي)';
    }
    return 'لم يُستخرج نص من الصورة';
}
