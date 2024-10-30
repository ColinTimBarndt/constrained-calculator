<script lang="ts">
  import type { Snippet } from "svelte";

  const {name, children}: {name?: string, children: Snippet} = $props();
</script>

<li>
  <h4>{name}</h4>
  <ul>{@render children()}</ul>
</li>

<style lang="scss">
  li {
    padding: 0;
  }

  h4 {
    font-size: 1.3rem;
    font-weight: normal;
    text-decoration: underline var(--color-input-outline);
    text-decoration-skip-ink: all;
    text-decoration-thickness: var(--border-width);
    margin: 0;
    padding-block: 0.2rem;
    padding-inline: 0.3rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    padding-inline-start: 0.8rem;
    display: flex;
    flex-direction: column;
  }
</style>