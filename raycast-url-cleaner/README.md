# URL Cleaner

クリップボード内のURLからトラッキングパラメータを除去し、サイトごとのルールでシンプルな形に正規化するRaycast拡張です。

## コマンド

- **Clean Link from Clipboard** (`no-view`): クリップボードのテキストからURLを検出し、その場でクリーンな状態に書き換えます。Raycastの設定でグローバルホットキー(例: `Cmd+Shift+U`)を割り当てて使うことを想定しています。

## サイト固有ルール

| サイト | 変換内容 |
|---|---|
| Amazon | 商品名スラッグや`ref`等を除去し `/dp/<ASIN>` の短い形に正規化 |
| X (Twitter) | ステータスURLのクエリパラメータを全削除 |
| YouTube | `youtu.be/<id>` を `youtube.com/watch?v=<id>` に正規化。`v`/`t`以外のパラメータを削除 |
| Figma / FigJam | `node-id` を保持しつつ、共有トークン(`t`)等を削除 |

上記に該当しないドメインには、`utm_*`・`gclid`・`fbclid`などの汎用トラッキングパラメータのブロックリストを適用します。

## 開発

```sh
npm install
npm run dev    # Raycast開発モードで起動
npm run test   # ルールのユニットテスト
npm run lint
```
