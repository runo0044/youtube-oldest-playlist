// background.ts: Chrome拡張のサービスワーカー
import type { RuntimeMessage } from "./types";

console.log("Service Worker started");
chrome.runtime.onMessage.addListener((message: RuntimeMessage & { clientId?: string; redirectUri?: string }, sender: any, sendResponse: any) => {
  if (message.type === "ping") {
    sendResponse({ pong: true });
    return true;
  }
  if (message.type === "getAuthToken") {
    chrome.identity.getAuthToken({ interactive: true }, (token: any) => {
      if (chrome.runtime.lastError || !token) {
        // Fallback: launchWebAuthFlow
        if (!message.clientId || !message.redirectUri) {
          sendResponse({ error: 'OAuthクライアントID/リダイレクトURIが未設定です' });
          return;
        }
        const authUrl =
          `https://accounts.google.com/o/oauth2/auth?` +
          `client_id=${encodeURIComponent(message.clientId)}` +
          `&redirect_uri=${encodeURIComponent(message.redirectUri)}` +
          `&response_type=token` +
          `&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl')}` +
          `&prompt=consent`;
        chrome.identity.launchWebAuthFlow({
          url: authUrl,
          interactive: true
        }, (redirectUrl: any) => {
          if (redirectUrl) {
            const m = redirectUrl.match(/[#&]access_token=([^&]+)/);
            if (m) {
              sendResponse({ token: m[1] });
            } else {
              sendResponse({ error: 'アクセストークン取得失敗' });
            }
          } else {
            sendResponse({ error: chrome.runtime.lastError?.message });
          }
        });
      } else {
        sendResponse({ token });
      }
    });
    return true;
  }
});
