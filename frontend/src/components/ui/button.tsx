import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "danger"
  size?: "sm" | "default" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-xl cursor-pointer select-none"

    const variants: Record<string, string> = {
      default:   "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
      outline:   "border border-gray-200 text-gray-700 bg-white hover:bg-gray-50",
      ghost:     "text-gray-600 hover:bg-gray-100",
      secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
      danger:    "bg-red-500 text-white hover:bg-red-600",
    }

    const sizes: Record<string, string> = {
      sm:      "h-8 px-3 text-sm",
      default: "h-10 px-5 text-sm",
      lg:      "h-12 px-7 text-base",
    }

    return (
      <button
        className={cn(base, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
