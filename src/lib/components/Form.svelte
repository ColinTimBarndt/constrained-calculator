<!--
@component
A HTML form providing a `ConstrainedForm` context for `NumericFormField` components.
-->

<script lang="ts" module>
  export interface FieldDefinition {
    name: string;
    katexName: string;
    label: string;
    icon?: string;
  }
</script>

<script lang="ts">
  import { ConstrainedForm } from "$lib/constrained-form.svelte";
  import { setContext, type Snippet } from "svelte";
  import Form from "./Form.svelte";

  interface Props {
    form: ConstrainedForm;
    fields: ReadonlyMap<string, FieldDefinition>;
    children?: Snippet;
  }

  const {form, fields, children}: Props = $props();

  setContext(Form, {form, fields});
</script>

<form>
  {@render children?.()}
</form>

<style lang="scss">
  form {
    display: grid;
    grid-template-columns: auto min-content 1fr;
    column-gap: 1rem;
    align-items: baseline;

    > :global(h3) {
      grid-column: 1 / span 3;
    }
  }

  @media (max-width: 600px) {
    form {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
