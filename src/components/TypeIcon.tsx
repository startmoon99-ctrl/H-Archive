import type { CSSProperties } from 'react';
import { getItemType, typeColorVar, type ItemType } from '@/config/itemTypes';

export const typeColorStyle = (type: ItemType) => ({ '--type-color': typeColorVar(type) }) as CSSProperties;

interface TypeIconProps {
  type: ItemType;
  size?: number;
  boxed?: boolean;
}

export function TypeIcon({ type, size = 16, boxed }: TypeIconProps) {
  const Icon = getItemType(type).icon;
  if (boxed) {
    return (
      <span className="type-icon type-icon--boxed" style={typeColorStyle(type)}>
        <Icon size={size} aria-hidden />
      </span>
    );
  }
  return <Icon className="type-icon" size={size} style={typeColorStyle(type)} aria-hidden />;
}

export function TypeBadge({ type }: { type: ItemType }) {
  const { icon: Icon, label } = getItemType(type);
  return (
    <span className="type-badge" style={typeColorStyle(type)}>
      <Icon size={13} aria-hidden />
      {label}
    </span>
  );
}
