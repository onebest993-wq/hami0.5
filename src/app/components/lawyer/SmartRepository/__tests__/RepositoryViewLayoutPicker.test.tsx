import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RepositoryViewLayoutPicker } from '../RepositoryViewLayoutPicker';

describe('RepositoryViewLayoutPicker', () => {
    it('يعرض نمطين أساسيين فقط — شبكة وقائمة', () => {
        const onSelect = vi.fn();
        render(<RepositoryViewLayoutPicker layoutId="grid" onSelect={onSelect} />);

        expect(screen.getByTestId('repository-view-segment')).toBeInTheDocument();
        expect(screen.getByTestId('repository-layout-grid')).toBeInTheDocument();
        expect(screen.getByTestId('repository-layout-list')).toBeInTheDocument();
        expect(screen.queryByTestId('repository-layout-compact')).not.toBeInTheDocument();
    });

    it('يستدعي onSelect عند اختيار القائمة ويُحدّث الحالة فوراً', () => {
        const onSelect = vi.fn();
        render(<RepositoryViewLayoutPicker layoutId="grid" onSelect={onSelect} />);

        fireEvent.click(screen.getByTestId('repository-layout-list'));
        expect(onSelect).toHaveBeenCalledWith('list');
        expect(screen.getByTestId('repository-layout-list').className).toContain(
            'hami-repository-view-segment__btn--active',
        );
        expect(screen.getByTestId('repository-layout-grid').className).not.toContain(
            'hami-repository-view-segment__btn--active',
        );
    });

    it('يُطبّع التخطيطات القديمة إلى شبكة', () => {
        const onSelect = vi.fn();
        render(<RepositoryViewLayoutPicker layoutId="timeline" onSelect={onSelect} />);

        expect(screen.getByTestId('repository-layout-grid').className).toContain(
            'hami-repository-view-segment__btn--active',
        );
    });
});
