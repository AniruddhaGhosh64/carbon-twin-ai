"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  min: number;
  max: number;
  value: number;
  onValueChange: (value: number) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min, max, value, onValueChange, ...props }, ref) => {
    return (
      <div className={cn("relative w-full flex items-center", className)}>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          ref={ref}
          onChange={(e) => onValueChange(Number(e.target.value))}
          className="h-1.5 w-full appearance-none rounded-lg bg-surface-container-highest focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus:outline-none accent-primary cursor-pointer transition-all"
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = "Slider";

export { Slider };
