"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className, width = 160, height = 40 }: LogoProps) {
  return (
    <span className={cn("block", className)} role="img" aria-label="NH Transportadora">
      NH Transportadora
    </span>
  );
}
