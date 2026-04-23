const esbuild = require('esbuild');
const fs      = require('fs');

const production = process.argv.includes('--production');
const watch      = process.argv.includes('--watch');

const problemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => { console.log('[watch] build started'); });
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  },
};

// Copies panel.html and panel.css into dist/webview after each webview build.
const copyStaticsPlugin = {
  name: 'copy-statics',
  setup(build) {
    build.onEnd(() => {
      fs.mkdirSync('dist/webview', { recursive: true });
      fs.copyFileSync('src/webview/panel.html', 'dist/webview/panel.html');
      fs.copyFileSync('src/webview/panel.css',  'dist/webview/panel.css');
    });
  },
};

const sharedOptions = {
  bundle:         true,
  minify:         production,
  sourcemap:      !production,
  sourcesContent: false,
  logLevel:       'silent',
};

async function main() {
  const extensionCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ['src/extension.ts'],
    format:      'cjs',
    platform:    'node',
    outfile:     'dist/extension.js',
    external:    ['vscode'],
    plugins:     [problemMatcherPlugin],
  });

  const webviewCtx = await esbuild.context({
    ...sharedOptions,
    entryPoints: ['src/webview/panel.ts'],
    format:      'iife',
    platform:    'browser',
    outfile:     'dist/webview/panel.js',
    plugins:     [copyStaticsPlugin],
  });

  if (watch) {
    await extensionCtx.watch();
    await webviewCtx.watch();
  } else {
    await extensionCtx.rebuild();
    await webviewCtx.rebuild();
    await extensionCtx.dispose();
    await webviewCtx.dispose();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
