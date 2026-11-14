import type { ComponentType } from "react";
import type { Message } from "../types";
import { TextMessage } from "./TextMessage";
import { ImageMessage } from "./ImageMessage";
import { FileMessage } from "./FileMessage";
import { VoiceMessage } from "./VoiceMessage";
import { UnknownMessage } from "./UnknownMessage";
import { StickerMessage } from "./StickerMessage";

export const messageRenderers: Record<string, ComponentType<{ message: Message }>> = {
  text: TextMessage,
  image: ImageMessage,
  gif: ImageMessage,
  file: FileMessage,
  audio: VoiceMessage,
  voice: VoiceMessage,
  sticker: StickerMessage,
};

export const getRenderer = (type: string) => messageRenderers[type] ?? UnknownMessage;
