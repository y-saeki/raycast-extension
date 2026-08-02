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
| `builtin.youtube.shorten` | YouTube | `youtube.com/watch?v=<id>` を `youtu.be/<id>` に短縮。**既定では無効**で、有効にすると短縮されます |
| `builtin.meet.code` | Google Meet | 会議URL(`meet.google.com/xxx-yyyy-zzz`)から `authuser`・`hs`・`pli` 等のパラメータを全削除 |
| `builtin.meet.lookup` | Google Meet | カレンダー由来の `lookup/<エイリアス>` URLからクエリパラメータを全削除 |
| `builtin.figma.slug` | Figma | ファイル名スラッグと共有トークン(`t`)を除去し、`node-id`・`m`(Dev Mode等)・`ready-for-dev`・`version-id`・プロトタイプ再生用パラメータを保持。Design・プロトタイプ・FigJam・Slides・Sites・Buzz・Makeに対応 |
| `builtin.figma.share-token` | Figma | 上記に該当しないFigma URLから、上と同じ保持対象以外のパラメータを除去(パスは変更しない) |
| `builtin.generic.tracking` | (全サイト) | `utm_*`・`gclid`・`fbclid`などの汎用トラッキングパラメータを除去 |

サイト固有ルールは**最初にマッチした1つだけ**が適用され、その後に全サイト対象のルールが適用されます。ユーザーのルールは組み込みルールより先に評価されるため、同じサイトのルールを自分で書けば挙動を上書きできます。

YouTubeはこの仕組みを利用した2段構成になっています。サイトルールが `youtu.be`・Shorts・Live・埋め込みをすべて `youtube.com/watch?v=<id>` の形に揃え、最後に `builtin.youtube.shorten` がそれを `youtu.be/<id>` へ短縮します。この最後の短縮ルールは**インストール直後は無効**なので、既定では `youtube.com/watch?v=<id>` 形式で出力されます。元のURLが `youtu.be` 形式だった場合も、1段目のルールで `youtube.com` 形式に展開されたままになります。短い `youtu.be` 形式で出力したい場合は `Manage URL Rules` から `builtin.youtube.shorten` を有効にしてください。なお `music.youtube.com` は別サービスのURLになってしまうため短縮の対象外です。

### ルールを追加する

`Manage URL Rules` を開いて `⌘N` でフォームから作成できます。マッチ条件(ホスト・パス正規表現)と、適用する変更(パスの書き換え・クエリパラメータの保持/削除)を指定します。フォームには実際のURLを入れて結果を確認できるプレビュー欄があります。

一覧でルールを選んで `⌘D` を押すと、そのルールを複製した状態でフォームが開きます。組み込みルールも複製できるので、組み込みルールを土台に少しだけ違うルールを作ったり、書き方の例として読みながら手を入れたりできます。複製元はそのまま残り、複製したものは新しい自分のルールとして保存されます。

`⌘⇧E` で自分のルールをJSONとしてクリップボードにエクスポート、`⌘⇧I` でクリップボードのJSONをインポートできます。書式の詳細と例は [ルールスキーマ](docs/rule-schema.md) を参照してください。

インポートは実行前に確認ダイアログが出ます。ルールの一覧に加えて、**URLのホストを書き換えるルール**と
**すべてのURLにマッチするルール**が含まれる場合は警告が表示されます。信頼できない場所からコピーしたJSONを
インポートすると、以後クリーンにしたURLが別のホストに書き換えられる可能性があるため、内容を確認してから取り込んでください。

### ルールを有効/無効にする

組み込みルールを含め、すべてのルールは `Manage URL Rules` から個別に有効/無効を切り替えられます。設定はRaycastのローカルストレージに保存されます。

組み込みルールは既定で有効ですが、`builtin.youtube.shorten` だけは例外で**インストール直後は無効**です。切り替えた状態はその後も保持され、拡張の更新やRaycastの再起動で勝手に戻ることはありません。`Reset to Defaults` を実行した場合だけ、インストール直後の状態(このルールは無効)に戻ります。

## プライバシーとセキュリティ

- ネットワーク通信は一切行いません。URLの変換はすべてローカルで完結し、クリップボードの内容が外部に送信されることはありません。
- 読み書きするデータは、コマンド実行時のクリップボードと、Raycastのローカルストレージに保存するルール設定
  (自分で作成したルールと、無効にしたルールのID、既定で無効なルールを適用済みかどうかのID)だけです。
- 認証情報やAPIキーは扱いません。拡張の設定項目(preferences)もありません。
- ルールの正規表現はユーザーが書けるため、長さに上限(500文字)を設けて、
  破滅的バックトラッキングを狙うパターンが入り込む余地を狭めています。インポートできるルール数も200件までです。

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

組み込みルールは `src/rules/` にサイトごとのファイルとして置かれています。ルールを追加・変更する場合はこのディレクトリを編集してください。既定で無効にするルールのIDは `src/rules/index.ts` の `defaultDisabledBuiltinRuleIds` に列挙します。ルールの適用エンジンは `src/lib/ruleEngine.ts`、検証は `src/lib/ruleSchema.ts`、保存は `src/lib/ruleStore.ts` です。

## 開発ドキュメント

仕様書や開発用ドキュメントは `docs/` ディレクトリにまとめています。

- [ルールスキーマ](docs/rule-schema.md): ルールの書式リファレンスと記述例
- [E2Eテストシナリオ](docs/e2e-test-scenarios.md): 実機のRaycastにインストールした状態で手動確認するテストケース一覧
