/** تحويل صريح عبر unknown — واجهات بلا index signature لا تُنسَب مباشرة إلى Record. */
export function asUnknownRecord(value: object): Record<string, unknown> {
    return value as unknown as Record<string, unknown>;
}
