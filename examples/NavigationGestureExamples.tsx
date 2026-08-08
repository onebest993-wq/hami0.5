/**
 * 📚 Navigation Gesture Examples
 * ===============================
 * 
 * أمثلة عملية لاستخدام نظام إيماءات التنقل والرجوع
 * 
 * الأمثلة المتضمنة:
 * 1. Basic Navigation (تنقل أساسي)
 * 2. Back Button Components (أزرار الرجوع)
 * 3. Navigation with Data (تنقل مع بيانات)
 * 4. Custom Navigation Flow (تدفق تنقل مخصص)
 * 5. Advanced Patterns (أنماط متقدمة)
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BackButton, 
  BackHeader, 
  BackNavBar, 
  FloatingBackButton,
  useBackButton 
} from '@/app/components/shared/BackButton';
import { navigationGesture } from '@/app/utils/navigationGestureHandler';

// ============================================================================
// Example 1: Basic Navigation (تنقل أساسي)
// ============================================================================

export function BasicNavigationExample() {
  const [screen, setScreen] = useState<'home' | 'settings' | 'profile'>('home');

  // استخدام navigationGesture للتتبع
  useEffect(() => {
    const unsubscribe = navigationGesture.subscribe((newScreen) => {
      console.log('Navigation changed to:', newScreen);
    });

    return unsubscribe;
  }, []);

  const handleNavigate = (newScreen: typeof screen) => {
    navigationGesture.push(newScreen);
    setScreen(newScreen);
  };

  return (
    <div className="min-h-screen bg-[#0B1021] text-white">
      {screen === 'home' && (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">الصفحة الرئيسية</h1>
          
          <div className="space-y-3">
            <button 
              onClick={() => handleNavigate('settings')}
              className="w-full p-4 bg-[#D4AF37] text-[#001830] rounded-lg"
            >
              الإعدادات
            </button>
            
            <button 
              onClick={() => handleNavigate('profile')}
              className="w-full p-4 bg-[#D4AF37] text-[#001830] rounded-lg"
            >
              الملف الشخصي
            </button>
          </div>
        </div>
      )}

      {screen === 'settings' && (
        <div className="min-h-screen bg-[#0B1021]">
          <BackHeader 
            title="الإعدادات"
            onBack={() => {
              navigationGesture.goBack();
              setScreen('home');
            }}
          />
          
          <div className="p-6">
            <p>محتوى صفحة الإعدادات...</p>
          </div>
        </div>
      )}

      {screen === 'profile' && (
        <div className="min-h-screen bg-[#0B1021]">
          <BackHeader 
            title="الملف الشخصي"
            onBack={() => {
              navigationGesture.goBack();
              setScreen('home');
            }}
          />
          
          <div className="p-6">
            <p>محتوى الملف الشخصي...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 2: Different Back Button Styles (أنماط أزرار الرجوع)
// ============================================================================

export function BackButtonStylesExample() {
  return (
    <div className="min-h-screen bg-[#0B1021] p-6 space-y-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        أنماط أزرار الرجوع
      </h1>

      {/* Default Style */}
      <div>
        <p className="text-white/60 mb-2 text-sm">Default Style</p>
        <BackButton 
          onClick={() => console.log('Back clicked')}
          variant="default"
        />
      </div>

      {/* Minimal Style */}
      <div>
        <p className="text-white/60 mb-2 text-sm">Minimal Style</p>
        <BackButton 
          onClick={() => console.log('Back clicked')}
          variant="minimal"
        />
      </div>

      {/* Royal Style */}
      <div>
        <p className="text-white/60 mb-2 text-sm">Royal Style</p>
        <BackButton 
          onClick={() => console.log('Back clicked')}
          variant="royal"
        />
      </div>

      {/* With Label */}
      <div>
        <p className="text-white/60 mb-2 text-sm">With Label</p>
        <BackButton 
          onClick={() => console.log('Back clicked')}
          label="رجوع"
          variant="royal"
        />
      </div>

      {/* Different Sizes */}
      <div>
        <p className="text-white/60 mb-2 text-sm">Sizes</p>
        <div className="flex items-center gap-4">
          <BackButton 
            onClick={() => console.log('Small')}
            size="sm"
            variant="royal"
          />
          <BackButton 
            onClick={() => console.log('Medium')}
            size="md"
            variant="royal"
          />
          <BackButton 
            onClick={() => console.log('Large')}
            size="lg"
            variant="royal"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 3: Navigation with Data (تنقل مع بيانات)
