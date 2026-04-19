<script lang="ts">
  import { onMount } from 'svelte';

  const KEY_NAV_WIDTH = 'sl-nav-width';
  const NAV_MIN = 160;
  const NAV_MAX = 400;

  onMount(() => {
    if (window.innerWidth < 800) return;
    const sidebarPane = document.querySelector<HTMLElement>('.sidebar-pane');
    if (!sidebarPane || document.getElementById('nav-resize-handle')) return;

    const handle = document.createElement('div');
    handle.id = 'nav-resize-handle';
    Object.assign(handle.style, {
      position: 'absolute', right: '-6px', top: '0', bottom: '0',
      width: '12px', cursor: 'col-resize', zIndex: '30',
    });

    const line = document.createElement('div');
    Object.assign(line.style, {
      position: 'absolute', left: '5px', top: '0', bottom: '0',
      width: '2px', borderRadius: '1px', background: 'transparent',
      transition: 'background 0.15s', pointerEvents: 'none',
    });
    handle.appendChild(line);

    handle.addEventListener('mouseenter', () => { line.style.background = 'var(--sl-color-accent)'; });
    handle.addEventListener('mouseleave', () => {
      if (!document.body.classList.contains('nav-resizing')) line.style.background = 'transparent';
    });

    handle.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = sidebarPane.getBoundingClientRect().width;
      document.body.classList.add('nav-resizing');

      function onMove(e: MouseEvent) {
        const w = Math.min(NAV_MAX, Math.max(NAV_MIN, startW + (e.clientX - startX)));
        document.documentElement.style.setProperty('--sl-sidebar-width', w + 'px');
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.classList.remove('nav-resizing');
        line.style.background = handle.matches(':hover') ? 'var(--sl-color-accent)' : 'transparent';
        localStorage.setItem(KEY_NAV_WIDTH, String(Math.round(sidebarPane.getBoundingClientRect().width)));
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    sidebarPane.appendChild(handle);

    return () => {
      document.getElementById('nav-resize-handle')?.remove();
    };
  });
</script>
