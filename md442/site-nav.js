// MD-Modules site nav: the same home logo and links on every page of music.nestgroup.space.
// A page puts <nav data-md-nav></nav> where it wants the bar; this fills it in.
(() => {
  const host = document.querySelector('nav[data-md-nav]'); if (!host) return;
  if (!document.querySelector('link[href*="family=Anybody"]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,100..900&family=Martian+Mono:wdth,wght@75..112.5,300..600&display=swap';
    document.head.appendChild(l);
  }
  const css = document.createElement('style');
  css.textContent = `
nav.mdn{display:flex;flex-wrap:wrap;align-items:center;gap:2px 4px;font:400 11px/1 'Martian Mono',ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}
nav.mdn a{display:inline-flex;align-items:center;min-height:44px;padding:0 12px;border-radius:999px;color:#a3a3a3;text-decoration:none}
nav.mdn a:hover{color:#0a0a0a;background:#f2f2f2}
nav.mdn a.on{color:var(--g,#3dff7a)}
nav.mdn a:focus-visible{outline:2px solid var(--g,#3dff7a);outline-offset:2px}
nav.mdn a.mdn-home{gap:9px;padding:0 14px 0 0;margin-right:6px;border-radius:10px;color:#f2f2f2;font:900 19px/1 'Anybody',system-ui,sans-serif;font-variation-settings:'wdth' 150;letter-spacing:-.03em;text-transform:none}
nav.mdn a.mdn-home:hover{background:none;color:#f2f2f2}
nav.mdn a.mdn-home img{width:36px;height:36px;display:block;transition:transform .15s}
nav.mdn a.mdn-home:hover img{transform:rotate(-6deg) scale(1.08)}
nav.mdn a.mdn-home i{font-style:normal;color:var(--g,#3dff7a)}
nav.mdn .mdn-sep{flex:0 0 1px;align-self:center;height:18px;background:#333;margin:0 6px}
@media (max-width:760px){nav.mdn .mdn-sep{display:none}nav.mdn a.mdn-home{flex:1 1 100%}nav.mdn a:not(.mdn-home){padding:0 16px 0 0}}`;
  document.head.appendChild(css);
  const path = location.pathname;
  const mach = (path.match(/^\/md(442|187|888)\/(?:index\.html)?$/) || [])[1];
  const phone = matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1024px)').matches;
  const play = phone ? '/md' + (mach || '442') + '/app/' : mach ? '#machine' : '/md442/#machine';
  const inst = /\/(install|restore|loops)(\.html)?\/?$/.test(path);
  const items = [
    ['/mathew-dj/', 'Mathew', path.startsWith('/mathew-dj')],
    [play, 'Play', false],
    ['/md442/', 'MD442', mach === '442', '442'], ['/md187/', 'MD187', mach === '187', '187'], ['/md888/', 'MD888', mach === '888', '888'],
    ['/md442/install.html', 'Installer', inst],
    ['/md442/download/', 'Download', /\/download\//.test(path)],
  ];
  host.classList.add('mdn'); host.setAttribute('aria-label', 'MD-Modules pages');
  host.innerHTML = '<a class="mdn-home" href="/" aria-label="MD-Modules home"' + (path === '/' ? ' aria-current="page"' : '') + '><img src="/md442/logo.svg" alt="" width="36" height="36"><span>MD<i>-</i>M<i>’s</i></span></a><span class="mdn-sep" aria-hidden="true"></span>'
    + items.map(([h, t, on, m]) => '<a href="' + h + '"' + (on ? ' class="on" aria-current="page"' : '') + (m ? ' data-m="' + m + '"' : '') + '>' + t + '</a>').join('');
  // On a machine page the console can switch machine: the nav follows it.
  document.addEventListener('md:style', e => host.querySelectorAll('a[data-m]').forEach(a => a.classList.toggle('on', a.dataset.m === String(e.detail))));
})();
