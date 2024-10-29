import { Constraint, ConstraintFormula } from "$lib/constraints";
import * as mathjs from "mathjs";

const constraints: ReadonlySet<Constraint> = Object.freeze(createConstraints());

export default constraints;

function createConstraints() {
  const constraints = new Set<Constraint>();

  {
    const c = Constraint.create("v_s = r_s * i_led", ["i_led", "r_s", "v_s"]);
    c.addFormula(
      ConstraintFormula.create(["r_s", "v_s"], "i_led", ({ r_s, v_s }) =>
        v_s.divide(r_s)
      )
    );
    c.addFormula(
      ConstraintFormula.create(["i_led", "v_s"], "r_s", ({ i_led, v_s }) =>
        v_s.divide(i_led)
      )
    );
    c.addFormula(
      ConstraintFormula.create(["i_led", "r_s"], "v_s", ({ i_led, r_s }) =>
        r_s.multiply(i_led)
      )
    );
    constraints.add(c);
  }

  {
    const c = Constraint.create("ripple = ripple_mult * i_led", [
      "ripple",
      "i_led",
      "ripple_mult",
    ]);
    c.addFormula(
      ConstraintFormula.create(
        ["i_led", "ripple_mult"],
        "ripple",
        ({ i_led, ripple_mult }) => ripple_mult.multiply(i_led)
      )
    );
    c.addFormula(
      ConstraintFormula.create(
        ["ripple", "ripple_mult"],
        "i_led",
        ({ ripple, ripple_mult }) => ripple.divide(ripple_mult)
      )
    );
    c.addFormula(
      ConstraintFormula.create(
        ["ripple", "i_led"],
        "ripple_mult",
        ({ ripple, i_led }) => ripple.divide(i_led)
      )
    );
    constraints.add(c);
  }

  let t_on;
  {
    const c = Constraint.create(
      "T_ON = (L * ΔI) / (V_IN - V_LED - I_LED * (R_S + R_L + R_LX))",
      ["t_on", "l", "ripple", "v_in", "v_led", "i_led", "r_s", "r_l", "r_lx"]
    );
    t_on = c;
    c.addFormula(
      ConstraintFormula.create(
        ["l", "ripple", "v_in", "v_led", "i_led", "r_s", "r_l", "r_lx"],
        "t_on",
        (x) => {
          const ldi = x.l.multiply(x.ripple);
          const denom = mathjs.subtract(
            x.v_in,
            mathjs.add(
              x.v_led,
              x.i_led.multiply(mathjs.add(x.r_s, x.r_l, x.r_lx))
            )
          );
          return ldi.divide(denom);
        }
      )
    );
    c.addFormula(
      ConstraintFormula.create(
        ["t_on", "ripple", "v_in", "v_led", "i_led", "r_s", "r_l", "r_lx"],
        "l",
        (x) => {
          const nom = mathjs
            .subtract(
              x.v_in,
              mathjs.add(
                x.v_led,
                x.i_led.multiply(mathjs.add(x.r_s, x.r_l, x.r_lx))
              )
            )
            .multiply(x.t_on);
          return nom.divide(x.ripple);
        }
      )
    );
    // TODO: Provide more formulas
    constraints.add(c);
  }

  let t_off;
  {
    const c = Constraint.create(
      "T_OFF = (L * ΔI) / (V_LED + V_D + I_LED * (R_S + R_L))",
      ["t_off", "l", "ripple", "v_d", "v_led", "i_led", "r_s", "r_l"]
    );
    t_off = c;
    c.addFormula(
      ConstraintFormula.create(
        ["l", "ripple", "v_d", "v_led", "i_led", "r_s", "r_l"],
        "t_off",
        (v) => {
          const ldi = v.l.multiply(v.ripple);
          const denom = mathjs.add(
            v.v_d,
            v.v_led,
            v.i_led.multiply(mathjs.add(v.r_s, v.r_l))
          );
          return ldi.divide(denom);
        }
      )
    );
    c.addFormula(
      ConstraintFormula.create(
        ["t_off", "ripple", "v_d", "v_led", "i_led", "r_s", "r_l"],
        "l",
        (v) => {
          const nom = mathjs
            .add(v.v_d, v.v_led, v.i_led.multiply(mathjs.add(v.r_s, v.r_l)))
            .multiply(v.t_off);
          return nom.divide(v.ripple);
        }
      )
    );
    // TODO: Provide more formulas
    constraints.add(c);
  }

  let duty;
  {
    const c = Constraint.create("d = t_ON / (t_ON + t_OFF)", [
      "d",
      "t_on",
      "t_off",
    ]);
    duty = c;
    c.addFormula(
      ConstraintFormula.create(["t_on", "t_off"], "d", ({ t_on, t_off }) =>
        t_on.divide(mathjs.add(t_on, t_off))
      )
    );
    c.addFormula(
      ConstraintFormula.create(["d", "t_off"], "t_on", ({ d, t_off }) => {
        const result = mathjs.multiply(
          d.multiply(t_off),
          1 / (1 - d.toNumber())
        );
        if (!mathjs.isUnit(result)) throw new Error("Unexpected result");
        return result;
      })
    );
    // TODO: t_off
    constraints.add(c);
  }

  let f_sw__on__of;
  {
    const c = Constraint.create("f_sw = 1 / (t_ON + t_OFF)", [
      "f_sw",
      "t_on",
      "t_off",
    ]);
    f_sw__on__of = c;
    c.addFormula(
      ConstraintFormula.create(["t_on", "t_off"], "f_sw", ({ t_on, t_off }) => {
        const result = mathjs.divide(1, mathjs.add(t_on, t_off));
        if (!mathjs.isUnit(result)) throw new Error("Unexpected result");
        return result;
      })
    );
    c.addFormula(
      ConstraintFormula.create(["f_sw", "t_off"], "t_on", ({ f_sw, t_off }) => {
        const result = mathjs.add(mathjs.divide(1, f_sw), t_off);
        if (!mathjs.isUnit(result)) throw new Error("Unexpected result");
        return result;
      })
    );
    // TODO: t_off
    constraints.add(c);
  }

  let l_formula;
  {
    const c = Constraint.create(
      "L = (V_IN - V_LED - I_LED * (R_S + R_L + R_LX))(V_LED + V_D + I_LED * (R_S + R_L)) / (f_SW * ΔI * (V_IN - R_LX * I_LED + V_D))",
      [
        "l",
        "f_sw",
        "v_in",
        "v_led",
        "i_led",
        "r_s",
        "r_l",
        "r_lx",
        "v_d",
        "ripple",
      ]
    );
    l_formula = c;
    c.addFormula(
      ConstraintFormula.create(
        [
          "f_sw",
          "v_in",
          "v_led",
          "i_led",
          "r_s",
          "r_l",
          "r_lx",
          "v_d",
          "ripple",
        ],
        "l",
        (x) => {
          const a = mathjs.subtract(
            x.v_in,
            mathjs.add(
              x.v_led,
              x.i_led.multiply(mathjs.add(x.r_s, x.r_l, x.r_lx))
            )
          );
          const b = mathjs.add(
            x.v_led,
            x.v_d,
            x.i_led.multiply(mathjs.add(x.r_s, x.r_l))
          );
          const nom = a.multiply(b);
          const denom = x.f_sw
            .multiply(x.ripple)
            .multiply(
              mathjs.subtract(
                mathjs.add(x.v_in, x.v_d),
                x.r_lx.multiply(x.i_led)
              )
            );
          return nom.divide(denom);
        }
      )
    );
    constraints.add(c);
  }

  l_formula.decompositions.add(new Set([t_on, t_off, f_sw__on__of]));
  f_sw__on__of.decompositions.add(new Set([t_on, t_off, l_formula]));

  return constraints;
}
