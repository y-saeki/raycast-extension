# E2Eテストシナリオ

`Clean URL from Clipboard` / `Manage URL Rules` コマンドを実機のRaycastにインストールした状態で、手動で確認するためのシナリオ一覧です。実装済みのルール(`src/rules/`)に対応しています。

対象URL・テキストをクリップボードにコピーし、コマンド(またはホットキー)を実行して、期待結果と一致するか確認してください。確認したら該当項目にチェックを入れてください。

## 必須: Figmaの`t`パラメータ除去がリンクの有効性を壊さないか

- [ ] 実際のFigmaファイルの共有リンク(`node-id`と`t`付き)をコピー → コマンド実行 → 結果のリンクをブラウザで開いて、正しいファイル/ノードが開けることを確認する

`t`(共有トークン)がアクセスに必須なケースがあれば、`src/rules/figma.ts`のFigmaルールを見直す必要があります。

## 各サイトルールの基本動作

| # | クリップボードにコピーするもの | 期待される結果 | 確認 |
|---|---|---|---|
| 2 | Amazon商品ページのURL(長い商品名スラッグ + `ref=`付き) | `https://www.amazon.co.jp/dp/<ASIN>` に短縮 | [ ] |
| 3 | Xの投稿URL(`?s=20&t=...`付き) | クエリが全部消えて `.../status/<id>` だけになる | [ ] |
| 4 | `youtu.be/xxxx?si=...` 形式 | `https://youtu.be/xxxx` のまま短く保たれ、`si`が消える | [ ] |
| 5 | `youtube.com/watch?v=xxxx&si=...&t=42s` | `https://youtu.be/xxxx?t=42s` に短縮される | [ ] |
| 6 | FigJamボードのリンク(`node-id`+`t`付き) | `node-id`は残り`t`が消える | [ ] |

## YouTube(2段構成の確認)

| # | クリップボードにコピーするもの | 期待される結果 | 確認 |
|---|---|---|---|
| 4-1 | Shortsの共有URL(`youtube.com/shorts/xxxx?feature=share`) | `https://youtu.be/xxxx` になり、ブラウザで開くと同じ動画が再生される | [ ] |
| 4-2 | ライブ配信のURL(`youtube.com/live/xxxx?si=...`) | `https://youtu.be/xxxx` になり、同じ配信が開く | [ ] |
| 4-3 | 再生リスト再生中の動画URL(`watch?v=xxxx&list=PLyyy&index=3`) | `https://youtu.be/xxxx?list=PLyyy` になり、再生リスト付きで開く | [ ] |
| 4-4 | 再生リストページのURL(`youtube.com/playlist?list=PLyyy&si=...`) | `https://www.youtube.com/playlist?list=PLyyy`(youtube.comのまま) | [ ] |
| 4-5 | YouTube MusicのURL(`music.youtube.com/watch?v=xxxx&si=...`) | ホストが `music.youtube.com` のまま残り、`youtu.be`に変換されない | [ ] |
| 4-6 | `builtin.youtube.shorten` を無効化 → `youtube.com/shorts/xxxx` をクリーン | `https://www.youtube.com/watch?v=xxxx` になる(短縮されない) | [ ] |

## 汎用パラメータ除去(サイト固有ルール未対応のドメイン)

| # | 内容 | 期待結果 | 確認 |
|---|---|---|---|
| 7 | 適当なブログ記事URLに`?utm_source=x&utm_medium=y`を手動付与 | `utm_*`が消えて他のクエリは残る | [ ] |
| 8 | `?fbclid=...`や`?gclid=...`を付けたURL | 該当パラメータのみ消える | [ ] |

## エッジケース(HUDメッセージ含めて確認)

