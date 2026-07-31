/** خطأ جلب آمن — معزول عن SecureAPIClient حتى لا يُسحب عميل الشبكة إلى مسار الإقلاع. */
export class SecureFetchError extends Error {
    public readonly status: number;
    public readonly bodyText: string;
    public readonly url: string;
    constructor(message: string, status: number, bodyText: string, url: string) {
        super(message);
        this.name = 'SecureFetchError';
        this.status = status;
        this.bodyText = bodyText;
        this.url = url;
    }
}
