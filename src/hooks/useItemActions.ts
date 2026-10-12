import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/config/navigation';
import { useUiStore } from '@/store/uiStore';

/** Item으로 이동하는 방식을 한곳에서 정의한다 */
export function useItemActions() {
  const navigate = useNavigate();
  const select = useUiStore((state) => state.select);

  return useMemo(
    () => ({
      /** 상세 화면으로 이동 */
      open(id: string) {
        select(id);
        navigate(ROUTES.item(id));
      },
      /** 화면 이동 없이 선택만 변경 (그래프 / 정보 패널) */
      peek(id: string) {
        select(id);
      },
      showInGraph(id: string) {
        select(id);
        navigate(ROUTES.graph);
      },
    }),
    [navigate, select],
  );
}
