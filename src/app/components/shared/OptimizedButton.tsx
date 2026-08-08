/**
 * 🔘 Optimized Button Component
 * أزرار محسّنة مع تأثيرات متحركة
 */

import React, { memo, useCallback } from 'react';
import { motion } from 'motion/react';
import { buttonPress } from '@/app/animations/transitions';

interface OptimizedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  animated?: boolean;
}

const OptimizedButtonComponent: React.FC<OptimizedButtonProps> = ({
  children,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  animated = true
}) => {
  
  const handleClick = useCallback(() => {
    if (!disabled && onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  if (!animated) {
    return (
      <button
        type={type}
        className={className}
        onClick={handleClick}
        disabled={disabled}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      type={type}
      className={className}
      onClick={handleClick}
      disabled={disabled}
      whileHover={!disabled ? buttonPress.whileHover : undefined}
      whileTap={!disabled ? buttonPress.whileTap : undefined}
      transition={buttonPress.transition}
    >
      {children}
    </motion.button>
  );
};

export const OptimizedButton = memo(OptimizedButtonComponent);
