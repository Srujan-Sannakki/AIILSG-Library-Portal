# Cloudinary Setup Guide

This application uses Cloudinary for cloud-based file storage, which is essential for production deployments where the local filesystem is ephemeral (e.g., Heroku, Vercel).

## Why Cloudinary?

- **Production Ready**: Files persist across deployments
- **Scalable**: Handles large files efficiently
- **CDN**: Fast global delivery
- **Free Tier**: Generous free plan for development

## Setup Instructions

### 1. Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. After signing up, you'll be taken to your dashboard

### 2. Get Your Credentials

From your Cloudinary dashboard, you'll find:
- **Cloud Name**: Found in the top section of your dashboard
- **API Key**: Found in the "Account Details" section
- **API Secret**: Found in the "Account Details" section (click "Reveal")

### 3. Configure Environment Variables

Create a `.env` file in the `server/` directory (or add to your existing `.env`):

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Important**: Never commit your `.env` file to version control!

### 4. Install Dependencies

The required packages are already in `package.json`. Just run:

```bash
npm install
```

This will install:
- `cloudinary` - Cloudinary SDK
- `multer-storage-cloudinary` - Multer integration for Cloudinary
- `streamifier` - Stream handling utilities

### 5. Restart Your Server

After setting up the environment variables, restart your server:

```bash
cd server
node server.js
```

You should see: `✅ Cloudinary configured for cloud storage`

## How It Works

### Development Mode (No Cloudinary)

If Cloudinary credentials are not set, the app falls back to local storage:
- Files are saved to `server/uploads/` directory
- URLs are formatted as `/uploads/filename.pdf`
- ⚠️ **Not suitable for production** - files will be lost on redeploy

### Production Mode (With Cloudinary)

When Cloudinary is configured:
- Files are uploaded directly to Cloudinary
- URLs are stored in MongoDB (e.g., `https://res.cloudinary.com/...`)
- Files persist across deployments
- Frontend automatically detects and uses Cloudinary URLs

## File Upload Flow

1. **Upload**: Admin uploads PDF via `/api/books` endpoint
2. **Storage**: 
   - If Cloudinary configured → Uploads to Cloudinary, stores URL
   - If not configured → Saves locally, stores local path
3. **Retrieval**: Frontend checks if `filePath` is a URL or local path and loads accordingly

## Testing

1. Set up Cloudinary credentials in `.env`
2. Restart server
3. Upload a book PDF through the admin panel
4. Check MongoDB - `filePath` should be a Cloudinary URL (starts with `http://` or `https://`)
5. Open the book in the student portal - PDF should load from Cloudinary

## Troubleshooting

### "Cloudinary not configured" Warning

- Check that all three environment variables are set
- Verify variable names match exactly: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Restart server after adding variables

### Upload Fails

- Verify Cloudinary credentials are correct
- Check Cloudinary dashboard for upload limits/quota
- Check server logs for detailed error messages

### PDFs Don't Load

- Verify the `filePath` in MongoDB is a valid URL
- Check browser console for CORS errors
- Ensure Cloudinary allows PDF files (should work by default)

## Migration from Local Storage

If you have existing books with local file paths:

1. Upload new books - they'll automatically use Cloudinary
2. For existing books, you can:
   - Re-upload them through the admin panel
   - Or write a migration script to upload existing files to Cloudinary

## Security Notes

- Keep your API Secret secure - never expose it in client-side code
- Use environment variables for all credentials
- Consider using Cloudinary's signed URLs for additional security
- Set up Cloudinary upload presets to restrict file types/sizes

## Alternative: AWS S3 or Google Cloud Storage

If you prefer AWS S3 or Google Cloud Storage, you can modify the upload logic in `server.js`:

- **AWS S3**: Use `aws-sdk` and `multer-s3`
- **Google Cloud Storage**: Use `@google-cloud/storage` and custom multer storage

The frontend code will work the same way - it just needs a URL in the `filePath` field.