// ============================================================================

interface CaseData {
  id: string;
  title: string;
  type: string;
  status: string;
}

export function NavigationWithDataExample() {
  const [screen, setScreen] = useState<'list' | 'detail'>('list');
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);

  const cases: CaseData[] = [
    { id: '1', title: 'دعوى مدنية #123', type: 'مدني', status: 'نشط' },
    { id: '2', title: 'دعوى تجارية #456', type: 'تجاري', status: 'معلق' },
    { id: '3', title: 'دعوى عمالية #789', type: 'عمالي', status: 'نشط' }
  ];

  const handleViewCase = (caseData: CaseData) => {
    // حفظ البيانات مع التنقل
    navigationGesture.push('caseDetail', { caseData });
    setSelectedCase(caseData);
    setScreen('detail');
  };

  const handleBack = () => {
    navigationGesture.goBack();
    setSelectedCase(null);
    setScreen('list');
  };

  return (
    <div className="min-h-screen bg-[#0B1021]">
      {screen === 'list' && (
        <div>
          <div className="p-6 border-b border-white/10">
            <h1 className="text-2xl font-bold text-white">
              قائمة الدعاوى
            </h1>
          </div>

          <div className="p-4 space-y-3">
            {cases.map(caseItem => (
              <button
                key={caseItem.id}
                onClick={() => handleViewCase(caseItem)}
                className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-right transition-colors"
              >
                <h3 className="text-white font-medium">{caseItem.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="text-[#D4AF37]">{caseItem.type}</span>
                  <span className="text-white/60">{caseItem.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === 'detail' && selectedCase && (
        <div>
          <BackHeader 
            title={selectedCase.title}
            onBack={handleBack}
          />

          <div className="p-6 space-y-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white/60 text-sm mb-1">نوع الدعوى</p>
              <p className="text-white font-medium">{selectedCase.type}</p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white/60 text-sm mb-1">الحالة</p>
              <p className="text-white font-medium">{selectedCase.status}</p>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-white/60 text-sm mb-1">رقم القضية</p>
              <p className="text-white font-medium">{selectedCase.id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Example 4: Multi-Level Navigation (تنقل متعدد المستويات)
// ============================================================================

type MultiScreen = 'home' | 'settings' | 'privacy' | 'security' | 'notifications';

export function MultiLevelNavigationExample() {
  const [screen, setScreen] = useState<MultiScreen>('home');

  const navigate = (newScreen: MultiScreen) => {
    navigationGesture.push(newScreen);
    setScreen(newScreen);
  };

  const goBack = () => {
    const previousScreen = navigationGesture.getPreviousScreen();
    if (previousScreen) {
      navigationGesture.goBack();
      setScreen(previousScreen as MultiScreen);
    }
  };

  // العنوان بناءً على الشاشة
  const getTitle = () => {
    const titles: Record<MultiScreen, string> = {
      home: 'الرئيسية',
      settings: 'الإعدادات',
      privacy: 'الخصوصية',
      security: 'الأمان',
      notifications: 'الإشعارات'
    };
    return titles[screen];
  };

  return (
    <div className="min-h-screen bg-[#0B1021]">
      {/* Navigation Bar with Progress */}
      <BackNavBar
        onBack={goBack}
        title={getTitle()}
        progress={(navigationGesture.getHistory().length - 1) * 25}
      />

      <div className="p-6">
        {screen === 'home' && (
          <div className="space-y-3">
            <button 
              onClick={() => navigate('settings')}
              className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-right transition-colors"
            >
              <span className="text-white">الإعدادات ←</span>
            </button>
          </div>
        )}

        {screen === 'settings' && (
          <div className="space-y-3">
            <button 
              onClick={() => navigate('privacy')}
              className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-right transition-colors"
            >
              <span className="text-white">الخصوصية ←</span>
            </button>
            
            <button 
              onClick={() => navigate('security')}
              className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-right transition-colors"
            >
              <span className="text-white">الأمان ←</span>
            </button>
            
            <button 
              onClick={() => navigate('notifications')}
              className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg text-right transition-colors"
            >
              <span className="text-white">الإشعارات ←</span>
            </button>
          </div>
        )}

        {(screen === 'privacy' || screen === 'security' || screen === 'notifications') && (
          <div className="p-6 bg-white/5 rounded-lg">
            <p className="text-white">
              محتوى صفحة {getTitle()}
            </p>
          </div>
        )}
      </div>

      {/* سجل التنقل (للتطوير) */}
      <div className="fixed bottom-4 left-4 right-4 p-3 bg-black/80 backdrop-blur-md rounded-lg text-xs text-white/60">
        <p className="mb-2 font-medium">Navigation History:</p>
        <p className="font-mono">
          {navigationGesture.getHistory().map(h => h.screen).join(' → ')}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: Floating Back Button (زر رجوع عائم)
// ============================================================================

export function FloatingBackButtonExample() {
  const [position, setPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-left');
  const [hideOnScroll, setHideOnScroll] = useState(false);

  return (
    <div className="min-h-[200vh] bg-[#0B1021] p-6">
      <div className="mb-8 space-y-4">
        <h1 className="text-2xl font-bold text-white">
          Floating Back Button
        </h1>

        <div className="p-4 bg-white/5 rounded-lg space-y-3">
          <div>
            <label className="text-white/60 text-sm mb-2 block">
              الموضع:
            </label>
            <select 
              value={position}
              onChange={(e) => setPosition(e.target.value as any)}
              className="w-full p-2 bg-white/10 text-white rounded"
            >
              <option value="top-left">أعلى اليمين</option>
              <option value="top-right">أعلى اليسار</option>
              <option value="bottom-left">أسفل اليمين</option>
              <option value="bottom-right">أسفل اليسار</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={hideOnScroll}
              onChange={(e) => setHideOnScroll(e.target.checked)}
              className="w-4 h-4"
            />
            <label className="text-white text-sm">
              إخفاء عند التمرير للأسفل
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4 text-white/60">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="p-4 bg-white/5 rounded-lg">
            <p>محتوى تجريبي - السطر {i + 1}</p>
            <p className="text-sm text-white/40 mt-2">
              مرر للأسفل لرؤية تأثير الإخفاء
            </p>
          </div>
        ))}
      </div>

      <FloatingBackButton
        onBack={() => console.log('Back clicked')}
        position={position}
        hideOnScroll={hideOnScroll}
      />
    </div>
  );
}

// ============================================================================
// Example 6: Custom Hook Usage (استخدام Hook مخصص)
// ============================================================================

export function CustomHookExample() {
  const [screen, setScreen] = useState<'home' | 'about'>('home');

  // استخدام useBackButton hook
  const { BackButton: CustomBackButton, handleBack } = useBackButton(() => {
    console.log('Custom back handler');
    setScreen('home');
  });

  return (
    <div className="min-h-screen bg-[#0B1021] p-6">
      {screen === 'home' && (
        <div>
          <h1 className="text-2xl font-bold text-white mb-4">
            الرئيسية
          </h1>
          
          <button 
            onClick={() => setScreen('about')}
            className="p-4 bg-[#D4AF37] text-[#001830] rounded-lg"
          >
            عن التطبيق
          </button>
        </div>
      )}

      {screen === 'about' && (
        <div>
          <div className="mb-6">
            <CustomBackButton variant="royal" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            عن التطبيق
          </h1>
          
          <p className="text-white/60">
            محتوى صفحة "عن التطبيق"
          </p>

          <button 
            onClick={handleBack}
            className="mt-6 px-6 py-3 bg-white/10 text-white rounded-lg"
          >
            رجوع باستخدام handleBack
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Export All Examples
// ============================================================================

export const NavigationGestureExamples = {
  BasicNavigation: BasicNavigationExample,
  BackButtonStyles: BackButtonStylesExample,
  NavigationWithData: NavigationWithDataExample,
  MultiLevel: MultiLevelNavigationExample,
  FloatingBackButton: FloatingBackButtonExample,
  CustomHook: CustomHookExample
};

/**
 * كيفية الاستخدام:
 * 
 * import { NavigationGestureExamples } from './examples/NavigationGestureExamples';
 * 
 * // في Component الخاص بك:
 * <NavigationGestureExamples.BasicNavigation />
 * <NavigationGestureExamples.BackButtonStyles />
 * <NavigationGestureExamples.NavigationWithData />
 * // ... إلخ
 */
