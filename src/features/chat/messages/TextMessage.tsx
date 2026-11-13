import type { Message } from "../types";
export function TextMessage({ message }: { message: Message }) {
  return <p className="whitespace-pre-wrap break-words leading-7">{message.content.text}</p>;
}
