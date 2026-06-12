import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawnSync } from 'child_process';

export function activate(context: vscode.ExtensionContext): void {
    const cmd = vscode.commands.registerCommand('vscode-zenn-image-paste.pasteImage', pasteImage);
    context.subscriptions.push(cmd);
}

export function deactivate(): void {}

// ---------------------------------------------------------------------------
// Main command handler
// ---------------------------------------------------------------------------

async function pasteImage(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const doc = editor.document;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('Zenn Image: ワークスペースフォルダが見つかりません。');
        return;
    }

    const resolved = resolveZennImagePath(doc.uri.fsPath, workspaceFolder.uri.fsPath);
    if (!resolved) {
        vscode.window.showErrorMessage(
            'Zenn Image: articles/ または books/ ディレクトリ内のファイルでのみ使用できます。'
        );
        return;
    }

    let imageBuffer: Buffer | null;
    try {
        imageBuffer = getClipboardImageBuffer();
    } catch (err) {
        vscode.window.showErrorMessage(`Zenn Image: クリップボードの取得に失敗しました。\n${err}`);
        return;
    }

    if (!imageBuffer) {
        vscode.window.showErrorMessage('Zenn Image: クリップボードに画像が見つかりません。');
        return;
    }

    const filename = generateFilename();
    try {
        fs.mkdirSync(resolved.imageDir, { recursive: true });
        fs.writeFileSync(path.join(resolved.imageDir, filename), imageBuffer);
    } catch (err) {
        vscode.window.showErrorMessage(`Zenn Image: ファイルの保存に失敗しました。\n${err}`);
        return;
    }

    const mdSnippet = `![](${resolved.markdownRef}${filename})`;
    const ok = await editor.edit(b => b.insert(editor.selection.active, mdSnippet));
    if (!ok) {
        vscode.window.showWarningMessage('Zenn Image: テキストの挿入に失敗しました（ファイルは保存済み）。');
        return;
    }

    vscode.window.showInformationMessage(`Zenn Image: 保存しました → ${resolved.markdownRef}${filename}`);
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

interface ZennPaths {
    imageDir: string;
    markdownRef: string;
}

function resolveZennImagePath(docFsPath: string, workspaceRoot: string): ZennPaths | null {
    const rel = path.relative(workspaceRoot, docFsPath);
    const parts = rel.split(path.sep);

    // articles/<slug>.md — ワークスペース内のどの深さにあっても対応
    const ai = parts.indexOf('articles');
    if (ai !== -1 && parts.length === ai + 2) {
        const zennRoot = path.join(workspaceRoot, ...parts.slice(0, ai));
        const slug = path.basename(parts[ai + 1], path.extname(parts[ai + 1]));
        return {
            imageDir: path.join(zennRoot, 'images', slug),
            markdownRef: `/images/${slug}/`,
        };
    }

    // books/<bookSlug>/<chapter>.md
    const bi = parts.indexOf('books');
    if (bi !== -1 && parts.length === bi + 3) {
        const zennRoot = path.join(workspaceRoot, ...parts.slice(0, bi));
        const bookSlug = parts[bi + 1];
        const chapterSlug = path.basename(parts[bi + 2], path.extname(parts[bi + 2]));
        return {
            imageDir: path.join(zennRoot, 'images', bookSlug, chapterSlug),
            markdownRef: `/images/${bookSlug}/${chapterSlug}/`,
        };
    }

    return null;
}

// ---------------------------------------------------------------------------
// Clipboard image extraction (platform-specific) — returns PNG buffer
// ---------------------------------------------------------------------------

function getClipboardImageBuffer(): Buffer | null {
    switch (process.platform) {
        case 'darwin':
            return getClipboardImageMacOS();
        case 'win32':
            return getClipboardImageWindows();
        default:
            return getClipboardImageLinux();
    }
}

