import * as mathjs from "mathjs";

const DEBUG_ASSERTIONS = true;

export class ConstraintFormula<
  D extends string = string,
  C extends string = string
> {
  public readonly compute: (
    deps: Record<D, mathjs.Unit>
  ) => Record<C, mathjs.Unit | number>;

  private constructor(
    public readonly dependencies: ReadonlySet<D>,
    public readonly computes: ReadonlySet<C>,
    compute: (deps: Record<D, mathjs.Unit>) => Record<C, mathjs.Unit | number>,
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

  public static create<D extends string, C extends string>(
    dependencies: readonly D[],
    computes: readonly C[],
    compute: (deps: Record<D, mathjs.Unit>) => Record<C, mathjs.Unit | number>,
    priority?: number
  ): ConstraintFormula<D, C>;
  public static create<D extends string, C extends string>(
    dependencies: readonly D[],
    computes: C,
    compute: (deps: Record<D, mathjs.Unit>) => mathjs.Unit | number,
    priority?: number
  ): ConstraintFormula<D, C>;
  public static create<D extends string, C extends string>(
    dependencies: readonly D[],
    computes: C | readonly C[],
    compute: (
      deps: Record<D, mathjs.Unit>
    ) => mathjs.Unit | number | Record<C, mathjs.Unit | number>,
    priority: number = 0
  ): ConstraintFormula<D, C> {
    if (typeof computes == "string") {
      return new this(
        new Set(dependencies),
        new Set([computes]),
        (deps) =>
          ({ [computes]: compute(deps) } as Record<C, mathjs.Unit | number>),
        priority
      );
    }
    return new this(
      new Set(dependencies),
      new Set(computes),
      compute as any,
      priority
    );
  }
}

export class Constraint<D extends string = string> {
  #formulas: ConstraintFormula[] = [];
  #dirtyOrder = false;
  public readonly decompositions: Set<ReadonlySet<Constraint>> = new Set();

  public constructor(
    public readonly name: string,
    public readonly fields: ReadonlySet<D>
  ) {
    Object.freeze(this.fields);
  }

  public static create<D extends string>(
    name: string,
    fields: readonly D[]
  ): Constraint<D> {
    return new this(name, new Set(fields));
  }

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

  public formulas(): IterableIterator<ConstraintFormula> {
    this.#sortIfDirty();
    return this.#formulas.values();
  }

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

type Num = mathjs.Unit | number;

abstract class ConstraintError extends Error {}

class OverconstrainedError extends ConstraintError {
  constructor(public constraint: Constraint) {
    super(
      `Cannot apply constraint "${constraint.name}" because all fields ${[
        ...constraint.fields,
      ]} are fixed.`
    );
  }
}

class MissingFormulaError extends ConstraintError {
  public fixed: Set<string>;

  constructor(public constraint: Constraint, fixed: ReadonlySet<string>) {
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

class UnapplicableFormulasError extends ConstraintError {
  constructor(public constraint: Constraint, public errors: ConstraintError[]) {
    super(
      `Cannot apply constraint "${constraint.name}" because all formulas result in an invalid state.` +
        errors
          .map((it) => "\n - " + it.toString().replaceAll("\n", "\n   "))
          .join("")
    );
  }
}

class UnapplicableConstraintsError extends ConstraintError {
  constructor(public errors: ConstraintError[]) {
    super(
      `All constraints result in an invalid state.` +
        errors
          .map((it) => "\n - " + it.toString().replaceAll("\n", "\n   "))
          .join("")
    );
  }
}

export class ConstraintSet extends Set<Constraint> {
  public solve<K extends string>(
    changed: ReadonlySet<K>,
    fixed: ReadonlySet<K>
  ): ConstraintFormula[];
  public solve(changed: ReadonlySet<string>, fixed: ReadonlySet<string>) {
    let stepCountdowm = 1000;
    console.groupCollapsed("Solve", changed);
    try {
      return step(
        new Set([...this].filter((it) => !it.fields.isDisjointFrom(changed))),
        changed.union(fixed),
        [],
        new Set(),
        this
      );
    } finally {
      console.groupEnd();
    }

    function step(
      constraints: ReadonlySet<Constraint>,
      fixed: Set<string>,
      apply: ConstraintFormula[],
      fulfilled: Set<Constraint>,
      pool: Set<Constraint>
    ): ConstraintFormula[] {
      if (stepCountdowm-- < 0) {
        console.error("Solve reached maximum steps");
        throw new Error("Maximum steps reached");
      }
      if (constraints.size == 0) return apply;

      console.debug("Step", constraints, fixed);

      let errors: Error[] = [];
      for (const constraint of constraints) {
        const remConstraints = new Set(constraints);
        remConstraints.delete(constraint);

        try {
          return tryConstraint(constraint, remConstraints);
        } catch (e) {
          if (!(e instanceof ConstraintError)) throw e;
          errors.push(e);
        }
      }

      throw new UnapplicableConstraintsError(errors);

      function tryConstraint(
        constraint: Constraint,
        remConstraints: Set<Constraint>
      ) {
        if (fulfilled.has(constraint)) {
          console.debug("Skip", constraint.name);
          return step(remConstraints, fixed, apply, fulfilled, pool);
        }

        if (constraint.fields.isSubsetOf(fixed)) {
          throw new OverconstrainedError(constraint);
          return step(
            remConstraints,
            fixed,
            apply,
            new Set([...fulfilled, constraint]),
            pool
          );
        }

        const formulas = [...constraint.applicableFormulas(fixed)];

        if (formulas.length == 0) {
          // If the formula cannot be applied as a whole, try decomposing into smaller constraints.
          for (const decomp of constraint.decompositions) {
            // Only add the constraints that are needed. The constraints that don't use any changed field can be thrown out.
            const extra = setWhere(
              decomp.difference(fulfilled),
              (it) => !it.fields.isDisjointFrom(fixed)
            );
            if (!extra.isSubsetOf(pool)) continue;
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

        let errors: Error[] = [];

        for (const formula of formulas) {
          try {
            console.group("Compute", formula.computes, "with", constraint.name);
            const newPool = setWithout(pool, constraint);
            return step(
              setWithout(remConstraints, constraint).union(
                setWhere(
                  newPool,
                  (it) => !it.fields.isDisjointFrom(formula.computes)
                )
              ),
              fixed.union(constraint.fields),
              [...apply, formula],
              setWith(fulfilled, constraint),
              newPool
            );
          } catch (e) {
            if (!(e instanceof ConstraintError)) throw e;
            errors.push(e);
          } finally {
            console.groupEnd();
          }
        }

        throw new UnapplicableFormulasError(constraint, errors);
      }
    }
  }
}

function setWithout<T>(set: ReadonlySet<T>, without: T): Set<T> {
  const set2 = new Set(set);
  set2.delete(without);
  return set2;
}

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

function setWith<T>(set: ReadonlySet<T>, item: T): Set<T> {
  const set2 = new Set(set);
  set2.add(item);
  return set2;
}
