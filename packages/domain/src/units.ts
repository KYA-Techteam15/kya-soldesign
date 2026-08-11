const unitBrand: unique symbol = Symbol('unit');

export type Quantity<Unit extends string> = number & {
  readonly [unitBrand]: Unit;
};

export type Watts = Quantity<'W'>;
export type Kilowatts = Quantity<'kW'>;
export type WattHours = Quantity<'Wh'>;
export type KilowattHours = Quantity<'kWh'>;
export type Volts = Quantity<'V'>;
export type Amperes = Quantity<'A'>;
export type Hours = Quantity<'h'>;

function quantity<Unit extends string>(value: number, unit: Unit): Quantity<Unit> {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${unit} must be finite`);
  }
  return value as Quantity<Unit>;
}

export const watts = (value: number): Watts => quantity(value, 'W');
export const kilowatts = (value: number): Kilowatts => quantity(value, 'kW');
export const wattHours = (value: number): WattHours => quantity(value, 'Wh');
export const kilowattHours = (value: number): KilowattHours => quantity(value, 'kWh');
export const volts = (value: number): Volts => quantity(value, 'V');
export const amperes = (value: number): Amperes => quantity(value, 'A');
export const hours = (value: number): Hours => quantity(value, 'h');

export const kilowattsToWatts = (value: Kilowatts): Watts => watts(value * 1_000);
export const wattsToKilowatts = (value: Watts): Kilowatts => kilowatts(value / 1_000);
export const kilowattHoursToWattHours = (value: KilowattHours): WattHours => wattHours(value * 1_000);
export const wattHoursToKilowattHours = (value: WattHours): KilowattHours => kilowattHours(value / 1_000);

