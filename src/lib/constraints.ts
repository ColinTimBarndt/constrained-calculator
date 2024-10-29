import * as mathjs from "mathjs";
import { UNIT } from "./units.js";

/**
 * Perform additional runtime checks.
 */
const DEBUG_ASSERTIONS = true;

/**
 * Show debug messages when solving for variables.
 * @see {@link ConstraintSet.solve}
 */
const DEBUG_SOLVE = false;

/**
 * Represents a formula that computes a set of variables such that
 * the resulting state always satisfies the {@link Constraint} it belongs to.
 *
 * @template D - Dependency variables.
 * @template C - Computed variables.
 */
export class ConstraintFormula<
  D extends string = string,
  C extends string = string
> {
  /**
   * Computes this formula given the requested variables.
   *
   * @param deps - Readonly record of variables needed by this formula. The entire state may be provided.
   * @returns Record of computed variables to satisfy the {@link Constraint} this formula belongs to.
   */
  public readonly compute: (
    deps: Readonly<Record<D, mathjs.Unit>>
  ) => Record<C, mathjs.Unit>;

  private constructor(
    /**
     * All variables which are needed by this formula. They must be present in the record that's passed to {@link ConstraintFormula.compute}.
     */
    public readonly dependencies: ReadonlySet<D>,

    /**
     * All variables which are computed by this formula. Exactly and only these must be returned by {@link ConstraintFormula.compute}.
     */
    public readonly computes: ReadonlySet<C>,

    compute: (deps: Readonly<Record<D, mathjs.Unit>>) => Record<C, mathjs.Unit>,

    /**
     * Priority of this formula when iterating over them.
     */
    public readonly priority: number = 0
  ) {
    Object.freeze(this.dependencies);
    Object.freeze(this.computes);

    if (DEBUG_ASSERTIONS) {
      this.compute = (deps) => {
        {
          const depNames = new Set(Object.keys(deps));
          const missing = this.dependencies.difference(depNames);
          if (missing.size > 0) {
            throw new Error(`Missing dependencies: ${[...missing]}.`);
          }
          //const superfluous = depNames.difference(this.dependencies);
          //if (superfluous.size > 0) {
          //  throw new Error(`Superfluous dependencies: ${[...superfluous]}.`);
          //}
        }

        const results = compute(deps);

        const resultNames = new Set(Object.keys(results));
        const missing = this.computes.difference(resultNames);
        if (missing.size > 0) {
          throw new Error(`Missing results: ${[...missing]}.`);
        }
        const superfluous = resultNames.difference(this.computes);
        if (superfluous.size > 0) {
          throw new Error(`Superfluous results: ${[...superfluous]}.`);
        }

        return results;
      };
    } else {
      this.compute = compute;
    }

    Object.freeze(this);
  }

  /**
   * Creates a new formula instance which can compute multiple variables.
   *
   * @param dependencies - List of variables needed by this formula.
   * @param computes - List of variables computed by this formula.
   * @param compute - Function which computes the formula.
   * @param priority - Optional priority of this formula when iterating over them.
   */
  public static create<D extends string, C extends string>(
    dependencies: readonly D[],
    computes: readonly C[],
    compute: (
      deps: Readonly<Record<D, mathjs.Unit>>
    ) => Record<C, mathjs.Unit | number>,
    priority?: number
  ): ConstraintFormula<D, C>;

  /**
   * Creates a new formula instance which computes one variable.
   *
   * @param dependencies - List of variables needed by this formula.
   * @param computes - Variable computed by this formula.
   * @param compute - Function which computes the formula.
   * @param priority - Optional priority of this formula when iterating over them.
   */
  public static create<D extends string, C extends string>(
    dependencies: readonly D[],
    computes: C,
    compute: (deps: Readonly<Record<D, mathjs.Unit>>) => mathjs.Unit | number,
    priority?: number
  ): ConstraintFormula<D, C>;

  public static create<D extends string, C extends string>(
    dependencies: readonly D[],
    computes: C | readonly C[],
    compute: (
      deps: Readonly<Record<D, mathjs.Unit>>
    ) => mathjs.Unit | number | Record<C, mathjs.Unit | number>,
    priority: number = 0
  ): ConstraintFormula<D, C> {
    if (typeof computes == "string") {
      // computes single variable, wrap the function to produce a record.
      return new this(
        new Set(dependencies),
        new Set([computes]),
        (deps) => {
          let val = (compute as any)(deps);
          // Convert number results to Unit
          if (typeof val == "number") val = mathjs.unit(val, UNIT.NONE as any);
          return { [computes]: val } as Record<C, mathjs.Unit>;
        },
        priority
      );
    }
    // computes record of variables.
    return new this(
      new Set(dependencies),
      new Set(computes),
      (deps) => {
        const result = (compute as any)(deps);
        for (const name of result) {
          const val = result[name];
          // Convert number results to Unit
          if (typeof val == "number")
            result[name] = mathjs.unit(val, UNIT.NONE as any);
        }
        return result;
      },
      priority
    );
  }
}

