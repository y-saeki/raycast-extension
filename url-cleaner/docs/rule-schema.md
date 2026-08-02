# ルールスキーマ

URL Cleanerのルールは、すべてプレーンなJSONデータで表現されます。組み込みルールもユーザーが追加するルールも形式は同じです。

ルールの追加・編集は `Manage URL Rules` コマンドから行えます。フォームで作るほか、このドキュメントの形式でJSONを書いてクリップボードからインポートすることもできます(`⌘⇧I`)。既存のルールは `⌘⇧E` でJSONとしてエクスポートできるので、そこから書き始めるのが簡単です。

## 全体の形

```json
{
  "id": "user.example",
  "name": "Example: 参照元パラメータを除去",
  "description": "任意。設定画面に表示される説明",
  "stage": "site",
  "match": {
    "hosts": ["example.com"],
    "hostPattern": "",
    "pathPattern": "^\\/articles\\/(\\d+)",
    "hasParams": []
  },
  "actions": {
    "setHost": "",
    "setPath": "/articles/$1",
    "queryMode": "remove",
    "queryParams": ["from", "ref"],
    "setParams": {}
  }
}
```

| フィールド | 必須 | 内容 |
|---|---|---|
| `id` | ○ | 一意な識別子。有効/無効の記憶に使われます。`builtin.` で始まるIDは拡張機能に同梱されるルール用に予約されています。フォームから作った場合は `user.<名前のスラッグ>` が自動で付きます |
| `name` | ○ | 設定画面に表示される名前 |
| `description` | | 補足説明 |
| `stage` | | `site`(既定) または `global`。下記参照 |
| `match` | ○ | ルールが適用される条件 |
| `actions` | ○ | 適用されたときにURLへ加える変更 |

## `stage`: ルールが動くタイミング

| 値 | 挙動 |
|---|---|
| `site`(既定) | サイト固有ルール。**最初にマッチした1つだけ**が適用されます。ユーザールールは組み込みルールより先に評価されるため、同じサイトのルールを自分で書けば組み込みルールを上書きできます |
| `global` | サイトルールの後に、**マッチするものすべて**が適用されます。組み込みの「汎用トラッキングパラメータ」(`builtin.generic.tracking`)がこれにあたります |

`site` ルールは `match` に条件を1つ以上書く必要があります(条件のないルールは以降のすべてのルールを覆い隠してしまうため)。`global` ルールは `match` を空(`{}`)にして全URLを対象にできます。

## `match`: 適用条件

書いた条件が**すべて**満たされたときにルールが適用されます。省略した条件は判定されません。

| フィールド | 内容 |
|---|---|
| `hosts` | ホスト名の配列。サブドメインも含めて一致します(`example.com` は `www.example.com` にも一致、`notexample.com` には一致しません) |
| `hostPattern` | ホスト名に対する正規表現(文字列) |
| `pathPattern` | パスに対する正規表現(文字列)。キャプチャグループは `actions` から `$1`, `$2`, ... で参照できます |
| `hasParams` | ここに挙げたクエリパラメータが**すべて存在する**ときだけ適用されます。値は `actions` から `${名前}` で参照できます |

正規表現は**常に大文字小文字を区別せず**照合されます。JSONの文字列なのでバックスラッシュは二重に書く必要があります(`^\\/watch$`)。正規表現として壊れているルールは、他のルールを巻き込まずにスキップされます。

`site` ルールに必要な「条件を1つ以上」には `hasParams` は数えません(単独ではすべてのホストにマッチしてしまうため)。`hosts`・`hostPattern`・`pathPattern` のいずれかと組み合わせて使ってください。

## `actions`: URLへの変更

| フィールド | 内容 |
|---|---|
| `setHost` | ホスト名を置き換えます。参照可 |
| `setPath` | パスを置き換えます。参照可 |
| `queryMode` | クエリ文字列の扱い(下表)。既定は `keepAll` |
| `queryParams` | `keepOnly` / `remove` で対象にするパラメータ名の配列 |
| `setParams` | パラメータを明示的にセットします。値は参照可。**クエリ文字列の先頭に置かれます** |

### 値の中で使える参照

| 記法 | 展開されるもの |
|---|---|
| `$1`, `$2`, ... | `match.pathPattern` のキャプチャグループ |
| `${名前}` | クエリパラメータ `名前` の値 |

参照は元のURLに対して解決されるため、同じルールが後からそのパラメータを削除しても問題ありません(`setPath: "/${v}"` と `queryMode: "keepOnly"` の組み合わせでクエリの `v` をパスへ移せます)。解決できない参照は書いたままの文字列として残ります。

### `queryMode`

| 値 | 挙動 |
|---|---|
| `keepAll` | クエリをそのまま残す(既定) |
| `removeAll` | すべてのパラメータを削除 |
| `keepOnly` | `queryParams` に挙げたものだけを残す |
| `remove` | `queryParams` に挙げたものだけを削除 |

パラメータが1つも変化しない場合、クエリ文字列は元のエンコーディングのまま一切書き換えられません。

## 例

### 特定のパラメータだけを消す

```json
[
  {
    "id": "user.note-from",
    "name": "note: 参照元パラメータを除去",
    "match": { "hosts": ["note.com"] },
    "actions": { "queryMode": "remove", "queryParams": ["from"] }
  }
]
```

### 必要なパラメータだけを残す

