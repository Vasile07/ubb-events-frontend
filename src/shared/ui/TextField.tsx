import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type FieldMessageProps = {
  label?: string;
  helperText?: string;
  error?: string;
  id?: string;
};
function ids(id: string | undefined, generated: string) {
  const fieldId = id ?? generated;
  return {
    fieldId,
    helperId: `${fieldId}-helper`,
    errorId: `${fieldId}-error`,
  };
}

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> &
  FieldMessageProps;
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { label, helperText, error, id, className = "", ...props },
    ref,
  ) {
    const generated = useId();
    const { fieldId, helperId, errorId } = ids(id, generated);
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
        <input
          ref={ref}
          id={fieldId}
          className={`ui-field-control${error ? " ui-field-error" : ""}`}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={describedBy}
          {...props}
        />
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

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldMessageProps & { height?: number | string };
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      label,
      helperText,
      error,
      id,
      height = 120,
      className = "",
      style,
      ...props
    },
    ref,
  ) {
    const generated = useId();
    const { fieldId, helperId, errorId } = ids(id, generated);
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
        <textarea
          ref={ref}
          id={fieldId}
          className={`ui-field-control ui-textarea${error ? " ui-field-error" : ""}`}
          style={{
            height: typeof height === "number" ? `${height}px` : height,
            ...style,
          }}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={describedBy}
          {...props}
        />
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
