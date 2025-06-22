// ...existing code...
// gcloud自動化スクリプト: APIキー/OAuthクライアント生成
// bash check-env.sh でgcloudが検出された場合のみ利用
// 失敗時は手動案内

# 1. プロジェクト作成/選択
gcloud projects describe test 2>/dev/null || gcloud projects create test

gcloud config set project test

# 2. YouTube Data API v3 有効化
gcloud services enable youtube.googleapis.com

# 3. APIキー作成
gcloud iam service-accounts create yt-ext-sa --display-name="YouTubeExtSA" || true
gcloud iam service-accounts keys create /tmp/yt-ext-key.json --iam-account=yt-ext-sa@test.iam.gserviceaccount.com || true
gcloud services enable iamcredentials.googleapis.com
API_KEY=$(gcloud alpha services api-keys create --display-name="yt-ext-key" --format="value(keyString)")
mkdir -p src/credentials
echo "{\"apiKey\": \"$API_KEY\"}" > src/credentials/apiKey.json

echo "APIキー: $API_KEY"

# 4. OAuth2クライアント作成
gcloud auth application-default login || true
OAUTH_JSON=$(gcloud alpha iam service-accounts credentials create --iam-account=yt-ext-sa@test.iam.gserviceaccount.com --format=json)
echo "$OAUTH_JSON" > src/credentials/oauth.json

echo "OAuth2クライアント情報を src/credentials/oauth.json に保存しました。"
