import { Plus } from 'lucide-react';
import { NavLink } from 'react-router';
import { NAV_ITEMS, ROUTES, type NavItem } from '@/config/navigation';
import { useUiStore } from '@/store/uiStore';

function BottomNavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.path} end={item.path === ROUTES.graph} className="bottom-nav__link">
      <Icon size={21} aria-hidden />
      <span>{item.label}</span>
    </NavLink>
  );
}

/** 모바일 하단 내비게이션. 가운데에 생성 버튼을 둔다. */
export function BottomNav() {
  const openEditor = useUiStore((state) => state.openEditor);
  const middle = Math.ceil(NAV_ITEMS.length / 2);

  return (
    <nav className="bottom-nav" aria-label="주 메뉴">
      {NAV_ITEMS.slice(0, middle).map((item) => (
        <BottomNavLink key={item.id} item={item} />
      ))}
      <button type="button" className="bottom-nav__create" aria-label="새 항목" onClick={() => openEditor()}>
        <Plus size={24} aria-hidden />
      </button>
      {NAV_ITEMS.slice(middle).map((item) => (
        <BottomNavLink key={item.id} item={item} />
      ))}
    </nav>
  );
}
