# YouTube Oldest-First Playlist Chrome Extension

YouTubeチャンネルの全動画を「古い順」で新しいプレイリストに自動追加するChrome拡張です。

## 機能
- 任意のYouTubeチャンネルページで「Create Playlist」ボタンを押すと、そのチャンネルの全動画を古い順で新規プレイリストにまとめます
- APIキー・OAuthクライアント情報はUIから安全に入力・保存
- /channel/UCxxxx, /user/xxxx, /@handle すべてのURL形式に対応
- 進捗バー・エラーログ表示
- Google認証/OAuth自動化

## セットアップ
1. **環境要件**
   - Node.js 14.x以上, npm または yarn, TypeScript, Chrome, gcloud（任意）
2. `npm install`
3. `npm run check-env` で環境チェック
4. `npm run build` でTypeScriptビルド
5. `npm run zip` で `extension.zip` を生成
6. 拡張機能画面でドラック&ドロップ(開発者モードが必要な場合は有効化)

## APIキー・OAuthクライアントの取得
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials) でYouTube Data API v3を有効化し、APIキーとOAuthクライアントID(JSON)を取得
- 拡張のポップアップUIから入力・保存
- OAuthリダイレクトURIは `https://<拡張ID>.chromiumapp.org/` を許可リストに追加

## 使い方
1. YouTubeチャンネルページ（/channel/UCxxxx, /user/xxxx, /@handle）を開く
2. 拡張アイコンをクリックし「Create Playlist」ボタンを押す
3. Google認証後、古い順でプレイリストが自動生成され、URLが表示されます

## 注意事項
- `src/credentials/` ディレクトリは `.gitignore` で除外されています。APIキーやOAuth情報は絶対に公開しないでください。
- Google APIの利用制限・レート制限に注意してください。
- 本拡張は個人利用・学習用途を想定しています。
- copilot agent mode & chatGPT-4.1により作成しました。
- 本拡張に関連する損害に一切責任を負いません。

## ライセンス
MIT
