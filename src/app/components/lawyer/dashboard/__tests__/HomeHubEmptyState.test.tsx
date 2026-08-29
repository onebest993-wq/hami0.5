import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeHubEmptyState } from '../HomeHubEmptyState';

describe('HomeHubEmptyState', () => {
    it('يعلن الحالة كـ status مع النص', () => {
        render(<HomeHubEmptyState message="لا يوجد تنبيه أو تثبيت" testId="home-hub-fully-empty" />);
        const node = screen.getByTestId('home-hub-fully-empty');
        expect(node).toHaveAttribute('role', 'status');
        expect(node).toHaveTextContent('لا يوجد تنبيه أو تثبيت');
        expect(node.className).toContain('hami-hub-empty');
        expect(node.className).toContain('min-h-[44px]');
        expect(node.className).not.toContain('hami-hub-empty--compact');
    });

    it('الوضع المضغوط لا يغيّر الدور', () => {
        render(
            <HomeHubEmptyState
                message="لا يوجد تنبيه أو تثبيت"
                testId="home-hub-fully-empty"
                compact
            />,
        );
        const node = screen.getByTestId('home-hub-fully-empty');
        expect(node).toHaveAttribute('role', 'status');
        expect(node.className).toContain('hami-hub-empty--compact');
        expect(node.className).toContain('min-h-[44px]');
    });
});
