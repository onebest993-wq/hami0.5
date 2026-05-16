/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 QUICK START: IMMUTABLE LEDGER ENGINE INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This is a REFERENCE IMPLEMENTATION showing how to integrate the Immutable 
 * Ledger Engine into your existing React components WITHOUT changing UI.
 * 
 * USAGE:
 * 1. Copy patterns from this file into your actual components
 * 2. Adapt state management to your existing structure
 * 3. Add conditional rendering based on legalActions
 * 
 * ⚠️ THIS FILE IS FOR REFERENCE ONLY - NOT TO BE EXECUTED DIRECTLY
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    createImmutableLedger,
    determineLegalActionsAvailability,
    evaluateAlimonyOverride,
    evaluateStrategicAlimonyWarning,
    recordPayment,
    recordBreach,
    getPaymentHistorySummary,
    shouldTriggerCoerciveMeasures,
    type ImmutableFinancialLedger,
    type ClaimType,
    type DebtorProfession,
    type LegalActionsAvailability
} from './src/app/utils/immutableLedgerEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 EXAMPLE 1: Creating a New Execution File
// ═══════════════════════════════════════════════════════════════════════════════

export function ExecutionFileCreationExample() {
    // STEP 1: Collect data from form (existing UI - no changes)
    const [principalDebt, setPrincipalDebt] = useState<string>('');
    const [claimType, setClaimType] = useState<ClaimType>('دين مالي');
    const [debtorProfession, setDebtorProfession] = useState<DebtorProfession>('كاسب');
    
    // STEP 2: Create ledger on submit
    const handleCreateFile = () => {
        const debtAmount = parseFloat(principalDebt.replace(/,/g, ''));
        
        // ✅ CREATE IMMUTABLE LEDGER
        const ledger = createImmutableLedger(
            debtAmount,
            claimType,
            debtorProfession
        );
        
        // Save to localStorage
        localStorage.setItem('current_execution_ledger', JSON.stringify(ledger));
        
        console.log('✅ Ledger created:', ledger);
        console.log('🔒 Principal Debt (READ-ONLY):', ledger.principal_debt);
        console.log('💰 Execution Fee (2%):', ledger.execution_fee);
    };
    
    return (
        <div>
            {/* EXISTING UI - NO CHANGES */}
            <input 
                type="text" 
                value={principalDebt}
                onChange={(e) => setPrincipalDebt(e.target.value)}
                placeholder="المبلغ الأصلي"
            />
            <select value={claimType} onChange={(e) => setClaimType(e.target.value as ClaimType)}>
                <option value="دين مالي">دين مالي</option>
                <option value="نفقة شرعية">نفقة شرعية</option>
            </select>
            <select value={debtorProfession} onChange={(e) => setDebtorProfession(e.target.value as DebtorProfession)}>
                <option value="موظف">موظف حكومي</option>
                <option value="كاسب">كاسب</option>
            </select>
            
            <button onClick={handleCreateFile}>
                فتح الإضبارة
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📂 EXAMPLE 2: File Details View with Dynamic Legal Actions
// ═══════════════════════════════════════════════════════════════════════════════

export function ExecutionFileDetailsExample() {
    // STEP 1: Load ledger from storage
    const [ledger, setLedger] = useState<ImmutableFinancialLedger | null>(null);
    
    // STEP 2: Additional state for override logic
    const [employeeNetSalary, setEmployeeNetSalary] = useState<number>(0);
    const [hasGuarantor, setHasGuarantor] = useState(false);
    const [isLumpSumDemand, setIsLumpSumDemand] = useState(false);
    const [hasSettlement, setHasSettlement] = useState(false);
    
    // STEP 3: Load ledger on mount
    useEffect(() => {
        const storedLedger = localStorage.getItem('current_execution_ledger');
        if (storedLedger) {
            setLedger(JSON.parse(storedLedger) as ImmutableFinancialLedger);
        }
    }, []);
    
    // STEP 4: Compute available legal actions
    const legalActions = useMemo<LegalActionsAvailability | null>(() => {
        if (!ledger) return null;
        
        return determineLegalActionsAvailability(
            ledger,
            employeeNetSalary || undefined,
            hasGuarantor
        );
    }, [ledger, employeeNetSalary, hasGuarantor]);
    
    // STEP 5: Strategic warning check
    const strategicWarning = useMemo(() => {
        if (!ledger) return null;
        
        return evaluateStrategicAlimonyWarning(
            ledger.claim_type,
            ledger.debtor_profession,
            isLumpSumDemand,
            hasSettlement
        );
    }, [ledger, isLumpSumDemand, hasSettlement]);
    
    // STEP 6: Alimony override details (for employee + alimony)
    const alimonyOverride = useMemo(() => {
        if (!ledger || ledger.claim_type !== 'نفقة شرعية' || ledger.debtor_profession !== 'موظف') {
            return null;
        }
        
        if (!employeeNetSalary) return null;
        
        return evaluateAlimonyOverride(
            ledger.principal_debt,
            employeeNetSalary,
            hasGuarantor
        );
    }, [ledger, employeeNetSalary, hasGuarantor]);
    
    if (!ledger) return <div>Loading...</div>;
    
    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            {/* ═══════════════════════════════════════════════════════ */}
            {/* FINANCIAL DASHBOARD (READ-ONLY PRINCIPAL) */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div style={{ background: '#f0f0f0', padding: '15px', marginBottom: '20px' }}>
                <h3>📊 الملخص المالي</h3>
                <div>
                    <strong>المبلغ الأصلي المحكوم به (ثابت):</strong> 
                    <span style={{ color: '#d97706' }}> {ledger.principal_debt.toLocaleString()} دينار</span>
                </div>
                <div>
                    <strong>رسوم التنفيذ (2%):</strong> 
                    <span> {ledger.execution_fee.toLocaleString()} دينار</span>
                </div>
                <div>
                    <strong>إجمالي المدفوع:</strong> 
                    <span style={{ color: '#10b981' }}> {ledger.total_paid.toLocaleString()} دينار</span>
                </div>
                <div>
                    <strong>الرصيد المتبقي:</strong> 
                    <span style={{ color: '#ef4444' }}> {ledger.remaining_balance.toLocaleString()} دينار</span>
                </div>
            </div>
            
            {/* ═══════════════════════════════════════════════════════ */}
            {/* ALIMONY OVERRIDE INPUT (Government Employee + Alimony) */}
            {/* ═══════════════════════════════════════════════════════ */}
            {ledger.debtor_profession === 'موظف' && ledger.claim_type === 'نفقة شرعية' && (
                <div style={{ background: '#fef3c7', padding: '15px', marginBottom: '20px' }}>
                    <h4>⚠️ تقييم النفقة للموظف الحكومي</h4>
                    <label>
                        الراتب الصافي للموظف (دينار):
                        <input 
                            type="number"
                            value={employeeNetSalary || ''}
                            onChange={(e) => setEmployeeNetSalary(parseFloat(e.target.value) || 0)}
                            style={{ marginLeft: '10px', padding: '5px' }}
                        />
                    </label>
                    
                    {alimonyOverride && (
                        <div style={{ marginTop: '10px', background: 'white', padding: '10px', borderRadius: '5px' }}>
                            <strong>النتيجة:</strong>
                            <p>{alimonyOverride.overrideMessage}</p>
                            {alimonyOverride.immunityShouldDrop && (
                                <div>
                                    <label>
                                        <input 
                                            type="checkbox"
                                            checked={hasGuarantor}
                                            onChange={(e) => setHasGuarantor(e.target.checked)}
                                        />
                                        هل تم تقديم كفيل ضامن؟
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {/* ═══════════════════════════════════════════════════════ */}
            {/* LEGAL ACTIONS SECTION (CONDITIONAL RENDERING) */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div style={{ background: '#e0e7ff', padding: '15px', marginBottom: '20px' }}>
                <h3>⚖️ الإجراءات القانونية المتاحة</h3>
                
                {/* IMPRISONMENT BUTTON */}
                {legalActions?.canRequestImprisonment ? (
                    <button style={{ 
                        background: '#dc2626', 
                        color: 'white', 
                        padding: '10px 20px', 
                        margin: '5px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}>
                        🔒 طلب الحبس
                    </button>
                ) : (
                    <div style={{ color: '#6b7280', fontSize: '14px' }}>
                        ❌ طلب الحبس معطل
                        {legalActions?.imprisonmentBlockingReasons.map((reason, i) => (
                            <div key={i} style={{ marginLeft: '20px' }}>• {reason}</div>
                        ))}
                    </div>
                )}
                
                {/* SALARY GARNISHMENT BUTTON */}
                {legalActions?.canGarnishSalary && (
                    <div>
                        <button style={{ 
                            background: '#059669', 
                            color: 'white', 
                            padding: '10px 20px', 
                            margin: '5px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}>
                            💰 إصدار قرار حجز 1/5 الراتب
                        </button>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>
                            {legalActions.salaryGarnishmentNote}
                        </p>
                    </div>
                )}
                
                {/* GUARANTOR BUTTON */}
                {legalActions?.canRequestGuarantor && (
                    <button style={{ 
                        background: '#0891b2', 
                        color: 'white', 
                        padding: '10px 20px', 
                        margin: '5px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}>
                        👤 إضافة كفيل ضامن
                    </button>
                )}
                
                {/* SETTLEMENT BUTTON (Always Available) */}
                {legalActions?.canInitiateSettlement && (
                    <button style={{ 
                        background: '#7c3aed', 
                        color: 'white', 
                        padding: '10px 20px', 
                        margin: '5px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}>
                        📝 إبرام تسوية مالية
                    </button>
                )}
                
                {/* STRATEGIC WARNINGS */}
                {legalActions?.strategicWarnings && legalActions.strategicWarnings.length > 0 && (
                    <div style={{ marginTop: '15px', background: '#fef3c7', padding: '10px', borderRadius: '5px' }}>
                        <strong>⚠️ تحذيرات استراتيجية:</strong>
                        {legalActions.strategicWarnings.map((warning, i) => (
                            <div key={i} style={{ marginTop: '5px' }}>{warning}</div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* ═══════════════════════════════════════════════════════ */}
            {/* STRATEGIC ALIMONY WARNING OVERLAY */}
            {/* ═══════════════════════════════════════════════════════ */}
            {strategicWarning?.shouldShowWarning && (
                <div style={{ 
                    position: 'fixed', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    background: 'white',
                    border: '3px solid #dc2626',
                    borderRadius: '10px',
                    padding: '30px',
                    maxWidth: '600px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    zIndex: 1000
                }}>
                    <h2 style={{ color: '#dc2626' }}>{strategicWarning.warningTitle}</h2>
                    <p style={{ lineHeight: '1.6' }}>{strategicWarning.warningMessage}</p>
                    
                    <h4>✅ الإجراءات الموصى بها:</h4>
                    <ul>
                        {strategicWarning.recommendedActions.map((action, i) => (
                            <li key={i}>{action}</li>
                        ))}
                    </ul>
                    
                    <button 
                        onClick={() => setIsLumpSumDemand(false)}
                        style={{ 
                            background: '#10b981', 
                            color: 'white', 
                            padding: '10px 20px', 
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            marginTop: '15px'
                        }}
                    >
                        فهمت - سأتخذ الإجراءات الموصى بها
                    </button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💳 EXAMPLE 3: Payment Recording (Binary Tracking)
// ═══════════════════════════════════════════════════════════════════════════════

export function PaymentRecordingExample() {
    const [ledger, setLedger] = useState<ImmutableFinancialLedger | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    
    useEffect(() => {
        const stored = localStorage.getItem('current_execution_ledger');
        if (stored) setLedger(JSON.parse(stored));
    }, []);
    
    // HANDLER: Record Payment
    const handleRecordPayment = () => {
        if (!ledger) return;
        
        const amount = parseFloat(paymentAmount.replace(/,/g, ''));
        
        // ✅ IMMUTABLE UPDATE
        const updatedLedger = recordPayment(ledger, {
            amount,
            date: new Date().toISOString().split('T')[0],
            verified: true,
            notes: 'دفعة من المدين'
        });
        
        // Update state
        setLedger(updatedLedger);
        
        // Save to storage
        localStorage.setItem('current_execution_ledger', JSON.stringify(updatedLedger));
        
        // Clear input
        setPaymentAmount('');
        
        console.log('✅ Payment recorded. New remaining balance:', updatedLedger.remaining_balance);
    };
    
    // HANDLER: Record Breach
    const handleRecordBreach = () => {
        if (!ledger) return;
        
        const updatedLedger = recordBreach(ledger, {
            date: new Date().toISOString().split('T')[0],
            missed_amount: 1000000, // Example
            reason: 'المدين لم يدفع القسط الشهري',
            coercive_action_triggered: true
        });
        
        setLedger(updatedLedger);
        localStorage.setItem('current_execution_ledger', JSON.stringify(updatedLedger));
        
        // Check if coercive measures needed
        const needsCoercion = shouldTriggerCoerciveMeasures(updatedLedger);
        
        if (needsCoercion) {
            alert('🚨 يجب تفعيل الإجراءات الجبرية (الحبس/الكفيل)!');
        }
    };
    
    // Get payment history
    const paymentSummary = ledger ? getPaymentHistorySummary(ledger) : null;
    
    if (!ledger) return <div>No active file</div>;
    
    return (
        <div style={{ padding: '20px' }}>
            <h3>💳 إدارة الدفعات</h3>
            
            {/* Payment Input */}
            <div>
                <input 
                    type="text"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="المبلغ المدفوع"
                    style={{ padding: '10px', marginRight: '10px' }}
                />
                <button onClick={handleRecordPayment} style={{ padding: '10px' }}>
                    ✅ تسجيل دفعة
                </button>
            </div>
            
            {/* Breach Button */}
            <button 
                onClick={handleRecordBreach}
                style={{ 
                    background: '#dc2626', 
                    color: 'white', 
                    padding: '10px', 
                    marginTop: '10px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                🚫 تسجيل خرق (عدم دفع)
            </button>
            
            {/* Payment History Summary */}
            {paymentSummary && (
                <div style={{ marginTop: '20px', background: '#f0f0f0', padding: '15px' }}>
                    <h4>📊 ملخص السجل المالي</h4>
                    <p>إجمالي الدفعات: {paymentSummary.total_payments}</p>
                    <p>الدفعات الموثقة: {paymentSummary.verified_payments}</p>
                    <p>المبلغ الموثق: {paymentSummary.total_verified_amount.toLocaleString()} دينار</p>
                    <p>إجمالي الخروقات: {paymentSummary.total_breaches}</p>
                    <p>نسبة الإنجاز: {paymentSummary.completion_percentage.toFixed(2)}%</p>
                </div>
            )}
            
            {/* Payment History List */}
            <div style={{ marginTop: '20px' }}>
                <h4>📜 سجل الدفعات</h4>
                {ledger.payments.map((payment, i) => (
                    <div 
                        key={payment.id} 
                        style={{ 
                            background: payment.verified ? '#d1fae5' : '#fee2e2', 
                            padding: '10px', 
                            marginBottom: '5px',
                            borderRadius: '5px'
                        }}
                    >
                        <strong>دفعة {i + 1}:</strong> {payment.amount.toLocaleString()} دينار
                        <span style={{ marginRight: '10px', fontSize: '12px', color: '#6b7280' }}>
                            {payment.date}
                        </span>
                        {payment.verified && <span style={{ color: '#10b981' }}> ✅</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 EXAMPLE 4: Testing Different Scenarios
// ═══════════════════════════════════════════════════════════════════════════════

export function ScenarioTester() {
    const [scenario, setScenario] = useState<string>('');
    const [result, setResult] = useState<any>(null);
    
    const runScenario = (scenarioName: string) => {
        setScenario(scenarioName);
        
        switch (scenarioName) {
            case 'employee_general_debt':
                // Government employee with general debt
                const ledger1 = createImmutableLedger(10000000, 'دين مالي', 'موظف');
                const actions1 = determineLegalActionsAvailability(ledger1);
                setResult({
                    description: 'موظف حكومي + دين مالي',
                    canImprison: actions1.canRequestImprisonment,
                    canGarnish: actions1.canGarnishSalary,
                    reasons: actions1.imprisonmentBlockingReasons
                });
                break;
                
            case 'employee_alimony_override':
                // Government employee + alimony + salary < alimony
                const ledger2 = createImmutableLedger(2000000, 'نفقة شرعية', 'موظف');
                const actions2 = determineLegalActionsAvailability(ledger2, 1000000, false);
                setResult({
                    description: 'موظف + نفقة + راتب < نفقة',
                    canImprison: actions2.canRequestImprisonment,
                    warnings: actions2.strategicWarnings
                });
                break;
                
            case 'self_employed_alimony_warning':
                // Self-employed + lump-sum alimony
                const warning = evaluateStrategicAlimonyWarning('نفقة شرعية', 'كاسب', true, false);
                setResult({
                    description: 'كاسب + نفقة مجمعة بدون تسوية',
                    showWarning: warning.shouldShowWarning,
                    warningLevel: warning.warningLevel,
                    message: warning.warningMessage
                });
                break;
                
            default:
                setResult(null);
        }
    };
    
    return (
        <div style={{ padding: '20px' }}>
            <h3>🧪 اختبار السيناريوهات</h3>
            
            <button onClick={() => runScenario('employee_general_debt')}>
                سيناريو 1: موظف + دين مالي
            </button>
            <button onClick={() => runScenario('employee_alimony_override')}>
                سيناريو 2: موظف + نفقة (تجاوز الحصانة)
            </button>
            <button onClick={() => runScenario('self_employed_alimony_warning')}>
                سيناريو 3: كاسب + تحذير نفقة مجمعة
            </button>
            
            {result && (
                <div style={{ marginTop: '20px', background: '#f0f0f0', padding: '15px' }}>
                    <h4>📋 النتيجة</h4>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 EXPORT ALL EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    ExecutionFileCreationExample,
    ExecutionFileDetailsExample,
    PaymentRecordingExample,
    ScenarioTester
};
