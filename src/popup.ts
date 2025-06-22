// popup.ts: 拡張機能のポップアップUIロジック
declare const chrome: any;

const btn = document.getElementById('createPlaylistBtn') as HTMLButtonElement;
const log = document.getElementById('statusLog') as HTMLDivElement;

// APIキー/OAuth設定UI
const apiKeyInput = document.createElement('input');
apiKeyInput.type = 'text';
apiKeyInput.placeholder = 'APIキーを入力';
apiKeyInput.id = 'apiKeyInput';
const apiKeySaveBtn = document.createElement('button');
apiKeySaveBtn.textContent = 'APIキー保存';

const oauthInput = document.createElement('input');
oauthInput.type = 'file';
oauthInput.accept = '.json';
oauthInput.id = 'oauthInput';
const oauthSaveBtn = document.createElement('button');
oauthSaveBtn.textContent = 'OAuthクライアントJSON保存';

// 進捗バーUI
const progressBar = document.createElement('progress');
progressBar.id = 'progressBar';
progressBar.max = 1;
progressBar.value = 0;
progressBar.style.width = '100%';
log.parentElement?.insertBefore(progressBar, log);
progressBar.style.display = 'none';

function appendLog(msg: string) {
  log.innerHTML += `<div>${msg}</div>`;
}

function showCredentialGuide() {
  log.innerHTML = `<b>APIキー/OAuthクライアントIDが未設定です。</b><br>
  <a href='https://console.cloud.google.com/apis/credentials' target='_blank'>Google Cloud Consoleで取得</a>し、下記で設定してください。<br>`;
  log.appendChild(apiKeyInput);
  log.appendChild(apiKeySaveBtn);
  log.appendChild(document.createElement('br'));
  log.appendChild(oauthInput);
  log.appendChild(oauthSaveBtn);
  // 保存済み値の復元
  chrome.storage.sync.get(['apiKey'], (result: { apiKey?: string }) => {
    if (result.apiKey) apiKeyInput.value = result.apiKey;
  });
}

apiKeySaveBtn.onclick = async () => {
  const key = apiKeyInput.value.trim();
  if (!key) return alert('APIキーを入力してください');
  await chrome.storage.sync.set({ apiKey: key });
  alert('APIキーを保存しました');
};

oauthSaveBtn.onclick = async () => {
  const file = oauthInput.files?.[0];
  if (!file) return alert('OAuthクライアントJSONを選択してください');
  const text = await file.text();
  await chrome.storage.sync.set({ oauthJson: text });
  alert('OAuthクライアント情報を保存しました');
};

// APIキー/OAuth設定チェック
async function checkCredentials(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'oauthJson'], (result: { apiKey?: string, oauthJson?: string }) => {
      const apiKey = result.apiKey;
      const oauthJson = result.oauthJson;
      if (!apiKey || !oauthJson) {
        return resolve(false);
      }
      try {
        let oauth: any;
        try {
          oauth = JSON.parse(oauthJson);
        } catch {
          alert('OAuth JSONパースエラー');
          return resolve(false);
        }
        // GoogleのOAuthクライアントJSONは"installed"や"web"プロパティ配下にclient_idがある場合がある
        let clientId = oauth.client_id;
        if (!clientId && oauth.installed) clientId = oauth.installed.client_id;
        if (!clientId && oauth.web) clientId = oauth.web.client_id;
        if (!apiKey || apiKey === 'YOUR_API_KEY') {
          alert('APIキー不整合エラー');
          return resolve(false);
        }
        if (!clientId || clientId === 'YOUR_CLIENT_ID') {
          alert('クライアント不整合IDエラー');
          return resolve(false);
        }
        resolve(true);
      } catch {
        resolve(false);
      }
    });
  });
}

btn.addEventListener('click', async () => {
  if (!(await checkCredentials())) {
    await showCredentialGuide();
    return;
  }
  appendLog('チャンネル情報を取得中...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url) throw new Error('タブURL取得失敗');
    // チャンネル識別子抽出
    const channelIdent = extractChannelIdentifier(tab.url);
    if (!channelIdent) throw new Error('YouTubeチャンネルページで実行してください');
    appendLog(`Channel: ${channelIdent.type} = ${channelIdent.value}`);
    // 認証トークン取得
    const token = await getAuthToken();
    // API呼び出し
    const playlistUrl = await createOldestFirstPlaylist(token, channelIdent);
    appendLog(`<a href='${playlistUrl}' target='_blank'>プレイリストを開く</a>`);
  } catch (e: any) {
    appendLog('エラー: ' + e.message);
  }
});

