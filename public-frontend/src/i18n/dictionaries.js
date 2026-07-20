export const LOCALES = ['en', 'hi', 'gu'];
export const DEFAULT_LOCALE = 'en';

export const hasLocale = (locale) => LOCALES.includes(locale);

const dictionaries = {
  en: {
    siteName: 'NewsPortal',
    tagline: 'Latest News & Breaking Stories',
    home: 'Home',
    trending: 'Trending',
    breaking: 'Breaking News',
    searchPlaceholder: 'Search news…',
    searchResults: 'Search Results',
    noResults: 'No articles found.',
    loadMore: 'Load More',
    readMore: 'Read More',
    minRead: 'min read',
    published: 'Published',
    updated: 'Updated',
    by: 'By',
    relatedArticles: 'Related Articles',
    forYou: 'For You',
    latestNews: 'Latest News',
    categories: 'Categories',
    noArticlesYet: 'No articles yet. Check back soon!',
    language: 'Language',
  },
  hi: {
    siteName: 'NewsPortal',
    tagline: 'ताज़ा खबरें और ब्रेकिंग न्यूज़',
    home: 'होम',
    trending: 'ट्रेंडिंग',
    breaking: 'ब्रेकिंग न्यूज़',
    searchPlaceholder: 'समाचार खोजें…',
    searchResults: 'खोज परिणाम',
    noResults: 'कोई लेख नहीं मिला।',
    loadMore: 'और देखें',
    readMore: 'पूरा पढ़ें',
    minRead: 'मिनट में पढ़ें',
    published: 'प्रकाशित',
    updated: 'अपडेट किया गया',
    by: 'लेखक',
    relatedArticles: 'संबंधित लेख',
    forYou: 'आपके लिए',
    latestNews: 'ताज़ा समाचार',
    categories: 'श्रेणियाँ',
    noArticlesYet: 'अभी कोई लेख नहीं है। जल्द ही देखें!',
    language: 'भाषा',
  },
  gu: {
    siteName: 'NewsPortal',
    tagline: 'તાજા સમાચાર અને બ્રેકિંગ ન્યૂઝ',
    home: 'હોમ',
    trending: 'ટ્રેન્ડિંગ',
    breaking: 'બ્રેકિંગ ન્યૂઝ',
    searchPlaceholder: 'સમાચાર શોધો…',
    searchResults: 'શોધ પરિણામો',
    noResults: 'કોઈ લેખ મળ્યો નથી.',
    loadMore: 'વધુ જુઓ',
    readMore: 'આખું વાંચો',
    minRead: 'મિનિટમાં વાંચો',
    published: 'પ્રકાશિત',
    updated: 'અપડેટ કર્યું',
    by: 'લેખક',
    relatedArticles: 'સંબંધિત લેખો',
    forYou: 'તમારા માટે',
    latestNews: 'તાજા સમાચાર',
    categories: 'શ્રેણીઓ',
    noArticlesYet: 'હજી કોઈ લેખ નથી. ટૂંક સમયમાં જુઓ!',
    language: 'ભાષા',
  },
};

export const getDictionary = (locale) => dictionaries[hasLocale(locale) ? locale : DEFAULT_LOCALE];

// date-fns locale ids differ from ours only in shape; resolved lazily where needed
export const LANGUAGE_LABELS = { en: 'English', hi: 'हिन्दी', gu: 'ગુજરાતી' };
