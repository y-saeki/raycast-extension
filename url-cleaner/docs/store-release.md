# ストア公開手順

[Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store) に沿った、
Raycast Store公開までの手順と現状のチェックリスト。

## 済んでいるもの

リポジトリ側で対応が完了している項目。

| 項目 | 状態 |
|---|---|
| `name` がケバブケース (`url-cleaner`) | ✅ |
| `title` がタイトルケース (`URL Cleaner`) | ✅ |
| `description` が拡張の機能を説明している | ✅ |
| `icon` が512×512pxのPNG (`assets/icon.png`) | ✅ |
| `categories` が有効な値 (`Productivity`, `Web`) | ✅ |
| `keywords` によるストア内検索対応 | ✅ |
| `author` がRaycastのユーザー名 (`y-saeki`) | ✅ |
| `license` が `MIT` かつ `LICENSE` ファイルがある | ✅ |
| `CHANGELOG.md` が `## [Initial Version] - {PR_MERGE_DATE}` 形式 | ✅ |
| コマンドの `name` が `src/` のファイル名と一致 | ✅ |
| コマンドの `title` がタイトルケースで拡張名を繰り返していない | ✅ |
| UI文言・トースト・HUDが英語で統一されている | ✅ |
| 未使用の依存がない | ✅ |
| エラーが未処理の例外ではなくトーストとして表示される | ✅ |
| `console.log` などのデバッグ出力が残っていない | ✅ |
| `npm run test` / `tsc --noEmit` / Prettier が通る | ✅ |

## macOSの実機で行うもの

Raycast本体が必要なため、このリポジトリのCIでは検証できない項目。

1. **ビルドとlint**

   ```sh
   npm install
   npm run build   # ray build
   npm run lint    # ray lint
   ```

   `ray` CLIはmacOSのRaycastアプリと通信するため、macOS以外では実行できない。

2. **スクリーンショット**

   `metadata/` ディレクトリに **2000×1250px** のPNGを最大6枚置く。ファイル名は
   `url-cleaner-1.png` のように連番にする。Raycastを開いた状態で `⌘⇧,`(Window Capture)
   を使うと、この解像度で撮影できる。

   最低限撮っておきたいもの:

   - `Manage URL Rules` のルール一覧(組み込みルールが並んでいる状態)
   - ルール作成フォームとプレビュー欄
   - `Clean URL from Clipboard` 実行後のHUD

3. **E2E確認**

   [E2Eテストシナリオ](e2e-test-scenarios.md) を実機で一通り流す。

4. **公開PR**

   Raycast Storeへの公開は [raycast/extensions](https://github.com/raycast/extensions) への
   プルリクエストで行う。`url-cleaner/` 以下を fork した `extensions/url-cleaner/` に配置して
   PRを出す。Raycastチームのレビュー後にマージされ、ストアに掲載される。

   なおこのリポジトリは開発用の置き場であり、`npm run publish`
   (`npx @raycast/api@latest publish`) はOrganization Store向けのコマンドで、
   公開ストアへの掲載には使わない。

## 公開後に固定になるもの

一度ストアに載せると、変更するとユーザーの環境が壊れるもの。

- コマンドの `name`(ホットキー割り当てが切れる)
- ルールの `id`(有効/無効の状態がidに紐づいている)

詳細は [CLAUDE.md](../CLAUDE.md) を参照。
