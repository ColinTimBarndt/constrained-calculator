import {
  Constraint,
  ConstraintError,
  ConstraintFormula,
  ConstraintSet,
} from "./constraints";
import type { Unit } from "mathjs";

const EMPTY: ReadonlySet<any> = Object.freeze(new Set());

export class ConstrainedForm {
  /**
   * The constraints for this form that need to be maintained.
   */
  public constraints: ConstraintSet = $state(new ConstraintSet());

  /**
   * The values of all form fields.
   */
  public readonly values: Partial<Record<string, Unit>> = $state({});

  /**
   * The locked state of all form fields.
   */
  public readonly locked: Partial<Record<string, boolean>> = $state({});

  /**
   * For which field to highlight which other fields would change, if any.
   */
  public highlightChangesOf: string | undefined = $state();

  /**
   * Readonly set of fields which have been locked by the user.
   */
  public readonly lockedSet: ReadonlySet<string> = $derived(
    new Set(
      Object.entries(this.locked)
        .filter(([, isLocked]) => isLocked)
        .map(([name]) => name)
    )
  );

  /**
   * Formulas for each field to apply to maintain all constraints. If not possible (`null`), the field is in the {@link disabled} set.
   */
  #computations: Partial<
    Record<
      string,
      Readonly<{
        changes: ReadonlySet<string>;
        steps: ConstraintFormula[];
      } | null>
    >
  > = $state.raw({});

  /**
   * The readonly set of all fields that should be highlighted.
   */
  public readonly highlighted: ReadonlySet<string> = $derived(
    (this.highlightChangesOf &&
      this.#computations[this.highlightChangesOf]?.changes) ||
      EMPTY
  );

  /**
   * The readonly set of all fields that should be disabled.
   */
  public readonly disabled: ReadonlySet<string> = $derived(
    new Set(
      Object.entries(this.#computations)
        .filter(([, comp]) => comp === null)
        .map(([name]) => name)
    )
  );

  /**
   * Creates a form and initializes the state for each field.
   *
   * @param constraints - The constraints for this form.
   * @param init - Initialization options for each field (needed for rendering).
   */
  public constructor(
    constraints: Iterable<Constraint>,
    init: Iterable<{
      name: string;
      value: Unit;
      locked?: boolean;
      recompute?: boolean;
    }>
  ) {
    this.constraints = new ConstraintSet(constraints);

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
      // Updates the computation steps needed to fulfill all constraints when the respective field changes.
      this.#computations = Object.fromEntries(
        Object.keys(this.values).map((name) => {
          try {
            const steps = this.constraints.solve(
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

  /**
   * Applies all steps and updates the field values accordingly.
   *
   * @param steps Formulas to evaluate.
   */
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

  /**
   * A field has changed and other fields need to be changed to maintain the constraints.
   *
   * Call this function when a field changes (`oninput`).
   *
   * @param fieldName The field that has changed.
   */
  recomputeForChange(fieldName: string) {
    const steps = this.#computations[fieldName]?.steps;
    if (!steps) throw new Error(`No computation for field ${fieldName}`);

    this.applySteps(steps);
  }
}
