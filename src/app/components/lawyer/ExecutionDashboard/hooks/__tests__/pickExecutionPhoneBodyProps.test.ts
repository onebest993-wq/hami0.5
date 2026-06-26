import { describe, expect, it } from 'vitest';
import { EXECUTION_PHONE_BODY_PROP_KEYS } from '../executionPhoneBodyPropKeys';
import { assignExecutionPhoneBodyScope } from '../pickExecutionPhoneBodyProps';

describe('pickExecutionPhoneBodyProps', () => {
    it('assigns curated phone body keys to scope ref', () => {
        const target: Record<string, unknown> = {};
        assignExecutionPhoneBodyScope(target, {
            executionId: 'ex-1',
            onClose: () => {},
            noise: 'ignored',
        });
        expect(target.executionId).toBe('ex-1');
        expect(target.onClose).toBeTypeOf('function');
        expect(target.noise).toBe('ignored');
    });

    it('phone body registry is substantial', () => {
        expect(EXECUTION_PHONE_BODY_PROP_KEYS.length).toBeGreaterThan(400);
    });

    it('includes component props used by phone body', () => {
        expect(EXECUTION_PHONE_BODY_PROP_KEYS).toContain('onClose');
        expect(EXECUTION_PHONE_BODY_PROP_KEYS).toContain('file');
        expect(EXECUTION_PHONE_BODY_PROP_KEYS).toContain('executionId');
    });
});
