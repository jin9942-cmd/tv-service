import { Link } from 'react-router-dom';
import { Page } from '../components/ui';

export function NotFound() {
  return (
    <Page className="py-24 text-center">
      <p className="label text-gold">404</p>
      <h1 className="mt-2 text-title font-black">This page isn't available</h1>
      <p className="mt-2 text-muted">The broadcast or page may have moved.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-gold underline-offset-4 hover:underline">
        Back to Home
      </Link>
    </Page>
  );
}