/**
 * Represents an equation that must be met for this constraint to be fulfilled.
 * For fulfilling a constraint, {@link ConstraintFormula}s must be added.
 *
 * Alternatively to fulfilling this constraint, {@link Constraint.decompositions}
 * can provide multiple smaller constraints that imply the fulfillment of this one.
 */
export class Constraint<D extends string = string> {
  #formulas: ConstraintFormula[] = [];
  #dirtyOrder = false;

  /**
   * Alternatively to fulfilling this constraint, any set of constraints in here
   * implies the fulfillment of this one. This must be specified to avoid
   * overconstraining if this constraint can be decomposed.
   */
  public readonly decompositions: Set<ReadonlySet<Constraint>> = new Set();

  private constructor(
    /**
     * A cosmetic name of this formula displayed in diagnostic messages.
     */
    public readonly name: string,

    /**
     * All fields which are part of this constraint.
     */
    public readonly fields: ReadonlySet<D>
  ) {
    Object.freeze(this.fields);
  }

  /**
   * Creates a new constraint.
   *
   * @param name - Cosmetic name of this formula displayed in diagnostic messages.
   * @param fields - All fields which are part of this constraint.
   * @returns The constraint.
   */
  public static create<D extends string>(
    name: string,
    fields: readonly D[]
  ): Constraint<D> {
    return new this(name, new Set(fields));
  }

  /**
   * Adds a new formula to this constraint for {@link ConstraintSet.solve} to utilize.
   * The formula's dependencies and computed variables must add up exactly to {@link Constraint.fields}.
   *
   * @param formula - A formula which fulfills the constraint.
   */
  public addFormula<C extends D>(
    formula: ConstraintFormula<Exclude<D, C>, C>
  ): void {
    if (DEBUG_ASSERTIONS) {
      if (
        this.#formulas.find(
          (it) => it.computes.symmetricDifference(formula.computes).size == 0
        )
      ) {
        throw new Error(
          "Formula computing the same properties already exists."
        );
      }

      {
        const expectedDeps = this.fields.difference(formula.computes);
        const missing = expectedDeps.difference(formula.dependencies);
        if (missing.size > 0) {
          throw new Error(`Formula is missing dependencies: ${[...missing]}.`);
        }
        const extra = formula.dependencies.difference(expectedDeps);
        if (extra.size > 0) {
          throw new Error(
            `Formula has dependencies outside of this constraint: ${[
              ...extra,
            ]}.`
          );
        }
      }

      const extra = formula.computes.difference(this.fields);
      if (extra.size > 0) {
        throw new Error(
          `Formula computes fields outside of this constraint: ${[...extra]}.`
        );
      }
    }

    this.#formulas.push(formula);
    this.#dirtyOrder = true;
  }

  /**
   * @returns An iterator over all {@link ConstraintFormula}s that were added, sorter by {@link ConstraintFormula.priority|priority}.
   */
  public formulas(): IterableIterator<ConstraintFormula> {
    this.#sortIfDirty();
    return this.#formulas.values();
  }

  /**
   * Retrieves all formulas which are applicable given the set of fixed variables. This means
   * all formulas which do not compute any fixed value.
   *
   * The formulas are first sorted by the number of fixed dependencies they have and then by
   * {@link ConstraintFormula.priority|priority}.
   *
   * @param fixed The set of variables which are fixed – assumed to be correct and unchangeable.
   * @returns A generator over all formuas can be applied to the state.
   */
  public *applicableFormulas(
    fixed: ReadonlySet<string>
  ): IterableIterator<ConstraintFormula> {
    this.#sortIfDirty();
    const formulas = this.#formulas
      .filter((it) => it.computes.isDisjointFrom(fixed))
      .map((it) => ({
        formula: it,
        fixedDeps: it.dependencies.intersection(fixed).size,
      }));
    formulas.sort(
      (a, b) =>
        a.fixedDeps - b.fixedDeps || a.formula.priority - b.formula.priority
    );
    for (const it of formulas) {
      yield it.formula;
    }
  }

  #sortIfDirty() {
    if (!this.#dirtyOrder) return;
    this.#formulas.sort((a, b) => a.priority - b.priority);
    this.#dirtyOrder = false;
  }
}

