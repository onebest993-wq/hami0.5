import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import type { SeizureAssetKind, SeizureEntityBase } from './seizureWorkflowTypes';

export type SeizureAssetPlugin = {
    kind: SeizureAssetKind;
    entityPayloadKey: 'seizedMovableId' | 'seizedPropertyId';
    initSubtypes: string[];
    auctionSubtype: string;
    expertSubtype: string;
    expertCommitteeSubtype: string;
    expertObjectionSubtype: string;
    finalAwardSubtype: string;
    reauctionDefaultSubtype: string;
    buyerDeliverySubtype: string;
    proceedsDisburseSubtype: string;
    titleTransferSubtype?: string;
    staleInitTextRegex: RegExp;
    exclusiveSubtypeGroups: string[][];
    subtypeLabelAr: Record<string, string>;
    seizureRequestBody: (entity: SeizureEntityBase, lead: string) => string;
};

const MOVABLE_PLUGIN: SeizureAssetPlugin = {
    kind: 'movable',
    entityPayloadKey: 'seizedMovableId',
    initSubtypes: ['movable', 'movable_auction'],
    auctionSubtype: 'movable_auction_date',
    expertSubtype: 'movable_expert',
    expertCommitteeSubtype: 'movable_expert_committee',
    expertObjectionSubtype: 'movable_expert_objection',
    finalAwardSubtype: 'movable_final_award',
    reauctionDefaultSubtype: 'movable_reauction_default',
    buyerDeliverySubtype: 'movable_buyer_delivery',
    proceedsDisburseSubtype: 'movable_proceeds_disburse',
    staleInitTextRegex: /منقول|مركبة/i,
    exclusiveSubtypeGroups: [
        ['movable_auction_date', 'movable_expert_objection'],
        ['movable_final_award', 'movable_reauction_default'],
    ],
    subtypeLabelAr: {
        movable_auction_date: 'تحديد موعد مزايدة',
        movable_expert_objection: 'اعتراض على التقدير',
        movable_final_award: 'إحالة قطعية',
        movable_reauction_default: 'إعادة المزايدة للنكول',
    },
    seizureRequestBody: (entity, lead) => {
        const m = entity as SeizedMovable;
        return [
            lead,
            `وصف المال: ${String(m.movableDescription || '').trim()}`,
            `المكان: ${String(m.movableLocation || '').trim()}`,
            m.judicialCustodianName
                ? `الحارس القضائي: ${String(m.judicialCustodianName).trim()}`
                : null,
        ]
            .filter(Boolean)
            .join('\n');
    },
};

const PROPERTY_PLUGIN: SeizureAssetPlugin = {
    kind: 'property',
    entityPayloadKey: 'seizedPropertyId',
    initSubtypes: ['property'],
    auctionSubtype: 'property_auction',
    expertSubtype: 'property_expert',
    expertCommitteeSubtype: 'property_expert_committee',
    expertObjectionSubtype: 'property_expert_objection',
    finalAwardSubtype: 'property_final_award',
    reauctionDefaultSubtype: 'property_reauction_default',
    buyerDeliverySubtype: 'property_buyer_delivery',
    proceedsDisburseSubtype: 'property_proceeds_disburse',
    titleTransferSubtype: 'property_title_transfer',
    staleInitTextRegex: /عقار/i,
    exclusiveSubtypeGroups: [
        ['property_auction', 'property_expert_objection'],
        ['property_final_award', 'property_reauction_default'],
    ],
    subtypeLabelAr: {
        property_auction: 'تحديد موعد مزايدة',
        property_expert_objection: 'اعتراض على التقدير',
        property_final_award: 'إحالة قطعية',
        property_reauction_default: 'إعادة المزايدة للنكول',
    },
    seizureRequestBody: (entity, lead) => {
        const p = entity as SeizedProperty;
        return [
            lead,
            `رقم العقار: ${String(p.propertyNumber || '').trim()}`,
            `الجنس: ${String(p.propertyGender || '').trim()}`,
            p.propertyAddress ? `العنوان: ${String(p.propertyAddress).trim()}` : null,
        ]
            .filter(Boolean)
            .join('\n');
    },
};

export function getSeizureAssetPlugin(kind: SeizureAssetKind): SeizureAssetPlugin {
    return kind === 'movable' ? MOVABLE_PLUGIN : PROPERTY_PLUGIN;
}

export function parseSeizedEntityIdFromDecision(
    plugin: SeizureAssetPlugin,
    row: Record<string, unknown>,
): string {
    const rawJson = String(row?.seizurePayloadJson || '').trim();
    if (!rawJson) return '';
    try {
        const v = JSON.parse(rawJson) as Record<string, unknown>;
        return String(v?.[plugin.entityPayloadKey] ?? '').trim();
    } catch {
        return '';
    }
}

export function buildSeizurePayloadJson(
    plugin: SeizureAssetPlugin,
    entityId: string,
    extra?: Record<string, unknown>,
): string {
    return JSON.stringify({
        [plugin.entityPayloadKey]: entityId,
        ...(extra || {}),
    });
}
