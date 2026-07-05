export type StolenTokenStatus = 'valid' | 'stolen' | 'cloned';
export interface StolenTokenVerdict {
    status: StolenTokenStatus;
    reason?: string;
}
export declare function isValidWifeDeviceId(raw: string | null | undefined): boolean;
export declare function extractDeviceIdFromRequest(req: Request): string;
export declare function registerTokenSessionServer(token: string, deviceId: string): Promise<boolean>;
export declare function detectStolenTokenServer(token: string, deviceId: string): Promise<StolenTokenVerdict>;
/** Test-only: clears in-memory session fallback between isolated scenarios. */
export declare function resetStolenTokenServerForTests(): void;
