import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Moved: Menus now lives under Menus & rights. */
export default function MenusRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/access-control?tab=menus');
  }, [router]);
  return null;
}
