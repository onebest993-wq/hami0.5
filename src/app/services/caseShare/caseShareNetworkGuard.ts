import { listNetworkColleagues } from './lawyerNetworkRepository';

/** يتحقق أن المستلم ضمن شبكة المتابعة — على السيرفر والعميل */
export async function assertRecipientInNetwork(ownerId: string, recipientId: string): Promise<boolean> {
    if (!ownerId?.trim() || !recipientId?.trim() || ownerId === recipientId) return false;
    const colleagues = await listNetworkColleagues(ownerId);
    return colleagues.some((c) => c.id === recipientId);
}
