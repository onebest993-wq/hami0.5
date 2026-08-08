import { describe, expect, it } from 'vitest';
import { imgFetchPriorityAttr } from '@/app/utils/imgFetchPriority';

describe('imgFetchPriorityAttr', () => {
    it('returns lowercase fetchpriority attribute', () => {
        expect(imgFetchPriorityAttr('high')).toEqual({ fetchpriority: 'high' });
    });

    it('returns undefined when priority is omitted', () => {
        expect(imgFetchPriorityAttr(undefined)).toBeUndefined();
    });
});
