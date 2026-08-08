import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
    formatHubSparkAttentionBadge,
    HubSparkAttentionBadge,
    shouldShowHubSparkAttentionBadge,
} from '@/app/components/lawyer/dashboard/commandHub/HubSparkAttentionBadge';

describe('HubSparkAttentionBadge', () => {
    it('formatHubSparkAttentionBadge يحدّ العدد عند 99+', () => {
        expect(formatHubSparkAttentionBadge(0)).toBe('');
        expect(formatHubSparkAttentionBadge(3)).toBe('3');
        expect(formatHubSparkAttentionBadge(120)).toBe('99+');
        expect(shouldShowHubSparkAttentionBadge(1)).toBe(true);
        expect(shouldShowHubSparkAttentionBadge(0)).toBe(false);
    });

    it('يعرض شارة زجاجية للعدّاد', () => {
        render(<HubSparkAttentionBadge count={4} />);
        const badge = screen.getByTestId('hub-spark-attention-badge');
        expect(badge).toHaveTextContent('4');
        expect(badge.className).toContain('backdrop-blur-md');
    });

    it('يعرض نقطة زجاجية للمستودع', () => {
        render(<HubSparkAttentionBadge count={1} variant="dot" />);
        expect(screen.getByTestId('hub-spark-attention-dot')).toBeInTheDocument();
    });

    it('لا يعرض شيئاً عند صفر', () => {
        const { container } = render(<HubSparkAttentionBadge count={0} />);
        expect(container.firstChild).toBeNull();
    });
});
