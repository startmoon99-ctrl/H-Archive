import { ITEM_TYPE_LIST } from '@/config/itemTypes';
import { MOTION } from '@/config/motion';

const declarations = (entries: Array<[name: string, value: string]>) =>
  entries.map(([name, value]) => `${name}:${value};`).join('');

/** config 에 정의된 값을 CSS 변수로 내보낸다 — 타입 색상과 모션 값을 CSS에 다시 적지 않기 위함 */
export function injectDesignTokens() {
  const motion = declarations([
    ['--motion-fast', `${MOTION.duration.fast}ms`],
    ['--motion-base', `${MOTION.duration.base}ms`],
    ['--motion-slow', `${MOTION.duration.slow}ms`],
    ['--ease-standard', MOTION.easing.standard],
    ['--ease-exit', MOTION.easing.exit],
  ]);
  const light = declarations(ITEM_TYPE_LIST.map((type) => [`--type-${type.id}`, type.color.light]));
  const dark = declarations(ITEM_TYPE_LIST.map((type) => [`--type-${type.id}`, type.color.dark]));

  const style = document.createElement('style');
  style.dataset.source = 'design-tokens';
  style.textContent = `:root{${motion}${light}}:root[data-theme='dark']{${dark}}`;
  document.head.appendChild(style);
}
