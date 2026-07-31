export type CriminalTrashItemKind =
    | 'statement'
    | 'lawyer_request'
    | 'investigation_log'
    | 'other_evidence'
    | 'procedural_container'
    | 'procedural_sub_item'
    | 'judicial_decision';

export function criminalTrashItemKindLabel(kind: CriminalTrashItemKind): string {
    switch (kind) {
        case 'statement':
            return 'إفادة';
        case 'lawyer_request':
            return 'طلب / قرار';
        case 'investigation_log':
            return 'سجل تتبع';
        case 'other_evidence':
            return 'دليل إثبات';
        case 'procedural_container':
            return 'مسار تتبع';
        case 'procedural_sub_item':
            return 'عنصر مسار';
        case 'judicial_decision':
            return 'قرار قضائي';
        default:
            return 'عنصر';
    }
}
