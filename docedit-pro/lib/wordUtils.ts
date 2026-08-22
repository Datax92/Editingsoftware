export const createWordHeadingId = (text: string, index: number): string => {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  return `word-heading-${index}-${slug || 'heading'}`;
};
