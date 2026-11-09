# ストア公開手順

[Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store) に沿った、
Raycast Store公開までの手順と現状のチェックリスト。

## 済んでいるもの

リポジトリ側で対応が完了している項目。

| 項目 | 状態 |
|---|---|
| `name` がケバブケース (`multiple-quicklink`) | ✅ |
| `title` がタイトルケース (`Multiple Quicklink`) | ✅ |
| `description` が拡張の機能を説明している | ✅ |
| `icon` が512×512pxのPNG (`assets/icon.png`) | ⚠️ 仮アイコン。下記参照 |
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
| コマンドの引数にプレースホルダーがある | ✅ |
| 読み込み中に「No results」がちらつかない | ✅ |
| 外部アナリティクスを含まない | ✅ |
| Keychainアクセスを要求しない | ✅ |
| バイナリ依存を同梱していない | ✅ |
| 未使用の依存がない | ✅ |
| エラーが未処理の例外ではなくトーストとして表示される | ✅ |
| `console.log` などのデバッグ出力が残っていない | ✅ |
| `npm run test` / `tsc --noEmit` / ESLint / Prettier が通る | ✅ |

### 仮アイコンの差し替え(公開前必須)

`assets/icon.png` は要件(512×512pxのPNG)を満たすだけの仮のもので、意匠として作り込まれていません。
公開前に本番用のアイコンへ差し替えてください。差し替え後、下記の「アイコンのライト/ダーク確認」も行います。

`author` はRaycastアカウントのユーザー名である必要がある。GitHubのユーザー名と同じとは限らないため、
`npm run lint` を実機で通して検証すること。`src/lib/deeplink.ts` の `AUTHOR_NAME` も同じ値を使っており、
ここが実際のアカウント名と食い違うと、ユーザーが作ったQuicklinkがどこにも届かなくなる。

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

   - `Search Multiple Quicklinks` のセット一覧(複数のセットが並んでいる状態)
   - セット作成フォームと Opens プレビュー欄
   - `Create Quicklink for This Set` から開いたRaycastの Create Quicklink 画面

   すべて同じ背景・同じテーマで撮ること。背景を変えたり、ライト/ダークを混ぜたりしない。

3. **アイコンのライト/ダーク確認**

   本番アイコンに差し替えたうえで、**ライトテーマとダークテーマの両方で見栄えするか**を実機で確認する
   (Raycast Preferences → Appearance で切り替え)。片方でしか成立しない場合は、`package.json` の
   manifest でライト/ダーク別アイコンを設定する。

4. **deeplinkの確認ダイアログの実測**

   [Deeplinks](https://developers.raycast.com/information/lifecycle/deeplinks) には、deeplinkから
   コマンドを実行する際に確認を求めると書かれている。毎回なのか初回だけなのか、Quicklink経由でも出るのかで
   この拡張の使い勝手が変わるため、実機で確認し `README.md` の記述を確定させる
   ([E2Eテストシナリオ](e2e-test-scenarios.md) の該当項目)。

5. **E2E確認**

   [E2Eテストシナリオ](e2e-test-scenarios.md) を実機で一通り流す。

6. **Windows実機での確認(公開前必須)**

   `platforms` に `"Windows"` を宣言している以上、Windows版Raycastでの動作確認は公開の前提条件。
   Windows機に Raycast for Windows を入れ、同じリポジトリで `npm ci && npm run dev` を実行して確認する。

   - 拡張が取り込まれ、`Search Multiple Quicklinks` と `Open Multiple Quicklink` がルート検索に出る
     (`platforms` に `"Windows"` が入っていないとここで落ちる)
   - `C:\...` 形式の絶対パスを含むセットが開ける
   - `Ctrl+N`(作成)・`Ctrl+E`(編集)・`Ctrl+D`(複製)・`Ctrl+Shift+C`(deeplinkのコピー)が効く
   - [E2Eテストシナリオ](e2e-test-scenarios.md) をキーを読み替えて一通り流す

   ここが通らないうちは `platforms` から `"Windows"` を外して公開すること。

7. **公開**

   ```sh
   npm run publish   # npx @raycast/api@latest publish
   ```

   [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension) のとおり、
   これが公開ストアへの標準的な手順。GitHub認証を求められたあと、
   [raycast/extensions](https://github.com/raycast/extensions) へのプルリクエストが自動で作成される。
   一度PRが開いたあとは、再度 `npm run publish` を実行すればコミットを追加できる。

   いずれの場合もRaycastチームのレビューを経てマージされ、ストアに自動掲載される。

## 公開後に固定になるもの

一度ストアに載せると、変更するとユーザーの環境が壊れるもの。

- コマンドの `name`(ホットキー割り当てが切れる)
- `src/lib/deeplink.ts` の `AUTHOR_NAME` / `EXTENSION_NAME` / `OPEN_COMMAND_NAME`
  (ユーザーが保存したQuicklinkの参照先が消える)
- セット名の照合方法(名前がQuicklink・deeplink・ホットキーの参照キーになっている)

詳細は [CLAUDE.md](../CLAUDE.md) を参照。
