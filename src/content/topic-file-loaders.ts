/**
 * Loaders for Topic files, keyed by the file's path inside the content folder,
 * like `general.json` or `tv/friends.json`. Calling one loads that file.
 */
export type TopicFileLoaders = Readonly<Record<string, () => Promise<unknown>>>;

/** Rekeys an `import.meta.glob` result from project paths to content-folder paths. */
export function byContentPath(glob: Record<string, () => Promise<unknown>>, folder: string): TopicFileLoaders {
  return Object.fromEntries(
    Object.entries(glob).map(([path, load]) => [path.startsWith(folder) ? path.slice(folder.length) : path, load]),
  );
}
