/** Parse the FAQ markdown into a map of `### Section title` → body text. */
export function parseFaqSections(faqText: string): Record<string, string> {
  const sections: Record<string, string> = {};
  let currentTitle: string | null = null;
  let buffer: string[] = [];

  for (const line of faqText.split("\n")) {
    if (line.startsWith("### ")) {
      if (currentTitle !== null) sections[currentTitle] = buffer.join("\n").trim();
      currentTitle = line.slice(4).trim();
      buffer = [];
    } else if (currentTitle !== null) {
      buffer.push(line);
    }
  }
  if (currentTitle !== null) sections[currentTitle] = buffer.join("\n").trim();
  return sections;
}
