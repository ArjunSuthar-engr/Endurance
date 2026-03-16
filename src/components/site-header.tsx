"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PlusBurstNav } from "@/components/plus-burst-nav";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [homeHeaderVisible, setHomeHeaderVisible] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!isHome) {
      return;
    }

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (currentY < 220) {
        setHomeHeaderVisible(false);
      } else if (delta < -8) {
        setHomeHeaderVisible(true);
      } else if (delta > 8) {
        setHomeHeaderVisible(false);
      }

      lastScrollY.current = currentY;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const isVisible = isHome ? homeHeaderVisible : true;

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <div className="px-4 pt-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1900px] items-center justify-between border border-black/10 bg-[rgba(255,250,243,0.86)] px-3 py-1.5 text-[var(--foreground)] shadow-[0_18px_42px_rgba(20,16,13,0.12)] backdrop-blur-md sm:px-4 sm:py-2">
          <Link href="/" aria-label="Endurance Home" className="inline-flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="Endurance logo"
              width={184}
              height={56}
              className="h-[clamp(1.55rem,3vw,2.9rem)] w-auto"
            />
            <span className="text-[clamp(1.15rem,2.3vw,2.1rem)] font-semibold leading-none tracking-tight">
              Endurance
            </span>
          </Link>

          <PlusBurstNav buttonClassName="h-[40px] w-[40px] sm:h-[46px] sm:w-[46px]" />
        </div>
      </div>
    </header>
  );
}