// チャンネル識別子抽出: /channel/UCxxxx, /user/xxxx, /@handle すべて対応
function extractChannelIdentifier(url: string): { type: 'channel' | 'user' | 'handle', value: string } | null {
  const channelMatch = url.match(/youtube\.com\/(channel)\/([\w-]+)/);
  if (channelMatch) return { type: 'channel', value: channelMatch[2] };
  const userMatch = url.match(/youtube\.com\/(user)\/([\w-]+)/);
  if (userMatch) return { type: 'user', value: userMatch[2] };
  // 日本語・全角・特殊文字ハンドル対応
  const atMatch = url.match(/youtube\.com\/@([^/?#]+)/);
  if (atMatch) return { type: 'handle', value: decodeURIComponent(atMatch[1]) };
  return null;
}

// 拡張IDからchromiumapp.orgリダイレクトURIを自動生成
function getExtensionRedirectUri(): string {
  const extId = chrome.runtime.id;
  return `https://${extId}.chromiumapp.org/`;
}

// getAuthTokenのコールバック型を明示
async function getAuthToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['oauthJson'], (result: { oauthJson?: string }) => {
      let clientId = '';
      let redirectUri = getExtensionRedirectUri();
      if (result.oauthJson) {
        try {
          const oauth = JSON.parse(result.oauthJson);
          if (oauth.web) {
            clientId = oauth.web.client_id;
          } else if (oauth.installed) {
            clientId = oauth.installed.client_id;
          } else {
            clientId = oauth.client_id || '';
          }
        } catch { }
      }
      chrome.runtime.sendMessage({ type: 'getAuthToken', clientId, redirectUri }, (res: any) => {
        if (res?.token) resolve(res.token);
        else {
          // 認証失敗時にリダイレクトURIを案内
          appendLog(`<b>認証失敗: Google Cloud ConsoleのOAuthクライアント設定で<br>リダイレクトURI <code>${redirectUri}</code> を承認済みに追加してください。</b>`);
          reject(new Error(res?.error || '認証失敗'));
        }
      });
    });
  });
}

// チャンネルID種別ごとにAPIリクエスト分岐
async function createOldestFirstPlaylist(token: string, channelIdent: { type: 'channel' | 'user' | 'handle', value: string }): Promise<string> {
  const { apiKey, oauthJson } = await new Promise<any>(resolve => {
    chrome.storage.sync.get(['apiKey', 'oauthJson'], resolve);
  });
  if (!apiKey || !oauthJson) throw new Error('APIキーまたはOAuth情報が未設定です');
  const oauth = JSON.parse(oauthJson);

  let channelId = '';
  let channelName = '';
  // 1. チャンネルID取得
  if (channelIdent.type === 'channel') {
    channelId = channelIdent.value;
  } else if (channelIdent.type === 'user') {
    // /user/xxxx → forUsername=xxxx で取得
    const userRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forUsername=${encodeURIComponent(channelIdent.value)}&key=${apiKey}`);
    if (!userRes.ok) throw new Error('ユーザー名からチャンネルID取得失敗');
    const userData = await userRes.json();
    channelId = userData.items?.[0]?.id;
    channelName = userData.items?.[0]?.snippet?.title || '';
    if (!channelId) throw new Error('ユーザー名からチャンネルID取得失敗');
  } else if (channelIdent.type === 'handle') {
    // /@handle → search APIでチャンネルID取得
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=@${encodeURIComponent(channelIdent.value)}&key=${apiKey}`);
    if (!searchRes.ok) throw new Error('ハンドル名からチャンネルID取得失敗');
    const searchData = await searchRes.json();
    channelId = searchData.items?.[0]?.snippet?.channelId || searchData.items?.[0]?.id?.channelId;
    channelName = searchData.items?.[0]?.snippet?.title || '';
    if (!channelId) throw new Error('ハンドル名からチャンネルID取得失敗');
  }

  // 2. チャンネル情報取得
  const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${apiKey}`);
  if (!channelRes.ok) throw new Error('チャンネル情報取得失敗');
  const channelData = await channelRes.json();
  const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!channelName) channelName = channelData.items?.[0]?.snippet?.title || 'channel';
  if (!uploadsId) throw new Error('アップロード動画リストID取得失敗');
  appendLog('アップロード動画リストID取得完了');
  // 2. 全動画ID収集
  let videoIds: string[] = [];
  let nextPageToken = '';
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('動画リスト取得失敗');
    const data = await res.json();
    videoIds.push(...(data.items?.map((i: any) => i.contentDetails.videoId) || []));
    nextPageToken = data.nextPageToken || '';
  } while (nextPageToken);
  appendLog("アップロード動画リスト取得完了");
  // 古い順に並べ替え（APIは新しい順で返すため）
  videoIds = videoIds.reverse();
  // 3. プレイリスト作成
  const playlistRes = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      snippet: {
        title: `${channelName} – oldest first`,
        description: `元チャンネル: https://www.youtube.com/channel/${channelId}`
      },
      status: { privacyStatus: 'private' }
    })
  });
  if (!playlistRes.ok) throw new Error('プレイリスト作成失敗');
  const playlist = await playlistRes.json();
  const playlistId = playlist.id;
  appendLog("プレイリスト作成開始...");

  // 進捗バー表示
  progressBar.max = videoIds.length;
  progressBar.value = 0;
  progressBar.style.display = '';

  // 4. 各動画を順に追加（レート制限対応: 1秒待機&リトライ）
  for (let i = 0; i < videoIds.length; i++) {
    const videoId = videoIds[i];
    let retry = 0;
    while (retry < 5) {
      const itemRes = await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            playlistId,
            resourceId: { kind: 'youtube#video', videoId }
          }
        })
      });
      if (itemRes.ok) break;
      if ([403, 429].includes(itemRes.status)) {
        await new Promise(r => setTimeout(r, 2 ** retry * 1000));
        retry++;
      } else {
        throw new Error('動画追加失敗: ' + (await itemRes.text()));
      }
    }
    progressBar.value = i + 1;
  }
  progressBar.style.display = 'none';
  appendLog("プレイリスト作成完了");
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}
