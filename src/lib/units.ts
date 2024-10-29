import * as mathjs from "mathjs";

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

export function unitNumber(
  value: number,
  unit: mathjs.Unit | string
): mathjs.Unit {
  return mathjs.unit(value, unit as any) as mathjs.Unit;
}

export function parseUnitValue(value: string): mathjs.Unit {
  return mathjs.unit(
    value.replaceAll(/(?=Ω)(\w)/g, (_, x) => "*" + x).replaceAll("Ω", "ohm")
  );
}

export function getInputUnit(el: HTMLInputElement): mathjs.Unit {
  if (!("unit" in el.dataset))
    throw new Error("Input missing property data-unit");

  let base = mathjs.unit(el.dataset.unit!);
  try {
    const parsed = parseUnitValue(el.value);
    if (base.equalBase(parsed)) return parsed;
  } catch (_) {}
  return base;
}

export function formatUnitValue(
  unit: mathjs.Unit | mathjs.MathCollection | number,
  options?: mathjs.FormatOptions
): string {
  return mathjs
    .format(unit, { notation: "auto", precision: 9, ...options })
    .replaceAll("ohm", "Ω");
}

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
