<script lang="ts">
  import type { Snippet } from "svelte";
  import {page} from "$app/stores";

  interface Props {
    href?: string;
    disabled?: boolean;
    children: Snippet;
  }

  const {href, disabled, children}: Props = $props();

  const current = $derived($page.url.pathname == href);
</script>

<li class:disabled><a href={current ? null : href} class:current>{@render children()}</a></li>

<style lang="scss">
  li {
    padding-block: 0.2rem;
    padding-inline: 0.3rem;

    &.disabled {
      opacity: 0.5;
      font-style: italic;
    }
  }

  a:any-link {
    color: var(--color-text);
  }

  a.current {
    color: var(--color-accent2);
    text-decoration: underline;
  }
</style>