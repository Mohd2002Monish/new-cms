/**
 * Seed Script — Create Multilingual Sample Categories and Articles (EN, HI, GU)
 * Run: node scripts/seed-articles.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { slugify } from '../src/utils/slugify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not defined in .env');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  role: { type: String, default: 'editor' },
  status: { type: String, default: 'active' },
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  nameTranslations: {
    hi: { type: String, trim: true, default: '' },
    gu: { type: String, trim: true, default: '' },
  },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

categorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
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
  language: { type: String, enum: ['en', 'hi', 'gu'], default: 'en', index: true },
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
  isSlider: { type: Boolean, default: false },
  sliderOrder: { type: Number, default: 0 },
  priority: { type: String, default: 'normal' },
  breakingExpiresAt: { type: Date, default: null },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: { type: Date, default: null },
  views: { type: Number, default: 0 },
  readingTimeMinutes: { type: Number, default: 1 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

postSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    const base = slugify(this.title) || 'news';
    this.slug = `${base}-${Date.now().toString().slice(-6)}`;
  }
  next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

const CATEGORIES_DATA = [
  {
    name: 'Technology',
    nameTranslations: { hi: 'टेक्नोलॉजी', gu: 'ટેકનોલોજી' },
    description: 'Gadgets, software, artificial intelligence, and the future of tech.',
    order: 1,
  },
  {
    name: 'Politics',
    nameTranslations: { hi: 'राजनीति', gu: 'રાજકારણ' },
    description: 'Local, national, and global political updates and analysis.',
    order: 2,
  },
  {
    name: 'Sports',
    nameTranslations: { hi: 'खेल', gu: 'રમતગમત' },
    description: 'Football, basketball, cricket, Olympics, and other major sporting events.',
    order: 3,
  },
  {
    name: 'Entertainment',
    nameTranslations: { hi: 'मनोरंजन', gu: 'મનોરંજન' },
    description: 'Movies, music, celebrity culture, television, and pop culture.',
    order: 4,
  },
  {
    name: 'Business & Finance',
    nameTranslations: { hi: 'व्यापार और वित्त', gu: 'વેપાર અને વાણિજ્ય' },
    description: 'Stock market, economy, startups, personal finance, and corporate updates.',
    order: 5,
  }
];

function createTiptapJSON(paragraphs) {
  return {
    type: 'doc',
    content: paragraphs.map(p => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p }]
    }))
  };
}

async function seed() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to database.');

  let author = await User.findOne({ role: 'admin' }) || await User.findOne({});
  if (!author) {
    author = await User.create({
      name: 'Super Admin',
      email: 'admin@newscms.com',
      role: 'admin',
      status: 'active'
    });
  }
  console.log(`👤 Using Author: ${author.name} (${author._id})`);

  console.log('📂 Seeding Categories with Translations...');
  const categories = {};
  for (const catData of CATEGORIES_DATA) {
    let cat = await Category.findOne({ name: catData.name });
    if (!cat) {
      cat = await Category.create({ ...catData, createdBy: author._id });
    } else {
      cat.nameTranslations = catData.nameTranslations;
      cat.order = catData.order;
      await cat.save();
    }
    categories[cat.name] = cat;
  }

  console.log('🗑️ Clearing existing sample posts...');
  await Post.deleteMany({ tags: 'sample-seed' });

  console.log('📰 Seeding Rich Multilingual Sample Articles (EN, HI, GU)...');

  const postsData = [
    // ══════════════════════════════════════════════════════════════════════════
    // ENGLISH ARTICLES (10 items: 5 for rails + 5 for infinite stream)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: 'The Rise of Generative AI: Transforming Daily Workflows',
      language: 'en',
      excerpt: 'Generative AI is shifting from novelty to daily necessity for workers worldwide.',
      paragraphs: ['Generative AI technologies have grown at an unprecedented rate, saving hours of manual labor every week.', 'Industry analysts estimate that generative AI could add up to $4.4 trillion annually.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1200&auto=format&fit=crop', alt: 'AI' },
      category: categories['Technology']._id,
      tags: ['technology', 'ai', 'sample-seed'],
      status: 'live', isBreaking: true, isSlider: true, sliderOrder: 1, views: 4200, publishedAt: new Date(Date.now() - 1 * 3600000),
    },
    {
      title: 'Autonomous Electric Air Taxis Complete First City Flight Trial',
      language: 'en',
      excerpt: 'Urban air mobility reaches a major milestone as autonomous eVTOL aircraft pass tests.',
      paragraphs: ['Urban transportation is taking to the skies with zero-emission electric air vehicles.', 'Commercial operations targeted for early 2028.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1200&auto=format&fit=crop', alt: 'City' },
      category: categories['Technology']._id,
      tags: ['technology', 'aviation', 'sample-seed'],
      status: 'live', isBreaking: false, views: 1820, publishedAt: new Date(Date.now() - 3 * 3600000),
    },
    {
      title: 'Next-Gen Quantum Chips Operating at Room Temperature',
      language: 'en',
      excerpt: 'Breakthrough processor eliminates need for extreme sub-zero cooling environments.',
      paragraphs: ['A semiconductor consortium has demonstrated a 128-qubit quantum chip running in ambient room temperature.', 'Opens the door for datacenter integration.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop', alt: 'Quantum' },
      category: categories['Technology']._id,
      tags: ['technology', 'quantum', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2450, publishedAt: new Date(Date.now() - 7 * 3600000),
    },
    {
      title: 'Global Climate Summit Reaches Landmark Green Energy Agreement',
      language: 'en',
      excerpt: 'Over 190 nations commit to tripling global renewable energy capacity by 2030.',
      paragraphs: ['Delegates in Geneva signed a binding pact establishing strict emissions benchmarks and green finance pools.', 'Praised by world leaders as a historic step forward.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop', alt: 'Landscape' },
      category: categories['Politics']._id,
      tags: ['politics', 'climate', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2980, publishedAt: new Date(Date.now() - 4 * 3600000),
    },
    {
      title: 'Digital Governance Bill Passed to Protect Consumer Privacy Online',
      language: 'en',
      excerpt: 'New legislative framework introduces strict biometric protections and algorithmic accountability.',
      paragraphs: ['Lawmakers have approved landmark data privacy legislation with bipartisan support.', 'Tech platforms face substantial fines for non-compliance.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=1200&auto=format&fit=crop', alt: 'Parliament' },
      category: categories['Politics']._id,
      tags: ['politics', 'policy', 'privacy', 'sample-seed'],
      status: 'live', isBreaking: false, views: 1650, publishedAt: new Date(Date.now() - 12 * 3600000),
    },
    {
      title: 'Championship Finals: Underdogs Secure Dramatic Last-Minute Victory',
      language: 'en',
      excerpt: 'Stunning 3-2 victory in extra time clinches team first-ever major silverware.',
      paragraphs: ['A 94th-minute header settled one of the most exhilarating tournament finals in recent football history.', 'Fans celebrated long into the night.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop', alt: 'Stadium' },
      category: categories['Sports']._id,
      tags: ['sports', 'football', 'sample-seed'],
      status: 'live', isBreaking: false, views: 3450, publishedAt: new Date(Date.now() - 5 * 3600000),
    },
    {
      title: 'Grand Slam Record: Teen Sensation Reaches World Number One Ranking',
      language: 'en',
      excerpt: 'Flawless baseline play and relentless composure crown youngest ever top-ranked player.',
      paragraphs: ['With back-to-back Grand Slam victories on hardcourt and clay, tennis has a new defining figure.', 'Critics praise tactical maturity and mental strength.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop', alt: 'Tennis' },
      category: categories['Sports']._id,
      tags: ['sports', 'tennis', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2780, publishedAt: new Date(Date.now() - 15 * 3600000),
    },
    {
      title: 'Highly Anticipated Sci-Fi Sequel Shines at Summer Box Office',
      language: 'en',
      excerpt: 'Blockbuster shatters opening weekend records with $185M debut and rave reviews.',
      paragraphs: ['Visual mastery and emotional storytelling deliver the biggest cinema opening of the decade.', 'Audiences flock back to IMAX theaters in record numbers.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop', alt: 'Cinema' },
      category: categories['Entertainment']._id,
      tags: ['entertainment', 'movies', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2890, publishedAt: new Date(Date.now() - 8 * 3600000),
    },
    {
      title: 'Renewable Energy Investments Outpace Fossil Fuels for Third Consecutive Year',
      language: 'en',
      excerpt: 'Clean energy capital expenditures top $1.8 trillion as solar and grid batteries surge.',
      paragraphs: ['Global capital markets have decisively favored renewable utility scale projects over traditional hydrocarbon extraction.', 'Economics rather than mandates now drive the shift.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=1200&auto=format&fit=crop', alt: 'Windmills' },
      category: categories['Business & Finance']._id,
      tags: ['business', 'cleanenergy', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2340, publishedAt: new Date(Date.now() - 10 * 3600000),
    },
    {
      title: 'Global Chip Demand Drives Tech Equities to Historic Milestones',
      language: 'en',
      excerpt: 'Surging demand for enterprise AI hardware powers major index advances across Asian and US markets.',
      paragraphs: ['Semiconductor foundries reported full-capacity production bookings through 2027.', 'Leading indices posted consecutive record closes.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop', alt: 'Finance' },
      category: categories['Business & Finance']._id,
      tags: ['business', 'stocks', 'sample-seed'],
      status: 'live', isBreaking: false, views: 3120, publishedAt: new Date(Date.now() - 16 * 3600000),
    },

    // ══════════════════════════════════════════════════════════════════════════
    // HINDI ARTICLES (हिन्दी समाचार — 10 items)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: 'भारत में 6G तकनीक पर तेज़ी से काम शुरू: दूरसंचार विभाग ने जारी किया नया विज़न डॉक्युमेंट',
      language: 'hi',
      excerpt: 'भारत सरकार ने 6G वायरलेस नेटवर्क के अनुसंधान और विकास के लिए 120 से अधिक पेटेंट दाखिल किए।',
      paragraphs: ['भारत ने 5G नेटवर्क के सबसे तेज़ राष्ट्रव्यापी विस्तार के बाद अब अगली पीढ़ी की 6G वायरलेस तकनीक पर काम तेज़ कर दिया है।', '2030 तक भारत को वैश्विक दूरसंचार मानकों में अग्रणी बनाने का लक्ष्य।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop', alt: '6G नेटवर्क' },
      category: categories['Technology']._id,
      tags: ['technology', '6g', 'sample-seed'],
      status: 'live', isBreaking: true, isSlider: true, sliderOrder: 1, views: 4200, publishedAt: new Date(Date.now() - 1 * 3600000),
    },
    {
      title: 'भारतीय वैज्ञानिकों ने विकसित किया स्वदेशी AI भाषा मॉडल: 22 भारतीय भाषाओं में सक्षम',
      language: 'hi',
      excerpt: 'आईआईटी और सेंटर फॉर डेवलपमेंट ऑफ एडवांस्ड कंप्यूटिंग ने मिलकर बनाया बहुभाषी मॉडल।',
      paragraphs: ['यह नया मॉडल अंग्रेजी के अलावा सभी प्रमुख भारतीय भाषाओं में जटिल अनुवाद और कोडिंग कर सकता है।', 'शिक्षा और स्वास्थ्य सेवा में इसका मुफ्त उपयोग किया जाएगा।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1200&auto=format&fit=crop', alt: 'एआई मॉडल' },
      category: categories['Technology']._id,
      tags: ['technology', 'ai', 'india', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2950, publishedAt: new Date(Date.now() - 4 * 3600000),
    },
    {
      title: 'डिजिटल इंडिया पहल: ग्रामीण क्षेत्रों में 50,000 नए जन सेवा केंद्र शुरू',
      language: 'hi',
      excerpt: 'दूरदराज के गांवों में 300 से अधिक सरकारी सेवाएं अब एक ही छत के नीचे ऑनलाइन उपलब्ध।',
      paragraphs: ['ग्रामीण विकास मंत्रालय ने देश भर के दूरदराज के क्षेत्रों में 50,000 नए कॉमन सर्विस सेंटर (CSC) शुरू किए हैं।', 'बिचौलियों की भूमिका समाप्त होगी और ग्रामीण अर्थव्यवस्था को प्रत्यक्ष गति मिलेगी।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=1200&auto=format&fit=crop', alt: 'डिजिटल भारत' },
      category: categories['Politics']._id,
      tags: ['politics', 'digitalindia', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2600, publishedAt: new Date(Date.now() - 6 * 3600000),
    },
    {
      title: 'संसद में राष्ट्रीय स्वच्छ ऊर्जा नीति 2026 पारित: सौर ऊर्जा ग्रिड को 50,000 करोड़ का पैकेज',
      language: 'hi',
      excerpt: 'देशभर में रूफटॉप सोलर और ग्रीन हाइड्रोजन परियोजनाओं को त्वरित गति देने के लिए ऐतिहासिक कानून।',
      paragraphs: ['पर्यावरण और ऊर्जा सुरक्षा को सुदृढ़ करते हुए संसद ने नए विधेयक को सर्वसम्मति से पारित कर दिया है।', 'आने वाले 5 वर्षों में जीवाश्म ईंधन पर निर्भरता में 35% कमी का लक्ष्य।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=1200&auto=format&fit=crop', alt: 'सोलर पैनल' },
      category: categories['Politics']._id,
      tags: ['politics', 'energy', 'parliament', 'sample-seed'],
      status: 'live', isBreaking: false, views: 1850, publishedAt: new Date(Date.now() - 14 * 3600000),
    },
    {
      title: 'टी20 विश्वकप की तैयारियों में जुटी टीम इंडिया, युवा खिलाड़ियों ने अभ्यास सत्र में दिखाया दम',
      language: 'hi',
      excerpt: 'कप्तान और कोच की देखरेख में बेंगलुरु के नेशनल क्रिकेट अकादमी में कड़ा ट्रेनिंग कैंप शुरू।',
      paragraphs: ['आगामी विश्व कप को ध्यान में रखते हुए भारतीय क्रिकेट टीम ने हाई-इंटेन्सिटी ट्रेनिंग कैंप शुरू कर दिया है।', 'डेथ ओवर्स में यॉर्कर और आक्रामक पावरप्ले बल्लेबाजी पर विशेष ध्यान।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop', alt: 'क्रिकेट पिच' },
      category: categories['Sports']._id,
      tags: ['sports', 'cricket', 'sample-seed'],
      status: 'live', isBreaking: false, views: 3100, publishedAt: new Date(Date.now() - 8 * 3600000),
    },
    {
      title: 'एशियाई एथलेटिक्स चैंपियनशिप: भारत ने भाला फेंक और रिले दौड़ में जीते 3 स्वर्ण पदक',
      language: 'hi',
      excerpt: 'भारतीय दल ने चैंपियनशिप में रचा इतिहास, पदक तालिका में शीर्ष तीन में बनाई जगह।',
      paragraphs: ['युवा भाला फेंक एथलीट ने 89.4 मीटर का थ्रो कर स्वर्ण पदक जीता।', 'भारतीय 4x400 मीटर रिले टीम ने राष्ट्रीय रिकॉर्ड भी तोड़ा।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1200&auto=format&fit=crop', alt: 'एथलेटिक्स' },
      category: categories['Sports']._id,
      tags: ['sports', 'athletics', 'goldmedal', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2400, publishedAt: new Date(Date.now() - 18 * 3600000),
    },
    {
      title: 'बॉक्स ऑफिस पर ऐतिहासिक रिकॉर्ड: भारतीय सिनेमा की नई एक्शन थ्रिलर ने पहले दिन कमाए 120 करोड़',
      language: 'hi',
      excerpt: 'सिनेमाघरों में दर्शकों का जबरदस्त उत्साह, क्रिटिक्स ने विजुअल इफेक्ट्स और अभिनय की तारीफ की।',
      paragraphs: ['बहुप्रतीक्षित एक्शन-ड्रामा फिल्म ने रिलीज होते ही बॉक्स ऑफिस पर नया इतिहास रच दिया है।', 'देश भर में सुबह 6 बजे से ही शो हाउसफुल चल रहे हैं।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1200&auto=format&fit=crop', alt: 'सिनेमा' },
      category: categories['Entertainment']._id,
      tags: ['entertainment', 'cinema', 'bollywood', 'sample-seed'],
      status: 'live', isBreaking: false, views: 3890, publishedAt: new Date(Date.now() - 5 * 3600000),
    },
    {
      title: 'भारतीय संगीत का डंका: ग्रैमी अवॉर्ड्स में भारतीय शास्त्रीय और फ्यूजन एल्बम को मिला नामांकन',
      language: 'hi',
      excerpt: 'भारतीय वाद्ययंत्रों और पश्चिमी ऑर्केस्ट्रा के संयोजन से तैयार एल्बम ने विदेशी समीक्षकों का दिल जीता।',
      paragraphs: ['सितार और तबला के साथ सिम्फनी ऑर्केस्ट्रा का यह फ्यूजन संगीत दुनिया भर में चार्टबस्टर बन गया है।', 'ग्रैमी जूरी ने इसे वर्ष का सबसे मौलिक संगीत प्रयोग करार दिया।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop', alt: 'संगीत' },
      category: categories['Entertainment']._id,
      tags: ['entertainment', 'music', 'grammy', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2150, publishedAt: new Date(Date.now() - 22 * 3600000),
    },
    {
      title: 'भारतीय यूपीआई तकनीक को वैश्विक स्वीकृति: 12 नए देशों में शुरू हुआ निर्बाध डिजिटल भुगतान',
      language: 'hi',
      excerpt: 'अंतरराष्ट्रीय यात्रियों और प्रवासी भारतीयों के लिए अब विदेशी धरती पर भी भारतीय यूपीआई से भुगतान संभव।',
      paragraphs: ['NPCI ने 12 नए देशों के साथ द्विपक्षीय समझौता पूरा किया।', 'विदेशों में भी स्थानीय दुकानों पर साधारण क्यूआर कोड स्कैन करके भारतीय बैंक खाते से भुगतान हो सकेगा।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1556742049-0a67e557224d?q=80&w=1200&auto=format&fit=crop', alt: 'यूपीआई' },
      category: categories['Business & Finance']._id,
      tags: ['business', 'upi', 'fintech', 'sample-seed'],
      status: 'live', isBreaking: false, views: 3400, publishedAt: new Date(Date.now() - 11 * 3600000),
    },
    {
      title: 'भारतीय शेयर बाजार में चौतरफा तेजी: सेंसेक्स पहली बार 85,000 के ऐतिहासिक स्तर के पार',
      language: 'hi',
      excerpt: 'मजबूत जीडीपी आंकड़ों और विदेशी संस्थागत निवेशकों की भारी लिवाली से बाजार में शानदार उछाल।',
      paragraphs: ['बैंकिंग, आईटी और ऑटोमोबाइल सेक्टर में रिकॉर्ड खरीदारी देखने को मिली।', 'खुदरा निवेशकों की संपत्ति में आज एक ही दिन में 4 लाख करोड़ से अधिक का इजाफा हुआ।'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop', alt: 'स्टॉक मार्केट' },
      category: categories['Business & Finance']._id,
      tags: ['business', 'sensex', 'stockmarket', 'sample-seed'],
      status: 'live', isBreaking: false, views: 3600, publishedAt: new Date(Date.now() - 13 * 3600000),
    },

    // ══════════════════════════════════════════════════════════════════════════
    // GUJARATI ARTICLES (ગુજરાતી સમાચાર — 10 items)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: 'ગુજરાતમાં ભારતની પ્રથમ સેમિકન્ડક્ટર ફેબ્રિકેશન સુવિધા શરૂ: હજારો યુવાનો માટે નવી તકો',
      language: 'gu',
      excerpt: 'ધોલેરા અને સાણંદમાં વૈશ્વિક કક્ષાના સેમિકન્ડક્ટર પ્લાન્ટનું નિર્માણ પૂરજોશમાં.',
      paragraphs: ['ગુજરાત હવે વિશ્વના ગ્લોબલ સેમિકન્ડક્ટર મેન્યુફેક્ચરિંગ નકશા પર અગ્રણી સ્થાન પ્રાપ્ત કરવા જઈ રહ્યું છે.', '20,000 થી વધુ યુવાનો માટે સીધી હાઇ-ટેક રોજગારીનું સર્જન થશે.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop', alt: 'સેમિકન્ડક્ટર' },
      category: categories['Technology']._id,
      tags: ['technology', 'semiconductor', 'gujarat', 'sample-seed'],
      status: 'live', isBreaking: true, isSlider: true, sliderOrder: 1, views: 3650, publishedAt: new Date(Date.now() - 1 * 3600000),
    },
    {
      title: 'ગિફ્ટ સિટીમાં આર્ટિફિશિયલ ઇન્ટેલિજન્સ રિસર્ચ હબની જાહેરાત: વૈશ્વિક ટેક જાયન્ટ્સ કરશે રોકાણ',
      language: 'gu',
      excerpt: 'ગાંધીનગર ખાતે એડવાન્સ્ડ ડેટા સાયન્સ અને ક્લાઉડ કમ્પ્યુટિંગ સેન્ટર સ્થપાશે.',
      paragraphs: ['ગિફ્ટ સિટીમાં ટેકનોલોજી સેક્ટરનો અભૂતપૂર્વ વિસ્તાર થઈ રહ્યો છે.', 'આંતરરાષ્ટ્રીય સ્તરનું એઆઈ ઇનોવેશન સેન્ટર ભારત અને એશિયા પેસિફિક ક્ષેત્ર માટે કામ કરશે.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop', alt: 'ગિફ્ટ સિટી' },
      category: categories['Technology']._id,
      tags: ['technology', 'giftcity', 'ai', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2800, publishedAt: new Date(Date.now() - 5 * 3600000),
    },
    {
      title: 'ગુજરાત વિધાનસભામાં નવી ઈ-વ્હીકલ પોલિસી મંજૂર: નાગરિકોને સબસિડી અને ચાર્જિંગ સ્ટેશન નેટવર્ક',
      language: 'gu',
      excerpt: 'રાજ્યના તમામ મુખ્ય હાઈવે પર દર 25 કિલોમીટરે ફાસ્ટ ચાર્જિંગ સુવિધા ઊભી કરવામાં આવશે.',
      paragraphs: ['પર્યાવરણની સુરક્ષા અને ઈંધણ ખર્ચ ઘટાડવા માટે સરકારે નવી પ્રોત્સાહક યોજના જાહેર કરી છે.', 'ઈલેક્ટ્રિક વાહનોની ખરીદી પર ખાસ નાણાકીય છૂટછાટ આપવામાં આવશે.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=1200&auto=format&fit=crop', alt: 'ઈલેક્ટ્રિક કાર' },
      category: categories['Politics']._id,
      tags: ['politics', 'ev', 'gujarat', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2100, publishedAt: new Date(Date.now() - 9 * 3600000),
    },
    {
      title: 'કચ્છમાં વિશ્વના સૌથી મોટા રિન્યુએબલ એનર્જી પાર્કનું 70% કાર્ય પૂર્ણ: દેશને મળશે વિપુલ વીજળી',
      language: 'gu',
      excerpt: 'ખાવડા ખાતે 30,000 મેગાવોટ ક્ષમતા ધરાવતો સોલર-વિન્ડ હાઇબ્રિડ પ્લાન્ટ આકાર લઈ રહ્યો છે.',
      paragraphs: ['રણના વિશાળ પટમાં ફેલાયેલો આ પ્રોજેક્ટ દેશની ગ્રીન એનર્જી ક્રાંતિની કરોડરજ્જુ સાબિત થશે.', 'આગામી વર્ષથી સંપૂર્ણ ક્ષમતા સાથે વીજ ઉત્પાદન શરૂ થશે.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=1200&auto=format&fit=crop', alt: 'કચ્છ સોલર પાર્ક' },
      category: categories['Politics']._id,
      tags: ['politics', 'kutch', 'greenenergy', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2750, publishedAt: new Date(Date.now() - 17 * 3600000),
    },
    {
      title: 'ગુજરાત ટાઇટન્સનો નવો કેમ્પ: યુવા ઓલરાઉન્ડરોનું ઉત્કૃષ્ટ પ્રદર્શન અને કઠિન અભ્યાસ',
      language: 'gu',
      excerpt: 'અમદાવાદના નરેન્દ્ર મોદી સ્ટેડિયમ ખાતે સ્થાનિક ખેલાડીઓની પ્રતિભા નિખારવા પર ભાર.',
      paragraphs: ['આગામી સ્પર્ધાત્મક સીઝનને ધ્યાનમાં રાખીને ગુજરાત ટાઇટન્સે અમદાવાદ ખાતે બે સપ્તાહના ખાસ કેમ્પનું આયોજન કર્યું છે.', 'યુવા પ્રતિભાઓમાં અદભુત જોશ જોવા મળી રહ્યો છે.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop', alt: 'ક્રિકેટ મેદાન' },
      category: categories['Sports']._id,
      tags: ['sports', 'cricket', 'gujarat', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2450, publishedAt: new Date(Date.now() - 7 * 3600000),
    },
    {
      title: 'નેશનલ ગેમ્સમાં ગુજરાતના સ્વિમર્સે જીત્યા 4 મેડલ: સ્વિમિંગમાં રાજ્યનો નવો રેકોર્ડ',
      language: 'gu',
      excerpt: 'રાજકોટના યુવા તરવૈયાએ 100 મીટર બેકસ્ટ્રોકમાં નવો નેશનલ મીટ રેકોર્ડ બનાવ્યો.',
      paragraphs: ['ગુજરાતના રમતવીરો રાષ્ટ્રીય કક્ષાએ ઉત્કૃષ્ટ દેખાવ કરીને ગૌરવ વધારી રહ્યા છે.', 'રાજ્ય સરકારની સ્પોર્ટ્સ સ્કોલરશિપ યોજનાના પરિણામો હવે મેદાન પર દેખાઈ રહ્યા છે.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=1200&auto=format&fit=crop', alt: 'સ્વિમિંગ' },
      category: categories['Sports']._id,
      tags: ['sports', 'swimming', 'nationalgames', 'sample-seed'],
      status: 'live', isBreaking: false, views: 1980, publishedAt: new Date(Date.now() - 19 * 3600000),
    },
    {
      title: 'ગુજરાતી સિનેમાનો સુવર્ણ કાળ: આંતરરાષ્ટ્રીય ફિલ્મ ફેસ્ટિવલમાં ગુજરાતી ફિલ્મને મળ્યો સર્વોચ્ચ એવોર્ડ',
      language: 'gu',
      excerpt: 'ગામડાની અનોખી વાર્તા અને માનવીય સંબંધોને ઉજાગર કરતી ફિલ્મે વિશ્વ મંચ પર ગુજરાતનું નામ રોશન કર્યું.',
      paragraphs: ['યુરોપ ખાતે યોજાયેલા પ્રતિષ્ઠિત ફિલ્મ મહોત્સવમાં ગુજરાતી ફીચર ફિલ્મને બેસ્ટ ઇન્ટરનેશનલ ફિલ્મનો એવોર્ડ મળ્યો છે.', 'ટૂંક સમયમાં સિનેમાઘરોમાં રિલીઝ થશે.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1200&auto=format&fit=crop', alt: 'ગુજરાતી ફિલ્મ' },
      category: categories['Entertainment']._id,
      tags: ['entertainment', 'cinema', 'gujaratifilms', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2150, publishedAt: new Date(Date.now() - 6 * 3600000),
    },
    {
      title: 'અમદાવાદમાં આંતરરાષ્ટ્રીય પુસ્તક મેળો: હજારો પુસ્તકપ્રેમીઓ અને લેખકોનો મેળાવડો',
      language: 'gu',
      excerpt: 'સાબરમતી રિવરફ્રન્ટ ખાતે પુસ્તક મેળાનો ભવ્ય પ્રારંભ, 300 થી વધુ પ્રકાશકો સહભાગી થયા.',
      paragraphs: ['ગુજરાતી, હિન્દી અને અંગ્રેજી સાહિત્યના શ્રેષ્ઠ પુસ્તકો ઉપરાંત ડિજિટલ વાચન માટે પણ ખાસ પેવેલિયન ઊભા કરાયા છે.', 'યુવા પેઢીમાં પુસ્તક વાચનનો ક્રેઝ વધી રહ્યો છે.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1200&auto=format&fit=crop', alt: 'પુસ્તક મેળો' },
      category: categories['Entertainment']._id,
      tags: ['entertainment', 'books', 'ahmedabad', 'sample-seed'],
      status: 'live', isBreaking: false, views: 1950, publishedAt: new Date(Date.now() - 21 * 3600000),
    },
    {
      title: 'શેરબજારમાં રેકોર્ડબ્રેક તેજી: સેન્સેક્સ અને નિફ્ટી ઐતિહાસિક ઓલ-ટાઈમ હાઈ સપાટીએ પહોંચ્યા',
      language: 'gu',
      excerpt: 'બેન્કિંગ, આઈટી અને રિન્યુએબલ એનર્જી શેરોમાં ભારે લેવાલીથી રોકાણકારોની સંપત્તિમાં લાખો કરોડોનો વધારો.',
      paragraphs: ['ભારતીય અર્થતંત્રના મજબૂત પાયા અને વિદેશી મૂડીરોકાણના પ્રવાહને લીધે બજારમાં ઉત્સાહનો માહોલ છે.', 'ગુજરાત બેઝ્ડ લિસ્ટેડ કંપનીઓના શેરોમાં પણ મોટો ઉછાળો જોવા મળ્યો.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop', alt: 'શેરબજાર' },
      category: categories['Business & Finance']._id,
      tags: ['business', 'sensex', 'stockmarket', 'sample-seed'],
      status: 'live', isBreaking: false, views: 2900, publishedAt: new Date(Date.now() - 3 * 3600000),
    },
    {
      title: 'સુરત હીરા બુર્સમાં નિકાસનો નવો રેકોર્ડ: વૈશ્વિક જેમ્સ એન્ડ જ્વેલરી માર્કેટમાં ભારતનો દબદબો',
      language: 'gu',
      excerpt: 'સુરતથી સીધા યુરોપ અને અમેરિકા ખાતે લેબ-ગ્રોન ડાયમંડ્સ અને પોલિશ્ડ હીરાની નિકાસમાં 40% નો વધારો.',
      paragraphs: ['સુરત ડાયમંડ બુર્સ સંપૂર્ણ કાર્યરત થતાં વૈશ્વિક ખરીદદારોનો સીધો પ્રવાહ સુરત તરફ વળ્યો છે.', 'હજારો સ્થાનિક કારીગરો માટે સોનેરી તકોનું સર્જન થયું છે.'],
      featuredImage: { url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop', alt: 'હીરા ઉદ્યોગ' },
      category: categories['Business & Finance']._id,
      tags: ['business', 'surat', 'diamond', 'export', 'sample-seed'],
      status: 'live', isBreaking: false, views: 3300, publishedAt: new Date(Date.now() - 15 * 3600000),
    }
  ];

  for (const postData of postsData) {
    const content = createTiptapJSON(postData.paragraphs);
    const contentHtml = postData.paragraphs.map(p => `<p>${p}</p>`).join('');
    const wordCount = postData.paragraphs.join(' ').split(/\s+/).length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    const post = await Post.create({
      title: postData.title,
      language: postData.language,
      excerpt: postData.excerpt,
      content,
      contentHtml,
      featuredImage: postData.featuredImage,
      category: postData.category,
      tags: postData.tags,
      status: postData.status,
      isBreaking: postData.isBreaking || false,
      isSlider: postData.isSlider || false,
      sliderOrder: postData.sliderOrder || 0,
      breakingExpiresAt: postData.breakingExpiresAt || null,
      priority: postData.priority || 'normal',
      author: author._id,
      publishedAt: postData.publishedAt,
      views: postData.views,
      readingTimeMinutes
    });

    console.log(`   [${post.language.toUpperCase()}] Created: "${post.title.slice(0, 38)}..." (Slug: ${post.slug})`);
  }

  console.log('\n🎉 Multilingual database seeding completed successfully!');
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
