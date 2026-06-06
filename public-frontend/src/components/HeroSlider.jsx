'use client';

import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import Image from 'next/image';
import { publicApi } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

export default function HeroSlider() {
  const [sliderPosts, setSliderPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);

  useEffect(() => {
    async function loadSliderPosts() {
      try {
        const response = await publicApi.getArticles({ limit: 8, isSlider: 'true', sort: 'slider' });
        setSliderPosts(response.data || []);
      } catch (err) {
        console.error('Failed to load slider posts', err);
      } finally {
        setLoading(false);
      }
    }
    loadSliderPosts();
  }, []);

  if (loading) {
    return <div className="hero-banner-skeleton" aria-label="Loading featured stories" />;
  }

  if (!sliderPosts.length) return null;

  return (
    <div className="hero-banner" role="region" aria-label="Featured stories">
      {/* Embla carousel viewport */}
      <div style={{ overflow: 'hidden', height: '100%' }} ref={emblaRef}>
        <div style={{ display: 'flex', height: '100%' }}>
          {sliderPosts.map((post) => (
            <div
              key={post._id}
              style={{ flex: '0 0 100%', minWidth: 0, position: 'relative', height: '100%' }}
            >
              {/* Background image */}
              {post.featuredImage?.url ? (
                <Image
                  src={post.featuredImage.url}
                  alt={post.title}
                  fill
                  priority
                  className="hero-banner-image"
                  sizes="(max-width: 768px) 100vw, 100vw"
                />
              ) : (
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(135deg, #4a0e0e 0%, #8b1a1a 50%, #2d0606 100%)',
                  }}
                />
              )}

              {/* Dark cinematic overlay */}
              <div className="hero-banner-overlay" />

              {/* Content (bottom-left) */}
              <div className="hero-banner-content">
                {/* Category tag */}
                {post.category?.name && (
                  <div>
                    <span className="hero-banner-tag">{post.category.name}</span>
                  </div>
                )}

                {/* Headline */}
                <Link href={`/articles/${post.slug}`}>
                  <h2 className="hero-banner-headline">{post.title}</h2>
                </Link>

                {/* Meta row */}
                <div className="hero-banner-meta">
                  {post.author?.name && <span>{post.author.name}</span>}
                  {post.author?.name && (post.publishedAt || post.createdAt) && (
                    <span className="hero-banner-meta-dot">·</span>
                  )}
                  {(post.publishedAt || post.createdAt) && (
                    <time dateTime={post.publishedAt || post.createdAt}>
                      {timeAgo(post.publishedAt || post.createdAt)}
                    </time>
                  )}
                  {post.readingTimeMinutes && (
                    <>
                      <span className="hero-banner-meta-dot">·</span>
                      <span>{post.readingTimeMinutes} min read</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ghost navigation arrows (bottom-right) */}
      <div className="hero-banner-arrows">
        <button
          className="hero-arrow-btn"
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous featured story"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          className="hero-arrow-btn"
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next featured story"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
