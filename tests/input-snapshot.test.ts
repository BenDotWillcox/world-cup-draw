import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hashInputSnapshotContents } from '@/lib/input-snapshot';

test('input snapshot hashes are stable across LF and CRLF checkouts', () => {
  const lfHash = hashInputSnapshotContents([
    { relativePath: 'lib/example.ts', content: 'export const one = 1;\nexport const two = 2;\n' },
  ]);
  const crlfHash = hashInputSnapshotContents([
    { relativePath: 'lib\\example.ts', content: 'export const one = 1;\r\nexport const two = 2;\r\n' },
  ]);

  assert.equal(crlfHash, lfHash);
});

test('input snapshot hashes still change when logical source content changes', () => {
  const firstHash = hashInputSnapshotContents([
    { relativePath: 'lib/example.ts', content: 'export const value = 1;\n' },
  ]);
  const secondHash = hashInputSnapshotContents([
    { relativePath: 'lib/example.ts', content: 'export const value = 2;\n' },
  ]);

  assert.notEqual(secondHash, firstHash);
});
