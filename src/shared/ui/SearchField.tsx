import { forwardRef, type InputHTMLAttributes } from "react";
const searchIcon = "/ui-assets/search.svg";

export const SearchField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function SearchField({ className = "", type = "search", ...props }, ref) {
  return (
    <label className={`ui-search-field ${className}`.trim()}>
      <span className="ui-search-icon" aria-hidden="true">
        <img src={searchIcon} alt="" />
      </span>
      <input ref={ref} type={type} {...props} />
    </label>
  );
});
