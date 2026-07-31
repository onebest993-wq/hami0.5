import { requireWifeUser, unwrapWifeUser } from '../security/bffAuth.ts';

/** مصادقة موحّدة لمسارات /api/notifications/* */
export async function requireNotificationsAuth(
    request: Request,
): Promise<{ userId: string } | Response> {
    const auth = await requireWifeUser(request);
    const unwrapped = unwrapWifeUser(auth);
    if ('response' in unwrapped) return unwrapped.response;
    return { userId: unwrapped.userId };
}
