import { forwardRef, type ButtonHTMLAttributes } from "react";
const defaultChevron = "/ui-assets/chevron-default.svg";
const activeChevron = "/ui-assets/chevron-active.svg";

export const FilterChip = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(function FilterChip(
  { active = false, className = "", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`ui-filter-chip${active ? " is-active" : ""} ${className}`.trim()}
      aria-pressed={active}
      {...props}
    >
      <span>{children}</span>
      <span className="ui-chevron" aria-hidden="true">
        <img src={active ? activeChevron : defaultChevron} alt="" />
      </span>
    </button>
  );
});