/**
 * Any expected error which may occur during {@link ConstraintSet.solve} when no solution is found.
 */
export abstract class ConstraintError extends Error {}

/**
 * When there are multiple constraints left to satisfy where all fields of that constraint are already fixed.
 */
export class OverconstrainedError extends ConstraintError {
  constructor(
    /**
     * The constraint.
     */
    public constraint: Constraint
  ) {
    super(
      `Cannot apply constraint "${constraint.name}" because all fields ${[
        ...constraint.fields,
      ]} are fixed.`
    );
  }
}

/**
 * The formula which might be needed to fulfill the constraint is missing.
 */
export class MissingFormulaError extends ConstraintError {
  /**
   * The set of fixed variables at the point where the formula was searched.
   */
  public fixed: Set<string>;

  constructor(
    /**
     * The constraint.
     */
    public constraint: Constraint,

    fixed: ReadonlySet<string>
  ) {
    super(
      `Missing formula for applying "${constraint.name}" on ${[
        ...constraint.fields,
      ]} where ${[...constraint.fields].filter(
        (it) => !fixed.has(it)
      )} are free.`
    );
    this.fixed = new Set(fixed);
  }
}

/**
 * None of the formulas of a constraint could be applied.
 */
export class UnapplicableFormulasError extends ConstraintError {
  constructor(
    /**
     * The constraint.
     */
    public constraint: Constraint,

    /**
     * Reason for each formula why it could not be applied.
     */
    public errors: Map<ConstraintFormula, ConstraintError>
  ) {
    super(
      `Cannot apply constraint "${constraint.name}" because all formulas result in an invalid state.` +
        [...errors.values()]
          .map((it) => "\n - " + it.toString().replaceAll("\n", "\n   "))
          .join("")
    );
  }
}

/**
 * None of the remaining constraints could be fulfilled.
 */
export class UnapplicableConstraintsError extends ConstraintError {
  constructor(
    /**
     * Reason for each constraint why it could not be fulfilled.
     */
    public errors: Map<Constraint, ConstraintError>
  ) {
    super(
      `All constraints result in an invalid state.` +
        [...errors.values()]
          .map((it) => "\n - " + it.toString().replaceAll("\n", "\n   "))
          .join("")
    );
  }
}

/**
 * A set of constraints which can solve for a set of variables.
 */
