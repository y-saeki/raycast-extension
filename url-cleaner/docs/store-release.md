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
| `platforms` を明示している (`["macOS", "Windows"]`) | ✅ |
| `keywords` によるストア内検索対応 | ✅ |
| `author` がRaycastのユーザー名 (`y-saeki`) | ⚠️ 要確認 |
| `@raycast/api` が最新版 (1.104.24) | ✅ |
| `package-lock.json` をコミットしている | ✅ |
| `license` が `MIT` かつ `LICENSE` ファイルがある | ✅ |
| `CHANGELOG.md` が `## [Initial Version] - {PR_MERGE_DATE}` 形式 | ✅ |
| コマンドの `name` が `src/` のファイル名と一致 | ✅ |
| コマンドの `title` がタイトルケースで拡張名を繰り返していない | ✅ |
| Action PanelのアクションがタイトルケースでアイコンつきAPI | ✅ |
| UI文言・トースト・HUDがUS英語で統一されている | ✅ |
| フォームの全項目にプレースホルダーがある | ✅ |
| 読み込み中に「No results」がちらつかない | ✅ |
| 外部アナリティクスを含まない | ✅ |
| Keychainアクセスを要求しない | ✅ |
| バイナリ依存を同梱していない | ✅ |
| 未使用の依存がない | ✅ |
| エラーが未処理の例外ではなくトーストとして表示される | ✅ |
| `console.log` などのデバッグ出力が残っていない | ✅ |
| `npm run test` / `tsc --noEmit` / Prettier が通る | ✅ |

`author` はRaycastアカウントのユーザー名である必要がある。GitHubのユーザー名と同じとは限らないため、
`npm run lint` を実機で通して検証すること。

Raycastはローカライズに対応しておらずUS英語のみをサポートするため、UI文言の英語統一は
[ガイドライン上の要件](https://developers.raycast.com/basics/prepare-an-extension-for-store)
(「Localization / Language」の節)でもある。

`platforms` は省略すると `["macOS"]` 扱いになり、Windows版Raycastが拡張を受け付けない
([Manifest](https://developers.raycast.com/information/manifest) /
[Changelog 1.103.0](https://developers.raycast.com/misc/changelog))。この拡張はネイティブ依存を
持たないため両方を宣言しているが、Raycastは「Windowsで実際にテストしたものだけをWindows対応として
公開する」方針なので、**下記のWindows実機確認をストア公開前に必ず通すこと**。

## Raycast実機で行うもの

`ray` CLIがローカルのRaycastアプリと通信するため、このリポジトリのCIでは検証できない項目。

1. **ビルドとlint**

   ```sh
   npm install
   npm run build   # ray build
   npm run lint    # ray lint
   ```

   `ray` CLIはローカルにインストールされたRaycastアプリと通信するため、Raycastのない環境
   (CIのコンテナなど)では実行できない。macOSでもWindowsでも、Raycastが動いている実機で行う。

2. **スクリーンショット**

   `metadata/` ディレクトリに **2000×1250px (16:10) のPNG** を置く。最大6枚、**3枚以上が推奨**。
   先に `metadata/` ディレクトリを手で作っておく必要がある。

   撮影はRaycastの Window Capture(v2では `Capture Window` コマンド)にホットキーを割り当て、
   拡張を開発モードで開いた状態で実行し、`Save to Metadata` にチェックを入れる。

   最低限撮っておきたいもの:

   - `Manage URL Rules` のルール一覧(組み込みルールが並んでいる状態)
   - ルール作成フォームとプレビュー欄
   - インポート時の確認ダイアログ

   すべて同じ背景・同じテーマで撮ること。背景を変えたり、ライト/ダークを混ぜたりしない。

3. **アイコンのライト/ダーク確認**

   `assets/icon.png` は512×512pxのPNGで要件を満たしているが、**ライトテーマとダークテーマの
   両方で見栄えするか**は実機での確認が必要(Raycast Preferences → Appearance で切り替え)。
   片方でしか成立しない場合は、`package.json` の manifest でライト/ダーク別アイコンを設定する。

4. **E2E確認**

   [E2Eテストシナリオ](e2e-test-scenarios.md) を実機で一通り流す。

5. **Windows実機での確認(公開前必須)**

   `platforms` に `"Windows"` を宣言している以上、Windows版Raycastでの動作確認は公開の前提条件。
   Windows機に Raycast for Windows を入れ、同じリポジトリで `npm ci && npm run dev` を実行して確認する。

   - 拡張が取り込まれ、`Clean URL from Clipboard` と `Manage URL Rules` がルート検索に出る
     (`platforms` に `"Windows"` が入っていないとここで落ちる)
   - `Clean URL from Clipboard` がクリップボードのURLをクリーンにする
   - `Manage URL Rules` で `Ctrl+N`(作成)・`Ctrl+D`(複製)・`Ctrl+Shift+E`(エクスポート)・
     `Ctrl+Shift+I`(インポート)が効く
   - [E2Eテストシナリオ](e2e-test-scenarios.md) をキーを読み替えて一通り流す

   ここが通らないうちは `platforms` から `"Windows"` を外して公開すること。

6. **公開**

   ```sh
   npm run publish   # npx @raycast/api@latest publish
   ```

   [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension) のとおり、
   これが公開ストアへの標準的な手順。GitHub認証を求められたあと、
   [raycast/extensions](https://github.com/raycast/extensions) へのプルリクエストが自動で作成される。
   一度PRが開いたあとは、再度 `npm run publish` を実行すればコミットを追加できる。

   手動で行いたい場合は、公式ドキュメントに「Alternative way」として、
   raycast/extensions を fork して `extensions/url-cleaner/` に配置しPRを出す手順も記載されている。

   いずれの場合もRaycastチームのレビューを経てマージされ、ストアに自動掲載される。

   なお同じ `npm run publish` は、`package.json` に `owner`(組織ハンドル)を設定すると
   Organization Storeへの非公開公開になる
   ([Publish a Private Extension](https://developers.raycast.com/teams/publish-a-private-extension))。
   このリポジトリでは `owner` を設定しないため、公開ストア向けの動作になる。

   公開前に、他人のコントリビュートやGitHub上での直接編集を取り込む必要がある場合は
   `npx @raycast/api@latest pull-contributions` を実行する。

## 公開後に固定になるもの

一度ストアに載せると、変更するとユーザーの環境が壊れるもの。

- コマンドの `name`(ホットキー割り当てが切れる)
- ルールの `id`(有効/無効の状態がidに紐づいている)

詳細は [CLAUDE.md](../CLAUDE.md) を参照。
