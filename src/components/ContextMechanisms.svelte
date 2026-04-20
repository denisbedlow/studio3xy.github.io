<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { Mechanism } from '../content/docs/claude-code-context-mechanisms/mechanisms';

  interface Props {
    rows: Mechanism[];
  }

  let { rows }: Props = $props();

  let expanded = $state<Record<number, boolean>>({});

  function toggle(i: number) {
    expanded[i] = !expanded[i];
  }

  const kindLabel = {
    instruction: 'Instruction',
    data: 'Data',
    config: 'Config',
  } as const;

  const attrFields: Array<[keyof Mechanism, string]> = [
    ['location', 'Location'],
    ['source', 'Source'],
    ['invoker', 'Invoker'],
    ['trigger', 'Trigger'],
    ['size', 'Size / limit'],
    ['compact', 'Survives /compact'],
    ['precedence', 'Precedence'],
  ];
</script>

<ul class="ctx-list not-content">
  {#each rows as row, i}
    <li class="ctx-item">
      <button
        type="button"
        onclick={() => toggle(i)}
        aria-expanded={expanded[i] ?? false}
        class="ctx-row"
      >
        <span class="ctx-chevron" class:open={expanded[i]} aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4,2 8,6 4,10" />
          </svg>
        </span>
        <span class="ctx-body">
          <span class="ctx-head">
            <span class="ctx-name">{@html row.name}</span>
            <span class="ctx-kind ctx-kind-{row.kind}">{kindLabel[row.kind]}</span>
          </span>
          <span class="ctx-what">{@html row.what}</span>
        </span>
      </button>
      {#if expanded[i]}
        <div class="ctx-details" transition:slide={{ duration: 160 }}>
          <dl class="ctx-dl">
            {#each attrFields as [key, label]}
              <dt>{label}</dt>
              <dd>{@html row[key]}</dd>
            {/each}
          </dl>
        </div>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .ctx-list {
    list-style: none;
    padding: 0;
    margin: 0;
    border: 1px solid var(--sl-color-hairline);
    border-radius: 0.5rem;
    overflow: hidden;
  }
  .ctx-item + .ctx-item {
    border-top: 1px solid var(--sl-color-hairline);
  }
  .ctx-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: 0;
    text-align: left;
    cursor: pointer;
    color: inherit;
    font: inherit;
    transition: background-color 120ms ease;
  }
  .ctx-row:hover {
    background: var(--sl-color-gray-6);
  }
  .ctx-row:focus-visible {
    outline: 2px solid var(--sl-color-accent);
    outline-offset: -2px;
  }
  .ctx-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1rem;
    height: 1.25rem;
    color: var(--sl-color-gray-3);
    transition: transform 150ms ease;
  }
  .ctx-chevron.open {
    transform: rotate(90deg);
  }
  .ctx-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .ctx-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
  }
  .ctx-name {
    color: var(--sl-color-white);
    font-weight: 500;
    font-size: var(--sl-text-base);
  }
  .ctx-what {
    color: var(--sl-color-gray-2);
    font-size: var(--sl-text-sm);
    line-height: 1.5;
  }
  .ctx-kind {
    display: inline-block;
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 9999px;
    font-weight: 500;
    white-space: nowrap;
    line-height: 1.55;
  }
  .ctx-kind-instruction {
    background: var(--sl-color-accent-low);
    color: var(--sl-color-accent-high);
  }
  .ctx-kind-data {
    background: var(--sl-color-gray-5);
    color: var(--sl-color-white);
  }
  .ctx-kind-config {
    background: transparent;
    color: var(--sl-color-gray-2);
    box-shadow: inset 0 0 0 1px var(--sl-color-gray-5);
  }
  .ctx-details {
    padding: 0 1rem 0.875rem calc(1rem + 1rem + 0.75rem);
  }
  .ctx-dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    column-gap: 1rem;
    row-gap: 0.375rem;
    margin: 0;
    font-size: var(--sl-text-sm);
  }
  .ctx-dl dt {
    color: var(--sl-color-gray-3);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-top: 0.15rem;
    font-weight: 500;
  }
  .ctx-dl dd {
    margin: 0;
    color: var(--sl-color-gray-1);
    line-height: 1.5;
  }
  .ctx-details :global(code),
  .ctx-name :global(code),
  .ctx-what :global(code) {
    font-family: var(--__sl-font-mono);
    font-size: 0.875em;
    padding: 0.1em 0.35em;
    background: var(--sl-color-bg-inline-code);
    border-radius: 3px;
  }
  @media (max-width: 40rem) {
    .ctx-details {
      padding-left: 1rem;
    }
    .ctx-dl {
      grid-template-columns: 1fr;
      row-gap: 0.125rem;
    }
    .ctx-dl dt {
      padding-top: 0.5rem;
    }
  }
</style>
