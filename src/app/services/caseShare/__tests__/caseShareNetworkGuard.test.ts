import { describe, expect, it, vi } from 'vitest';

vi.mock('../lawyerNetworkRepository', () => ({
    listNetworkColleagues: vi.fn(),
}));

import { listNetworkColleagues } from '../lawyerNetworkRepository';
import { assertRecipientInNetwork } from '../caseShareNetworkGuard';
import { PERSONAS } from './caseShareTestFixtures';

describe('assertRecipientInNetwork', () => {
    it('يرفض المعرّفات الفارغة أو مشاركة النفس', async () => {
        await expect(assertRecipientInNetwork('', PERSONAS.recipient.id)).resolves.toBe(false);
        await expect(assertRecipientInNetwork(PERSONAS.sender.id, '')).resolves.toBe(false);
        await expect(assertRecipientInNetwork(PERSONAS.sender.id, PERSONAS.sender.id)).resolves.toBe(false);
        expect(listNetworkColleagues).not.toHaveBeenCalled();
    });

    it('يقبل مستلماً في شبكة المتابعة ويرفض الغريب', async () => {
        vi.mocked(listNetworkColleagues).mockResolvedValue([
            { id: PERSONAS.recipient.id, name: PERSONAS.recipient.name, relation: 'both' },
        ]);
        await expect(
            assertRecipientInNetwork(PERSONAS.sender.id, PERSONAS.recipient.id),
        ).resolves.toBe(true);
        await expect(
            assertRecipientInNetwork(PERSONAS.sender.id, PERSONAS.outsider.id),
        ).resolves.toBe(false);
    });
});
