"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const items = [
  { href: "/", label: "Home", index: "01" },
  { href: "/portal", label: "Portal", index: "02" },
  { href: "/contact", label: "Contact", index: "03" },
];

type PlusBurstNavProps = {
  buttonClassName?: string;
};

export function PlusBurstNav({ buttonClassName = "" }: PlusBurstNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "inline-flex items-center justify-center text-inherit transition-opacity hover:opacity-80",
          buttonClassName,
        ].join(" ")}
      >
        <motion.span
          animate={{ rotate: open ? 90 : 0, scale: open ? 1.04 : 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="inline-flex text-[clamp(1.2rem,1.7vw,1.4rem)] font-semibold leading-none"
        >
          +
        </motion.span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, x: 18, scale: 0.96, filter: "blur(5px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 10, scale: 0.98, filter: "blur(3px)" }}
            transition={{ type: "spring", stiffness: 290, damping: 26, mass: 0.9 }}
            className="absolute right-[calc(100%+0.7rem)] top-1/2 -translate-y-1/2 origin-right"
          >
            <ul className="flex h-[40px] items-stretch border border-black/10 bg-[rgba(255,250,243,0.96)] px-2 py-1 text-[var(--foreground)] shadow-[0_16px_32px_rgba(20,16,13,0.16)] sm:h-[46px]">
              {items.map((item, index) => {
                const isActive = pathname === item.href;
                const delay = (items.length - 1 - index) * 0.06;

                return (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, x: 22, y: 1 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: 14, y: -1 }}
                    transition={{
                      delay,
                      type: "spring",
                      stiffness: 300,
                      damping: 24,
                      mass: 0.8,
                    }}
                    className="flex"
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={[
                        "inline-flex items-center gap-2 px-3 text-[11px] font-semibold tracking-[0.01em] text-[var(--foreground)] transition sm:px-4 sm:text-[13px]",
                        isActive
                          ? "bg-[rgba(232,109,31,0.14)] ring-1 ring-[rgba(232,109,31,0.35)]"
                          : "hover:bg-[rgba(20,16,13,0.05)]",
                      ].join(" ")}
                    >
                      <span className="font-mono text-[10px] tracking-[0.18em] text-[var(--muted)]">
                        {item.index}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
