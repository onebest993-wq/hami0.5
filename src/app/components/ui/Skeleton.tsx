/**
 * Skeleton Loader Components
 * Ù…ÙƒÙˆÙ†Ø§Øª ØªØ­Ù…ÙŠÙ„ Ù‡ÙŠÙƒÙ„ÙŠØ© (Ø¨Ø¯ÙˆÙ† ØªØ£Ø«ÙŠØ± Ø¹Ù„Ù‰ Ø§Ù„ØªØµÙ…ÙŠÙ… Ø§Ù„Ø­Ø§Ù„ÙŠ)
 */

import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: boolean;
}

/**
 * Ù…ÙƒÙˆÙ† Skeleton Ø£Ø³Ø§Ø³ÙŠ
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = true,
  style: styleProp,
  ...rest
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  const animationClass = animation ? 'animate-pulse' : '';

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...styleProp,
  };

  return (
    <div
      className={`bg-gray-800/50 ${variantClasses[variant]} ${animationClass} ${className}`}
      style={style}
      {...rest}
    />
  );
};

/**
 * Skeleton Ù„Ù€ ExecutionDashboard
 */
export const ExecutionDashboardSkeleton: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#000000] z-50 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton width="250px" height="40px" />
        <Skeleton variant="circular" width="40px" height="40px" />
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Skeleton height="140px" className="rounded-xl" />
        <Skeleton height="140px" className="rounded-xl" />
        <Skeleton height="140px" className="rounded-xl" />
      </div>

      {/* Main Content Area */}
      <div className="bg-[#0B1120]/60 rounded-xl border border-gray-800/50 p-6 mb-6">
        <Skeleton width="180px" height="30px" className="mb-4" />
        <div className="space-y-3">
          <Skeleton height="20px" />
          <Skeleton height="20px" width="90%" />
          <Skeleton height="20px" width="80%" />
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="80px" className="rounded-xl" />
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ù„ÙØ§Øª
 */
export const FileListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#0B1120]/60 rounded-xl border border-gray-800/50 p-4 flex items-center gap-4"
        >
          <Skeleton variant="circular" width="48px" height="48px" />
          <div className="flex-1 space-y-2">
            <Skeleton height="20px" width="70%" />
            <Skeleton height="16px" width="50%" />
          </div>
          <Skeleton width="80px" height="32px" className="rounded-lg" />
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton Ù„Ø¨Ø·Ø§Ù‚Ø© ÙˆØ§Ø­Ø¯Ø©
 */
export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#0B1120]/60 rounded-xl border border-gray-800/50 p-6">
      <Skeleton width="150px" height="24px" className="mb-4" />
      <div className="space-y-3">
        <Skeleton height="16px" />
        <Skeleton height="16px" width="90%" />
        <Skeleton height="16px" width="80%" />
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton width="100px" height="36px" className="rounded-lg" />
        <Skeleton width="100px" height="36px" className="rounded-lg" />
      </div>
    </div>
  );
};

/**
 * Skeleton Ù„Ø¬Ø¯ÙˆÙ„ Ø¨ÙŠØ§Ù†Ø§Øª
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="40px" className="rounded-lg" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} height="50px" className="rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton Ù„Ù„Ù†Ù…ÙˆØ°Ø¬
 */
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="120px" height="20px" />
          <Skeleton height="44px" className="rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton width="120px" height="44px" className="rounded-lg" />
        <Skeleton width="120px" height="44px" className="rounded-lg" />
      </div>
    </div>
  );
};

/**
 * Skeleton Ù„Ù€ Timeline
 */
export const TimelineSkeleton: React.FC<{ items?: number }> = ({ items = 4 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton variant="circular" width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <Skeleton height="20px" width="60%" />
            <Skeleton height="16px" width="80%" />
            <Skeleton height="14px" width="40%" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Loading Spinner Ø¨Ø³ÙŠØ· (Ø¨Ø¯ÙŠÙ„ Ù„Ù„Ù€ Skeleton)
 */
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}> = ({ size = 'md', color = 'border-amber-500' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-16 h-16 border-4'
  };

  return (
    <div className={`${sizeClasses[size]} ${color} border-t-transparent rounded-full animate-spin`} />
  );
};

/**
 * Full Page Loading (Ù…Ø¹ Ø´Ø¹Ø§Ø±)
 */
export const FullPageLoading: React.FC<{ message?: string }> = ({
  message = 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...'
}) => {
  return (
    <div className="fixed inset-0 bg-[#000000] z-50 flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
      <p className="text-amber-500 font-semibold mt-6 text-lg">{message}</p>
    </div>
  );
};
