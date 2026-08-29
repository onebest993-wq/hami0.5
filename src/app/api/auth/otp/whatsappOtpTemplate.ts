/**
 * حمولات قالب واتساب لرمز لمرة واحدة.
 * قوالب AUTHENTICATION (copy-code) تحتاج الرمز في الجسم وفي زر URL.
 * قوالب UTILITY بجسم {{1}} فقط ترفض مكوّن الزر — نُجرّب الاثنين بالترتيب.
 */

export type WhatsAppOtpTemplateKind = 'authentication' | 'body_only';

export function buildWhatsAppOtpTemplatePayload(input: {
    toMsisdn: string;
    code: string;
    template: string;
    lang: string;
    kind: WhatsAppOtpTemplateKind;
}): Record<string, unknown> {
    const body = {
        type: 'body',
        parameters: [{ type: 'text', text: input.code }],
    };
    const components =
        input.kind === 'authentication'
            ? [
                  body,
                  {
                      type: 'button',
                      sub_type: 'url',
                      index: '0',
                      parameters: [{ type: 'text', text: input.code }],
                  },
              ]
            : [body];

    return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.toMsisdn,
        type: 'template',
        template: {
            name: input.template,
            language: { code: input.lang },
            components,
        },
    };
}
