import storage from './storage';
import { safeJsonParse } from './formatters';

let FileSystem = null;
try {
  FileSystem = require('expo-file-system');
} catch (_) {
  FileSystem = null;
}

const OFFLINE_INDEX_KEY = '@offline_articles_index';

export const offlineManager = {
  /**
   * Get list of all locally saved articles
   */
  async getOfflineArticles() {
    try {
      const raw = await storage.getItem(OFFLINE_INDEX_KEY);
      if (!raw) return [];
      const parsed = safeJsonParse(raw, []);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  },

  /**
   * Check if a specific article is downloaded
   */
  async isArticleDownloaded(slug) {
    if (!slug) return false;
    const list = await this.getOfflineArticles();
    return list.some((a) => a.slug === slug);
  },

  /**
   * Download a single article for offline reading
   */
  async saveArticleOffline(article) {
    if (!article || !article.slug) return false;
    try {
      const list = await this.getOfflineArticles();
      const existingIdx = list.findIndex((a) => a.slug === article.slug);

      let localImageUri = null;
      if (FileSystem && article.featuredImage) {
        const remoteUrl =
          typeof article.featuredImage === 'string'
            ? article.featuredImage
            : article.featuredImage?.url;

        if (remoteUrl && remoteUrl.startsWith('http')) {
          const fileExt = remoteUrl.split('.').pop()?.split('?')[0] || 'jpg';
          const localPath = `${FileSystem.documentDirectory}article_${article.slug}.${fileExt}`;
          try {
            const downloadRes = await FileSystem.downloadAsync(remoteUrl, localPath);
            if (downloadRes?.status === 200) {
              localImageUri = downloadRes.uri;
            }
          } catch (dlErr) {
            console.warn('Failed to cache image offline:', dlErr?.message);
          }
        }
      }

      const offlineRecord = {
        _id: article._id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        contentHtml: article.contentHtml,
        author: article.author,
        category: article.category,
        language: article.language,
        audioNarrations: article.audioNarrations,
        featuredImage: localImageUri ? { url: localImageUri } : article.featuredImage,
        savedAt: Date.now(),
      };

      if (existingIdx >= 0) {
        list[existingIdx] = offlineRecord;
      } else {
        list.unshift(offlineRecord);
      }

      await storage.setItem(OFFLINE_INDEX_KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      console.warn('saveArticleOffline error:', err);
      return false;
    }
  },

  /**
   * Remove a saved article from offline storage
   */
  async removeOfflineArticle(slug) {
    if (!slug) return false;
    try {
      const list = await this.getOfflineArticles();
      const target = list.find((a) => a.slug === slug);
      if (target?.featuredImage?.url && FileSystem && target.featuredImage.url.startsWith('file://')) {
        try {
          await FileSystem.deleteAsync(target.featuredImage.url, { idempotent: true });
        } catch (_) {}
      }

      const updated = list.filter((a) => a.slug !== slug);
      await storage.setItem(OFFLINE_INDEX_KEY, JSON.stringify(updated));
      return true;
    } catch (err) {
      console.warn('removeOfflineArticle error:', err);
      return false;
    }
  },

  /**
   * Clear all downloaded offline content
   */
  async clearAllOfflineData() {
    try {
      const list = await this.getOfflineArticles();
      if (FileSystem) {
        for (const item of list) {
          if (item?.featuredImage?.url && item.featuredImage.url.startsWith('file://')) {
            try {
              await FileSystem.deleteAsync(item.featuredImage.url, { idempotent: true });
            } catch (_) {}
          }
        }
      }
      await storage.removeItem(OFFLINE_INDEX_KEY);
      return true;
    } catch (err) {
      console.warn('clearAllOfflineData error:', err);
      return false;
    }
  },
};

export default offlineManager;
