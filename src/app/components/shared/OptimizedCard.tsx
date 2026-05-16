/**
 * 🎴 Optimized Card Component
 * بطاقات محسّنة مع رسوم متحركة
 */

import React, { memo } from 'react';
import { motion } from 'motion/react';
import { cardHover } from '@/app/animations/transitions';

interface OptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  animated?: boolean;
  hover?: boolean;
}

const OptimizedCardComponent: React.FC<OptimizedCardProps> = ({
  children,
  className = '',
  onClick,
  animated = true,
  hover = true
}) => {
  if (!animated) {
    return (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      onClick={onClick}
      initial="rest"
      whileHover={hover ? "hover" : undefined}
      whileTap={onClick ? "tap" : undefined}
      variants={cardHover}
      layout
    >
      {children}
    </motion.div>
  );
};

export const OptimizedCard = memo(OptimizedCardComponent);
