/**
 * 🎬 Royal Animation System
 * نظام الرسوم المتحركة الفاخر - دون تغيير التصميم
 */

/**
 * 🌊 Fade Transitions - تلاشي سلس
 */
export const fadeTransitions = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

/**
 * 📱 Slide from Bottom - انزلاق من الأسفل (للـ Modals)
 */
export const slideFromBottom = {
  initial: { opacity: 0, y: 50 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    y: 50,
    transition: { duration: 0.2 }
  }
};

/**
 * ➡️ Slide from Right
 */
export const slideFromRight = {
  initial: { opacity: 0, x: 100 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    x: 100,
    transition: { duration: 0.2 }
  }
};

/**
 * ⬅️ Slide from Left
 */
export const slideFromLeft = {
  initial: { opacity: 0, x: -100 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    x: -100,
    transition: { duration: 0.2 }
  }
};

/**
 * 🔽 Slide from Top
 */
export const slideFromTop = {
  initial: { opacity: 0, y: -50 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    y: -50,
    transition: { duration: 0.2 }
  }
};

/**
 * 📋 List Stagger - تأثير متتالي للقوائم
 */
export const listStagger = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 20,
        stiffness: 300
      }
    }
  }
};

/**
 * 🎴 Card Hover - تأثير بطاقة عند التمرير
 */
export const cardHover = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      type: "spring" as const,
      damping: 15,
      stiffness: 300
    }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  }
};

/**
 * ✨ Glow Effect - تأثير توهج
 */
export const glowEffect = {
  initial: { 
    boxShadow: "0 0 0px rgba(218, 165, 32, 0)" 
  },
  animate: { 
    boxShadow: [
      "0 0 10px rgba(218, 165, 32, 0.3)",
      "0 0 20px rgba(218, 165, 32, 0.5)",
      "0 0 10px rgba(218, 165, 32, 0.3)"
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

/**
 * 🌟 Scale Bounce - تأثير قفز
 */
export const scaleBounce = {
  initial: { scale: 0 },
  animate: { 
    scale: 1,
    transition: {
      type: "spring" as const,
      damping: 12,
      stiffness: 200,
      mass: 0.8
    }
  }
};

/**
 * 💫 Rotate and Fade
 */
export const rotateAndFade = {
  initial: { opacity: 0, rotate: -10 },
  animate: { 
    opacity: 1, 
    rotate: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: { 
    opacity: 0, 
    rotate: 10,
    transition: { duration: 0.3 }
  }
};

/**
 * 🎯 Button Press - ضغط الزر
 */
export const buttonPress = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
  transition: { type: "spring" as const, stiffness: 400, damping: 17 }
};

/**
 * 📊 Progress Bar Animation
 */
export const progressBar = (progress: number) => ({
  initial: { width: "0%" },
  animate: { 
    width: `${progress}%`,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1]
    }
  }
});

/**
 * 🌈 Color Pulse - نبض الألوان
 */
export const colorPulse = {
  animate: {
    backgroundColor: [
      "rgba(218, 165, 32, 0.1)",
      "rgba(218, 165, 32, 0.2)",
      "rgba(218, 165, 32, 0.1)"
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

/**
 * 🎪 Modal Backdrop
 */
export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

/**
 * 🏃 Fast Transition - انتقال سريع
 */
export const fastTransition = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.15 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.1 }
  }
};

/**
 * 🎨 Page Container - للشاشات الكاملة
 */
export const pageContainer = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: { duration: 0.3 }
  }
};

/**
 * ⭐ Shimmer Loading Effect
 */
export const shimmerEffect = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

/**
 * 🎭 Notification Slide
 */
export const notificationSlide = {
  initial: { opacity: 0, x: 100, scale: 0.8 },
  animate: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    x: 100,
    scale: 0.8,
    transition: { duration: 0.2 }
  }
};
