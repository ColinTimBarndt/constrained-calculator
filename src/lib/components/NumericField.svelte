<!--
@component
An input field for a numeric value used for the constraint system.
-->
<script lang="ts">
  import * as math from "mathjs";
  import type { Unit } from "mathjs";
  import { checkUnitValidity, formatUnitValue, parseUnitValue } from "../units";

  interface Props {
    id: string;
    value?: Unit;
    locked?: boolean;
    disabled?: boolean;
    highlight?: boolean;
    icon?: string;
    onfocus?(): void;
    onblur?(): void;
    onchange?(): void;
  }
  let {
    id,
    value = $bindable(math.unit("0")),
    locked = $bindable(false),
    disabled,
    highlight = false,
    icon,
    onfocus,
    onblur,
    onchange,
  }: Props = $props();

  let textValue: string = $state.raw(formatUnitValue(value));
  let inputEl: HTMLInputElement | undefined = $state.raw();
  let currentValue: Unit = value;

  export function getValue() {
    return value;
  }
  export function setValue(v: Unit) {
    value = v;
  }

  export function isLocked() {
    return locked;
  }

  $effect(() => {
    if (value === currentValue) return;
    textValue = formatUnitValue(value);
  });

  function oninput(event: Event) {
    if (!inputEl) return;
    typingHelper(inputEl, event);
    inputEl.setCustomValidity(checkUnitValidity(textValue, value));

    if (!inputEl.validity.valid) return;

    currentValue = parseUnitValue(textValue);
    value = currentValue;

    onchange?.();
  }

  function reformat() {
    if (!inputEl || !inputEl.validity.valid) return;
    textValue = formatUnitValue(value);
  }

  /**
   * This is a typing helper replacing "ohm" with "Ω" and "µ" with "u".
   * @param event
   */
  function typingHelper(inputEl: HTMLInputElement, _: Event) {
    if (inputEl.selectionStart === null || inputEl.selectionEnd === null) {
      inputEl.value = inputEl.value
        .replaceAll(/[Oo]hm/g, "Ω")
        .replaceAll(/µ(?=[a-z])/gi, "u");
      return;
    }

    let index;
    let selStart = inputEl.selectionStart;
    let selEnd = inputEl.selectionEnd;
    let val = inputEl.value.replaceAll(/µ(?=[a-z])/gi, "u");

    while ((index = val.search(/[Oo]hm/g)) >= 0) {
      if (selStart > index) {
        selStart = Math.max(index + 1, selStart - 2);
      }
      if (selEnd > index) {
        selEnd = Math.max(index + 1, selEnd - 2);
      }
      val = val.substring(0, index) + "Ω" + inputEl.value.substring(index + 3);
    }
    inputEl.value = val;
    inputEl.selectionStart = selStart;
    inputEl.selectionEnd = selEnd;
  }
</script>

<fieldset class={highlight ? "highlight" : ""}>
  {#if icon}
    <i class={"icon i-" + icon}></i>
  {/if}
  <input
    class="text"
    {id}
    bind:value={textValue}
    bind:this={inputEl}
    type="text"
    {oninput}
    disabled={disabled || locked}
    {onfocus}
    onblur={() => {
      reformat();
      onblur?.();
    }}
  />
  <input
    class={"lock icon " + (locked ? "i-locked" : "i-unlocked")}
    id={id + ".locked"}
    bind:checked={locked}
    type="checkbox"
    title="Lock this value"
  />
</fieldset>

<style lang="scss">
  $width: 12rem;
  $height: 2rem;
  $border: 2px;
  $radius: 4px;
  $radius-inner: calc($radius - $border);

  fieldset {
    display: inline-flex;
    border: 2px solid var(--color-input-outline);
    margin: 0;
    padding: 0;
    width: $width;
    height: $height;
    border-radius: $radius;
    outline-offset: 2px;
    position: relative;

    &.highlight {
      border-color: var(--color-accent2);
    }

    &:has(> .text:focus) {
      outline: 2px solid var(--color-accent);
    }

    &:has(> .text:disabled) {
      border-color: var(--color-input-outline-inactive);
    }

    &:has(> .text:invalid) {
      border-color: var(--color-invalid);
    }
  }

  i {
    display: inline-block;
    height: 100%;
    position: absolute;
    pointer-events: none;

    + .text {
      padding-inline-start: calc(0.4rem + $height - 2 * $border);
    }
  }

  .text {
    appearance: none;
    background: var(--color-interactive);
    color: var(--color-text);
    border: none;
    border-radius: 0;
    margin: 0;
    padding: 0.2rem 0.4rem;
    flex-grow: 1;
    flex-shrink: 1;
    width: 100%;
    border-radius: $radius-inner 0 0 $radius-inner;

    &:focus,
    &:hover:not(:disabled) {
      outline: none;
      background: var(--color-interactive-active);
    }

    &:disabled {
      background: none;
    }
  }

  .lock {
    appearance: none;
    display: inline-block;
    background-color: var(--color-interactive);
    margin: 0;
    aspect-ratio: 1;
    height: 100%;
    border-radius: 0 $radius-inner $radius-inner 0;

    &:active,
    &:hover:not(:disabled) {
      background-color: var(--color-interactive-active);
    }

    &:disabled {
      visibility: hidden;
    }

    &:focus {
      background-color: var(--color-interactive-active);
      outline: 2px solid var(--color-accent);
      outline-offset: calc($border + 2px);
    }
  }
</style>
