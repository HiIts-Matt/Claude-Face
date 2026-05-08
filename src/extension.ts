import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Fixed port so ~/.claude/settings.json can point to a stable URL.
const PORT = 57438;

// The four hook events Claude Code fires. Each one pipes its JSON stdin
// straight to our server with curl — that's the entire bridge.
const HOOK_EVENTS = ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop', 'UserPromptSubmit', 'PreCompact', 'PostCompact'] as const;
const HOOK_CMD = `curl -s -X POST http://localhost:${PORT} -H "Content-Type: application/json" -d @-`;

let server: http.Server | undefined;
let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
    let body = '';
    req.on('data', (c: Buffer) => { body += c; });
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        const state = classifyEvent(event);
        currentPanel?.webview.postMessage({ type: 'setState', state });
      } catch { }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      vscode.window.showErrorMessage(`Claude Crab: port ${PORT} is already in use. Is another instance running?`);
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    bar.text = '$(smiley) CLAUDE.CRAB';
    bar.tooltip = `Listening on http://localhost:${PORT}\nClick to open face`;
    bar.command = 'claude-crab.show';
    bar.show();
    context.subscriptions.push(bar);
  });

  const STATES = ['idle', 'thinking', 'reading', 'writing', 'running_command', 'error', 'success', 'uncertain', 'actually', 'compacting'];

  context.subscriptions.push(
    vscode.commands.registerCommand('claude-crab.show', () => openPanel(context)),
    vscode.commands.registerCommand('claude-crab.setupHooks', () => setupHooks()),
    vscode.commands.registerCommand('claude-crab.previewState', async () => {
      openPanel(context);
      const choice = await vscode.window.showQuickPick(STATES, { placeHolder: 'Preview animation state' });
      if (choice) { currentPanel?.webview.postMessage({ type: 'setState', state: choice }); }
    }),
    vscode.commands.registerCommand('claude-crab.toggleDevMode', () => {
      openPanel(context);
      currentPanel?.webview.postMessage({ type: 'toggleDevMode' });
    }),
    { dispose: () => server?.close() }
  );

  openPanel(context);

  // On first run, prompt to wire up the hooks automatically.
  if (!hooksConfigured()) {
    vscode.window.showInformationMessage(
      'Claude Crab: hook Claude Code events to animate the crab?',
      'Set up hooks'
    ).then(choice => { if (choice) { setupHooks(); } });
  }
}

function hooksConfigured(): boolean {
  try {
    const settings = JSON.parse(fs.readFileSync(claudeSettingsPath(), 'utf-8'));
    return HOOK_EVENTS.every(event =>
      settings?.hooks?.[event]?.some((entry: any) =>
        entry?.hooks?.some((h: any) => h?.command?.includes(`localhost:${PORT}`))
      )
    );
  } catch { return false; }
}

function setupHooks(): void {
  const settingsPath = claudeSettingsPath();
  let settings: any = {};
  try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')); } catch { }

  settings.hooks ??= {};
  const hookEntry = { matcher: '', hooks: [{ type: 'command', command: HOOK_CMD }] };

  for (const event of HOOK_EVENTS) {
    settings.hooks[event] ??= [];
    // Remove any stale entry for this port before re-adding.
    settings.hooks[event] = (settings.hooks[event] as any[]).filter(
      (e: any) => !e?.hooks?.some((h: any) => h?.command?.includes(`localhost:${PORT}`))
    );
    settings.hooks[event].push(hookEntry);
  }

  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  vscode.window.showInformationMessage('Claude Crab: hooks written to ~/.claude/settings.json ✓');
}

function claudeSettingsPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function classifyEvent(event: any): string {
  const hook: string = event.hook_event_name ?? '';
  if (hook === 'SessionStart') { return 'idle'; }
  if (hook === 'UserPromptSubmit') { return 'thinking'; }
  if (hook === 'PreToolUse') {
    const tool: string = event.tool_name ?? '';
    if (tool === 'Read') { return 'reading'; }
    if (tool === 'Write' || tool === 'Edit') { return 'writing'; }
    if (tool === 'Bash') { return 'running_command'; }
    return 'thinking';
  }
  if (hook === 'PostToolUse') { return 'thinking'; }
  if (hook === 'PreCompact') { return 'compacting'; }
  if (hook === 'PostCompact') { return 'idle'; }
  if (hook === 'Stop') {
    const msg = ((event.last_assistant_message ?? '') as string).toLowerCase();
    if (/\b(actually|wait|hmm|hold on)\b/.test(msg)) { return 'actually'; }
    if (/\b(error|failed|cannot|can't|unable|sorry)\b/.test(msg)) { return 'error'; }
    if (/\b(done|success|complete|finished|perfect)\b/.test(msg)) { return 'success'; }
    if (/\b(not sure|might|perhaps|maybe|unsure)\b/.test(msg)) { return 'uncertain'; }
    return 'idle';
  }
  return 'idle';
}

function openPanel(context: vscode.ExtensionContext) {
  if (currentPanel) { currentPanel.reveal(vscode.ViewColumn.Two); return; }

  const distWebview = vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview');
  currentPanel = vscode.window.createWebviewPanel(
    'claudeCrab', 'Claude Crab',
    vscode.ViewColumn.Two,
    { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [distWebview] }
  );

  currentPanel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'images', 'icon.png');

  const webview = currentPanel.webview;
  const cssUri    = webview.asWebviewUri(vscode.Uri.joinPath(distWebview, 'panel.css'));
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(distWebview, 'panel.js'));
  const htmlPath  = path.join(context.extensionPath, 'dist', 'webview', 'panel.html');
  webview.html = fs.readFileSync(htmlPath, 'utf-8')
    .replace(/\{\{cspSource\}\}/g, webview.cspSource)
    .replace(/\{\{cssUri\}\}/g,    cssUri.toString())
    .replace(/\{\{scriptUri\}\}/g, scriptUri.toString());

  currentPanel.onDidDispose(() => { currentPanel = undefined; }, null, context.subscriptions);
}

export function deactivate() {
  server?.close();
}
