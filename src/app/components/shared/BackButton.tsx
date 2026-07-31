/**
 * 🔙 Back Button Component
 * ========================
 * 
 * مكون زر الرجوع المتكامل مع نظام الإيماءات
 * 
 * المميزات:
 * ✅ تصميم Royal UI (ذهبي/كحلي)
 * ✅ Animation وتأثيرات بصرية
 * ✅ دعم RTL للعربية
 * ✅ Accessibility (A11y)
 * ✅ تكامل مع NavigationGestureHandler
 */

import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';

interface BackButtonProps {
  /** دالة تنفذ عند الضغط على الزر */
  onClick?: () => void;
  
  /** نص الزر (اختياري) */
  label?: string;
  
  /** حجم الزر */
  size?: 'sm' | 'md' | 'lg';
  
  /** نوع التصميم */
  variant?: 'default' | 'minimal' | 'royal';
  
  /** موضع الزر */
  position?: 'static' | 'absolute' | 'fixed';
  
  /** إخفاء الأيقونة */
  hideIcon?: boolean;
  
  /** فئات CSS إضافية */
  className?: string;
  
  /** تعطيل الزر */
  disabled?: boolean;
}

/**
 * زر الرجوع القياسي
 */
export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label,
  size = 'md',
  variant = 'default',
  position = 'static',
  hideIcon = false,
  className = '',
  disabled = false
}) => {
  // الأحجام
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  // التصاميم المختلفة
  const variantClasses = {
    default: 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20',
    minimal: 'bg-transparent text-[#D4AF37] hover:bg-[#D4AF37]/10',
    royal: 'bg-gradient-to-br from-[#D4AF37] to-[#FFD700] text-[#001830] hover:shadow-lg hover:shadow-[#D4AF37]/30'
  };

  // المواضع
  const positionClasses = {
    static: '',
    absolute: 'absolute top-6 left-6',
    fixed: 'fixed top-6 left-6 z-50'
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${positionClasses[position]}
        ${className}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        rounded-full flex items-center justify-center gap-2
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50
        ${label ? 'px-4 w-auto' : ''}
      `}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      aria-label={label || 'رجوع'}
      role="button"
    >
      {!hideIcon && (
        <ChevronRight className={`${label ? 'w-4 h-4' : 'w-5 h-5'}`} />
      )}
      {label && (
        <span className="font-medium">{label}</span>
      )}
    </motion.button>
  );
};

/**
 * زر رجوع بنمط Royal UI الفاخر
 */
export const RoyalBackButton: React.FC<Omit<BackButtonProps, 'variant'>> = (props) => {
  return <BackButton {...props} variant="royal" />;
};

/**
 * زر رجوع بسيط (Minimal)
 */
export const MinimalBackButton: React.FC<Omit<BackButtonProps, 'variant'>> = (props) => {
  return <BackButton {...props} variant="minimal" />;
};

/**
 * Header مع زر رجوع مدمج
 */
interface BackHeaderProps {
  /** عنوان الصفحة */
  title: string;
  
  /** دالة الرجوع */
  onBack: () => void;
  
  /** محتوى إضافي على اليمين */
  rightContent?: React.ReactNode;
  
  /** نمط الخلفية */
  background?: 'transparent' | 'blur' | 'solid';
  
  /** ثابت في الأعلى */
  sticky?: boolean;
}

export const BackHeader: React.FC<BackHeaderProps> = ({
  title,
  onBack,
  rightContent,
  background = 'blur',
  sticky = true
}) => {
  const backgroundClasses = {
    transparent: 'bg-transparent',
    blur: 'bg-[#001830]/95 backdrop-blur-xl border-b border-[#D4AF37]/20',
    solid: 'bg-[#001830] border-b border-[#D4AF37]/30'
  };

  return (
    <div 
      className={`
        ${backgroundClasses[background]}
        ${sticky ? 'sticky top-0 z-50' : ''}
        px-5 py-4 flex items-center justify-between
      `}
    >
      {/* زر الرجوع + العنوان */}
      <div className="flex items-center gap-3 flex-1">
        <BackButton 
          onClick={onBack}
          variant="minimal"
          size="md"
        />
        
        <h1 className="text-xl font-bold text-white truncate">
          {title}
        </h1>
      </div>

      {/* محتوى إضافي */}
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  );
};

/**
 * Card مع زر رجوع في الزاوية
 */
interface BackCardProps {
  /** محتوى الكارد */
  children: React.ReactNode;
  
  /** دالة الرجوع */
  onBack?: () => void;
  
  /** إخفاء زر الرجوع */
  hideBackButton?: boolean;
  
  /** فئات CSS إضافية */
  className?: string;
}

export const BackCard: React.FC<BackCardProps> = ({
  children,
  onBack,
  hideBackButton = false,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {!hideBackButton && onBack && (
        <BackButton
          onClick={onBack}
          position="absolute"
          variant="default"
          size="md"
        />
      )}
      
      {children}
    </div>
  );
};

/**
 * Navigation Bar مع زر رجوع وإجراءات
 */
interface BackNavBarProps {
  /** دالة الرجوع */
  onBack: () => void;
  
  /** عنوان الصفحة */
  title?: string;
  
  /** أيقونات/أزرار إضافية */
  actions?: React.ReactNode;
  
  /** إظهار Progress Bar */
  progress?: number; // 0-100
}

export const BackNavBar: React.FC<BackNavBarProps> = ({
  onBack,
  title,
  actions,
  progress
}) => {
  return (
    <div className="bg-[#0B1021] border-b border-white/10">
      {/* Nav Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Right Side: Back + Title */}
        <div className="flex items-center gap-3 flex-1">
          <BackButton
            onClick={onBack}
            variant="minimal"
            size="md"
          />
          
          {title && (
            <h2 className="text-lg font-semibold text-white truncate">
              {title}
            </h2>
          )}
        </div>

        {/* Left Side: Actions */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="h-1 bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Floating Back Button (زر رجوع عائم)
 */
interface FloatingBackButtonProps {
  /** دالة الرجوع */
  onBack: () => void;
  
  /** موضع الزر */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  
  /** إخفاء عند التمرير للأسفل */
  hideOnScroll?: boolean;
}

export const FloatingBackButton: React.FC<FloatingBackButtonProps> = ({
  onBack,
  position = 'top-left',
  hideOnScroll = false
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  // مراقبة التمرير
  React.useEffect(() => {
    if (!hideOnScroll) return;

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // إخفاء عند التمرير للأسفل
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScroll]);

  // المواضع
  const positionClasses = {
    'top-left': 'top-6 left-6',
    'top-right': 'top-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-right': 'bottom-6 right-6'
  };

  return (
    <motion.div
      className={`fixed ${positionClasses[position]} z-50`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.8
      }}
      transition={{ duration: 0.2 }}
    >
      <BackButton
        onClick={onBack}
        variant="royal"
        size="lg"
      />
    </motion.div>
  );
};

/**
 * Hook للتكامل السهل مع NavigationGestureHandler
 */
export function useBackButton(onBack?: () => void) {
  const handleBack = React.useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      // Fallback: استخدام window.history
      window.history.back();
    }
  }, [onBack]);

  return {
    BackButton: (props: Partial<BackButtonProps>) => (
      <BackButton onClick={handleBack} {...props} />
    ),
    handleBack
  };
}

/**
 * Examples:
 * 
 * 1. زر رجوع بسيط:
 *    <BackButton onClick={() => setScreen('home')} />
 * 
 * 2. Header مع عنوان:
 *    <BackHeader title="الإعدادات" onBack={() => setScreen('home')} />
 * 
 * 3. زر عائم:
 *    <FloatingBackButton onBack={() => setScreen('home')} position="top-right" />
 * 
 * 4. استخدام Hook:
 *    const { BackButton, handleBack } = useBackButton(() => setScreen('home'));
 *    <BackButton />
 */
