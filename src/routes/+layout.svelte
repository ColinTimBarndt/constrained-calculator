<script lang="ts">
  import "../app.scss";
  import Navigation from "$components/Navigation.svelte";
  import NavItem from "$components/NavItem.svelte";
  import NavGroup from "$components/NavGroup.svelte";
</script>

<div class="layout">
  <header>
    <h1>Calculator</h1>
    <div class="filler"></div>
  </header>

  <aside>
    <Navigation>
      <NavItem href="/">Home</NavItem>
      <NavGroup name="Electronics">
        <NavItem href="/led-driver">LED Driver</NavItem>
        <NavItem disabled>555 Timer (ToDo)</NavItem>
      </NavGroup>
    </Navigation>
  </aside>

  <main>
    <slot />
  </main>
</div>

<style lang="scss">
  header {
    grid-area: header;
    display: flex;
    align-items: stretch;

    > h1 {
      padding-block: 0.5rem;
      line-height: 1;
      font-weight: normal;
      width: 16rem;
      text-align: center;
      margin: 0;
      background: var(--color-bg-dark);
    }

    .filler {
      border-block-end: var(--border-width) solid
        var(--color-input-outline-inactive);
      flex-grow: 1;
    }
  }

  aside {
    padding-block: 1rem;
    padding-inline: 1.6rem;
  }

  main {
    padding-inline: 1.6rem;
    grid-area: main;
    max-width: 800px;
  }

  @media (min-width: 1000px) {
    .layout {
      display: grid;
      column-gap: 2rem;
      min-height: 100vh;
      grid-template-columns: 16rem 1fr;
      grid-template-rows: 3rem 1fr;
      grid-template-areas: "header header" "sidebar main";
    }

    aside {
      grid-area: sidebar;
      border-inline-end: var(--border-width) solid
        var(--color-input-outline-inactive);
    }

    header .filler {
      margin-left: calc(-1 * var(--border-width));
    }
  }
</style>
