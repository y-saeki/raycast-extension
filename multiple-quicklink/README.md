# Multiple Quicklink

複数のリンクをまとめて開くRaycast拡張です。1つの「セット」にURL・ローカルのファイルパス・`raycast://` のdeeplinkを好きな順で並べておき、1回の操作で上から順に開きます。

Raycast標準の[Quicklink](https://manual.raycast.com/quicklinks)は1コマンドで1つの対象しか開けません。この拡張はそこだけを拡張したもので、使い勝手は標準のQuicklinkに揃えています。

macOSとWindowsの両方に対応しています。以下のキー表記は `⌘N`(macOS)/ `Ctrl+N`(Windows)のように併記しています。

## コマンド

- **Search Multiple Quicklinks** (`view`): 保存したセットの一覧です。選んでEnterで一括起動でき、セットの作成・編集・複製・削除もここから行います。
- **Open Multiple Quicklink** (`no-view`): セット名を引数に取り、そのセットを直接開きます。後述のQuicklink/deeplink経由の起動で使われる着地点です。

## セットを作る

`Search Multiple Quicklinks` を開いて `⌘N` / `Ctrl+N` でフォームが開きます。項目は名前とリンクの2つだけです。

リンクは**1行に1つ**書きます。書いた順に上から開かれます。

```
https://github.com/y-saeki/raycast-extension
https://mail.google.com | Google Chrome
/Users/me/projects/notes.md
raycast://extensions/raycast/raycast/confetti
```

| 書き方 | 意味 |
|---|---|
| `https://example.com` | URL。スキーム(`https://` など)が必要です |
| `/Users/me/notes.md`・`~/notes.md`・`C:\Users\me\notes.md` | ローカルのファイルやフォルダ。絶対パスで書きます |
| `raycast://extensions/...` | Raycastのdeeplink。他の拡張のコマンドを混ぜられます |
| `<リンク> \| <アプリ名>` | そのリンクだけを指定したアプリで開きます。アプリ名・バンドルID・アプリの絶対パスが使えます |

`example.com` のようにスキームのないホスト名は、相対パスと区別がつかないためエラーになります。`https://` を付けてください。

フォーム下部の **Opens** に、各行がどう解釈され、どの順でどのアプリで開かれるかが表示されます。保存前にここで確認できます。

1つのセットに入れられるリンクは最大20個です。

一覧でセットを選んで `⌘D` / `Ctrl+D` を押すと、そのセットを複製した状態でフォームが開きます。複製元はそのまま残ります。

## ルート検索から1発で開く

Raycastの拡張は、保存したデータごとにルート検索の項目を増やすことができません。そこで、標準のQuicklinkに変換する導線を用意しています。

一覧でセットを選び、**Create Quicklink for This Set** を実行すると、そのセットを開くdeeplinkが入った状態でRaycastの `Create Quicklink` 画面が開きます。保存すれば、ふつうのQuicklinkとしてルート検索に並び、エイリアスやホットキーも割り当てられます。標準のQuicklinkと同じ使い勝手になるのはこの経路です。

deeplinkだけが欲しい場合は `⌘⇧C` / `Ctrl+Shift+C` でクリップボードにコピーできます。形式は次のとおりです。

```
raycast://extensions/y-saeki/multiple-quicklink/open-multiple-quicklink?arguments=%7B%22name%22%3A%22Morning%22%7D
```

> **注意:** Raycastの仕様上、deeplinkからコマンドを実行するときは確認を求められることがあります([Deeplinks](https://developers.raycast.com/information/lifecycle/deeplinks))。実機での挙動は `docs/e2e-test-scenarios.md` の確認項目に含めています。

セット名はdeeplinkがセットを引くキーなので、**大文字小文字を無視して一意**である必要があります。同名のセットは保存時に拒否されます。セット名を変えた場合、そのセットを指していたQuicklinkは作り直してください。

## 開く順序について

リンクは上から順に、1つずつ待ちながら開きます。間に約150msの待ちを挟んでいます。連続で開くと起動の速いアプリが遅いアプリを追い越して手前に来てしまい、並べた順序の意味がなくなるためです。

一部のリンクが開けなかった場合(パスが存在しない、deeplink先の拡張が入っていない等)でも残りは開きます。終了後に「3件中1件失敗」のようにまとめて表示されます。

## Dynamic Placeholderには対応していません

標準のQuicklinkが使える `{clipboard}` などの[Dynamic Placeholder](https://manual.raycast.com/dynamic-placeholders)には対応していません。RaycastはこれをQuicklink・Snippet・AI Command側の機能として提供しており、拡張から展開するAPIは公開されていないためです。

プレースホルダーが必要な単体のリンクは、標準のQuicklinkをそのまま使ってください。

## プライバシーとセキュリティ

- ネットワーク通信は一切行いません。保存も起動もすべてローカルで完結します。
- 読み書きするデータは、Raycastのローカルストレージに保存するセット(名前・リンク・開くアプリ名)だけです。
- 拡張の設定項目(preferences)はありません。
- リンクを開く操作はOSに委ねています。信頼できないリンクを保存しないでください。

## 開発

Node.js 22.14.0以上が必要です(`.nvmrc` は `22`)。

```sh
npm ci
npm run dev     # ray develop: Raycastに開発版として読み込ませる
npm test        # vitest
npx tsc --noEmit
npx eslint .
npx prettier --check .
```

`ray build` / `ray lint`(`npm run build` / `npm run lint`)はローカルのRaycastアプリと通信するため、Raycastのない環境では実行できません。

## 開発ドキュメント

- [リンクの書式](docs/link-schema.md)
- [E2Eテストシナリオ](docs/e2e-test-scenarios.md)
- [ストア公開手順](docs/store-release.md)
