import { storageGetJson, storageSetJson, isStringArray } from '~/utils/safeStorage'

// The lvOS Gallery is one capped ring in localStorage, fed by four producers —
// the desktop screenshot tool, the asciicam, Paint and the co-draw whiteboard.
// Keeping the key, the cap and the write in one place stops them from drifting
// apart (bump the cap in one and the gallery would silently disagree).
export const GALLERY_KEY = 'lvos-shots'
export const GALLERY_MAX = 6

/** The Gallery's stored images (data URLs), newest first. */
export function readGallery(): string[] {
  return storageGetJson(GALLERY_KEY, isStringArray) ?? []
}

/** Prepend an image (data URL) to the Gallery, capped at GALLERY_MAX. Returns
 * false when the write fails (localStorage full). */
export function addToGallery(dataUrl: string): boolean {
  return storageSetJson(GALLERY_KEY, [dataUrl, ...readGallery()].slice(0, GALLERY_MAX))
}
