/**
 * One-time migration for multilingual support.
 *
 * 1. Drops the old English-analyzer text index on posts (it stemmed with
 *    English rules and would misread the new `language` field).
 * 2. Backfills `language: 'en'` on all existing posts.
 * 3. Rebuilds indexes to match the current schemas.
 *
 * Run from backend/:  node scripts/migrate-multilingual.js
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { Post } from '../src/models/Post.js';
import { Category } from '../src/models/Category.js';

const run = async () => {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const collection = mongoose.connection.db.collection('posts');
  const indexes = await collection.indexes();
  const textIndex = indexes.find((ix) => ix.key && ix.key._fts === 'text');
  if (textIndex && textIndex.default_language !== 'none') {
    console.log(`Dropping old text index "${textIndex.name}" (default_language: ${textIndex.default_language || 'english'})`);
    await collection.dropIndex(textIndex.name);
  } else {
    console.log('Text index already multilingual-safe or absent — skipping drop');
  }

  const backfill = await collection.updateMany(
    { language: { $exists: false } },
    { $set: { language: 'en', translationGroup: null } }
  );
  console.log(`Backfilled language='en' on ${backfill.modifiedCount} posts`);

  console.log('Syncing Post indexes…');
  await Post.syncIndexes();
  console.log('Syncing Category indexes…');
  await Category.syncIndexes();

  console.log('Migration complete ✔');
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