| # | 内容 | 期待結果 | 確認 |
|---|---|---|---|
| 9 | 既にクリーンなURL(例: `https://example.com/page?id=1`) | 変化なし。HUD「URLが見つからないか、変更はありませんでした」。クリップボードも書き換わらない | [ ] |
| 10 | URLを含まない普通のテキスト | 同上のHUD | [ ] |
| 11 | クリップボードを空にした状態 | HUD「クリップボードが空です」 | [ ] |
| 12 | 文章中にAmazon URLが埋め込まれたテキスト(例: 「これ見て https://amazon.co.jp/.../dp/XXXX?ref=xxx 良さそう」) | URL部分だけ置換され、前後の文章はそのまま | [ ] |
| 13 | 上記のようなテキストで、文末の句点直後にURLがある場合 | 句読点を巻き込まずURLだけ正しく置換される | [ ] |
| 14 | 1つのテキストにYouTubeリンクとXリンクが両方含まれる | 両方とも正しく変換される | [ ] |
| 15 | 画像だけがクリップボードに入っている状態(テキストなし) | エラーにならず「クリップボードが空です」的な扱いになる | [ ] |

## 運用まわり

| # | 内容 | 期待結果 | 確認 |
|---|---|---|---|
| 16 | 割り当てたグローバルホットキーを、Raycastを開かず他のアプリ(ブラウザ等)からいきなり押す | Raycastウィンドウを開かなくてもコマンドが実行され、HUDだけ出る | [ ] |
| 17 | Preferences「Exit After Cleaning」をONにした場合/OFFのままの場合 | ONだと実行後にRaycastの検索バーがクリアされて根本画面に戻る、OFFだと特に何もしない | [ ] |

## 設定画面 (`Manage URL Rules`)

| # | 内容 | 期待結果 | 確認 |
|---|---|---|---|
| 18 | コマンドを開く | 「Built-in Rules」に組み込みルール11件が全て有効(緑チェック)で並ぶ。「Your Rules」は空 | [ ] |
| 19 | `builtin.amazon.product`(Amazon)を選んでEnterで無効化 → Amazon商品URLをコピーしてクリーン | `/dp/<ASIN>` への短縮が行われず、`utm_*`等の汎用パラメータ除去だけが効く | [ ] |
| 20 | 上記ルールを再度有効化 → 同じURLをクリーン | シナリオ#2と同じ結果に戻る | [ ] |
| 21 | `builtin.generic.tracking` を無効化 → `?utm_source=x` 付きURLをクリーン | `utm_source`が残る(HUDは「変更はありませんでした」) | [ ] |
| 22 | `⌘N` でルール作成。Hosts に `note.com`、Query Mode に `Remove`、Query Params に `from` を入力 | Test URLに `https://note.com/xxx?from=a&id=1` を入れるとプレビューが `?id=1` を示す | [ ] |
| 22-1 | `⌘N` でルール作成。Hosts に `example.com`、Has Params に `v`、Set Path に `/${v}` を入力 | Test URLに `https://example.com/watch?v=abc` を入れるとプレビューが `https://example.com/abc` を示し、`?v=` のないURLでは変化しない | [ ] |
| 23 | 上記ルールを保存 → 一覧に戻る | 「Your Rules」セクションに追加され、有効状態で表示される | [ ] |
| 24 | 作成したルールが効くURLをコピーしてクリーン | ルールどおりに変換される | [ ] |
| 25 | 必須項目を空にして保存しようとする | 該当フィールドにインラインエラーが出て保存されない | [ ] |
| 26 | 壊れた正規表現(例: `^\/([a-z`)をPath Patternに入れて保存 | 正規表現が不正である旨のエラーが出て保存されない | [ ] |
| 27 | `⌘⇧E` でエクスポート → テキストエディタに貼り付け | 作成したルールがJSON配列として出力される | [ ] |
| 28 | 上記JSONをそのままコピーし直して `⌘⇧I` でインポート | 「0 added, 1 replaced」となり、ルールが重複しない | [ ] |
| 29 | JSONでない文字列をコピーして `⌘⇧I` | エラーが表示され、既存のルールは壊れない | [ ] |
| 30 | 自分のルールを `⌃X` で削除 | 確認ダイアログが出て、OKすると一覧から消える | [ ] |
| 31 | 組み込みルールを選択した状態でアクションパネルを開く | Edit Rule / Delete Rule が表示されない(組み込みは編集不可) | [ ] |
| 32 | 「Reset to Defaults」を実行 | 確認ダイアログの後、自分のルールが全削除され、組み込みルールが全て有効に戻る | [ ] |
| 33 | ルールを無効化・追加した状態でRaycastを再起動し、再度コマンドを開く | 有効/無効の状態と自分のルールが保持されている | [ ] |