// macOS: AppleScript で PNG として取得（PNG 直接 or TIFF→PNG 変換）
function getClipboardImageMacOS(): Buffer | null {
    const pid = process.pid;
    const tmpDir = os.tmpdir();
    const scriptPath = path.join(tmpDir, `zenn-image-${pid}.applescript`);
    const pngPath = path.join(tmpDir, `zenn-image-${pid}.png`);

    const escapedPng = pngPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    const script = `use framework "AppKit"
use scripting additions

set pb to current application's NSPasteboard's generalPasteboard()
set outPath to "${escapedPng}"

-- NSImage(pasteboard:) はあらゆる画像形式を自動処理する
set img to current application's NSImage's alloc()'s initWithPasteboard_(pb)
if img is missing value then return

-- TIFFRepresentation はプロパティなので () 不要
set tiffData to img's TIFFRepresentation
if tiffData is missing value then return

set rep to current application's NSBitmapImageRep's imageRepWithData_(tiffData)
if rep is missing value then return

-- NSDictionary's new() で空辞書を生成（{} は NSArray になるため不可）
set props to current application's NSDictionary's new()
set pngOut to rep's representationUsingType_properties_(4, props)
if pngOut is not missing value then
    pngOut's writeToFile_atomically_(outPath, true)
end if`;

    try {
        fs.writeFileSync(scriptPath, script, 'utf8');
        const result = spawnSync('osascript', [scriptPath], { timeout: 10000 });
        if (result.error) throw result.error;
        if (result.status !== 0) {
            throw new Error(result.stderr?.toString() ?? 'osascript failed');
        }
        if (!fs.existsSync(pngPath) || fs.statSync(pngPath).size === 0) return null;
        return fs.readFileSync(pngPath);
    } finally {
        try { fs.unlinkSync(scriptPath); } catch { /* ignore */ }
        try { fs.unlinkSync(pngPath); } catch { /* ignore */ }
    }
}

// Windows: PowerShell で PNG として取得
function getClipboardImageWindows(): Buffer | null {
    const pid = process.pid;
    const tmpDir = os.tmpdir();
    const scriptPath = path.join(tmpDir, `zenn-image-${pid}.ps1`);
    const pngPath = path.join(tmpDir, `zenn-image-${pid}.png`);

    const escapedPng = pngPath.replace(/'/g, "''");
    const script = `Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($img -ne $null) {
    $img.Save('${escapedPng}', [System.Drawing.Imaging.ImageFormat]::Png)
}`;

    try {
        fs.writeFileSync(scriptPath, script, 'utf8');
        const result = spawnSync(
            'powershell',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
            { timeout: 10000 }
        );
        if (result.error) throw result.error;
        if (!fs.existsSync(pngPath) || fs.statSync(pngPath).size === 0) return null;
        return fs.readFileSync(pngPath);
    } finally {
        try { fs.unlinkSync(scriptPath); } catch { /* ignore */ }
        try { fs.unlinkSync(pngPath); } catch { /* ignore */ }
    }
}

// Linux: xclip / xsel で PNG バッファを取得
function getClipboardImageLinux(): Buffer | null {
    let result = spawnSync(
        'xclip',
        ['-selection', 'clipboard', '-t', 'image/png', '-o'],
        { encoding: null, timeout: 5000 }
    );
    if (result.status !== 0 || !result.stdout || (result.stdout as Buffer).length === 0) {
        result = spawnSync('xsel', ['--clipboard', '--output'], { encoding: null, timeout: 5000 });
    }
    const buf = result.stdout as Buffer | null;
    return buf && buf.length > 0 ? buf : null;
}

// ---------------------------------------------------------------------------
// Filename generation
// ---------------------------------------------------------------------------

function generateFilename(): string {
    const now = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');
    const ts = [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate()),
        pad(now.getHours()),
        pad(now.getMinutes()),
        pad(now.getSeconds()),
    ].join('');
    return `${ts}.png`;
}
