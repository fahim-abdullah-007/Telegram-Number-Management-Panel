import type { Variants } from 'framer-motion';

export const motionTimings = {
  fast: 0.14,
  standard: 0.22,
  slow: 0.36,
};

export const motionEasings = {
  standard: [0.2, 0.8, 0.2, 1] as const,
  emphasized: [0.16, 1, 0.3, 1] as const,
};

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionTimings.slow, ease: motionEasings.standard },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: motionTimings.standard, ease: motionEasings.standard },
  },
};

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: motionTimings.standard, ease: motionEasings.standard } },
  exit: { opacity: 0, transition: { duration: motionTimings.fast, ease: motionEasings.standard } },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionTimings.slow, ease: motionEasings.emphasized },
  },
  exit: { opacity: 0, y: 8, transition: { duration: motionTimings.standard } },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: motionTimings.standard, ease: motionEasings.emphasized },
  },
  exit: { opacity: 0, scale: 0.98, transition: { duration: motionTimings.fast } },
};

export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.04,
      staggerChildren: 0.06,
    },
  },
};

export const hoverLift = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -3,
    scale: 1.005,
    transition: { duration: motionTimings.standard, ease: motionEasings.standard },
  },
};

export const buttonMotion = {
  whileHover: { y: -1, transition: { duration: motionTimings.fast } },
  whileTap: { scale: 0.98, transition: { duration: motionTimings.fast } },
};

export const modalTransition = {
  duration: motionTimings.standard,
  ease: motionEasings.emphasized,
};
