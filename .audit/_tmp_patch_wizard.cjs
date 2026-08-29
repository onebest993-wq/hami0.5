const fs = require('fs');
const p = String.raw`c:\Users\HEX STORE\Downloads\New folder\src\app\bootstrap\lawyerAuth\LawyerRegisterWizard.tsx`;
let text = fs.readFileSync(p, 'utf8');
const marker = 'data-testid="lawyer-register-identity-next"';
const i = text.indexOf(marker);
if (i < 0) throw new Error('marker not found');
const backBtn = text.indexOf("onClick={() => setStep('credentials')}", i);
if (backBtn < 0) throw new Error('back btn not found');
const btnStart = text.lastIndexOf('<button', backBtn);
if (btnStart < i) throw new Error('btn start weird');

const newTail = `                <button
                    type="button"
                    className={authGateGhostBtnClass}
                    onClick={() => setStep('profile')}
                >
                    رجوع
                </button>
            </form>
        );
    }

    if (step === 'profile') {
        return (
            <form
                onSubmit={goIdentity}
                className={authGateCardClass}
                data-testid="lawyer-register-profile"
            >
                <h1 className={authGateTitleClass}>{stepTitle}</h1>
                <p className="text-sm text-white/70 leading-relaxed">
                    أكمل بياناتك المهنية بعد إنشاء الحساب — هاتف، اسم، محافظة، وغرفة المحامين.
                </p>
                <label className={authGateLabelClass}>
                    <span className={authGateLabelTextClass}>رقم الهاتف</span>
                    <input
                        type="tel"
                        inputMode="numeric"
                        required
                        value={phone}
                        onChange={(e) => setPhone(normalizeIraqiPhoneInput(e.target.value).slice(0, 11))}
                        className={authGateInputClass}
                        placeholder="07xxxxxxxx"
                        maxLength={11}
                        data-testid="lawyer-register-phone"
                    />
                </label>
                <label className={authGateLabelClass}>
                    <span className={authGateLabelTextClass}>الاسم الثلاثي</span>
                    <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={authGateInputClass}
                        data-testid="lawyer-register-full-name"
                    />
                </label>
                <label className={authGateLabelClass}>
                    <span className={authGateLabelTextClass}>اللقب</span>
                    <input
                        type="text"
                        required
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        className={authGateInputClass}
                        data-testid="lawyer-register-family-name"
                    />
                </label>
                <label className={authGateLabelClass}>
                    <span className={authGateLabelTextClass}>المحافظة</span>
                    <select
                        required
                        value={governorate}
                        onChange={(e) => setGovernorate(e.target.value)}
                        className={authGateInputClass}
                        data-testid="lawyer-register-governorate"
                    >
                        <option value="">اختر المحافظة</option>
                        {IRAQ_REGISTRATION_GOVERNORATES.map((g) => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={authGateLabelClass}>
                    <span className={authGateLabelTextClass}>غرفة المحامين</span>
                    <input
                        type="text"
                        required
                        value={lawyerBarRoom}
                        onChange={(e) => setLawyerBarRoom(e.target.value)}
                        className={authGateInputClass}
                        placeholder="مثال: غرفة محاميي بغداد"
                        data-testid="lawyer-register-bar-room"
                        autoComplete="organization"
                    />
                </label>
                {error ? (
                    <p className={authGateErrorClass} role="alert" data-testid="lawyer-register-error">
                        {error}
                    </p>
                ) : null}
                <button
                    type="submit"
                    className={authGatePrimaryBtnClass}
                    data-testid="lawyer-register-profile-next"
                >
                    متابعة
                </button>
                <button
                    type="button"
                    className={authGateGhostBtnClass}
                    onClick={() => setStep('credentials')}
                >
                    رجوع
                </button>
            </form>
        );
    }

    return (
        <form onSubmit={goProfile} className={authGateCardClass} data-testid="lawyer-register-credentials">
            <h1 className={authGateTitleClass}>{stepTitle}</h1>
            <label className={authGateLabelClass}>
                <span className={authGateLabelTextClass}>البريد الإلكتروني</span>
                <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    dir="ltr"
                    lang="en"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value.replace(/\s/g, '').slice(0, 254))}
                    className={authGateInputClass}
                    style={{ textAlign: 'left' }}
                    maxLength={254}
                    data-testid="lawyer-register-email"
                />
            </label>
            <AuthPasswordField
                label="كلمة المرور"
                testId="lawyer-register-password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <AuthPasswordField
                label="تأكيد كلمة المرور"
                testId="lawyer-register-password-confirm"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error ? (
                <p className={authGateErrorClass} role="alert" data-testid="lawyer-register-error">
                    {error}
                </p>
            ) : null}
            <button
                type="submit"
                className={authGatePrimaryBtnClass}
                data-testid="lawyer-register-credentials-next"
            >
                متابعة
            </button>
            <button type="button" className={authGateGhostBtnClass} onClick={onBack}>
                رجوع
            </button>
        </form>
    );
}
`;

const nl = text.includes('\r\n') ? '\r\n' : '\n';
const patched = text.slice(0, btnStart) + newTail.replace(/\n/g, nl);
fs.writeFileSync(p, patched);
console.log('ok', text.length, '->', patched.length);
