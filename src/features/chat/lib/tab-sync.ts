import type { Message } from "../types";

type MessagePatch = Partial<Message> & Pick<Message, "id">;

export type TabSyncEvent =
  | {
      type: "message";
      action: "insert";
      chatId: string;
      message: Message;
    }
  | {
      type: "message";
      action: "update";
      chatId: string;
      message: MessagePatch;
    }
  | {
      type: "message";
      action: "delete";
      chatId: string;
      messageId: string;
    };

type Listener = (event: TabSyncEvent) => void;

const CHANNEL_NAME = "masanger-tab-sync";

export function publishTabEvent(event: TabSyncEvent) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage(event);
  channel.close();
}

export function subscribeToTabEvents(listener: Listener) {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return () => undefined;
  }

  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<TabSyncEvent>) => {
    if (event.data?.type === "message") listener(event.data);
  };

  return () => channel.close();
}
