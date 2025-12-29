import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input"> & {
  variant?: "default" | "large" | "code"
}>(
  ({ className, type, variant = "default", ...props }, ref) => {
    const variants = {
      default: "h-10 text-sm",
      large: "h-14 text-lg px-5",
      code: "h-16 text-3xl font-display font-bold text-center tracking-[0.5em] uppercase",
    }

    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-lg border border-input bg-background px-4 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          variants[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
