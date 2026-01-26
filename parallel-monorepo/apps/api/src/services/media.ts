import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

export class MediaService {
  private static isConfigured = false;

  private static configure() {
    if (this.isConfigured) return;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    this.isConfigured = true;
    console.log('[MEDIA] Cloudinary configured with:', process.env.CLOUDINARY_CLOUD_NAME);
  }

  /**
   * Uploads an external image URL to Cloudinary and returns the optimized URL.
   */
  static async uploadImage(url: string, folder: string = 'listings'): Promise<string> {
    this.configure();
    console.log(`[CLOUDINARY] Uploading: ${url.substring(0, 40)}...`);
    try {
      const result = await cloudinary.uploader.upload(url, {
        folder: `parallel/${folder}`,
      });
      console.log(`[CLOUDINARY] SUCCESS: ${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      console.error('[CLOUDINARY] ERROR:', error);
      return url;
    }
  }

  /**
   * Uploads multiple images and returns the array of new URLs
   */
  static async uploadMany(urls: string[], folder?: string): Promise<string[]> {
    if (!urls || urls.length === 0) return [];
    console.log(`[MEDIA] Starting batch upload for ${urls.length} images`);
    
    const results = [];
    for (const url of urls) {
      const newUrl = await this.uploadImage(url, folder);
      results.push(newUrl);
    }
    
    console.log(`[MEDIA] Batch upload complete. First URL: ${results[0]?.substring(0, 40)}`);
    return results;
  }
}
