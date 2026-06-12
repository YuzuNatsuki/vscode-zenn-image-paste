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
cursor --install-extension vscode-zenn-image-paste-0.0.1.vsix
```
