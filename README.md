# Zenn Image Paste

Zenn の記事・本を VSCode / Cursor で書くとき、クリップボードの画像を **`Cmd+Alt+V`** 一発で貼り付けられる拡張機能です。  
画像は PNG 形式で `images/` ディレクトリに自動保存され、マークダウン参照も挿入されます。

## 使い方

1. Zenn プロジェクト（`articles/` があるフォルダ）を開く
2. `articles/my-article.md` など記事ファイルを開く
3. 画像をクリップボードにコピーする（下記参照）
4. **`Cmd+Alt+V`** を押す

カーソル位置にマークダウンが挿入されます：

```markdown
![](/images/my-article/20240609153045.png)
```

コマンドパレット（`Cmd+Shift+P`）から「Zenn: Paste Image from Clipboard」でも実行できます。

## 画像のクリップボードへのコピー方法（macOS）

| やりたいこと | ショートカット |
|---|---|
| 画面全体をコピー | `Ctrl+Cmd+Shift+3` |
| 範囲を選択してコピー | `Ctrl+Cmd+Shift+4` |
| ウィンドウを選択してコピー | `Ctrl+Cmd+Shift+4` → `Space` |
| ブラウザ等の画像をコピー | 画像を右クリック →「画像をコピー」 |

> `Cmd+Shift+4`（Ctrl なし）はデスクトップにファイル保存されるだけで、クリップボードには入りません。

## ディレクトリ構造

```
zenn-project/
├── articles/
│   └── my-article.md         ← このファイルを開いて Cmd+Alt+V
├── books/
│   └── my-book/
│       └── chapter1.md       ← 本の章でも使用可能
└── images/
    ├── my-article/
    │   └── 20240609153045.png  ← 自動生成
    └── my-book/
        └── chapter1/
            └── 20240609153045.png
```

## 保存先マッピング

| ファイル | 画像保存先 | マークダウン参照 |
|---|---|---|
| `articles/<slug>.md` | `images/<slug>/` | `/images/<slug>/` |
| `books/<book>/<chapter>.md` | `images/<book>/<chapter>/` | `/images/<book>/<chapter>/` |

Zenn プロジェクトがワークスペースのサブディレクトリにある場合も自動検出します。

## 動作環境

| OS | クリップボード取得方法 | 追加ツール |
|---|---|---|
| macOS | AppKit（`NSImage(pasteboard:)`）| 不要 |
| Windows | PowerShell（`System.Windows.Forms`）| 不要 |
| Linux | `xclip` または `xsel` | 要インストール |

## ビルド方法

```bash
cd vscode-zenn-image-paste
npm install
npm run compile    # TypeScript → out/
npm run package    # → vscode-zenn-image-paste-0.0.1.vsix
```

生成した `.vsix` をインストールします。

**VS Code の場合**

```bash
code --install-extension vscode-zenn-image-paste-0.0.1.vsix
```

> `code` コマンドが使えない場合は、VS Code のコマンドパレット（`Cmd+Shift+P`）から「Shell Command: Install 'code' command in PATH」を実行してください。

**Cursor の場合**

拡張機能ビュー（`Cmd+Shift+X`）を開き、右上の `…` メニューから **Install from VSIX...** を選び、生成した `.vsix` を指定します。

CLI を使う場合：

```bash
cursor --install-extension vscode-zenn-image-paste-0.0.1.vsix
```

> `cursor` コマンドが使えない場合は、Cursor のコマンドパレット（`Cmd+Shift+P`）から「Shell Command: Install 'cursor' command in PATH」を実行してください。

## Marketplace への公開

GitHub Actions で VS Code Marketplace へ自動公開します。`v*` タグを push すると `publish` ワークフローが実行されます。

### 初回セットアップ

1. [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage) で Publisher を作成する  
   - Publisher ID は `package.json` の `publisher`（`YuzuNatsuki`）と一致させる
2. [Azure DevOps](https://dev.azure.com/) で Personal Access Token (PAT) を作成する  
   - Scope: **Marketplace** → **Manage**
3. GitHub リポジトリの **Settings → Secrets and variables → Actions** に `VSCE_PAT` という名前で PAT を登録する

### リリース手順

1. `package.json` の `version` を更新する
2. 変更を main に push する
3. バージョンタグを push する

```bash
git tag v0.0.2
git push origin v0.0.2
```

タグ（例: `v0.0.2`）と `package.json` の `version`（例: `0.0.2`）が一致している必要があります。

手動で公開する場合は、GitHub の **Actions → Publish to VS Code Marketplace → Run workflow** からも実行できます。
