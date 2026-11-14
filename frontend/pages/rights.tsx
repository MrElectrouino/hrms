import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Moved: Rights now lives under Menus & rights. */
export default function RightsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/access-control?tab=rights');
  }, [router]);
  return null;
}
