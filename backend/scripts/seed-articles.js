/**
 * Seed Script — Create Sample Categories and Articles
 * Run: node scripts/seed-articles.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not defined in .env');
  process.exit(1);
}

// Inline schemas to avoid import/transpilation path issues
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  role: { type: String, default: 'editor' },
  status: { type: String, default: 'active' },
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

// Auto-generate slug from name before save
categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  next();
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, lowercase: true },
  content: mongoose.Schema.Types.Mixed,
  contentHtml: { type: String, default: '' },
  excerpt: { type: String, default: '' },
  featuredImage: {
    url: { type: String, default: null },
    publicId: { type: String, default: null },
    alt: { type: String, default: '' },
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  tags: [{ type: String, lowercase: true }],
  status: { type: String, default: 'draft' },
  isBreaking: { type: Boolean, default: false },
  priority: { type: String, default: 'normal' },
  breakingExpiresAt: { type: Date, default: null },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: { type: Date, default: null },
  views: { type: Number, default: 0 },
  readingTimeMinutes: { type: Number, default: 1 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

// Auto-generate slug from title + compute reading time
postSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      + '-' + Date.now();
  }
  next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

const CATEGORIES_DATA = [
  { name: 'Technology', description: 'Gadgets, software, artificial intelligence, and the future of tech.' },
  { name: 'Politics', description: 'Local, national, and global political updates and analysis.' },
  { name: 'Sports', description: 'Football, basketball, cricket, Olympics, and other major sporting events.' },
  { name: 'Entertainment', description: 'Movies, music, celebrity culture, television, and pop culture.' },
  { name: 'Business & Finance', description: 'Stock market, economy, startups, personal finance, and corporate updates.' }
];

function createTiptapJSON(paragraphs) {
  return {
    type: 'doc',
    content: paragraphs.map(p => ({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: p
        }
      ]
    }))
  };
}

async function seed() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to database.');

  // 1. Get or Create Author User
  let author = await User.findOne({ role: 'admin' });
  if (!author) {
    author = await User.findOne({});
  }
  if (!author) {
    console.log('📝 Creating a mock admin author...');
    author = await User.create({
      name: 'Super Admin',
      email: 'admin@newscms.com',
      role: 'admin',
      status: 'active'
    });
  }
  console.log(`👤 Using Author: ${author.name} (${author._id})`);

  // 2. Create Categories
  console.log('📂 Seeding Categories...');
  const categories = {};
  for (const catData of CATEGORIES_DATA) {
    let cat = await Category.findOne({ name: catData.name });
    if (!cat) {
      cat = await Category.create({
        ...catData,
        createdBy: author._id
      });
      console.log(`   Created category: ${cat.name}`);
    } else {
      console.log(`   Category already exists: ${cat.name}`);
    }
    categories[cat.name] = cat;
  }

  // 3. Clear existing posts to start fresh
  console.log('🗑️ Clearing existing sample posts...');
  await Post.deleteMany({ tags: 'sample-seed' });

  // 4. Create Sample Posts
  console.log('📰 Seeding Sample Articles...');

  const postsData = [
    {
      title: 'The Rise of Generative AI: Transforming Daily Workflows',
      excerpt: 'Generative artificial intelligence is shifting from a futuristic novelty to a daily necessity for knowledge workers worldwide. Here is how it is reshaping roles.',
      paragraphs: [
        'Generative AI technologies have grown at an unprecedented rate, leaving companies scrambling to adopt AI-first strategies. From automatic code generation to draft copywriting and smart spreadsheet formulas, tools powered by large language models (LLMs) are saving hours of manual labor every week.',
        'Industry analysts estimate that generative AI could add up to $4.4 trillion annually to the global economy. However, this shift raises major questions about job security, data privacy, and intellectual property. Companies must navigate these challenges while trying to remain competitive.',
        'Experts suggest that instead of replacing humans, AI will act as a collaborative co-pilot. Workers who learn how to effectively prompt and manage AI systems will be the ones who thrive in the new, automated digital landscape.'
      ],
      featuredImage: {
        url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1200&auto=format&fit=crop',
        alt: 'Futuristic AI neural network concept visualization'
      },
      category: categories['Technology']._id,
      tags: ['technology', 'ai', 'future', 'sample-seed'],
      status: 'live',
      isBreaking: true,
      breakingExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      priority: 'high',
      views: 1250,
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      title: 'Global Climate Summit Reaches Landmark Green Energy Agreement',
      excerpt: 'Delegates from over 190 nations have signed a historic pact committing to triple global renewable energy capacity by the end of the decade.',
      paragraphs: [
        'Following weeks of tense negotiations in Geneva, international leaders have finalised a comprehensive treaty aimed at accelerating the global transition away from fossil fuels. The treaty mandates strict emissions targets and establishes a global fund to assist developing nations in building wind and solar infrastructures.',
        'Proponents have hailed the agreement as the most significant breakthrough since the Paris Agreement. "We are finally turning promises into concrete, binding action," remarked the summit chairperson during the closing ceremony.',
        'Despite the optimism, some environmental activists warn that the pact lacks strong enforcement mechanisms. Implementation will depend heavily on the political will of individual nations and domestic policy updates over the coming years.'
      ],
      featuredImage: {
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop',
        alt: 'Beautiful green landscape with mist'
      },
      category: categories['Politics']._id,
      tags: ['politics', 'climate', 'news', 'global', 'sample-seed'],
      status: 'live',
      isBreaking: false,
      priority: 'normal',
      views: 980,
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    },
    {
      title: 'Championship Finals: Underdogs Secure Dramatic Last-Minute Victory',
      excerpt: 'Against all odds, the newcomers pulled off a stunning 3-2 victory in the final seconds of extra time, clinching their first-ever league cup.',
      paragraphs: [
        'It was a match that will be remembered for decades. Entering the finals as massive underdogs, the Rovers faced off against the reigning champions in a packed stadium. After falling behind 2-0 early in the first half, the team staged a spectacular comeback.',
        'The deciding goal came in the 94th minute, courtesy of a spectacular header from substitute striker Marcus Vance. The stadium erupted in celebration as the whistle blew moments later.',
        'With this win, the Rovers secure their first major trophy in club history. Their coach, visibly emotional during the post-game press conference, dedicated the victory to the loyal fans who supported the team through years of struggles.'
      ],
      featuredImage: {
        url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop',
        alt: 'Soccer stadium floodlights at night'
      },
      category: categories['Sports']._id,
      tags: ['sports', 'championship', 'football', 'underdog', 'sample-seed'],
      status: 'live',
      isBreaking: false,
      priority: 'normal',
      views: 3450, // high view count to test trending
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      title: 'Highly Anticipated Sci-Fi Sequel Shines at Summer Box Office',
      excerpt: 'The blockbuster sequel has shattered opening weekend records, drawing praise from critics and audiences alike for its visual mastery.',
      paragraphs: [
        'The cinematic event of the summer has finally arrived. The long-awaited sequel to the critically acclaimed sci-fi saga made its debut this weekend, raking in an estimated $185 million domestically and topping the global box office charts.',
        'Featuring groundbreaking visual effects, a complex narrative, and standout performances from the ensemble cast, the film has managed to surpass high expectations. Critics are calling it a "triumph of modern filmmaking" that redefines the genre.',
        'Industry analysts project the film will comfortably cross the billion-dollar mark globally within the next few weeks, cementing its place as one of the most successful franchises of the decade.'
      ],
      featuredImage: {
        url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop',
        alt: 'Neon lighted movie cinema sign'
      },
      category: categories['Entertainment']._id,
      tags: ['entertainment', 'movies', 'boxoffice', 'scifi', 'sample-seed'],
      status: 'live',
      isBreaking: false,
      priority: 'normal',
      views: 2890, // high views to test trending
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      title: 'Central Bank Hikes Interest Rates to Combat Inflation',
      excerpt: 'In a bid to curb persistent inflation, the Federal Reserve has announced another 25 basis point rate increase, signaling tighter economic controls ahead.',
      paragraphs: [
        'The central bank continued its aggressive monetary tightening policy today, raising the benchmark interest rate to its highest level in fifteen years. The decision reflects ongoing concerns over consumer price pressures and a tight labor market.',
        'Economic commentators are divided on the move. Some argue it is a necessary measure to cool the economy, while others express fears that continued rate hikes could trigger a mild recession by late 2026.',
        'Stock markets reacted immediately, with major indices showing moderate declines following the announcement. Mortgage rates and credit costs are expected to rise starting next week.'
      ],
      featuredImage: {
        url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop',
        alt: 'Financial stock market charts on screen'
      },
      category: categories['Business & Finance']._id,
      tags: ['business', 'finance', 'economy', 'inflation', 'sample-seed'],
      status: 'live',
      isBreaking: false,
      priority: 'normal',
      views: 740,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    {
      title: 'Next-Generation Quantum Computer Unveiled by Tech Startup',
      excerpt: 'A promising startup has revealed a 120-qubit quantum processor capable of operating at room temperature, potentially accelerating real-world applications.',
      paragraphs: [
        'Quantum computing has long been restricted by the need for extreme sub-zero cooling. Today, a Silicon Valley startup announced a major breakthrough: a stable quantum processor that functions at ambient temperature.',
        'If verified independently, this technology could revolutionise cryptography, drug discovery, and logistics optimization. "This is the transistor moment for quantum systems," said the CEO during a live demonstration.',
        'Several tech giants have already expressed interest in partnerships, and early developer access to the cloud quantum API is scheduled to open next month.'
      ],
      featuredImage: {
        url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop',
        alt: 'Abstract technology quantum physics experiment visualization'
      },
      category: categories['Technology']._id,
      tags: ['technology', 'quantum', 'computing', 'breakthrough', 'sample-seed'],
      status: 'live',
      isBreaking: false,
      priority: 'normal',
      views: 4120, // highest views to top the trending charts
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
    {
      title: 'New Infrastructure Project Promises to Revitalise City Transit',
      excerpt: 'City council approves a $3.2 billion urban transit project featuring high-speed electric bus lanes and extensive bicycle highway networks.',
      paragraphs: [
        'Commuters in the metropolitan area can look forward to significantly shorter travel times. The city council voted overwhelmingly to fund the "Green Transit Initiative," a massive infrastructure overhaul starting next spring.',
        'The project aims to reduce traffic congestion and carbon emissions by introducing dedicated lanes for smart, electric transit buses and connecting suburban areas with over 50 miles of protected bicycle lanes.',
        'Construction is expected to take three years and create thousands of local jobs, although some residents are concerned about temporary road closures and traffic delays during construction phases.'
      ],
      featuredImage: {
        url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1200&auto=format&fit=crop',
        alt: 'Modern red electric bus on city street'
      },
      category: categories['Politics']._id,
      tags: ['politics', 'infrastructure', 'transit', 'city', 'sample-seed'],
      status: 'live',
      isBreaking: false,
      priority: 'normal',
      views: 520,
      publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
    {
      title: 'Draft Article - Upcoming Gadget Leak',
      excerpt: 'This is a draft article that should not be visible on the public frontend.',
      paragraphs: [
        'This article contains leaked specifications of an upcoming smartphone. It is currently in draft mode and should not be public.'
      ],
      featuredImage: {
        url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop',
        alt: 'Smartphone close up'
      },
      category: categories['Technology']._id,
      tags: ['technology', 'leak', 'draft', 'sample-seed'],
      status: 'draft',
      isBreaking: false,
      priority: 'normal',
      views: 0,
      publishedAt: null,
    }
  ];

  for (const postData of postsData) {
    // Generate Tiptap JSON content
    const content = createTiptapJSON(postData.paragraphs);
    
    // Generate simple contentHtml snapshot for rendering compatibility
    const contentHtml = postData.paragraphs.map(p => `<p>${p}</p>`).join('');

    // Calculate reading time roughly (words / 200)
    const wordCount = postData.paragraphs.join(' ').split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    const post = await Post.create({
      title: postData.title,
      excerpt: postData.excerpt,
      content,
      contentHtml,
      featuredImage: postData.featuredImage,
      category: postData.category,
      tags: postData.tags,
      status: postData.status,
      isBreaking: postData.isBreaking,
      breakingExpiresAt: postData.breakingExpiresAt,
      priority: postData.priority,
      author: author._id,
      publishedAt: postData.publishedAt,
      views: postData.views,
      readingTimeMinutes
    });

    console.log(`   Created article: ${post.title} (Status: ${post.status}, Slug: ${post.slug})`);
  }

  console.log('\n🎉 Database seeding completed successfully!');
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
