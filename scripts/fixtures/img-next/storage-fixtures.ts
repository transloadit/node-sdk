import { createHash } from 'node:crypto'

/** Deterministic identities for the protocol fake; API2 creates real IDs independently of paths. */
export function fixtureStorageIdentity(path: string): {
  workspace: string
  asset_id: string
  version_id: string
} {
  const id = (value: string): string =>
    createHash('sha256').update(value).digest().subarray(0, 16).toString('base64url')
  return { workspace: 'fixture', asset_id: id(path), version_id: id(`${path}:version-1`) }
}

export function fixtureImage(
  path: string,
  width: number,
  height: number,
): ReturnType<typeof fixtureStorageIdentity> & { path: string; width: number; height: number } {
  return { ...fixtureStorageIdentity(path), path, width, height }
}

export const fixtureImages = Object.fromEntries(
  [
    fixtureImage('website/hero.jpg', 2400, 1600),
    fixtureImage('website/small.jpg', 320, 240),
    fixtureImage('website/alpha.png', 64, 64),
    fixtureImage('documents/hero.jpg', 2400, 1600),
    fixtureImage('documents/avatar.jpg', 400, 300),
    fixtureImage('documents/late.jpg', 400, 300),
    fixtureImage('documents/alpha.png', 64, 64),
    fixtureImage('documents/public/hero.jpg', 400, 300),
    fixtureImage('documents/private/hero.jpg', 400, 300),
    fixtureImage('accounts/avatar.jpg', 400, 300),
  ].map((image) => [image.path, image]),
)
