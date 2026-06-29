import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepositoryFeedList } from '../RepositoryFeedList';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import { REPOSITORY_FEED_VIRTUAL_SCROLL_THRESHOLD } from '../repositoryFeedConstants';

vi.mock('../RepositoryFeedVirtualList', () => ({
    RepositoryFeedVirtualList: () => <div data-testid="repository-feed-virtual-scroll" />,
}));

vi.mock('../RepositoryFeedProgressiveList', () => ({
    RepositoryFeedProgressiveList: () => <div data-testid="repository-feed-progressive" />,
}));

function makeItems(count: number): RepositoryFeedItem[] {
    return Array.from({ length: count }, (_, i) => ({
        kind: 'global' as const,
        note: {
            id: `n-${i}`,
            title: `بطاقة ${i}`,
            body: 'نص',
            isPinned: false,
        },
        sortKey: i,
    }));
}

const baseProps = {
    feedLayout: 'grid' as const,
    lawsuitFiles: [],
    executionFiles: [],
    dossiers: [],
    vaultDocsById: new Map(),
    onSaveGlobal: () => undefined,
    onDeleteGlobal: () => undefined,
    onUpdateLawsuit: () => undefined,
    onUpdateExecution: () => undefined,
    onLinkGlobalToDossier: async () => undefined,
    onBindVaultDoc: async () => undefined,
    onDeleteVaultDoc: () => undefined,
    onEditVaultDoc: () => undefined,
    onViewVaultDoc: () => undefined,
};

describe('RepositoryFeedList virtualization routing', () => {
    it('يستخدم العرض التدريجي دون العتبة', () => {
        render(
            <RepositoryFeedList
                {...baseProps}
                items={makeItems(REPOSITORY_FEED_VIRTUAL_SCROLL_THRESHOLD - 1)}
            />,
        );
        expect(screen.getByTestId('repository-feed-progressive')).toBeInTheDocument();
        expect(screen.queryByTestId('repository-feed-virtual-scroll')).not.toBeInTheDocument();
    });

    it('يفعّل التمرير الافتراضي عند العتبة أو فوقها', () => {
        render(
            <RepositoryFeedList
                {...baseProps}
                feedLayout="list"
                items={makeItems(REPOSITORY_FEED_VIRTUAL_SCROLL_THRESHOLD)}
            />,
        );
        expect(screen.getByTestId('repository-feed-virtual-scroll')).toBeInTheDocument();
        expect(screen.queryByTestId('repository-feed-progressive')).not.toBeInTheDocument();
    });
});
