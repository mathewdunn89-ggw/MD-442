// Use the normal download path for EXPORT and MIDI, so files land in Documents/MD-442/Beats.
require('electron').webFrame.executeJavaScript('window.showSaveFilePicker = undefined;');
// Inside the desktop app, skip the web landing text and open straight on the machine.
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('inapp', 'desktop-app');
  const s = document.createElement('style');
  s.textContent = '#dl, .cta, .back { display: none !important; }';
  document.head.appendChild(s);
});
