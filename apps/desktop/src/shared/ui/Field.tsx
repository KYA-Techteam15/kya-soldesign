import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export function Field({ label, error, children }: { readonly label: string; readonly error?: string | undefined; readonly children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{error ? <small role="alert">{error}</small> : null}</label>;
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement> & { readonly label: string; readonly error?: string | undefined }) {
  const { label, error, ...inputProps } = props;
  const errorId = useId();
  return <label className="field"><span>{label}</span><input className="input" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} {...inputProps} />{error ? <small id={errorId} role="alert">{error}</small> : null}</label>;
}