```json
[
  {
    "id": "user.example-keep-id",
    "name": "Example: id以外のクエリを除去",
    "match": { "hosts": ["example.com"], "pathPattern": "^\\/items$" },
    "actions": { "queryMode": "keepOnly", "queryParams": ["id"] }
  }
]
```

### パスを短く正規化する

キャプチャした記事IDだけを使ってパスを組み直し、クエリをすべて落とす例です。

```json
[
  {
    "id": "user.example-canonical",
    "name": "Example: 記事URLを正規化",
    "match": { "hosts": ["example.com"], "pathPattern": "^\\/articles\\/(\\d+)\\/.*$" },
    "actions": { "setPath": "/articles/$1", "queryMode": "removeAll" }
  }
]
```

### 短縮URLを展開する

パスの一部をクエリパラメータへ移す例です(組み込みの `builtin.youtube.short` と同じ考え方)。

```json
[
  {
    "id": "user.example-short",
    "name": "Example: 短縮URLを展開",
    "match": { "hosts": ["exmpl.co"], "pathPattern": "^\\/([^\\/]+)" },
    "actions": {
      "setHost": "www.example.com",
      "setPath": "/watch",
      "setParams": { "v": "$1" },
      "queryMode": "keepOnly",
      "queryParams": ["t"]
    }
  }
]
```

### URLを短縮形にする

逆に、クエリパラメータをパスへ移す例です(組み込みの `builtin.youtube.shorten` — 既定では無効 — と同じ考え方)。`hasParams` があるので `v` を持たないURLには適用されません。

```json
[
  {
    "id": "user.example-shorten",
    "name": "Example: 短縮形に変換",
    "stage": "global",
    "match": { "hosts": ["www.example.com"], "pathPattern": "^\\/watch$", "hasParams": ["v"] },
    "actions": {
      "setHost": "exmpl.co",
      "setPath": "/${v}",
      "queryMode": "keepOnly",
      "queryParams": ["t"]
    }
  }
]
```

### 独自のトラッキングパラメータを全サイトから消す

```json
[
  {
    "id": "user.extra-tracking",
    "name": "追加のトラッキングパラメータ",
    "stage": "global",
    "match": {},
    "actions": { "queryMode": "remove", "queryParams": ["spm", "scm", "ref_src"] }
  }
]
```

## 組み込みルール

`src/rules/` にサイトごとのファイルとして置かれています。どれも上記と同じスキーマで書かれているので、実例として参照できます。

| ID | ファイル | 内容 |
|---|---|---|
| `builtin.amazon.product` | `src/rules/amazon.ts` | 商品URLを `/dp/<ASIN>` に短縮 |
| `builtin.x.status` | `src/rules/x.ts` | 投稿URLのクエリを全削除 |
| `builtin.youtube.short` | `src/rules/youtube.ts` | `youtu.be/<id>` を正規化 |
| `builtin.youtube.embed-playlist` | `src/rules/youtube.ts` | `embed/videoseries?list=<id>` を再生リストページに変換 |
| `builtin.youtube.video-path` | `src/rules/youtube.ts` | Shorts・Live・埋め込みを動画URLに変換 |
| `builtin.youtube.watch` | `src/rules/youtube.ts` | `v`/`t`/`list` 以外のパラメータを削除 |
| `builtin.youtube.playlist` | `src/rules/youtube.ts` | 再生リストURLから `list` 以外を削除 |
| `builtin.youtube.shorten` | `src/rules/youtube.ts` | `youtube.com/watch?v=<id>` を `youtu.be/<id>` に短縮(`global`、**既定で無効**) |
| `builtin.meet.code` | `src/rules/meet.ts` | 会議URL(`xxx-yyyy-zzz`)のクエリを全削除 |
| `builtin.meet.lookup` | `src/rules/meet.ts` | `lookup/<エイリアス>` URLのクエリを全削除 |
| `builtin.figma.slug` | `src/rules/figma.ts` | ファイル名スラッグと共有トークンを除去(`node-id`・`m`・`ready-for-dev`・`version-id`・プロトタイプ再生用パラメータは保持)。`/design/`・`/proto/`・`/board/`・`/slides/`・`/deck/`・`/site/`・`/buzz/`・`/make/`・`/file/` が対象 |
| `builtin.figma.share-token` | `src/rules/figma.ts` | 上記に当てはまらないFigma URLから、同じ保持対象以外を除去(パスは変更しない) |
| `builtin.generic.tracking` | `src/rules/generic.ts` | `utm_*`・`gclid`・`fbclid` などを全URLから除去 |

組み込みルールは設定画面から有効/無効を切り替えられます(編集はできません)。挙動を変えたい場合は、組み込みルールを無効にしたうえで同じサイトを対象にした自分のルールを作ってください。

ほとんどの組み込みルールは既定で有効です。既定で無効にしたいルールは、そのIDを `src/rules/index.ts` の `defaultDisabledBuiltinRuleIds` に加えます。ローカルストレージには「無効にしたルールのID」だけが保存される仕組み(そのため新しい組み込みルールは既定で有効になる)なので、`defaultDisabledBuiltinRuleIds` のIDは初回ロード時に一度だけ無効リストへ書き込まれ、適用済みであることが別のキーに記録されます。ユーザがあとから有効にした状態はそのまま維持されます(`src/lib/ruleStore.ts` の `seedDefaultDisabledRuleIds`)。
