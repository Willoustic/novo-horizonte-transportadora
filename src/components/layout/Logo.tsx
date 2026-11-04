import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className, width = 160, height = 40 }: LogoProps) {
  return (
    <Image
      src="/images/logo.jpg"
      alt="NH Transportadora"
      width={width}
      height={height}
      className={cn("block object-contain", className)}
      role="img"
      aria-label="NH Transportadora"
      priority
    />
  );
}
