import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface InputSnapshotContent {
  relativePath: string;
  content: string;
}

/**
 * Hashes text inputs by logical content rather than platform-specific bytes.
 * Git may check the same source out with LF or CRLF line endings, so all line
 * endings and path separators are normalized before the digest is calculated.
 */
export function hashInputSnapshotContents(entries: readonly InputSnapshotContent[]): string {
  const normalizedEntries = entries
    .map(entry => ({
      relativePath: entry.relativePath.replaceAll('\\', '/'),
      content: entry.content.replace(/\r\n?/g, '\n'),
    }))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const hash = crypto.createHash('sha256');
  for (const entry of normalizedEntries) {
    hash.update(entry.relativePath);
    hash.update('\0');
    hash.update(entry.content, 'utf8');
    hash.update('\0');
  }

  return hash.digest('hex');
}

export function hashInputFiles(
  relativePaths: readonly string[],
  rootDirectory: string = process.cwd(),
): string {
  return hashInputSnapshotContents(relativePaths.map(relativePath => ({
    relativePath,
    content: fs.readFileSync(path.join(rootDirectory, relativePath), 'utf8'),
  })));
}
