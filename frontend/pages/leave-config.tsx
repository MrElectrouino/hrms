import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Moved: now a tab in System settings. */
export default function Redirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/system-settings?tab=leave');
  }, [router]);
  return null;
}
