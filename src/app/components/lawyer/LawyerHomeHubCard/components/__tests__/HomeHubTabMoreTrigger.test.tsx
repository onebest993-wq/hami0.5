import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubTabMoreTrigger } from '../HomeHubTabMoreTrigger';

describe('HomeHubTabMoreTrigger', () => {
    it('لا يُرسم عند العدّ صفر', () => {
        const { container } = render(
            <HomeHubTabMoreTrigger count={0} onClick={vi.fn()} ariaLabel="المزيد" testId="more" />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('يفتح البقية مع aria للحوار و44px', () => {
        const onClick = vi.fn();
        const onPrefetch = vi.fn();
        render(
            <HomeHubTabMoreTrigger
                count={2}
                onClick={onClick}
                onPrefetch={onPrefetch}
                ariaLabel="عرض 2 تنبيهات عاجلة إضافية"
                testId="home-hub-urgent-more-trigger"
                controlsId="home-hub-urgent-more-panel"
                expanded={false}
            />,
        );
        const btn = screen.getByTestId('home-hub-urgent-more-trigger');
        expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
        expect(btn).toHaveAttribute('aria-expanded', 'false');
        expect(btn).toHaveAttribute('aria-controls', 'home-hub-urgent-more-panel');
        expect(btn).toHaveTextContent('البقية (2)');
        fireEvent.click(btn);
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
