/** يمنع كتابة ملف محامٍ آخر — defense-in-depth مع kv-proxy ownership */
export class ProfileWriteForbiddenError extends Error {
    constructor(message = 'profile-write-forbidden') {
        super(message);
        this.name = 'ProfileWriteForbiddenError';
    }
}

export function assertCanWriteProfile(writerId: string | null | undefined, targetUserId: string): void {
    const writer = writerId?.trim();
    const target = targetUserId?.trim();
    if (!writer || !target) {
        throw new ProfileWriteForbiddenError('profile-write-unauthorized');
    }
    if (writer !== target) {
        throw new ProfileWriteForbiddenError();
    }
}
