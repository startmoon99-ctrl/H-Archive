import type { ArchiveItem } from '@/types/archive';

/** 같은 제목을 쓰려 할 때 보여 줄 문구. 저장 실패 알림과 편집기의 입력 안내가 함께 쓴다. */
export const duplicateTitleMessage = (existing: ArchiveItem) =>
  `"${existing.title}" 항목이 이미 있어요. 제목은 다른 항목과 겹칠 수 없어요.`;

/** 제목은 [[제목]] 링크의 열쇠이므로 Archive 전체에서 유일해야 한다 */
export class DuplicateTitleError extends Error {
  readonly existing: ArchiveItem;

  constructor(existing: ArchiveItem) {
    super(duplicateTitleMessage(existing));
    this.name = 'DuplicateTitleError';
    this.existing = existing;
  }
}
