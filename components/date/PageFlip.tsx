"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
type Props = {
  children: ReactNode;
  pageKey: number;
  onTurning?: (value: boolean) => void;
};
export default function PageFlip({ children, pageKey, onTurning }: Props) {
  const reduced = useReducedMotion();
  const currentPage = useRef<HTMLDivElement>(null);
  const [last, setLast] = useState({ key: pageKey, children });
  const [outgoing, setOutgoing] = useState<ReactNode>(null);
  const [seen, setSeen] = useState(pageKey);
  if (seen !== pageKey) {
    setSeen(pageKey);
    setOutgoing(last.children);
    setLast({ key: pageKey, children });
  }
  return (
    <div className="book-perspective">
      <div className="book-paper" aria-busy={outgoing !== null}>
        <div ref={currentPage} tabIndex={-1} className="page-current">
          {children}
        </div>
        {outgoing && (
          <motion.div
            key={pageKey}
            className="turning-page"
            aria-hidden="true"
            inert
            initial={{ rotateY: 0 }}
            animate={{ rotateY: -180 }}
            transition={{
              duration: reduced ? 0.12 : 0.8,
              ease: [0.65, 0, 0.35, 1],
            }}
            onAnimationStart={() => onTurning?.(true)}
            onAnimationComplete={() => {
              setOutgoing(null);
              onTurning?.(false);
              requestAnimationFrame(() =>
                currentPage.current?.focus({ preventScroll: true }),
              );
            }}
          >
            <div className="page-front">
              {outgoing}
              <motion.div
                className="page-shadow"
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <div className="page-back">
              <span>juste nous deux ♡</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
