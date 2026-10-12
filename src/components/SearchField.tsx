import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import { cx } from '@/utils/cx';

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size'> {
  value: string;
  onChange(value: string): void;
  size?: 'm' | 'large';
}

export function SearchField({ value, onChange, size = 'm', className, ...rest }: SearchFieldProps) {
  return (
    <div className={cx('search-field', size === 'large' && 'search-field--large', className)}>
      <Search size={size === 'large' ? 18 : 15} aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        {...rest}
      />
      {value && (
        <button type="button" className="icon-btn icon-btn--s" aria-label="검색어 지우기" onClick={() => onChange('')}>
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
