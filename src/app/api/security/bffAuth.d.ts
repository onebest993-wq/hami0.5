export type WifeAuthOk = {
    ok: true;
    userId: string;
};
export type WifeAuthFail = {
    ok: false;
    response: Response;
};
export type WifeAuthResult = WifeAuthOk | WifeAuthFail;
export declare function wifeAuthDenied(auth: WifeAuthResult): Response | null;
/** بعد فحص wifeAuthDenied — يُرجع userId أو Response للإرجاع المباشر. */
export declare function unwrapWifeUser(auth: WifeAuthResult): {
    userId: string;
} | {
    response: Response;
};
export declare function requireWifeUser(request: Request): Promise<WifeAuthResult>;
