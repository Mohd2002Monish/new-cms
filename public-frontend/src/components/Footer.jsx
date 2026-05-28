import Link from 'next/link';
import { Newspaper } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Newspaper size={24} />
              NewsPortal
            </div>
            <p className="footer-desc">
              Your trusted source for breaking news, in-depth analysis, and
              real-time updates across politics, sports, technology, and more.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="footer-heading">Sections</h3>
            <ul className="footer-links" role="list">
              <li><Link href="/category/politics">Politics</Link></li>
              <li><Link href="/category/sports">Sports</Link></li>
              <li><Link href="/category/technology">Technology</Link></li>
              <li><Link href="/category/business">Business</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="footer-heading">Company</h3>
            <ul className="footer-links" role="list">
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><a href="/rss.xml">RSS Feed</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <span>© {year} NewsPortal. All rights reserved.</span>
          <span>
            <Link href="/privacy" style={{ marginRight: '1rem' }}>Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
