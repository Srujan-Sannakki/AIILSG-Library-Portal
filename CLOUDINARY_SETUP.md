# Private Cloudinary storage

Set these variables in the backend environment (never in Vite variables):

```env
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Startup rejects incomplete Cloudinary configuration. There is no silent fallback to public/local storage when cloud credentials are missing or fail.

The backend validates a PDF before calling the Cloudinary SDK with `resource_type: raw`, `type: authenticated` and a random public ID. MongoDB stores an internal storage key, not a public delivery URL. A short-lived signed download URL is consumed only by the backend to construct the authorized single-page response. The browser never receives this URL or the original PDF.

Verify the account supports authenticated raw PDF uploads and private download. Upload a test PDF, confirm direct unsigned access fails, read an assigned page through the portal, and confirm an unassigned/expired/unpaid page fails. Cloud account policy, quota and credentials are external deployment prerequisites; the integration suite exercises the private local-storage adapter.

Legacy assets uploaded with public delivery remain public until removed or invalidated in Cloudinary. Re-upload them with the new application and retire the previous public copies. Do not configure an unsigned public upload preset for library originals.

References: [Media access control](https://cloudinary.com/documentation/control_access_to_media), [Upload API](https://cloudinary.com/documentation/image_upload_api_reference).
