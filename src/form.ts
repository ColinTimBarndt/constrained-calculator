import * as mathjs from "mathjs";
import {
  addUnitValidator as attachUnitValidator,
  attachTypingHelper,
  parseUnitValue,
  formatUnitValue,
} from "./units.js";
import { Constraint, ConstraintFormula, ConstraintSet } from "./constraints.js";

type InputKeys<F extends Record<string, any>> = {
  [key in keyof F]: F[key] extends HTMLInputElement ? key : never;
}[keyof F];

interface CachedFormula {
  apply: ConstraintFormula[];
  changes: Set<string>;
}

const UNITLESS = mathjs.unit("");

export class Form<N extends string> {
  public readonly numericFields: Record<N, mathjs.Unit> = {} as any;
  #constraints: ConstraintSet = new ConstraintSet();
  readonly #fixed: Set<N> = new Set();
  #formulaCache: Partial<Record<string, CachedFormula | null>> = {};
  #locks: Record<N, HTMLInputElement> = {} as any;

  constructor(public readonly elements: Readonly<Record<string, Element>>) {
    for (const [key, elem] of Object.entries(elements)) {
      if (!(elem instanceof HTMLInputElement) || !("unit" in elem.dataset)) {
        continue;
      }

      const wrapper = document.createElement("div");
      wrapper.classList.add("input-wrapper");
      elem.insertAdjacentElement("afterend", wrapper);
      wrapper.appendChild(elem);

      attachTypingHelper(elem);
      attachUnitValidator(elem);

      const unit = mathjs.unit(elem.dataset.unit!);
      let value: mathjs.Unit;

      if (elem.validity.valid) {
        value = parseUnitValue(elem.value);
      } else {
        value = unit;
      }

      const setValue = (v: number | mathjs.Unit) => {
        if (typeof v == "number") {
          if (unit.units.length > 0)
            throw new Error(
              `Expected value of unit ${unit.formatUnits()}, received unitless value.`
            );
          value = mathjs.unit(v, UNITLESS as any);
        } else if (value.units.length == 0) {
          value = v;
        } else {
          value = mathjs.to(v, value.formatUnits()) as mathjs.Unit;
        }
      };

      Object.defineProperty(this.numericFields, key, {
        enumerable: true,
        get() {
          return value;
        },
        set(v: number | mathjs.Unit) {
          setValue(v);
          elem.value = formatUnitValue(value);
        },
      });

      elem.addEventListener("input", () => {
        if (!elem.validity.valid) return;
        setValue(parseUnitValue(elem.value));
        const formula = this.#getFormula(key as N);
        if (formula == null) return;
        let state = { ...this.numericFields };
        for (const step of formula.apply) {
          state = { ...state, ...step.compute(state) };
        }

        console.log(formula.changes);

        for (const key of formula.changes) {
          this.numericFields[key as N] = state[key as N]; // TODO: Checking if key is N
        }
      });

      elem.addEventListener("blur", () => {
        this.#removeAllCls("form-dependent-field");
      });

      const highlightChangedFields = () => {
        const formula = this.#getFormula(key as N);
        if (formula == null) return;
        this.#addCls("form-dependent-field", formula.changes);
      };

      elem.addEventListener("focus", highlightChangedFields);

      // Locking
      {
        const lock = document.createElement("input");
        this.#locks[key as N] = lock;
        lock.type = "checkbox";
        lock.title = "Lock this field's value";
        lock.checked = false;
        wrapper.appendChild(lock);

        lock.addEventListener("input", () => {
          const disabled = this.#getFormula(key as N) === null;
          elem.disabled = disabled || lock.checked;
          if (lock.checked) {
            this.#fixed.add(key as N);
          } else {
            this.#fixed.delete(key as N);
          }
          this.#recomputeCache();
        });
      }
    }

    Object.seal(this.numericFields);
  }

  setConstraints(constraints: Iterable<Constraint>) {
    this.#constraints = new ConstraintSet(constraints);
    this.#recomputeCache();
  }

  computeFields(fields: Set<string>) {
    const steps = this.#constraints.solve(
      new Set(Object.keys(this.numericFields)).difference(fields),
      new Set()
    );

    let state = { ...this.numericFields };
    for (const step of steps) {
      state = { ...state, ...step.compute(state) };
    }
    for (const key of fields) {
      this.numericFields[key as N] = state[key as N]; // TODO: Checking if key is N
    }
  }

  #recomputeCache() {
    this.#formulaCache = {};
    for (const key of Object.keys(this.numericFields)) {
      const disabled =
        this.#getFormula(key as N) === null || this.#fixed.has(key as N);
      (this.elements[key] as HTMLInputElement).disabled = disabled;
    }
  }

  #addCls(cls: string, keys: Iterable<string>) {
    for (const key of keys) {
      const elem = this.elements[key];
      if (elem) elem.classList.add(cls);
    }
  }

  #removeAllCls(cls: string) {
    for (const elem of Object.values(this.elements)) {
      elem.classList.remove(cls);
    }
  }

  #getFormula(key: N): CachedFormula | null {
    if (key in this.#formulaCache) return this.#formulaCache[key]!;

    try {
      const solved = this.#constraints.solve(new Set([key]), this.#fixed);
      let changes = new Set<string>();
      for (const formula of solved) {
        changes = changes.union(formula.computes);
      }

      return (this.#formulaCache[key] = {
        apply: solved,
        changes,
      } satisfies CachedFormula);
    } catch (e) {
      console.warn(`Cannot solve formula for key ${key}:`, e);
      return (this.#formulaCache[key] = null);
    }
  }
}
