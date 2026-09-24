import { useEffect, useState, type ChangeEvent, type ComponentProps } from 'react';
import { isDecimalDraft } from '../../../app/models/formValues';

/**
 * Champ numérique qui garde la saisie en cours (« 1, », « 0,0 ») sans la réécrire à chaque
 * frappe, et ne transmet qu'une valeur lisible.
 */
export function DraftNumberInput({
  value,
  onCommit,
  format = (number) => String(number),
  nullable = false,
  inputMode = 'decimal',
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  readonly value: number | null;
  readonly onCommit: (value: number | null) => void;
  readonly format?: (value: number) => string;
  readonly nullable?: boolean;
}) {
  const [draft, setDraft] = useState(() => value === null ? '' : format(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value === null ? '' : format(value));
  }, [focused, format, value]);

  const commitDraft = (raw: string) => {
    if (raw.trim() === '') {
      if (nullable) onCommit(null);
      return;
    }
    if (!isDecimalDraft(raw)) return;
    const parsed = Number(raw.replace(',', '.'));
    if (Number.isFinite(parsed)) onCommit(parsed);
  };

  return <input
    {...props}
    inputMode={inputMode}
    value={draft}
    onFocus={() => setFocused(true)}
    onChange={(event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (!isDecimalDraft(raw)) return;
      setDraft(raw);
      commitDraft(raw);
    }}
    onBlur={() => {
      commitDraft(draft);
      setFocused(false);
    }}
  />;
}
