/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase 프로젝트 주소. 비어 있으면 이 브라우저(IndexedDB)에만 저장한다. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase의 공개용(publishable / anon) 키. service_role 키는 절대 넣지 않는다. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
