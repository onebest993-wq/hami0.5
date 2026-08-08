import { describe, expect, it } from 'vitest';
import {
    APPEARANCE_BLOCK_SCOPE_IDS,
    appearanceBlockLabel,
} from '@/app/services/settings/appearanceBlockCatalog';

describe('appearanceBlockCatalog', () => {
    it('لا يعرض حاوية الشريط السفلي — مُستغنى عنها', () => {
        expect(APPEARANCE_BLOCK_SCOPE_IDS).not.toContain('dockShell');
    });

    it('يسمّي بطاقة التنبيهات بالبطاقة الذكية', () => {
        expect(appearanceBlockLabel('alerts')).toBe('البطاقة الذكية');
    });
});
