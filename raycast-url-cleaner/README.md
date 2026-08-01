# URL Cleaner

クリップボード内のURLからトラッキングパラメータを除去し、サイトごとのルールでシンプルな形に正規化するRaycast拡張です。

## コマンド

- **Clean URL from Clipboard** (`no-view`): クリップボードのテキストからURLを検出し、その場でクリーンな状態に書き換えます。Raycastの設定でグローバルホットキー(例: `Cmd+Shift+U`)を割り当てて使うことを想定しています。
- **Manage URL Rules** (`view`): ルールの一覧・有効/無効の切り替え・自分のルールの追加/編集/削除・JSONでのインポート/エクスポートを行う設定画面です。

## ルール

URLの変換はすべて「ルール」で表現されます。組み込みルールもユーザーが追加するルールも同じ形式です。

| ID | サイト | 変換内容 |
|---|---|---|
| `builtin.amazon.product` | Amazon | 商品名スラッグや`ref`等を除去し `/dp/<ASIN>` の短い形に正規化 |
| `builtin.x.status` | X (Twitter) | ステータスURLのクエリパラメータを全削除 |
| `builtin.youtube.short` | YouTube | `youtu.be/<id>` を正規化(`t`・`list`は保持) |
| `builtin.youtube.embed-playlist` | YouTube | `embed/videoseries?list=<id>` を再生リストページに変換 |
| `builtin.youtube.video-path` | YouTube | Shorts・Live・埋め込み(`/shorts/`・`/live/`・`/embed/`・`/v/`)を動画URLに変換 |
| `builtin.youtube.watch` | YouTube | `v`/`t`/`list`以外のパラメータを削除 |
| `builtin.youtube.playlist` | YouTube | 再生リストURLから `list` 以外のパラメータを削除 |
| `builtin.youtube.shorten` | YouTube | `youtube.com/watch?v=<id>` を `youtu.be/<id>` に短縮。**このルールを無効にすると `youtube.com` 形式で出力されます** |
| `builtin.figma.slug` | Figma / FigJam | ファイル/ボード名スラッグと共有トークン(`t`)を除去し `node-id` を保持 |
| `builtin.figma.share-token` | Figma / FigJam | 上記に該当しないFigma URLから `node-id` 以外のパラメータを除去 |
| `builtin.generic.tracking` | (全サイト) | `utm_*`・`gclid`・`fbclid`などの汎用トラッキングパラメータを除去 |

サイト固有ルールは**最初にマッチした1つだけ**が適用され、その後に全サイト対象のルールが適用されます。ユーザーのルールは組み込みルールより先に評価されるため、同じサイトのルールを自分で書けば挙動を上書きできます。

YouTubeはこの仕組みを利用した2段構成になっています。サイトルールが `youtu.be`・Shorts・Live・埋め込みをすべて `youtube.com/watch?v=<id>` の形に揃え、最後に `builtin.youtube.shorten` がそれを `youtu.be/<id>` へ短縮します。既定では短いURLが出力され、`youtube.com` 形式のまま使いたい場合は `builtin.youtube.shorten` だけを無効にしてください。なお `music.youtube.com` は別サービスのURLになってしまうため短縮の対象外です。

### ルールを追加する

`Manage URL Rules` を開いて `⌘N` でフォームから作成できます。マッチ条件(ホスト・パス正規表現)と、適用する変更(パスの書き換え・クエリパラメータの保持/削除)を指定します。フォームには実際のURLを入れて結果を確認できるプレビュー欄があります。

`⌘⇧E` で自分のルールをJSONとしてクリップボードにエクスポート、`⌘⇧I` でクリップボードのJSONをインポートできます。書式の詳細と例は [ルールスキーマ](docs/rule-schema.md) を参照してください。

### ルールを無効にする

組み込みルールを含め、すべてのルールは `Manage URL Rules` から個別に有効/無効を切り替えられます。設定はRaycastのローカルストレージに保存されます。

## 開発

Node.js 22.14以上が必要です([Raycast公式ドキュメント](https://developers.raycast.com/basics/getting-started))。`nvm`を使う場合は以下でリポジトリの`.nvmrc`に沿ったバージョンに切り替えられます。

```sh
nvm install
nvm use
```

```sh
npm install
npm run dev    # Raycast開発モードで起動
npm run test   # ユニットテスト
npm run lint
```

組み込みルールは `src/rules/` にサイトごとのファイルとして置かれています。ルールを追加・変更する場合はこのディレクトリを編集してください。ルールの適用エンジンは `src/lib/ruleEngine.ts`、検証は `src/lib/ruleSchema.ts`、保存は `src/lib/ruleStore.ts` です。

## 開発ドキュメント

仕様書や開発用ドキュメントは `docs/` ディレクトリにまとめています。

- [ルールスキーマ](docs/rule-schema.md): ルールの書式リファレンスと記述例
- [E2Eテストシナリオ](docs/e2e-test-scenarios.md): 実機のRaycastにインストールした状態で手動確認するテストケース一覧
