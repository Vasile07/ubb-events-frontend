import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "Primary" | "Secondary" | "Ghost" | "Danger";
export type ButtonSize = "Md" | "Sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "Primary",
      size = "Md",
      loading = false,
      leadingIcon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`ui-button ui-button-${variant.toLowerCase()} ui-button-${size.toLowerCase()} ${className}`.trim()}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span className="ui-button-spinner" aria-hidden="true" />
        ) : (
          leadingIcon
        )}
        <span>{loading ? "Loading…" : children}</span>
      </button>
    );
  },
);
