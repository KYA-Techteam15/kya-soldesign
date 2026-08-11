import { loadItemSchema, type LoadItem } from '@ksd/domain';

export interface LoadDraftInput {
  readonly id: string;
  readonly label: string;
  readonly quantity: string;
  readonly activePowerW: string;
  readonly powerFactor: string;
  readonly simultaneityRatio: string;
  readonly activeHours: readonly number[];
}

export type LoadDraftResult =
  | { readonly ok: true; readonly item: LoadItem }
  | { readonly ok: false; readonly fieldErrors: Readonly<Record<string, string>> };

function numberFrom(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

export function parseLoadDraft(input: LoadDraftInput): LoadDraftResult {
  const activeHours = new Set(input.activeHours.filter((hour) => Number.isInteger(hour) && hour >= 0 && hour < 24));
  const parsed = loadItemSchema.safeParse({
    id: input.id,
    label: input.label.trim(),
    quantity: numberFrom(input.quantity),
    activePowerW: numberFrom(input.activePowerW),
    powerFactor: input.powerFactor.trim() === '' ? null : numberFrom(input.powerFactor),
    simultaneityRatio: numberFrom(input.simultaneityRatio),
    hourlyOperatingFractions: Array.from({ length: 24 }, (_, hour) => activeHours.has(hour) ? 1 : 0),
  });
  if (parsed.success) return { ok: true, item: parsed.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? 'form');
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}
