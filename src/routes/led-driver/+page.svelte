<script lang="ts">
  import NumericField from "$components/NumericField.svelte";
  import { ConstrainedForm } from "$lib/constrained-form.svelte";
  import { UNIT, unitNumber } from "$lib/units";
  import type { Unit } from "mathjs";
  import constraints from "./constraints";
  import type { PageServerData } from './$types';

  const { data }: { data: PageServerData } = $props();

  interface FieldDefinition {
    name: string;
    value: Unit;
    katexName: string;
    label: string;
    icon?: string;
    recompute?: true;
    locked?: true;
  }

  const fields: Map<string, FieldDefinition> = new Map(
    (
      [
        {
          name: "v_in",
          value: unitNumber(20, UNIT.V),
          label: "Input Voltage",
          icon: "voltage",
        },
        {
          name: "v_led",
          value: unitNumber(3.4, UNIT.V),
          label: "LED Forward Voltage",
          icon: "voltage",
        },
        {
          name: "i_led",
          value: unitNumber(0, UNIT.mA),
          label: "LED Current",
          icon: "current",
          recompute: true,
        },
        {
          name: "v_d",
          value: unitNumber(450, UNIT.mV),
          label: "Flyback Diode Forward Voltage",
          icon: "diode",
        },
        {
          name: "r_s",
          value: unitNumber(150, UNIT.mohm),
          label: "Current Sense Resistance",
          icon: "resistor",
        },
        {
          name: "l",
          value: unitNumber(47, UNIT.uH),
          label: "Inductor Value",
          icon: "inductor",
        },
        {
          name: "r_l",
          value: unitNumber(300, UNIT.mohm),
          label: "Inductor Resistance",
          icon: "resistor",
        },
        // IC Specification
        {
          name: "v_s",
          value: unitNumber(100, UNIT.mV),
          label: "Current Sense Voltage",
          icon: "voltage",
          locked: true,
        },
        {
          name: "ripple_mult",
          value: unitNumber(0.26, UNIT.NONE),
          label: "Ripple Factor",
          locked: true,
        },
        {
          name: "ripple",
          value: unitNumber(0, UNIT.mA),
          label: "Ripple",
          icon: "current-ripple",
          recompute: true,
        },
        {
          name: "r_lx",
          value: unitNumber(200, UNIT.mohm),
          label: "Switch Resistance",
          icon: "resistor",
          locked: true,
        },
        // Switching Characteristics
        {
          name: "t_on",
          value: unitNumber(0, UNIT.ns),
          label: "On Time",
          icon: "time",
          recompute: true,
        },
        {
          name: "t_off",
          value: unitNumber(0, UNIT.ns),
          label: "Off Time",
          icon: "time",
          recompute: true,
        },
        {
          name: "d",
          value: unitNumber(0, UNIT.NONE),
          label: "Duty Cycle",
          icon: "pwm",
          recompute: true,
        },
        {
          name: "f_sw",
          value: unitNumber(0, UNIT.kHz),
          label: "Switch Frequency",
          icon: "time",
          recompute: true,
        },
      ] satisfies Omit<FieldDefinition, "katexName">[]
    ).map((it) => {
      (it as Partial<FieldDefinition>).katexName = data.katex[it.name]!;
      return [it.name, it as FieldDefinition]
    })
  );

  const form = new ConstrainedForm(constraints, fields.values());
</script>

<h2>LED Driver Calculator</h2>

<form>
  <table>
    <tbody>
      {@render numField("v_in")}
      {@render numField("v_led")}
      {@render numField("i_led")}
      {@render numField("r_s")}
      {@render numField("v_d")}
      {@render numField("l")}
      {@render numField("r_l")}
      {@render numField("ripple")}
    </tbody>
  </table>

  <h3>IC Specification</h3>
  <table>
    <tbody>
      {@render numField("v_s")}
      {@render numField("ripple_mult")}
      {@render numField("r_lx")}
    </tbody>
  </table>

  <h3>Switching Characteristics</h3>
  <table>
    <tbody>
      {@render numField("t_on")}
      {@render numField("t_off")}
      {@render numField("d")}
      {@render numField("f_sw")}
    </tbody>
  </table>
</form>

{#snippet numField(name: string)}
  {@const params = fields.get(name)!}
  <tr>
    <td>
      {@html params.katexName}
    </td>
    <td>
      <NumericField
        id={name}
        bind:value={form.values[name]}
        bind:locked={form.locked[name]}
        disabled={form.disabled.has(name)}
        highlight={form.highlighted.has(name)}
        icon={params.icon}
        onfocus={() => {form.highlightChangesOf = name}}
        onblur={() => {form.highlightChangesOf = ""}}
        onchange={() => form.recomputeForChange(name)}
      />
    </td>
    <td>
      <label for={name}>{params.label}</label>
    </td>
  </tr>
{/snippet}

<style lang="scss">
  table {
    border-collapse: collapse;
  }

  td {
    padding: 0.3rem 0.5rem;

    &:first-child {
      padding-inline-start: 0;
    }
  }
</style>
