import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeHubOverlayChunkFallback } from '../HomeHubOverlayChunkFallback';

describe('HomeHubOverlayChunkFallback', () => {
    it('يعلن التحميل لقارئ الشاشة دون سطح مرئي', () => {
        render(
            <HomeHubOverlayChunkFallback testId="home-hub-pins-more-loading" label="جاري تحميل قائمة التثبيت" />,
        );
        const node = screen.getByTestId('home-hub-pins-more-loading');
        expect(node).toHaveAttribute('role', 'status');
        expect(node).toHaveAttribute('aria-live', 'polite');
        expect(node).toHaveClass('sr-only');
        expect(node).toHaveTextContent('جاري تحميل قائمة التثبيت');
    });
});
