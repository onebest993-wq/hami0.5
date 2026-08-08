export type SparkTextAuditFieldType = 'petition' | 'attachment' | 'note';

export type SparkTextAuditRequest = {
    text: string;
    fieldType: SparkTextAuditFieldType;
    caseNo?: string;
    court?: string;
};

/** نتيجة تدقيق شكلي — بدون استنتاج قانوني */
export type SparkTextAuditResult = {
    present: string[];
    missing: string[];
    summary: string;
};
