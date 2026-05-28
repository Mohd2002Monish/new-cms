'use client';

import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Link from 'next/link';
import Image from 'next/image';
import { publicApi } from '@/lib/api';

export default function HeroSlider() {
  const [sliderPosts, setSliderPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize Embla with autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
  ]);

  useEffect(() => {
    async function loadSliderPosts() {
      try {
        // Fetch posts marked as isSlider
        const response = await publicApi.getArticles({ limit: 10, isSlider: 'true', sort: 'slider' });
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
    return (
      <div className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sliderPosts.length === 0) {
    return null; // Don't show anything if no slider posts
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden group mb-12 shadow-2xl shadow-rose-900/5">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y touch-pinch-zoom">
          {sliderPosts.map((post) => (
            <div className="relative flex-[0_0_100%] min-w-0" key={post._id}>
              {/* Aspect Ratio Container */}
              <div className="relative w-full h-[400px] sm:h-[500px] lg:h-[600px]">
                {post.featuredImage?.url ? (
                  <Image
                    src={post.featuredImage.url}
                    alt={post.title}
                    fill
                    priority
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800" />
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />
                
                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 md:p-14 flex flex-col justify-end">
                  <div className="max-w-4xl space-y-4">
                    {post.category?.name && (
                      <span className="inline-block px-3 py-1 bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        {post.category.name}
                      </span>
                    )}
                    <Link href={`/articles/${post.slug}`} className="block group/link">
                      <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md group-hover/link:text-rose-400 transition-colors">
                        {post.title}
                      </h2>
                    </Link>
                    {post.excerpt && (
                      <p className="hidden sm:block text-slate-200 text-sm sm:text-base lg:text-lg max-w-2xl font-medium drop-shadow-sm line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
                      <span>{post.author?.name || 'News Desk'}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="absolute right-6 bottom-6 flex gap-2">
        <button
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/10"
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous slide"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/10"
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next slide"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}
