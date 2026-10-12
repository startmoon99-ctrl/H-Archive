import { NavLink } from 'react-router';
import { APP_NAME } from '@/config/app';
import { NAV_ITEMS, ROUTES } from '@/config/navigation';
import { Explorer } from '@/features/explorer/Explorer';
import { useArchiveStore } from '@/store/archiveStore';
import { toast } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';

interface SidebarContentProps {
  /** 메뉴나 항목을 눌러 이동했을 때 호출 — 모바일 Drawer 를 닫는 데 쓴다 */
  onNavigate?(): void;
}

/** Sidebar 의 내용. PC 는 고정 패널, 모바일은 Drawer 안에 같은 내용을 넣는다. */
export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const count = useArchiveStore((state) => state.items.length);
  const resetToSample = useArchiveStore((state) => state.resetToSample);
  const select = useUiStore((state) => state.select);

  const reset = async () => {
    if (!window.confirm('모든 데이터를 샘플 상태로 되돌릴까요?\n직접 만든 항목은 삭제됩니다.')) return;
    select(null);
    await resetToSample();
    toast('샘플 데이터로 되돌렸어요');
  };

  return (
    <>
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden>
          H
        </span>
        <strong>{APP_NAME}</strong>
      </div>

      <nav className="sidebar__nav" aria-label="주 메뉴">
        {NAV_ITEMS.map(({ id, label, path, icon: Icon }) => (
          <NavLink key={id} to={path} end={path === ROUTES.graph} className="sidebar__link" onClick={onNavigate}>
            <Icon size={17} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <Explorer onNavigate={onNavigate} />

      <footer className="sidebar__footer">
        <span>항목 {count}개</span>
        <button type="button" className="link-btn" onClick={reset}>
          샘플로 초기화
        </button>
      </footer>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="sidebar">
      <SidebarContent />
    </aside>
  );
}
