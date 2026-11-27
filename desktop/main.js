// MD-442 desktop: the MD|442 web app in its own window, with WebMIDI for the
// M-VAVE SMK-37 Elite / Pro, FM-1 and any other USB or Bluetooth MIDI controller.
const { app, BrowserWindow, protocol, net, session, shell, Menu } = require('electron');
const path = require('path'), url = require('url'), fs = require('fs');
const SITE = 'https://music.nestgroup.space';
const WEB = path.join(__dirname, 'web');

protocol.registerSchemesAsPrivileged([{ scheme: 'md442', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } }]);

function serve() {
  protocol.handle('md442', req => {
    const u = new URL(req.url);
    // Sign-up and other API calls go to the live site.
    if (u.pathname.startsWith('/api/')) { const headers = new Headers(req.headers); headers.delete('origin'); return net.fetch(SITE + u.pathname + u.search, { method: req.method, headers, body: req.body, duplex: 'half' }); }
    let p = decodeURIComponent(u.pathname).replace(/^\/md442\/?/, '/');
    if (p.endsWith('/')) p += 'index.html';
    const file = path.normalize(path.join(WEB, p));
    if (!file.startsWith(WEB)) return new Response('no', { status: 403 });
    return net.fetch(url.pathToFileURL(file).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1000, minHeight: 640,
    backgroundColor: '#0a0a0a', title: 'MD-442', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false }
  });
  win.loadURL('md442://app/md442/');
  // Links to other pages open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, to) => { if (!to.startsWith('md442://')) { e.preventDefault(); shell.openExternal(to); } });
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.whenReady().then(() => {
  const ok = new Set(['midi', 'midiSysex', 'fullscreen', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(ok.has(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => ok.has(perm));
  serve();
  // Beats (.md442.json) and MIDI clips (.mid) save to Documents/MD-442/Beats, the same folder as the plugin.
  session.defaultSession.on('will-download', (e, item) => {
    const name = item.getFilename();
    if (!/\.(md442\.json|mid)$/i.test(name)) return;
    const dir = path.join(app.getPath('documents'), 'MD-442', 'Beats');
    fs.mkdirSync(dir, { recursive: true });
    let file = path.join(dir, name), n = 2;
    while (fs.existsSync(file)) file = path.join(dir, name.replace(/(\.md442\.json|\.mid)$/i, ` ${n++}$1`));
    item.setSavePath(file);
  });
  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]));
  else Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
