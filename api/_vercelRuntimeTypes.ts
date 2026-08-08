/**
 * عقد نوعَي دالة Vercel — منقول محلياً بدل حزمة `@vercel/node`.
 *
 * الحزمة كانت اعتمادية تطوير كاملة (باني، ومحلّل بايثون، وundici وjs-yaml
 * وminimatch وpath-to-regexp) لأجل هذين النوعين وحدهما في ملف واحد. جرّت
 * وحدها إحدى عشرة نشرة أمنية على شجرة التطوير، وإصلاح npm الوحيد المعروض
 * كان النزول إلى إصدار رئيسي أقدم — أي عودة إلى الوراء لا إصلاحاً.
 *
 * النسخة مطابقة لتعريف `@vercel/node@5.9.7` عدا `unknown` مكان `any` في
 * الحمولة: لا شيء هنا يقرأ `body`، وunknown تقبل كل ما تقبله any عند
 * التمرير وتمنع القراءة غير المحروسة.
 *
 * الاسم يبدأ بشرطة سفلية حتى لا تعامله Vercel كمسار دالة.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

export type VercelRequestCookies = { [key: string]: string };
export type VercelRequestQuery = { [key: string]: string | string[] };

export type VercelRequest = IncomingMessage & {
    query: VercelRequestQuery;
    cookies: VercelRequestCookies;
    body: unknown;
};

export type VercelResponse = ServerResponse & {
    send: (body: unknown) => VercelResponse;
    json: (jsonBody: unknown) => VercelResponse;
    status: (statusCode: number) => VercelResponse;
    redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
};

export type VercelApiHandler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>;
