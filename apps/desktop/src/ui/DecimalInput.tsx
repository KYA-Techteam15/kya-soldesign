import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { formatOptionalDecimal, parseOptionalDecimal } from '../app/models/formValues';

/**
 * Saisie décimale à brouillon : la frappe reste libre (« 2, » est un état
 * légitime), la valeur n'est validée qu'à la sortie du champ ou sur Entrée. Une
 * saisie hors bornes est refusée et le champ revient à la dernière valeur.
 */
export function DecimalInput({ value, onCommit, min, max, decimals = 2, allowEmpty = false, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  readonly value: number | null;
  readonly onCommit: (value: number | null) => void;
  readonly min?: number;
  readonly max?: number;
  readonly decimals?: number;
  readonly allowEmpty?: boolean;
}) {
  const shown = formatOptionalDecimal(value, decimals);
  const [draft, setDraft] = useState(shown);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setDraft(shown); setInvalid(false); }, [shown]);
  const commit = () => {
    const parsed = parseOptionalDecimal(draft, { ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) });
    if (!parsed.ok || (parsed.value === null && !allowEmpty)) { setInvalid(true); setDraft(shown); return; }
    setInvalid(false);
    if (parsed.value !== value) onCommit(parsed.value);
  };
  return (
    <input
      {...props}
      inputMode="decimal"
      value={draft}
      aria-invalid={invalid || undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') commit(); props.onKeyDown?.(event); }}
    />
  );
}
