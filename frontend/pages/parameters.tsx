import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Moved: Parameters now lives under Masters. */
export default function ParametersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/masters?tab=parameters');
  }, [router]);
  return null;
}
