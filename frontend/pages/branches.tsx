import { useEffect } from 'react';
import { useRouter } from 'next/router';

/** Moved: branches are now parameters (Masters → Parameters → Branch). */
export default function BranchesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/masters?tab=parameters');
  }, [router]);
  return null;
}
