import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth';
import Layout from '../components/Layout';
import { BrandingProvider } from '../lib/branding';
import { BranchProvider, useBranch } from '../lib/branch';
import '../styles/globals.css';

/** Remounts the page when the branch changes, so its data reloads for the new branch. */
function PageForBranch({ Component, pageProps }: Pick<AppProps, 'Component' | 'pageProps'>) {
  const { version } = useBranch();
  return <Component key={version} {...pageProps} />;
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <BrandingProvider>
      <AuthProvider>
        <BranchProvider>
          <Layout>
            <PageForBranch Component={Component} pageProps={pageProps} />
          </Layout>
        </BranchProvider>
      </AuthProvider>
    </BrandingProvider>
  );
}

export default MyApp;
