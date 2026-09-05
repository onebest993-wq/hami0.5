import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RepositoryFeedList } from '../RepositoryFeedList';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';

vi.mock('../RepositoryFeedVirtualList', () => ({
    RepositoryFeedVirtualList: () => <div data-testid="repository-feed-virtual-scroll" />,
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
    it('يستخدم التمرير الافتراضي للقوائم القصيرة', () => {
        render(
            <RepositoryFeedList
                {...baseProps}
                items={makeItems(3)}
            />,
        );
        expect(screen.getByTestId('repository-feed-virtual-scroll')).toBeInTheDocument();
        expect(screen.queryByTestId('repository-feed-progressive')).not.toBeInTheDocument();
        expect(screen.queryByTestId('repository-show-all-items')).not.toBeInTheDocument();
    });

    it('يستخدم التمرير الافتراضي للقوائم الطويلة', () => {
        render(
            <RepositoryFeedList
                {...baseProps}
                feedLayout="list"
                items={makeItems(40)}
            />,
        );
        expect(screen.getByTestId('repository-feed-virtual-scroll')).toBeInTheDocument();
        expect(screen.queryByTestId('repository-feed-progressive')).not.toBeInTheDocument();
    });
});
