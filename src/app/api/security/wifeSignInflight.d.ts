/**
 * يدمج طلبات wife-sign المتزامنة المتطابقة لنفس المستخدم على نفس المثيل.
 * لا TTL cache — كل nonce يُستهلك مرة عند استدعاء API الهدف.
 */
type WifeSignInflightInput = {
    subject: string;
    method: string;
    url: string;
    body: string;
    contentHash?: string;
};
export declare function coalesceWifeSign<T>(input: WifeSignInflightInput, sign: () => Promise<T>): Promise<T>;
/** للاختبارات */
export declare function clearWifeSignInflightForTests(): void;
export {};
