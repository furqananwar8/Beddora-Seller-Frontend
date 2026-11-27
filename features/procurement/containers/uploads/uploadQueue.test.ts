// Run with: npx tsx --test features/procurement/containers/uploads/uploadQueue.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { applyUploadEvent, overallPercent, reconcileUploads, type ServerUpload, type UploadItem } from './uploadQueue'

const item = (id: string, patch: Partial<UploadItem> = {}): UploadItem => ({ id, containerId: 1, name: `${id}.pdf`, size: 10, file: {} as File, status: 'sending', percent: 0, phasePercent: 0, background: false, ...patch })
const server = (id: string, patch: Partial<ServerUpload> = {}): ServerUpload => ({ uploadId: id, containerId: 1, filename: `${id}.pdf`, sizeBytes: 10, status: 'RECEIVING', percent: 0, receivedPercent: 0, storedPercent: 0, ...patch })

describe('reconcileUploads', () => {
  it('moves progress forward only while sending', () => {
    let items = reconcileUploads([item('a')], [server('a', { percent: 20, receivedPercent: 40 })])
    items = reconcileUploads(items, [server('a', { percent: 10, receivedPercent: 20 })])
    assert.deepEqual([items[0].percent, items[0].phasePercent], [20, 40])
  })
  it('moves a sent file on to saving, with its own phase percent', () => {
    const items = reconcileUploads([item('a', { percent: 48 })], [server('a', { status: 'STORING', percent: 75, storedPercent: 50, documentId: 'doc1' })])
    assert.deepEqual([items[0].status, items[0].percent, items[0].phasePercent, items[0].documentId], ['saving', 75, 50, 'doc1'])
    assert.equal(reconcileUploads(items, [server('a', { status: 'QUEUED', percent: 50 })])[0].waiting, true)
  })
  it('settles once: a late failure cannot undo a finished upload', () => {
    let items = reconcileUploads([item('a', { status: 'saving' })], [server('a', { status: 'DONE', documentId: 'doc1' })])
    items = reconcileUploads(items, [server('a', { status: 'FAILED' })])
    assert.deepEqual([items[0].status, items[0].documentId, items[0].percent], ['done', 'doc1', 100])
  })
  it('catches up on a finish it missed', () => {
    assert.equal(reconcileUploads([item('a', { status: 'saving', percent: 80 })], [server('a', { status: 'DONE' })])[0].status, 'done')
  })
  it('adds uploads still going that this page never saw (after a reload), as background unless their dialog is open', () => {
    const uploads = [server('a', { status: 'STORING', percent: 60 }), server('b', { containerId: 2, status: 'QUEUED' })]
    const items = reconcileUploads([], uploads, (containerId) => containerId === 2)
    assert.deepEqual(items.map((i) => [i.id, i.status, i.background, i.file]), [['a', 'saving', true, undefined], ['b', 'saving', false, undefined]])
  })
  it('does not add finished uploads it never saw (their toast was due elsewhere)', () => {
    assert.equal(reconcileUploads([], [server('a', { status: 'DONE' }), server('b', { status: 'FAILED' })]).length, 0)
  })
  it('drops what the server no longer lists, but keeps files this page is still sending and local queued ones', () => {
    const items = reconcileUploads([item('saved', { status: 'saving' }), item('gone', { status: 'sending', file: undefined }), item('mine'), item('waiting', { status: 'queued' })], [])
    assert.deepEqual(items.map((i) => i.id), ['mine', 'waiting'])
  })
})

describe('applyUploadEvent', () => {
  it('folds the moved upload and the whole list it carries', () => {
    const event = { type: 'progress' as const, data: { ...server('a', { status: 'STORING', percent: 70 }), uploads: [server('b', { status: 'QUEUED', percent: 50 })] } }
    const items = applyUploadEvent([item('a')], event)
    assert.deepEqual(items.map((i) => [i.id, i.status]), [['a', 'saving'], ['b', 'saving']])
  })
})

describe('overallPercent', () => {
  it('averages started files and ignores queued ones', () => {
    assert.equal(overallPercent([item('a', { percent: 50 }), item('b', { status: 'done', percent: 100 }), item('c', { status: 'queued' })]), 75)
  })
})
