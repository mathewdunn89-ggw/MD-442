// Turns this folder into one machine's app: node variant.js 442 | 187 | 888
// Each app has its own name, id, installer file, settings and beats folder, and opens on its own machine.
const fs = require('fs'), path = require('path');
const id = String(process.argv[2] || '442');
if (!['442', '187', '888'].includes(id)) { console.error('style must be 442, 187 or 888'); process.exit(1); }
const name = 'MD-' + id, pkgFile = path.join(__dirname, 'package.json'), pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
const tag = { 442: 'techno', 187: '90s hip-hop', 888: 'hard techno' }[id];
pkg.name = 'md' + id; pkg.productName = name; pkg.description = 'MD|' + id + ' ' + tag + ' drum machine by Mathew, NEST Group';
const b = pkg.build;
b.appId = 'space.nestgroup.md' + id; b.productName = name;
b.mac.artifactName = 'md' + id + '-mac.${ext}'; b.mac.extendInfo.NSBluetoothAlwaysUsageDescription = name + ' uses Bluetooth MIDI controllers.';
b.dmg.title = name; b.win.artifactName = 'md' + id + '-windows.${ext}'; b.nsis.shortcutName = name;
if (!b.files.includes('style.json')) b.files.push('style.json');
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'style.json'), JSON.stringify({ id, name }) + '\n');
console.log('variant', name);
