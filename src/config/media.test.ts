import { describe, expect, it } from 'vitest'
import { detectMediaKind } from './media'

describe('detectMediaKind', () => {
  it('구체적인 종류(gif)를 넓은 종류(image)보다 먼저 고른다', () => {
    expect(detectMediaKind('image/gif', 'loop.gif')).toBe('gif')
    expect(detectMediaKind('image/png', 'shot.png')).toBe('image')
  })

  it('MIME이 있으면 확장자보다 우선한다', () => {
    expect(detectMediaKind('video/mp4', 'clip.png')).toBe('video')
  })

  it('MIME이 비어 있으면 확장자로 판별한다(대소문자 무시)', () => {
    expect(detectMediaKind('', 'TRACK.MP3')).toBe('audio')
    expect(detectMediaKind('', 'notes.hwp')).toBe('document')
  })

  it('알 수 없는 파일은 file로 둔다', () => {
    expect(detectMediaKind('application/octet-stream', 'build.unitypackage')).toBe('file')
    expect(detectMediaKind('', 'README')).toBe('file')
  })
})
