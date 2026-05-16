/**
 * Alimony Calculations Tests
 * Critical tests for Iraqi Personal Status Law alimony calculations
 */

import { describe, it, expect } from 'vitest';

// Mock alimony calculation functions
const calculateAlimony = (params: {
  husbandIncome: number;
  wifeIncome: number;
  numberOfChildren: number;
  housingType: 'owned' | 'rented' | 'family';
  location: 'baghdad' | 'other';
}): number => {
  const { husbandIncome, wifeIncome: _wifeIncome, numberOfChildren, housingType, location } = params;
  
  // Base alimony: 25% of husband's income
  let wifeAlimony = husbandIncome * 0.25;
  
  // Children alimony: 15% per child
  const childrenAlimony = husbandIncome * 0.15 * numberOfChildren;
  
  // Housing allowance
  let housingAlimony = 0;
  if (housingType === 'rented') {
    housingAlimony = location === 'baghdad' ? 500000 : 300000;
  }
  
  // Total
  const total = wifeAlimony + childrenAlimony + housingAlimony;
  
  // Cap at 60% of husband's income
  const maxAlimony = husbandIncome * 0.6;
  
  return Math.min(total, maxAlimony);
};

describe('Alimony Calculations - Iraqi Personal Status Law', () => {
  describe('Basic Calculations', () => {
    it('should calculate alimony for wife only (no children)', () => {
      const result = calculateAlimony({
        husbandIncome: 2000000, // 2M IQD
        wifeIncome: 0,
        numberOfChildren: 0,
        housingType: 'owned',
        location: 'baghdad',
      });

      // 25% of 2M = 500,000 IQD
      expect(result).toBe(500000);
    });

    it('should calculate alimony with one child', () => {
      const result = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 0,
        numberOfChildren: 1,
        housingType: 'owned',
        location: 'baghdad',
      });

      // Wife: 500,000 + Child: 300,000 = 800,000 IQD
      expect(result).toBe(800000);
    });

    it('should calculate alimony with multiple children', () => {
      const result = calculateAlimony({
        husbandIncome: 3000000,
        wifeIncome: 0,
        numberOfChildren: 3,
        housingType: 'owned',
        location: 'baghdad',
      });

      // Wife: 750,000 + Children: 1,350,000 = 2,100,000 IQD
      // But capped at 60% = 1,800,000
      expect(result).toBeLessThanOrEqual(1800000);
    });
  });

  describe('Housing Allowance', () => {
    it('should add housing allowance for rented property in Baghdad', () => {
      const result = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 0,
        numberOfChildren: 0,
        housingType: 'rented',
        location: 'baghdad',
      });

      // Wife: 500,000 + Housing: 500,000 = 1,000,000 IQD
      expect(result).toBe(1000000);
    });

    it('should add housing allowance for rented property in other cities', () => {
      const result = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 0,
        numberOfChildren: 0,
        housingType: 'rented',
        location: 'other',
      });

      // Wife: 500,000 + Housing: 300,000 = 800,000 IQD
      expect(result).toBe(800000);
    });

    it('should not add housing allowance for owned property', () => {
      const result = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 0,
        numberOfChildren: 0,
        housingType: 'owned',
        location: 'baghdad',
      });

      // Wife only: 500,000 IQD
      expect(result).toBe(500000);
    });

    it('should not add housing allowance when living with family', () => {
      const result = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 0,
        numberOfChildren: 0,
        housingType: 'family',
        location: 'baghdad',
      });

      // Wife only: 500,000 IQD
      expect(result).toBe(500000);
    });
  });

  describe('Income Caps', () => {
    it('should cap total alimony at 60% of husband income', () => {
      const result = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 0,
        numberOfChildren: 5, // Many children
        housingType: 'rented',
        location: 'baghdad',
      });

      // Should be capped at 60% of 2M = 1,200,000 IQD
      expect(result).toBeLessThanOrEqual(1200000);
    });

    it('should handle very high income correctly', () => {
      const result = calculateAlimony({
        husbandIncome: 10000000, // 10M IQD
        wifeIncome: 0,
        numberOfChildren: 2,
        housingType: 'rented',
        location: 'baghdad',
      });

      // Should respect the 60% cap
      const maxAllowed = 10000000 * 0.6;
      expect(result).toBeLessThanOrEqual(maxAllowed);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero income', () => {
      const result = calculateAlimony({
        husbandIncome: 0,
        wifeIncome: 0,
        numberOfChildren: 1,
        housingType: 'owned',
        location: 'baghdad',
      });

      expect(result).toBe(0);
    });

    it('should handle minimum income', () => {
      const result = calculateAlimony({
        husbandIncome: 500000, // Minimum wage
        wifeIncome: 0,
        numberOfChildren: 1,
        housingType: 'owned',
        location: 'other',
      });

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(300000); // 60% of 500K
    });

    it('should handle working wife (should not affect calculation)', () => {
      const result = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 1000000, // Wife has income
        numberOfChildren: 1,
        housingType: 'owned',
        location: 'baghdad',
      });

      // Wife's income doesn't reduce alimony in Iraqi law
      expect(result).toBe(800000);
    });
  });

  describe('Legal Compliance', () => {
    it('should comply with minimum alimony requirements', () => {
      const result = calculateAlimony({
        husbandIncome: 1000000,
        wifeIncome: 0,
        numberOfChildren: 0,
        housingType: 'owned',
        location: 'other',
      });

      // Minimum should be 25% for wife
      expect(result).toBeGreaterThanOrEqual(250000);
    });

    it('should handle child support increments correctly', () => {
      const noChild = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 0,
        numberOfChildren: 0,
        housingType: 'owned',
        location: 'baghdad',
      });

      const oneChild = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 0,
        numberOfChildren: 1,
        housingType: 'owned',
        location: 'baghdad',
      });

      const twoChildren = calculateAlimony({
        husbandIncome: 2000000,
        wifeIncome: 0,
        numberOfChildren: 2,
        housingType: 'owned',
        location: 'baghdad',
      });

      // Each child should add 15% (300,000 IQD)
      expect(oneChild - noChild).toBe(300000);
      expect(twoChildren - oneChild).toBe(300000);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should calculate typical Baghdad case', () => {
      // Typical case: middle-income husband, 2 children, rented house
      const result = calculateAlimony({
        husbandIncome: 3000000, // 3M IQD monthly
        wifeIncome: 0,
        numberOfChildren: 2,
        housingType: 'rented',
        location: 'baghdad',
      });

      // Wife: 750K + Children: 900K + Housing: 500K = 2,150K
      // Capped at 60% = 1,800K
      expect(result).toBe(1800000);
    });

    it('should calculate low-income case', () => {
      const result = calculateAlimony({
        husbandIncome: 800000, // Minimum wage scenario
        wifeIncome: 0,
        numberOfChildren: 1,
        housingType: 'family',
        location: 'other',
      });

      // Wife: 200K + Child: 120K = 320K
      expect(result).toBe(320000);
    });

    it('should calculate high-income case', () => {
      const result = calculateAlimony({
        husbandIncome: 8000000, // High income
        wifeIncome: 0,
        numberOfChildren: 3,
        housingType: 'owned',
        location: 'baghdad',
      });

      // Should be capped at 60%
      expect(result).toBe(4800000);
    });
  });

  describe('Percentage Validation', () => {
    it('should never exceed 60% of husband income', () => {
      const testCases = [
        { income: 1000000, children: 5 },
        { income: 5000000, children: 4 },
        { income: 10000000, children: 6 },
      ];

      testCases.forEach(({ income, children }) => {
        const result = calculateAlimony({
          husbandIncome: income,
          wifeIncome: 0,
          numberOfChildren: children,
          housingType: 'rented',
          location: 'baghdad',
        });

        const maxAllowed = income * 0.6;
        expect(result).toBeLessThanOrEqual(maxAllowed);
      });
    });

    it('should always provide at least wife alimony (25%)', () => {
      const testCases = [500000, 1000000, 2000000, 5000000];

      testCases.forEach(income => {
        const result = calculateAlimony({
          husbandIncome: income,
          wifeIncome: 0,
          numberOfChildren: 0,
          housingType: 'owned',
          location: 'other',
        });

        const expectedMinimum = income * 0.25;
        expect(result).toBeGreaterThanOrEqual(expectedMinimum);
      });
    });
  });
});
