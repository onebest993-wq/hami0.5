import { describe, expect, it } from 'vitest';
import { resolveSupabaseExecutionType } from '../executionCreationSubmitBuilders';

describe('resolveSupabaseExecutionType', () => {
    it('maps court judgments by classification, not as always-sharia', () => {
        expect(resolveSupabaseExecutionType('قرارات وأحكام المحاكم', 'مدني')).toBe('مدني');
        expect(resolveSupabaseExecutionType('قرارات وأحكام المحاكم', 'شرعي')).toBe('شرعي');
        expect(resolveSupabaseExecutionType('قرارات وأحكام المحاكم', 'sharia')).toBe('شرعي');
    });

    it('keeps sharia deeds as شرعي', () => {
        expect(resolveSupabaseExecutionType('الحجج الشرعية', 'مدني')).toBe('شرعي');
    });
});
