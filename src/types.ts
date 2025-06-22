// 型定義: 拡張機能のメッセージ通信
export type RuntimeMessage =
  | { type: 'getAuthToken'; authUrl?: string }
  | { type: 'ping' };
