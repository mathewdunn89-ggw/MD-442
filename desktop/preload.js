// Use the normal download path for EXPORT and MIDI, so files land in Documents/MD-442/Beats.
require('electron').webFrame.executeJavaScript('window.showSaveFilePicker = undefined;');
// Inside the desktop app, skip the web landing text and open straight on the machine.
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('inapp', 'desktop-app');
  const s = document.createElement('style');
  s.textContent = '#dl, .cta, .back { display: none !important; }';
  document.head.appendChild(s);
});
// The MD-187 and MD-888 apps open on their own machine the first time. After that, the last machine used is kept.
const style = ((process.argv || []).find(a => a.startsWith('--md-style=')) || '--md-style=442').split('=')[1];
window.addEventListener('load', () => {
  require('electron').webFrame.executeJavaScript(`(() => { try {
    if (localStorage.getItem('md-desktop-style')) return;
    if (window.MD442 && MD442.pickStyle) { if ('${style}' !== '442') MD442.pickStyle('${style}'); localStorage.setItem('md-desktop-style', '${style}'); }
  } catch (_) {} })();`);
});
