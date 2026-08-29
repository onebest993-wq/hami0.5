import { describe, expect, it } from 'vitest';
import { pickFreshSmartFileModalFile } from '../SmartFileModalPortal';

describe('pickFreshSmartFileModalFile', () => {
    it('prefers the latest stored file with the same id', () => {
        const staleFile = { id: 42, title: 'old', activeStageIndex: 0 };
        const freshFile = { id: 42, title: 'new', activeStageIndex: 2 };

        expect(pickFreshSmartFileModalFile(staleFile as never, [freshFile])).toEqual(freshFile);
    });

    it('merges stored row onto the open file so missing disk fields keep open identity', () => {
        const incomingFile = {
            id: 42,
            title: 'open',
            lawsuitJurisdiction: 'personal',
            judge: 'القاضي',
        };
        const storedFile = { id: 42, title: 'disk', activeStageIndex: 2 };

        expect(pickFreshSmartFileModalFile(incomingFile as never, [storedFile])).toEqual({
            id: 42,
            title: 'disk',
            lawsuitJurisdiction: 'personal',
            judge: 'القاضي',
            activeStageIndex: 2,
        });
    });
});
