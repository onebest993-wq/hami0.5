import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepositoryClassificationBootFallback } from '../repositoryBootFallbacks';

describe('repositoryBootFallbacks', () => {
    it('تصنيف التحميل يحافظ على ارتفاع لمس 44px', () => {
        render(<RepositoryClassificationBootFallback />);
        const boot = screen.getByTestId('repository-classification-boot');
        expect(boot).toHaveAttribute('aria-busy', 'true');
        const rows = [...boot.querySelectorAll('[aria-hidden]')];
        expect(rows).toHaveLength(6);
        expect(rows.every((el) => el.className.includes('min-h-[44px]'))).toBe(true);
    });
});
