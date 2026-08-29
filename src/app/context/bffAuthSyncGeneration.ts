/** جيل مزامنة جلسة BFF — يُبطِل مسباراً قديماً بعد دخول جديد */
let generation = 0;

export function nextBffAuthSyncGeneration(): number {
    generation += 1;
    return generation;
}

export function isCurrentBffAuthSyncGeneration(seen: number): boolean {
    return seen === generation;
}
