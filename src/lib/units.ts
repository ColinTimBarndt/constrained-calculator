import * as mathjs from "mathjs";

/**
 * The most common units as valueless instances of {@link mathjs.Unit}.
 */
export const UNIT = Object.freeze({
  NONE: mathjs.unit(""),
  ohm: mathjs.unit("ohm"),
  mohm: mathjs.unit("mohm"),
  V: mathjs.unit("V"),
  mV: mathjs.unit("mV"),
  A: mathjs.unit("A"),
  mA: mathjs.unit("mA"),
  Hz: mathjs.unit("Hz"),
  kHz: mathjs.unit("kHz"),
  uH: mathjs.unit("uH"),
  ns: mathjs.unit("ns"),
});

/**
 * Helper function to create a {@link mathjs.Unit}.
 * @param value - The numeric value.
 * @param unit - The unit, either as a string or a valueless {@link mathjs.Unit} (see {@link UNIT}).
 * @returns The unit instance.
 */
export function unitNumber(
  value: number,
  unit: mathjs.Unit | string
): mathjs.Unit {
  return mathjs.unit(value, unit as any) as mathjs.Unit;
}

/**
 * Helper function to parse a {@link mathjs.Unit} supporting unicode symbols.
 * @param value - The string to parse.
 * @returns The parsed unit.
 * @throws {@link Error}
 * When parsing the value fails.
 */
export function parseUnitValue(value: string): mathjs.Unit {
  return mathjs.unit(
    value.replaceAll(/(?=Ω)(\w)/g, (_, x) => "*" + x).replaceAll("Ω", "ohm")
  );
}

/**
 * Helper function to format a {@link mathjs.Unit} supporting unicode symbols.
 * @param unit - The value to format.
 * @param options - Options passed to mathjs.
 * @returns The formatted string.
 */
export function formatUnitValue(
  unit: mathjs.Unit | mathjs.MathCollection | number,
  options?: mathjs.FormatOptions
): string {
  return mathjs
    .format(unit, { notation: "auto", precision: 9, ...options })
    .replaceAll("ohm", "Ω");
}

/**
 * Helper function for checking whether a value has the expected type.
 * Used for validating form fields.
 *
 * @param value - The value to validate.
 * @param valUnit - The expected unit.
 * @returns An empty string if valid, otherwise the error message.
 */
export function checkUnitValidity(value: string, valUnit: mathjs.Unit): string {
  let parsed;

  try {
    parsed = parseUnitValue(value);
  } catch (_) {
    return "Invalid Value";
  }

  if (!valUnit.equalBase(parsed)) {
    return `Invalid Unit: ${parsed.formatUnits()}`;
  }

  return "";
}
