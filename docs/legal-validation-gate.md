# Legal validation gate

## Quick gate

```bash
npm run gate:legal
```

Runs, in order:

1. Presence of this file + 17 legal-critical test source files (hard fail if any missing)
2. Vitest run of the 17 legal-critical test files listed in `scripts/legal-production-gate.mjs` L45-L60

## Coverage matrix of legal-critical test suite

| # | Test file | Domain |
|---|-----------|--------|
| 1 | `lawsuitJurisdiction.test.ts` | Lawsuit jurisdiction engine |
| 2 | `appealDeadlineEnforcement.test.ts` | Decisions & Appeals — deadlines |
| 3 | `judgmentAppealRights.test.ts` | Smart-file — judgment appeal rights |
| 4 | `crossAppealEngine.test.ts` | Smart-file — cross-appeal engine |
| 5 | `visitationScheduleEngine.test.ts` | Execution domain — visitation |
| 6 | `alimonyCalculations.test.ts` | Sharia & civil alimony calculations |
| 7 | `inheritanceCalculations.test.ts` | Inheritance (mirath) calculations |
| 8 | `imprisonmentEngine.test.ts` | Execution domain — imprisonment |
| 9 | `buildDebtorSummonsProfileBundle.test.ts` | Execution followup — summons bundle |
| 10 | `executionSummonsWorkflow.test.ts` | Execution summons workflow routing |
| 11 | `cassationEngine.test.ts` | Criminal system — cassation engine |
| 12 | `decisionAppealPeriodEngine.test.ts` | Criminal system — decision appeal period |
| 13 | `judicialDecisionsEngine.test.ts` | Criminal system — judicial decisions |
| 14 | `trialSessionsEngine.test.ts` | Criminal system — trial sessions |
| 15 | `verdictCassationResultEngine.test.ts` | Criminal system — verdict cassation result |
| 16 | `stageJourney.test.ts` | Criminal system — stage journey transitions |

## CI

Triggered from `gate:closed-sections` wrapper and from `quality-gate.yml` legal-invocation path.

## Known limits

- Real notarized deed document comparison is **not** part of this gate (paper-based comparison workflow in production operations).
- Calculation results for alimony/inheritance use exact-precision decimal; cross-check against notarized spreadsheets is done out-of-band for edge cases.
