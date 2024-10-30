<script lang="ts">
  import type { Snippet } from "svelte";

  const { children, class: cssClass }: { children: Snippet, class?: string } = $props();
</script>

<ul role="navigation" class={cssClass}>
  {@render children()}
</ul>

<style lang="scss">
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
