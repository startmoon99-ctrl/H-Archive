import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from '@/store/toastStore';
import { fileToDataUrl } from '@/utils/image';
import { toSafeImageSrc } from '@/utils/url';

interface CoverFieldProps {
  label: string;
  value?: string;
  onChange(value: string | undefined): void;
}

/** 이미지 업로드(축소 후 data URL) 또는 주소 입력 */
export function CoverField({ label, value, onChange }: CoverFieldProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const preview = toSafeImageSrc(value);
  const isUpload = value?.startsWith('data:') ?? false;

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToDataUrl(file));
    } catch {
      toast('이미지를 불러오지 못했어요', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div className="cover-field">
        {preview && <img className="cover-field__preview" src={preview} alt="" />}
        <div className="cover-field__controls">
          <input
            className="input"
            type="url"
            inputMode="url"
            placeholder="이미지 주소 붙여넣기"
            aria-label={`${label} 주소`}
            value={isUpload ? '' : (value ?? '')}
            onChange={(event) => onChange(event.target.value || undefined)}
            disabled={isUpload}
          />
          <div className="cover-field__buttons">
            <button type="button" className="btn" disabled={busy} onClick={() => fileInput.current?.click()}>
              <ImagePlus size={15} aria-hidden />
              {busy ? '처리 중…' : '이미지 선택'}
            </button>
            {value && (
              <button type="button" className="btn btn--ghost" onClick={() => onChange(undefined)}>
                <Trash2 size={15} aria-hidden />
                제거
              </button>
            )}
          </div>
        </div>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
    </div>
  );
}
