export type SeizureLogTab = 'property' | 'salary' | 'movable' | 'third_party';

export function isSeizureLogTab(v: string): v is SeizureLogTab {
    return v === 'property' || v === 'salary' || v === 'movable' || v === 'third_party';
}
