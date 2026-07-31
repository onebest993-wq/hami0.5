import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { CaseShareRepository } from '../../../services/caseShare/caseShareRepository.ts';

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
}

async function auth(request: Request): Promise<{ userId: string } | Response> {
    const unwrapped = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in unwrapped) return unwrapped.response;
    return { userId: unwrapped.userId };
}

/** تفاصيل جلسة مشاركة — بعد الموافقة فقط للمستقبل */
export async function GET(request: Request): Promise<Response> {
    try {
        const authResult = await auth(request);
        if (authResult instanceof Response) return authResult;

        const url = new URL(request.url);
        const shareId = url.searchParams.get('shareId')?.trim();
        if (!shareId) {
            return json(400, { ok: false, error: 'shareId مطلوب' });
        }

        const share = await CaseShareRepository.getById(shareId, authResult.userId);
        if (!share) {
            return json(404, { ok: false, error: 'غير متاح — وافق على الطلب أولاً أو انتهت الجلسة' });
        }

        return json(200, { ok: true, share });
    } catch {
        return json(500, { ok: false, error: 'Internal server error' });
    }
}
