import { forwardRef, type HTMLAttributes } from "react";

export type BadgeTone =
  "Neutral" | "Info" | "Success" | "Warning" | "Danger" | "Brand";
export type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = "Neutral", className = "", children, ...props },
  ref,
) {
  const dots = {
    Neutral: "/ui-assets/badge-neutral.svg",
    Info: "/ui-assets/badge-info.svg",
    Success: "/ui-assets/badge-success.svg",
    Warning: "/ui-assets/badge-warning.svg",
    Danger: "/ui-assets/badge-danger.svg",
    Brand: "/ui-assets/badge-brand.svg",
  };
  return (
    <span
      ref={ref}
      className={`ui-badge ui-badge-${tone.toLowerCase()} ${className}`.trim()}
      {...props}
    >
      <img
        className="ui-badge-dot"
        src={dots[tone]}
        alt=""
        aria-hidden="true"
      />
      {children}
    </span>
  );
});
