// Pure text for the chat that opens when a collab request is accepted.
const first = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || "there";

export function acceptedChatMessage(author: string | null, creator: string | null, title: string) {
  return `🎉 ${first(author)} accepted ${first(creator)} for the collab "${title}"!

You're now connected. Plan your reel right here in this chat.
– Team Peerpop`;
}
