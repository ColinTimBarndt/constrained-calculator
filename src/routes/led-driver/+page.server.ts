import type { PageServerLoad } from "./$types";
import katex from "katex";

export const load: PageServerLoad = ({ params }) => {
  const katexOptions: katex.KatexOptions = {
    colorIsTextColor: true,
    displayMode: false,
    throwOnError: false,
    output: "mathml",
  };

  const render = (tex: string) => katex.renderToString(tex, katexOptions);

  return {
    // We only render katex on the server side to avoid bundling katex, which is a large library.
    katex: {
      // NAME~\left[UNIT\right]
      v_in: render(String.raw`V_{IN}~\left[\text{V}\right]`),
      v_led: render(String.raw`V_{LED}~\left[\text{V}\right]`),
      i_led: render(String.raw`I_{LED}~\left[\text{A}\right]`),
      v_d: render(String.raw`V_D~\left[\text{V}\right]`),
      r_s: render(String.raw`R_S~\left[\Omega\right]`),
      l: render(String.raw`L~\left[\text{H}\right]`),
      r_l: render(String.raw`R_L~\left[\Omega\right]`),
      v_s: render(String.raw`V_S~\left[\text{V}\right]`),
      ripple_mult: render(String.raw`\Delta I / I_{LED}`),
      ripple: render(String.raw`\Delta I~\left[\text{A}\right]`),
      r_lx: render(String.raw`R_{LX}~\left[\Omega\right]`),
      t_on: render(String.raw`T_{ON}~\left[\text{s}\right]`),
      t_off: render(String.raw`T_{OFF}~\left[\text{s}\right]`),
      d: render(String.raw`D`),
      f_sw: render(String.raw`f_{SW}~\left[\text{Hz}\right]`),
    },
  };
};
