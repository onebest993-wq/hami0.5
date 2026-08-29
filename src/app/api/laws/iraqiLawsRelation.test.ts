import { describe, expect, it } from 'vitest';
import { IRAQI_LAWS_TABLE_MISSING, isMissingIraqiLawsRelation } from './iraqiLawsRelation.ts';

describe('iraqiLawsRelation', () => {
  it('يكشف جدول القوانين الغائب', () => {
    expect(isMissingIraqiLawsRelation('relation "iraqi_laws" does not exist')).toBe(true);
    expect(isMissingIraqiLawsRelation('Could not find the table in the schema cache')).toBe(true);
    expect(isMissingIraqiLawsRelation('duplicate key value')).toBe(false);
  });

  it('رسالة المقر عربية وواضحة', () => {
    expect(IRAQI_LAWS_TABLE_MISSING).toContain('iraqi_laws');
    expect(IRAQI_LAWS_TABLE_MISSING).toContain('جدول القوانين');
  });
});
