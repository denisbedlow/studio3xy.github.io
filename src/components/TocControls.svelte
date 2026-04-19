<script lang="ts">
  import { onMount } from 'svelte';

  const KEY_COLLAPSED = 'sl-toc-collapsed';
  const KEY_WIDTH = 'sl-toc-width';
  const MIN_WIDTH = 120;
  const MAX_WIDTH = 540;

  function applyWidth(width: number) {
    document.documentElement.style.setProperty('--toc-width', width + 'px');
  }

  onMount(() => {
    const toggle = document.getElementById('toc-toggle') as HTMLButtonElement | null;
    const edge   = document.getElementById('toc-edge') as HTMLElement | null;
    if (!toggle || !edge) return;

    function handleToggle(e: Event) {
      e.stopPropagation();
      const EASE = 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)';
      const container = document.querySelector<HTMLElement>('.right-sidebar-container');
      const sidebar   = document.querySelector<HTMLElement>('.right-sidebar');
      if (container) container.style.transition = EASE;
      if (sidebar)   sidebar.style.transition   = EASE;
      setTimeout(() => {
        if (container) container.style.transition = '';
        if (sidebar)   sidebar.style.transition   = '';
      }, 250);

      const isNowCollapsed = document.documentElement.classList.toggle('toc-collapsed');
      localStorage.setItem(KEY_COLLAPSED, isNowCollapsed ? '1' : '0');
      if (!isNowCollapsed) {
        const w = localStorage.getItem(KEY_WIDTH);
        if (w) applyWidth(parseInt(w));
      }
    }

    function handleEdgeMousedown(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('#toc-toggle')) return;
      if (document.documentElement.classList.contains('toc-collapsed')) return;
      e.preventDefault();

      const container = document.querySelector<HTMLElement>('.right-sidebar-container');
      if (!container) return;
      const startX     = e.clientX;
      const startWidth = container.getBoundingClientRect().width;
      const sidebar = document.querySelector<HTMLElement>('.right-sidebar');
      if (container) container.style.transition = 'none';
      if (sidebar)   sidebar.style.transition   = 'none';
      document.body.classList.add('toc-resizing');

      function onMove(e: MouseEvent) {
        applyWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (startX - e.clientX))));
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (container) container.style.transition = '';
        if (sidebar)   sidebar.style.transition   = '';
        document.body.classList.remove('toc-resizing');
        const cur = getComputedStyle(document.documentElement).getPropertyValue('--toc-width').trim();
        const px = parseInt(cur);
        if (!isNaN(px)) localStorage.setItem(KEY_WIDTH, String(px));
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    toggle.addEventListener('click', handleToggle);
    edge.addEventListener('mousedown', handleEdgeMousedown);

    return () => {
      toggle.removeEventListener('click', handleToggle);
      edge.removeEventListener('mousedown', handleEdgeMousedown);
    };
  });
</script>
