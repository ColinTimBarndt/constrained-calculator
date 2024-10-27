import * as mathjs from "mathjs";

export function parseUnitValue(value: string): mathjs.Unit {
  return mathjs.unit(value.replaceAll("Ω", "ohm"));
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

export function attachTypingHelper(el: HTMLInputElement) {
  el.addEventListener("input", ((ev: InputEvent) => {
    if (ev.data === null) return;
    if (el.selectionStart === null || el.selectionEnd === null) {
      el.value = el.value
        .replaceAll(/[Oo]hm/g, "Ω")
        .replaceAll(/µ(?=[a-z])/gi, "u");
      return;
    }

    let index;
    let selStart = el.selectionStart;
    let selEnd = el.selectionEnd;
    let val = el.value;

    while ((index = val.search(/[Oo]hm/g)) >= 0) {
      if (selStart > index) {
        selStart = Math.max(index + 1, selStart - 2);
      }
      if (selEnd > index) {
        selEnd = Math.max(index + 1, selEnd - 2);
      }
      val = val.substring(0, index) + "Ω" + el.value.substring(index + 3);
    }
    el.value = val;
    el.selectionStart = selStart;
    el.selectionEnd = selEnd;
  }) as any);
}

export function addUnitValidator(el: HTMLInputElement) {
  if (!("unit" in el.dataset)) return;

  const valUnit = mathjs.unit(el.dataset.unit!);

  checkValidity();
  el.addEventListener("input", checkValidity);

  function checkValidity() {
    let parsed;

    try {
      parsed = parseUnitValue(el.value);
    } catch (_) {
      el.setCustomValidity("Invalid Value");
      return;
    }

    if (!valUnit.equalBase(parsed)) {
      el.setCustomValidity(`Invalid Unit: ${parsed.formatUnits()}`);
      return;
    }

    el.setCustomValidity("");
  }
}
