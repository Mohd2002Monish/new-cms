import cron from 'node-cron';
import { Post } from '../models/Post.js';
import * as audit from './audit.service.js';
import * as notification from './notification.service.js';

export const startCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find all scheduled posts whose time has come
      const postsToPublish = await Post.find({
        status: 'scheduled',
        scheduledPublishAt: { $lte: now },
        deletedAt: null
      });

      if (postsToPublish.length > 0) {
        console.log(`Cron: Found ${postsToPublish.length} scheduled posts to publish.`);
      }

      for (const post of postsToPublish) {
        const previousState = { status: post.status };
        post.status = 'live';
        post.publishedAt = now;
        await post.save();

        await audit.log({
          req: { user: { _id: 'system', role: 'system', name: 'Cron Job' }, ip: '127.0.0.1', headers: { 'user-agent': 'node-cron' } }, 
          action: 'POST_PUBLISHED_SCHEDULED', 
          targetType: 'Post', 
          targetId: post._id, 
          targetLabel: post.title,
          previousState, 
          newState: { status: 'live' }
        });

        await notification.create({
          recipientId: post.author,
          type: 'POST_PUBLISHED',
          message: `Your scheduled post "${post.title}" is now live!`,
          relatedModel: 'Post',
          relatedId: post._id,
        });
      }
    } catch (error) {
      console.error('Error in scheduled publishing cron job:', error);
    }
  });

  console.log('Cron jobs initialized.');
};
