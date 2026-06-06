'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * NewsletterBox — solid red subscribe widget for the right sidebar.
 */
export default function NewsletterBox() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    // Placeholder: could POST to a newsletter API here
    setSubmitted(true);
  };

  return (
    <aside className="newsletter-box" aria-label="Newsletter subscription">
      {submitted ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <CheckCircle size={32} style={{ color: '#fff' }} />
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4 }}>You're in!</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>
            Thank you for subscribing. We'll send the best stories straight to your inbox.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <p className="newsletter-box-title">Stay Informed</p>
          <p className="newsletter-box-desc">
            Get the top stories delivered to your inbox every morning. No spam, ever.
          </p>
          <input
            id="newsletter-email"
            type="email"
            className="newsletter-box-input"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-label="Email address for newsletter"
            required
          />
          <button type="submit" className="newsletter-box-btn" id="newsletter-subscribe-btn">
            Subscribe Now
          </button>
        </form>
      )}
    </aside>
  );
}
