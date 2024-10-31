<!--
@component
A labelled `NumericField` including the formula symbol to be used inside a `Form`.
-->

<script lang="ts">
  import { ConstrainedForm } from "$lib/constrained-form.svelte";
  import { getContext } from "svelte";
  import type { FieldDefinition } from "./Form.svelte";
  import Form from "./Form.svelte";
  import NumericField from "./NumericField.svelte";

  interface Props {
    name: string;
  }

  const { name }: Props = $props();

  const {
    form,
    fields,
  }: { form: ConstrainedForm; fields: ReadonlyMap<string, FieldDefinition> } =
    getContext(Form);

  const params = fields.get(name);
  if (!params) throw new Error(`Unknown field "${name}"`);
</script>

<div class="row">
  <span class="katex">{@html params.katexName}</span>
  <span class="field"
    ><NumericField
      id={name}
      bind:value={form.values[name]}
      bind:locked={form.locked[name]}
      disabled={form.disabled.has(name)}
      highlight={form.highlighted.has(name)}
      icon={params.icon}
      onfocus={() => {
        form.highlightChangesOf = name;
      }}
      onblur={() => {
        form.highlightChangesOf = undefined;
      }}
      onchange={() => form.recomputeForChange(name)}
    /></span
  >
  <label for={name}>{params.label}</label>
</div>

<style lang="scss">
  .row {
    display: contents;
    margin-block: 0.3rem;

    > * {
      margin-block: inherit;
    }
  }

  @media (max-width: 600px) {
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
