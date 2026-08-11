import type { CalculationEnvelope, SystemKind } from '@ksd/domain';

export interface CalculationRequest<Input> {
  readonly system: SystemKind;
  readonly input: Input;
}

export interface CalculationEngine<Input, Output> {
  readonly version: string;
  calculate(request: CalculationRequest<Input>): Promise<CalculationEnvelope<Output>>;
}

export class UnsupportedCalculationError extends Error {
  public constructor(system: SystemKind) {
    super(`No production calculation is implemented for ${system}`);
    this.name = 'UnsupportedCalculationError';
  }
}

