<script lang="ts">
  import { ConstrainedForm } from "$lib/constrained-form.svelte";
  import constraints from "./constraints";
  import type { PageServerData } from "./$types";
  import { createFieldsData } from "./fields-data";
  import Form from "$components/Form.svelte";
  import NumericFormField from "$components/NumericFormField.svelte";

  const { data }: { data: PageServerData } = $props();

  const fields = createFieldsData(data.katex);
  const form = new ConstrainedForm(constraints, fields.values());
</script>

<svelte:head>
  <title>LED Driver Calculator</title>
</svelte:head>

<h2>LED Driver Calculator</h2>

<Form {form} {fields}>
  <NumericFormField name="v_in" />
  <NumericFormField name="v_led" />
  <NumericFormField name="i_led" />
  <NumericFormField name="r_s" />
  <NumericFormField name="v_d" />
  <NumericFormField name="l" />
  <NumericFormField name="r_l" />
  <NumericFormField name="ripple" />

  <h3>IC Specification</h3>
  <NumericFormField name="v_s" />
  <NumericFormField name="ripple_mult" />
  <NumericFormField name="r_lx" />

  <h3>Switching Characteristics</h3>
  <NumericFormField name="t_on" />
  <NumericFormField name="t_off" />
  <NumericFormField name="d" />
  <NumericFormField name="f_sw" />
</Form>
