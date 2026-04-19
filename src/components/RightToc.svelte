<script lang="ts">
  import { onMount } from 'svelte';

  type Heading = { depth: number; slug: string; text: string };

  let { headings }: { headings: Heading[] } = $props();

  const h2h3 = headings.filter(h => h.depth === 2 || h.depth === 3);
  let activeSlugs = $state<string[]>([]);

  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('id');
          if (!id) continue;
          if (entry.isIntersecting) {
            activeSlugs = [...activeSlugs, id];
          } else {
            activeSlugs = activeSlugs.filter(s => s !== id);
          }
        }
      },
      { rootMargin: '-80px 0px -66% 0px' }
    );

    for (const h of h2h3) {
      const el = document.getElementById(h.slug);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  });
</script>

{#if h2h3.length > 0}
  <nav aria-label="Table of contents">
    <p class="text-xs font-semibold tracking-widest uppercase text-[var(--sl-color-white)] mb-3">On this page</p>
    <ul class="list-none p-0 flex flex-col gap-0.5">
      {#each h2h3 as h}
        <li class={h.depth === 3 ? 'ps-4' : ''}>
          <a
            href={`#${h.slug}`}
            class={[
              'block px-2 py-[0.2rem] rounded text-xs no-underline transition-colors duration-100',
              activeSlugs.includes(h.slug)
                ? 'text-[var(--sl-color-white)] bg-[var(--sl-color-gray-6)]'
                : 'text-[var(--sl-color-gray-3)] hover:text-[var(--sl-color-white)] hover:bg-[var(--sl-color-gray-6)]'
            ].join(' ')}
          >{h.text}</a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}
