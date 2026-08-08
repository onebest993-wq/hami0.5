/** يستنتج إن كان الحكم يستوجب تمييزاً إلزامياً — من سجل الإضبارة أو الأرشيف */
export function resolveCriminalMandatoryCassationFromRecord(record: Record<string, unknown>): boolean {
    if (record.isSentToCassation === true) return false;

    const finalDecision =
        record.finalDecision && typeof record.finalDecision === 'object'
            ? (record.finalDecision as Record<string, unknown>)
            : null;

    const decisionType = String(finalDecision?.decisionType ?? '').trim();
    const punishmentType = String(finalDecision?.punishmentType ?? '').trim();

    return (
        decisionType === 'conviction' &&
        (punishmentType === 'death' || punishmentType === 'life')
    );
}
