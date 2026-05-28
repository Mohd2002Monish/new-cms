import { PostRevision } from '../models/PostRevision.js';

export async function snapshot(post, savedBy) {
  // Find highest version
  const latest = await PostRevision.findOne({ postId: post._id }).sort({ version: -1 });
  const version = latest ? latest.version + 1 : 1;
  
  return PostRevision.create({
    postId: post._id,
    version,
    title: post.title,
    content: post.content,
    contentHtml: post.contentHtml,
    excerpt: post.excerpt,
    category: post.category,
    tags: post.tags,
    featuredImage: post.featuredImage,
    seo: post.seo,
    isBreaking: post.isBreaking,
    priority: post.priority,
    breakingExpiresAt: post.breakingExpiresAt,
    author: post.author,
    coAuthors: post.coAuthors,
    savedBy,
  });
}
