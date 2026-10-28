"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export function Logo({
  className,
  width = 120,
  height = 40,
}: LogoProps) {
  return (
    <Image
      src="/logo.jfif"
      alt="Novo Horizonte"
      width={width}
      height={height}
      className={cn("block", className)}
      priority
    />
  )
}
