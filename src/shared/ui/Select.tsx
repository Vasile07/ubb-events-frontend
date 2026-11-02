import { forwardRef, useId, type SelectHTMLAttributes } from "react";
const defaultChevron = "/ui-assets/chevron-default.svg";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { label, helperText, error, id, className = "", children, ...props },
    ref,
  ) {
    const generated = useId();
    const fieldId = id ?? generated;
    const helperId = `${fieldId}-helper`;
    const errorId = `${fieldId}-error`;
    const describedBy =
      [
        props["aria-describedby"],
        helperText ? helperId : undefined,
        error ? errorId : undefined,
      ]
        .filter(Boolean)
        .join(" ") || undefined;
    return (
      <label className={`ui-field ${className}`.trim()} htmlFor={fieldId}>
        {label && <span className="ui-field-label">{label}</span>}
        <span className="ui-select-wrap">
          <select
            ref={ref}
            id={fieldId}
            className={`ui-field-control${error ? " ui-field-error" : ""}`}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={describedBy}
            {...props}
          >
            {children}
          </select>
          <span className="ui-chevron" aria-hidden="true">
            <img src={defaultChevron} alt="" />
          </span>
        </span>
        {helperText && (
          <span id={helperId} className="ui-field-message">
            {helperText}
          </span>
        )}
        {error && (
          <span
            id={errorId}
            className="ui-field-message ui-field-message-error"
          >
            {error}
          </span>
        )}
      </label>
    );
  },
);