export class ConstraintSet extends Set<Constraint> {
  /**
   * Determines which formulas need to be applied in order to fulfill all constraints in this set.
   *
   * @param changed - The set of variables which changed whose constraints need to be satisfied again.
   * @param fixed - The set of variables which have been fixed, can be assumed to be correct and must not be changed.
   * @throws {@link ConstraintError}
   * When no solution was found.
   */
  public solve<K extends string>(
    changed: ReadonlySet<K>,
    fixed: ReadonlySet<K>
  ): ConstraintFormula[];
  public solve(changed: ReadonlySet<string>, fixed: ReadonlySet<string>) {
    let stepCountdowm = 1000; // limit CPU
    if (DEBUG_SOLVE) console.groupCollapsed("Solve", changed);
    try {
      return step(
        // Only need to consider the constraints that depend on the changed variables.
        new Set([...this].filter((it) => !it.fields.isDisjointFrom(changed))),
        // Changed variables must not be overridden.
        changed.union(fixed),
        [],
        new Set(),
        // If another variable is changed by a formula, we must consider all constraints.
        this
      );
    } finally {
      if (DEBUG_SOLVE) console.groupEnd();
    }

    /**
     * One step of the solving algorithm.
     *
     * @param constraints - Constraints which must be satisfied, but aren't yet.
     * @param fixed - Fixed variables.
     * @param apply - Formulas which must be applied to fulfill all fulfilled constraints.
     * @param fulfilled - Constraints which have been fulfilled.
     * @param pool - Additional constraints which are considered when computing a variable.
     * @returns The solution when {@link constraints} is empty and thus everything fulfilled.
     */
    function step(
      constraints: ReadonlySet<Constraint>,
      fixed: Set<string>,
      apply: ConstraintFormula[],
      fulfilled: Set<Constraint>,
      pool: Set<Constraint>
    ): ConstraintFormula[] {
      if (stepCountdowm-- < 0) {
        // Out of CPU
        console.error("Solve reached maximum steps");
        throw new Error("Maximum steps reached");
      }
      if (constraints.size == 0) return apply; // Everything was fulfilled

      if (DEBUG_SOLVE) console.debug("Step", constraints, fixed);

      // Try fulfilling any of the constraints (recursively).
      const errors = new Map<Constraint, ConstraintError>();
      for (const constraint of constraints) {
        const remConstraints = new Set(constraints);
        remConstraints.delete(constraint);

        try {
          return tryConstraint(constraint, remConstraints);
        } catch (e) {
          if (!(e instanceof ConstraintError)) throw e;
          errors.set(constraint, e);
        }
      }

      // No remaining constraint could be fulfilled => unrecoverable
      throw new UnapplicableConstraintsError(errors);

      /**
       * One inner step of the solving algorithm for individual constraints. Recurses back to {@link step}.
       *
       * @param constraint - The constraint to try to fulfill.
       * @param remConstraints - All remaining constraints that need to be fulfilled after this.
       * @returns The solution, see {@link step}.
       */
      function tryConstraint(
        constraint: Constraint,
        remConstraints: Set<Constraint>
      ) {
        if (fulfilled.has(constraint)) {
          // Constraint is already fulfilled and can be skipped, continue without it.
          if (DEBUG_SOLVE) console.debug("Skip", constraint.name);
          return step(remConstraints, fixed, apply, fulfilled, pool);
        }

        if (constraint.fields.isSubsetOf(fixed)) {
          // All fields of the constraint are fixed, thus nothing can be adjusted to fulfill it => unrecoverable
          throw new OverconstrainedError(constraint);
        }

        const formulas = [...constraint.applicableFormulas(fixed)];

        if (formulas.length == 0) {
          // If the constraint cannot be fulfilled as a whole, try decomposing into smaller constraints.
          for (const decomp of constraint.decompositions) {
            // Only add the constraints that are needed. The constraints that don't use any changed field can be thrown out.
            const extra = setWhere(
              decomp.difference(fulfilled),
              (it) => !it.fields.isDisjointFrom(fixed)
            );
            if (!extra.isSubsetOf(pool)) {
              // Don't decompose into constraints where some must not be considered. Otherwise we can get a loop.
              continue;
            }
            if (extra.size == 0) {
              // Decomposition is are already satisfied => this constraint is satisfied.
              return step(
                remConstraints,
                fixed,
                apply,
                setWith(fulfilled, constraint),
                setWithout(pool, constraint)
              );
            }
            // Decompose
            return step(
              setWithout(remConstraints, constraint).union(extra),
              fixed,
              apply,
              fulfilled,
              setWithout(pool, constraint)
            );
          }

          throw new MissingFormulaError(constraint, fixed);
        }

        // Try applying any formula (and recursively the remaining and resulting additional constraints).
        const errors = new Map<ConstraintFormula, ConstraintError>();
        for (const formula of formulas) {
          try {
            if (DEBUG_SOLVE)
              console.group(
                "Compute",
                formula.computes,
                "with",
                constraint.name
              );
            const newPool = setWithout(pool, constraint);
            return step(
              // continue without this constrint (now fulfilled), and add all constraints from
              // the pool that depend on any of the computed variables
              setWithout(remConstraints, constraint).union(
                setWhere(
                  newPool,
                  (it) => !it.fields.isDisjointFrom(formula.computes)
                )
              ),
              // fix all fields of this constraint so that they can't be changed (which could "un-fulfill" it again)
              fixed.union(constraint.fields),
              [...apply, formula],
              setWith(fulfilled, constraint),
              newPool
            );
          } catch (e) {
            if (!(e instanceof ConstraintError)) throw e;
            errors.set(formula, e);
          } finally {
            if (DEBUG_SOLVE) console.groupEnd();
          }
        }

        // No formula can be applied, thus the constraint cannot be fulfilled under these circumstances.
        throw new UnapplicableFormulasError(constraint, errors);
      }
    }
  }
}

/**
 * @param set - Base set.
 * @param item - The item that should be removed.
 * @returns The base set without {@link item}.
 */
function setWithout<T>(set: ReadonlySet<T>, item: T): Set<T> {
  const set2 = new Set(set);
  set2.delete(item);
  return set2;
}

/**
 * @param set - Base set.
 * @param condition - Predicate that every item in the result must fulfill.
 * @returns The base set with only the items matching the predicate.
 */
function setWhere<T>(
  set: ReadonlySet<T>,
  condition: (it: T) => boolean
): Set<T> {
  return new Set(
    (function* () {
      for (const it of set) if (condition(it)) yield it;
    })()
  );
}

/**
 * @param set - Base set.
 * @param item - The item that should be added.
 * @returns The base set with {@link item}.
 */
function setWith<T>(set: ReadonlySet<T>, item: T): Set<T> {
  const set2 = new Set(set);
  set2.add(item);
  return set2;
}
