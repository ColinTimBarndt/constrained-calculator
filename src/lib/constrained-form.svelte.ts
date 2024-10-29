import {
  Constraint,
  ConstraintError,
  ConstraintFormula,
  ConstraintSet,
} from "./constraints";
import type { Unit } from "mathjs";

const EMPTY: ReadonlySet<any> = Object.freeze(new Set());

export class ConstrainedForm {
  #constraints: ConstraintSet = $state.raw(new ConstraintSet());
  public readonly values: Partial<Record<string, Unit>> = $state({});
  public readonly locked: Partial<Record<string, boolean>> = $state({});
  public highlightChangesOf: string | undefined = $state();

  public readonly lockedSet: ReadonlySet<string> = $derived(
    new Set(
      Object.entries(this.locked)
        .filter(([, isLocked]) => isLocked)
        .map(([name]) => name)
    )
  );

  #computations: Partial<
    Record<
      string,
      Readonly<{
        changes: ReadonlySet<string>;
        steps: ConstraintFormula[];
      } | null>
    >
  > = $state.raw({});

  public readonly highlighted: ReadonlySet<string> = $derived(
    (this.highlightChangesOf &&
      this.#computations[this.highlightChangesOf]?.changes) ||
      EMPTY
  );

  public readonly disabled: ReadonlySet<string> = $derived(
    new Set(
      Object.entries(this.#computations)
        .filter(([, comp]) => comp === null)
        .map(([name]) => name)
    )
  );

  public constructor(
    constraints: Iterable<Constraint>,
    init: Iterable<{
      name: string;
      value: Unit;
      locked?: boolean;
      recompute?: boolean;
    }>
  ) {
    this.#constraints = new ConstraintSet(constraints);

    const recomputeSet = new Set<string>();

    for (const { name, value, locked = false, recompute } of init) {
      this.values[name] = value;
      this.locked[name] = locked;
      if (recompute) recomputeSet.add(name);
    }

    if (recomputeSet.size > 0) {
      const allFields = new Set(Object.keys(this.values));
      const steps = this.constraints.solve(
        allFields.difference(recomputeSet),
        new Set()
      );
      this.applySteps(steps);
    }

    $effect(() => {
      this.#computations = Object.fromEntries(
        Object.keys(this.values).map((name) => {
          try {
            const steps = this.#constraints.solve(
              new Set([name]),
              this.lockedSet
            );
            const changes = new Set<string>();
            for (const step of steps)
              step.computes.forEach((it) => changes.add(it));
            return [name, { steps, changes }];
          } catch (e) {
            if (!(e instanceof ConstraintError)) throw e;
            //console.warn(`Could not solve for ${name}:\n${e}`);

            return [name, null];
          }
        })
      );
    });
  }

  get constraints() {
    return new ConstraintSet(this.#constraints);
  }
  set constraints(val) {
    this.#constraints = val;
  }

  applySteps(steps: ConstraintFormula[]) {
    let state = { ...this.values } as Record<string, Unit>;
    const changed = new Set<string>();
    for (const step of steps) {
      const changes = step.compute(state);
      for (const name in changes) {
        state[name] = changes[name];
        changed.add(name);
      }
    }

    for (const name of changed) {
      this.values[name] = state[name].simplify();
    }
  }

  recomputeForChange(fieldName: string) {
    const steps = this.#computations[fieldName]?.steps;
    if (!steps) throw new Error(`No computation for field ${fieldName}`);

    this.applySteps(steps);
  }
}
