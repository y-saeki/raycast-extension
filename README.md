# raycast-extension

y-saeki が作成する Raycast Extension 置き場。拡張機能ごとに root 直下のディレクトリに分かれている。

## Extensions

- [url-cleaner](./url-cleaner) — クリップボード内の URL からトラッキングパラメータを除去し、サイトごとのルールで正規化する

## 開発版をインストールする

ストアに公開する前の拡張は、リポジトリをローカルに置いて「開発モードの拡張」として Raycast に読み込ませる。

### 前提

- macOS(`ray` CLI は Raycast アプリと通信するため、macOS 以外では動かない)
- Node.js 22.14.0 以上と npm
- Raycast にサインインしていること(開発モードの利用にアカウントが必要)

### 手順

拡張ごとにディレクトリが独立しているので、インストールしたい拡張のディレクトリで作業する
(ここでは `url-cleaner` を例にする)。

```sh
git clone https://github.com/y-saeki/raycast-extension.git
cd raycast-extension/url-cleaner
npm ci
npm run dev
```

`npm run dev`(`ray develop`)を実行すると拡張がビルドされ、Raycast に取り込まれる。
Raycast を開くとコマンド(`Clean URL from Clipboard` と `Manage URL Rules`)が
そのまま検索できる状態になっている。

`npm run dev` は起動したまま待機し、`src/` を編集すると自動で再ビルドされる。
`Ctrl+C` で終了しても拡張は Raycast に残るので、ふだん使う分には一度動かせばよい。
最新版に追随したいときは `git pull` してから `npm ci && npm run dev` をやり直す。

### ホットキーを割り当てる

`Clean URL from Clipboard` のような `no-view` コマンドは、グローバルホットキーから直接実行すると便利。
Raycast Settings → Extensions で拡張を選び、コマンドの `Record Hotkey` に好きなキー(例: `Cmd+Shift+U`)を割り当てる。

### アンインストール

Raycast Settings → Extensions で対象の拡張を選び、`Cmd+Shift+D`(または右クリックから削除)で開発版の登録を外す。
ローカルのクローンを消しても Raycast 側の登録は残るため、先に Raycast 側から外すこと。
