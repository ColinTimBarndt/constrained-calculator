<script lang="ts">
  import NumericField from "$components/NumericField.svelte";
  import { ConstrainedForm } from "$lib/constrained-form.svelte";
  import constraints from "./constraints";
  import type { PageServerData } from './$types';
  import { createFieldsData } from "./fields-data";

  const { data }: { data: PageServerData } = $props();

  const fields = createFieldsData(data.katex);
  const form = new ConstrainedForm(constraints, fields.values());
</script>

<svelte:head>
  <title>LED Driver Calculator</title>
</svelte:head>

<h2>LED Driver Calculator</h2>

<form>
  {@render numField("v_in")}
  {@render numField("v_led")}
  {@render numField("i_led")}
  {@render numField("r_s")}
  {@render numField("v_d")}
  {@render numField("l")}
  {@render numField("r_l")}
  {@render numField("ripple")}

  <h3>IC Specification</h3>
  {@render numField("v_s")}
  {@render numField("ripple_mult")}
  {@render numField("r_lx")}

  <h3>Switching Characteristics</h3>
  {@render numField("t_on")}
  {@render numField("t_off")}
  {@render numField("d")}
  {@render numField("f_sw")}
</form>

{#snippet numField(name: string)}
  {@const params = fields.get(name)!}
  <div class="row">
    <span class="katex">{@html params.katexName}</span>
    <span class="field"><NumericField
      id={name}
      bind:value={form.values[name]}
      bind:locked={form.locked[name]}
      disabled={form.disabled.has(name)}
      highlight={form.highlighted.has(name)}
      icon={params.icon}
      onfocus={() => {form.highlightChangesOf = name}}
      onblur={() => {form.highlightChangesOf = undefined}}
      onchange={() => form.recomputeForChange(name)}
    /></span>
    <label for={name}>{params.label}</label>
  </div>
{/snippet}

<style lang="scss">
  form {
    display: grid;
    grid-template-columns: auto min-content 1fr;
    column-gap: 1rem;
    align-items: baseline;
  }

  .row {
    display: contents;
    margin-block: 0.3rem;

    > * {
      margin-block: inherit;
    }
  }

  h3 {
    grid-column: 1 / span 3;
  }

  @media (max-width: 600px) {
    form {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    .row {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      column-gap: 1rem;
      margin-block: 0.5rem;

      > * {
        margin-block: 0;
      }
    }

    label {
      width: 100%;
    }

    .katex {
      order: 2;
    }

    .field {
      order: 1;
    }
  }
</style>
