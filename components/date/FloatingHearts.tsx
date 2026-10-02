"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
type Heart = { id: number; x: number; y: number; drift: number };
export default function FloatingHearts({ celebrate }: { celebrate: boolean }) {
  const [hearts, setHearts] = useState<Heart[]>([]);
  const counter = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const click = (e: PointerEvent) => {
      const id = counter.current++;
      setHearts((h) => [
        ...h.slice(-18),
        { id, x: e.clientX, y: e.clientY, drift: Math.random() * 50 - 25 },
      ]);
      const timer = setTimeout(() => {
        setHearts((h) => h.filter((v) => v.id !== id));
        timers.delete(timer);
      }, 1100);
      timers.add(timer);
    };
    window.addEventListener("pointerdown", click);
    return () => {
      window.removeEventListener("pointerdown", click);
      timers.forEach(clearTimeout);
    };
  }, [reduced]);
  return (
    <div className="effects" aria-hidden="true">
      <div className="ambient-heart h1">♡</div>
      <div className="ambient-heart h2">♡</div>
      <div className="ambient-heart h3">♥</div>
      <div className="ambient-heart h4">✧</div>
      <div className="ambient-heart h5">✦</div>
      <AnimatePresence>
        {hearts.map((h) => (
          <motion.span
            className="click-heart"
            key={h.id}
            style={{ left: h.x, top: h.y }}
            initial={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1.3, 0.9],
              x: h.drift,
              y: -100,
            }}
            transition={{ duration: 1 }}
          >
            ♥
          </motion.span>
        ))}
      </AnimatePresence>
      {celebrate &&
        !reduced &&
        Array.from({ length: 32 }, (_, i) => (
          <motion.span
            className="confetti"
            key={i}
            style={{ left: `${(i * 37) % 100}%` }}
            initial={{ y: -30, opacity: 0, rotate: 0 }}
            animate={{
              y: "100vh",
              opacity: [0, 0.8, 0.8, 0],
              rotate: i % 2 ? 160 : -160,
            }}
            transition={{ duration: 2.2, delay: (i % 7) * 0.12 }}
          >
            {i % 3 ? "♥" : "✦"}
          </motion.span>
        ))}
    </div>
  );
}
