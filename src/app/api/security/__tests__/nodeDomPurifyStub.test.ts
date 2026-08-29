import { describe, expect, it } from 'vitest';
import nodeDomPurifyStub from '../nodeDomPurifyStub.ts';

describe('nodeDomPurifyStub', () => {
    it('ينزع الوسوم ويبقي النص', () => {
        expect(nodeDomPurifyStub.sanitize('<b>سلام</b>')).toBe('سلام');
        expect(nodeDomPurifyStub.sanitize('plain')).toBe('plain');
    });
});
