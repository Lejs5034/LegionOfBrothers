interface MentionData {
  userId: string;
  username: string;
}

export function extractMentions(text: string, members: Array<{ id: string; username: string }>): MentionData[] {
  const mentions: MentionData[] = [];
  const mentionRegex = /@(\w+)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1];
    const member = members.find(
      (m) => m.username.toLowerCase() === username.toLowerCase()
    );

    if (member) {
      mentions.push({
        userId: member.id,
        username: member.username,
      });
    }
  }

  return mentions;
}

export function getCaretPosition(element: HTMLInputElement): number {
  return element.selectionStart || 0;
}

export function findMentionTrigger(text: string, caretPosition: number): { start: number; searchTerm: string } | null {
  const textBeforeCaret = text.substring(0, caretPosition);
  const lastAtIndex = textBeforeCaret.lastIndexOf('@');

  if (lastAtIndex === -1) {
    return null;
  }

  const textAfterAt = textBeforeCaret.substring(lastAtIndex + 1);

  if (/\s/.test(textAfterAt)) {
    return null;
  }

  return {
    start: lastAtIndex,
    searchTerm: textAfterAt,
  };
}

export function insertMention(
  currentText: string,
  mentionStart: number,
  searchTermLength: number,
  username: string
): string {
  const before = currentText.substring(0, mentionStart);
  const after = currentText.substring(mentionStart + searchTermLength + 1);
  return `${before}@${username} ${after}`;
}
