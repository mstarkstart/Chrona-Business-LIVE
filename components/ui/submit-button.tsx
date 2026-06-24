"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SubmitButtonProps extends ButtonProps {
  pendingText?: string;
  loadingIcon?: React.ReactNode;
}

export const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ children, pendingText, loadingIcon, className, disabled, ...props }, ref) => {
    const { pending } = useFormStatus();

    return (
      <Button
        ref={ref}
        disabled={pending || disabled}
        className={cn("relative transition-all", className)}
        {...props}
        type="submit"
      >
        {pending && (
          <span className="mr-2 animate-spin">
            {loadingIcon ?? <Loader2 className="h-4 w-4" />}
          </span>
        )}
        {pending && pendingText ? pendingText : children}
      </Button>
    );
  }
);
SubmitButton.displayName = "SubmitButton";
