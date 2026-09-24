import {
  AnimatePresence,
  MotionConfig,
  motion,
  type HTMLMotionProps,
  type Variants,
} from 'framer-motion';
import { useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import './motion.css';
import {
  buttonMotion,
  fadeVariants,
  hoverLift,
  modalTransition,
  pageVariants,
  scaleInVariants,
  slideUpVariants,
  staggerContainerVariants,
} from '../lib/motion';

type RevealProps = HTMLMotionProps<'div'> & {
  children: ReactNode;
  variants?: Variants;
};

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function PageTransition({ children, variants = pageVariants, ...props }: RevealProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      exit={reducedMotion ? undefined : 'exit'}
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, variants = fadeVariants, ...props }: RevealProps) {
  return <PageTransition variants={variants} {...props}>{children}</PageTransition>;
}

export function SlideUp({ children, variants = slideUpVariants, ...props }: RevealProps) {
  return <PageTransition variants={variants} {...props}>{children}</PageTransition>;
}

export function ScaleIn({ children, variants = scaleInVariants, ...props }: RevealProps) {
  return <PageTransition variants={variants} {...props}>{children}</PageTransition>;
}

export function Stagger({ children, ...props }: RevealProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : 'hidden'}
      animate="visible"
      variants={staggerContainerVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCard({ children, ...props }: HTMLMotionProps<'div'> & { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : 'rest'}
      whileHover={reducedMotion ? undefined : 'hover'}
      variants={hoverLift}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedButton({ children, ...props }: HTMLMotionProps<'button'> & { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      whileHover={reducedMotion ? undefined : buttonMotion.whileHover}
      whileTap={reducedMotion ? undefined : buttonMotion.whileTap}
      {...props}
    >
      {children}
    </motion.button>
  );
}

type AnimatedModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
};

export function AnimatedModal({ open, onClose, children, labelledBy }: AnimatedModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="motion-modal-overlay"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeVariants}
          onClick={onClose}
        >
          <motion.div
            className="motion-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={scaleInVariants}
            transition={modalTransition}
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type AnimatedToastProps = {
  open: boolean;
  children: ReactNode;
};

export function AnimatedToast({ open, children }: AnimatedToastProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          className="motion-toast"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 18 }}
          transition={modalTransition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
