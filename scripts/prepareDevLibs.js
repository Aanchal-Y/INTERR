const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd) {
    console.log('> ' + cmd);
    execSync(cmd, { stdio: 'inherit', shell: true });
}

function ensureDir(p) {
    if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
    }
}

const root = process.cwd();
const libsDir = path.join(root, 'libs');
ensureDir(libsDir);

// Build CSS: css/main.scss -> css/all.css using local binaries if available.
try {
    const sassBin = path.join('node_modules', '.bin', process.platform === 'win32' ? 'sass.cmd' : 'sass');
    const cleancssBin = path.join('node_modules', '.bin', process.platform === 'win32' ? 'cleancss.cmd' : 'cleancss');
    const sassCmd = fs.existsSync(sassBin) ? `${sassBin} css/main.scss css/all.bundle.css` : `npx --no-install sass css/main.scss css/all.bundle.css`;
    run(sassCmd);

    const cleancssCmd = fs.existsSync(cleancssBin)
        ? `${cleancssBin} --skip-rebase css/all.bundle.css > css/all.css`
        : `npx --no-install clean-css-cli --skip-rebase css/all.bundle.css > css/all.css`;
    // Use shell to redirect output
    run(cleancssCmd);

    // remove intermediate bundle if exists
    const bundlePath = path.join(root, 'css', 'all.bundle.css');
    if (fs.existsSync(bundlePath)) {
        fs.unlinkSync(bundlePath);
    }
} catch (e) {
    console.warn('Warning: building CSS failed, continuing. Error:', e && e.message);
}

// Helper to copy files if they exist
function copyIfExists(src, dest) {
    try {
        if (fs.existsSync(src)) {
            const baseName = path.basename(src);
            const dst = path.join(dest, baseName);
            fs.copyFileSync(src, dst);
            console.log(`copied ${src} -> ${dst}`);
        }
    } catch (e) {
        console.warn(`copy failed ${src}: ${e.message}`);
    }
}

// Copy some commonly needed artifacts used by the app (best-effort).
// lib-jitsi-meet
const libJitsiUmd = path.join(root, 'node_modules', 'lib-jitsi-meet', 'dist', 'umd');
if (fs.existsSync(libJitsiUmd)) {
    ensureDir(libsDir);
    const files = fs.readdirSync(libJitsiUmd).filter(f => f.startsWith('lib-jitsi-meet'));
    files.forEach(f => copyIfExists(path.join(libJitsiUmd, f), libsDir));
}

// OLM wasm
copyIfExists(path.join(root, 'node_modules', '@matrix-org', 'olm', 'olm.wasm'), libsDir);

// Tensorflow wasm
const tfDir = path.join(root, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist');
if (fs.existsSync(tfDir)) {
    fs.readdirSync(tfDir).forEach(f => {
        if (f.endsWith('.wasm')) copyIfExists(path.join(tfDir, f), libsDir);
    });
}

// rnnoise wasm
copyIfExists(path.join(root, 'node_modules', '@jitsi', 'rnnoise-wasm', 'dist', 'rnnoise.wasm'), libsDir);

// TFLite virtual-background WASM modules and segmentation model
const tfliteVendorDir = path.join(root, 'react', 'features', 'stream-effects', 'virtual-background', 'vendor');
copyIfExists(path.join(tfliteVendorDir, 'tflite', 'tflite.wasm'), libsDir);
copyIfExists(path.join(tfliteVendorDir, 'tflite', 'tflite-simd.wasm'), libsDir);
copyIfExists(path.join(tfliteVendorDir, 'models', 'selfie_segmentation_landscape.tflite'), libsDir);

// face models (best-effort)
const faceDir = path.join(root, 'node_modules', '@vladmandic', 'human-models', 'models');
if (fs.existsSync(faceDir)) {
    ['blazeface-front.bin', 'blazeface-front.json', 'emotion.bin', 'emotion.json'].forEach(f => {
        copyIfExists(path.join(faceDir, f), libsDir);
    });
}

// Excalidraw assets (dev)
const exDirDev = path.join(root, 'node_modules', '@jitsi', 'excalidraw', 'dist', 'excalidraw-assets-dev');
const exDir = path.join(root, 'node_modules', '@jitsi', 'excalidraw', 'dist', 'excalidraw-assets');
if (fs.existsSync(exDirDev)) {
    // copy directory recursively (best-effort)
    const target = path.join(libsDir, 'excalidraw-assets-dev');
    ensureDir(target);
    try {
        fs.readdirSync(exDirDev).forEach(f => {
            const s = path.join(exDirDev, f);
            const d = path.join(target, f);
            if (fs.statSync(s).isFile()) fs.copyFileSync(s, d);
        });
    } catch (e) {
        console.warn('excalidraw copy failed', e.message);
    }
} else if (fs.existsSync(exDir)) {
    const target = path.join(libsDir, 'excalidraw-assets');
    ensureDir(target);
    try {
        fs.readdirSync(exDir).forEach(f => {
            const s = path.join(exDir, f);
            const d = path.join(target, f);
            if (fs.statSync(s).isFile()) fs.copyFileSync(s, d);
        });
    } catch (e) {
        console.warn('excalidraw copy failed', e.message);
    }
}

console.log('prepareDevLibs finished (best-effort).');

