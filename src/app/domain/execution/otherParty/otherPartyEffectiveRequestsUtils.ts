/**
 * Barrel: other-party effective requests — public import path unchanged.
 */
export type {
    OtherPartyRequestOutcome,
    OtherPartyRequestBadge,
    OtherPartyCatalogInput,
    OtherPartyExecutorTabBadge,
    HiddenPersonalCoerciveRequestKey,
} from './otherPartyEffectiveRequestsTypes';

export {
    buildOtherPartyRequestCatalog,
    resolveOtherPartyRequestOptionBadges,
    resolveOtherPartyExecutorTabBadge,
    resolveOtherPartyEffectiveRequestBadges,
} from './otherPartyEffectiveRequestsCatalog';
