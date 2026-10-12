import { LIMITS } from '@/config/app';
import { replaceWikiLinks } from './wikilinks';

/** 본문 마크업을 걷어낸 평문 */
export function toPlainText(content: string): string {
  return replaceWikiLinks(content, (link) => link.target)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

export const getExcerpt = (content: string, length: number = LIMITS.excerptLength) =>
  truncate(toPlainText(content), length);

export const firstLine = (content: string) => toPlainText(content.split('\n').find((line) => line.trim()) ?? '');
