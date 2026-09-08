import type { ExtractOptions } from './settings';

export enum MessageType {
  /** Kiểm tra content script đã nằm sẵn trong tab chưa. */
  PING = 'PING',
  EXTRACT = 'EXTRACT',
}

export interface PingMessage {
  type: MessageType.PING;
}

export interface ExtractMessage {
  type: MessageType.EXTRACT;
  options: ExtractOptions;
}

export type ContentMessage = PingMessage | ExtractMessage;
