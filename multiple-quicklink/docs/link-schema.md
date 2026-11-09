# リンクの書式

セットに入れるリンクの書き方と、保存時に行われる検証の仕様。実装は `src/lib/linkSchema.ts` と
`src/lib/targetText.ts`、フォームは `src/components/QuicklinkForm.tsx`。

## テキスト形式

フォームの **Links** 欄は1行1リンクのテキストです。この形式を選んでいるのは、並び替えが行の入れ替えだけで
済み、リンクごとに子画面を開かなくてよいためです。

```
<リンク>
<リンク> | <アプリ>
```

- 空行は無視されます(エラーになりません)。
- 前後の空白は取り除かれます。
- 区切りは **行内で最後に現れる `|`** です。リンク側にクエリ文字列やdeeplinkの引数として `|` が
  含まれることはありますが、アプリ名に含まれることはないためです。

## リンクの種別

`classifyLink()` が次の順で判定します。どの種別でも最終的には `open()` に同じように渡されるため、
種別は一覧やエラーメッセージの表示にしか使われません。

| 種別 | 条件 | 例 |
|---|---|---|
| `deeplink` | `raycast://` で始まる | `raycast://extensions/raycast/raycast/confetti` |
| `url` | `^[a-z][a-z0-9+.-]*://` にマッチする | `https://example.com`、`slack://channel?team=T1` |
| `path` | `/`・`~/`・`~`・`C:\` `C:/` のいずれかで始まる | `/Users/me/notes.md`、`~/notes.md`、`C:\Users\me\notes.md` |

上のどれにも当てはまらない文字列は**不正**です。`example.com` や `notes/todo.md` のような
スキームのない文字列は、ホスト名なのか相対パスなのか判別できません。推測して片方に寄せると意図しない
ものが開くため、`https://` を付けるか絶対パスで書くよう促すエラーを返します。

## パスの展開

`~` / `~/…` は `resolveLink()` がホームディレクトリに展開してから `open()` に渡します。macOSでも
Windowsでも `open()` はパスをそのままOSに渡すだけで、シェルのような `~` の展開は行われないためです。
それ以外の文字列は一切書き換えません(URL内の `~` も対象外)。

## アプリの指定

`|` の右側は `open()` の第2引数にそのまま渡されます。指定できるのは
[Utilities](https://developers.raycast.com/api-reference/utilities) のとおり、アプリ名・バンドルID・
アプリバンドルの絶対パスです。省略した場合はOSの既定のアプリが開きます。

アプリ名はプラットフォームによって異なります(`Google Chrome` など)。macOSとWindowsの両方で使うセットは、
既定のアプリに任せるほうが移植しやすくなります。

## 検証規則

`parseQuicklink()` がセット全体を検証します。

| 対象 | 規則 |
|---|---|
| `id` | 必須。`set-` + UUID(`createQuicklinkId()`)|
| `name` | 必須。100文字以内 |
| `name` の一意性 | 大文字小文字を無視して重複不可(`saveQuicklink()` が検証)|
| `targets` | 1件以上、20件以下 |
| 各リンク | 上記の種別判定を通ること |
| セット数 | 200件まで |

リンクの上限を20件にしているのは、誤って大量の行を貼り付けたときにウィンドウが大量に開くのを防ぐためです。
セット名の一意性は、`Open Multiple Quicklink` が名前でセットを引く以上、重複するとdeeplinkとホットキーの
指す先が不定になるためです。

エラーメッセージは `name:` / `targets:` の接頭辞を持ち、フォーム側でその接頭辞を見て対応する入力欄に
インライン表示します(`ERROR_FIELDS`)。行番号は**内容のある行**を1から数えます。

## 保存されるデータ

```json
[
  {
    "id": "set-6f0c…",
    "name": "Morning Routine",
    "targets": [
      { "link": "https://mail.google.com", "application": "Google Chrome" },
      { "link": "/Users/me/projects/notes.md" }
    ]
  }
]
```

`LocalStorage` のキー `multipleQuicklinks` にこの配列をJSON文字列として保存します。読み出し時には
必ず `parseQuicklinks()` を通し、検証に通らなくなったセットは黙って除外します(壊れた保存内容で拡張が
起動しなくなることを避けるため)。
