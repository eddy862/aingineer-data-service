export const sanitizeTableName = (name: string): string => {
  return name
    .toLowerCase()              // normalize
    .replace(/[^a-z0-9_]/g, "_") // replace invalid chars
    .replace(/^_+|_+$/g, "");    // trim underscores
};
