<script lang="ts">
  import { onMount } from 'svelte';

  let dialog: HTMLDialogElement;
  let container: HTMLDivElement;
  let initialized = false;

  async function openSearch() {
    dialog.showModal();

    if (!initialized) {
      try {
        // new Function bypasses Vite's static import analysis in dev mode
        const { PagefindUI } = await new Function('u', 'return import(u)')('/pagefind/pagefind-ui.js');
        new PagefindUI({ element: container, showSubResults: true, resetStyles: false });
        initialized = true;
      } catch (err) {
        console.error('Pagefind failed to load:', err);
        container.textContent = 'Search not available in dev mode — run npm run build first.';
      }
    }

    setTimeout(() => {
      (dialog.querySelector('input[type="text"]') as HTMLInputElement | null)?.focus();
    }, 60);
  }

  function handleBackdropClick(e: MouseEvent) {
    const rect = dialog.getBoundingClientRect();
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom
    ) dialog.close();
  }
</script>

<button
  onclick={openSearch}
  class="flex items-center justify-center w-8 h-8 border-none rounded bg-transparent text-[var(--sl-color-gray-3)] cursor-pointer p-0 transition-colors duration-150 hover:text-[var(--sl-color-white)] hover:bg-[var(--sl-color-gray-5)]"
  aria-label="Search"
  title="Search"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
</button>

<!-- ::backdrop and pagefind-container custom properties are in custom.css (Tailwind can't target ::backdrop) -->
<dialog
  bind:this={dialog}
  onclick={handleBackdropClick}
  aria-label="Search"
  class="search-dialog mt-[10vh] w-[min(640px,90vw)] max-h-[80vh] overflow-y-auto bg-[var(--sl-color-bg)] border border-[var(--sl-color-hairline)] rounded-lg p-4 text-[var(--sl-color-text)]"
>
  <div bind:this={container} id="pagefind-container"></div>
</dialog>
