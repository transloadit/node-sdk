import type { StoredAsset, StoredAssetsPage } from '../../../src/alphalib/types/storageAsset.ts'

export function storedAsset(overrides: Partial<StoredAsset> = {}): StoredAsset {
  return {
    workspace: 'my-app',
    asset_id: 'A'.repeat(22),
    version_id: 'B'.repeat(21) + 'A',
    path: 'website/a.jpg',
    size: 123,
    mime: 'image/jpeg',
    width: 800,
    height: 600,
    md5hash: 'd41d8cd98f00b204e9800998ecf8427e',
    ...overrides,
  }
}

export function storagePage(
  assets: StoredAsset[] = [],
  overrides: Partial<StoredAssetsPage> = {},
): StoredAssetsPage {
  return {
    ok: 'DAM_ASSETS_LISTED',
    message: 'Assets listed',
    workspace: 'my-app',
    assets,
    next_cursor: null,
    ...overrides,
  }
}
