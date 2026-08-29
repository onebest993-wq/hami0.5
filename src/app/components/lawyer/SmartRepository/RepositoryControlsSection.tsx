import React, { memo } from 'react';
import { VaultSearchFilterHub } from '@/app/components/lawyer/SmartVaultModal/VaultSearchFilterHub';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import { REPO_CONTROLS_SHELL } from './smartRepositoryTheme';
import { RepositoryAddMenu } from './RepositoryAddMenu';
import { RepositoryFiltersRail } from './RepositoryFiltersRail';
import { RepositoryViewLayoutPicker } from './RepositoryViewLayoutPicker';
import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { RepositoryRoom, RepositoryRoomFilter } from '@/app/services/repository/repositoryRooms';

type VaultControls = Pick<
    ReturnType<typeof useSmartVault>,
    | 'searchQuery'
    | 'setSearchQuery'
    | 'handleSearchSubmit'
    | 'searchInputRef'
    | 'activeFilter'
    | 'setActiveFilter'
    | 'customCategories'
    | 'addVaultCategory'
    | 'removeVaultCategory'
    | 'imageInputRef'
    | 'pdfInputRef'
    | 'handleImageUploadSelect'
    | 'handlePdfUploadSelect'
>;

type RepositoryControlsSectionProps = {
    vault: VaultControls;
    unboundVaultDocs: SmartVaultDoc[];
    notes: GlobalNote[];
    rooms: RepositoryRoom[];
    pinnedRoomIds: string[];
    selectedRoomId: RepositoryRoomFilter;
    onSelectRoom: (filter: RepositoryRoomFilter) => void;
    onCreateRoom: (title: string) => void;
    onRemoveRoom: (roomId: string) => void;
    onTogglePinRoom: (roomId: string) => void;
    feedLayout: RepositoryFeedLayoutId;
    actionToolbarDisabled?: boolean;
    onFeedLayoutChange: (layout: RepositoryFeedLayoutId) => void;
    onCreateNote: () => void;
    onOpenScanner: () => void;
    onOpenVoice: () => void;
};

export const RepositoryControlsSection = memo(function RepositoryControlsSection({
    vault,
    unboundVaultDocs,
    notes,
    rooms,
    pinnedRoomIds,
    selectedRoomId,
    onSelectRoom,
    onCreateRoom,
    onRemoveRoom,
    onTogglePinRoom,
    feedLayout,
    actionToolbarDisabled = false,
    onFeedLayoutChange,
    onCreateNote,
    onOpenScanner,
    onOpenVoice,
}: RepositoryControlsSectionProps) {
    return (
        <div className={REPO_CONTROLS_SHELL}>
            <div className="hami-repository-controls-toolbar px-5 pt-3 pb-2 shrink-0" dir="rtl">
                <div className="hami-repository-controls-toolbar__search">
                    <VaultSearchFilterHub
                        searchQuery={vault.searchQuery}
                        onSearchChange={vault.setSearchQuery}
                        onSearchKeyDown={vault.handleSearchSubmit}
                        searchInputRef={vault.searchInputRef}
                        activeFilter={vault.activeFilter}
                        onFilterChange={vault.setActiveFilter}
                        customCategories={vault.customCategories}
                        onAddCategory={vault.addVaultCategory}
                        onRemoveCategory={(name) => void vault.removeVaultCategory(name)}
                        docs={unboundVaultDocs}
                        notes={notes}
                    />
                </div>
                <RepositoryViewLayoutPicker
                    layoutId={feedLayout}
                    onSelect={onFeedLayoutChange}
                />
                <RepositoryAddMenu
                    onCreateNote={onCreateNote}
                    onOpenScanner={onOpenScanner}
                    onOpenVoice={onOpenVoice}
                    disabled={actionToolbarDisabled}
                    imageInputRef={vault.imageInputRef}
                    pdfInputRef={vault.pdfInputRef}
                    onImageSelect={(e) => void vault.handleImageUploadSelect(e)}
                    onPdfSelect={(e) => void vault.handlePdfUploadSelect(e)}
                />
            </div>

            <div className="hami-repository-rail hami-repository-rail--filters shrink-0 min-w-0 pe-4" dir="rtl">
                <RepositoryFiltersRail
                    docs={unboundVaultDocs}
                    notes={notes}
                    rooms={rooms}
                    pinnedRoomIds={pinnedRoomIds}
                    selectedRoomId={selectedRoomId}
                    onSelectRoom={onSelectRoom}
                    onCreateRoom={onCreateRoom}
                    onRemoveRoom={onRemoveRoom}
                    onTogglePinRoom={onTogglePinRoom}
                />
            </div>
        </div>
    );
});
