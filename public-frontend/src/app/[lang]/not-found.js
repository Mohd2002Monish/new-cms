import Link from 'next/link';
import { Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center', minHeight: '60vh' }}>
      <div className="empty-state">
        <div className="empty-state-icon" aria-hidden="true">
          <Search size={64} opacity={0.3} />
        </div>
        <h2>Page Not Found</h2>
        <p style={{ maxWidth: '400px', margin: '0 auto 2rem' }}>
          We couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <Link href="/" className="btn btn-primary">
          Return Home
        </Link>
      </div>
    </div>
  );
}
