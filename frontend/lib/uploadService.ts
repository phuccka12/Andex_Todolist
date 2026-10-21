const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface UploadResult {
  success: boolean;
  url: string;
  mode: 'cloudinary' | 'fallback';
  message?: string;
}

/**
 * Uploads an image (base64 data URL or URL) to Cloudinary via Backend API.
 * Automatically falls back to compressed local asset if Cloudinary is not yet configured.
 */
export async function uploadImageToCloud(
  imageData: string,
  folder = 'cbp_todolist'
): Promise<UploadResult> {
  if (!imageData) {
    return { success: false, url: '', mode: 'fallback', message: 'No image provided' };
  }

  // If already a remote URL (e.g. Unsplash, Cloudinary), no need to re-upload
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return { success: true, url: imageData, mode: 'cloudinary' };
  }

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        folder,
      }),
    });

    if (!res.ok) {
      throw new Error(`Upload server responded with status: ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.url) {
      return {
        success: true,
        url: data.url,
        mode: data.mode || 'cloudinary',
        message: data.message,
      };
    }

    return {
      success: true,
      url: imageData,
      mode: 'fallback',
      message: 'Fallback local image',
    };
  } catch (err: any) {
    console.warn('Cloud upload failed, falling back to local compressed image:', err);
    return {
      success: true,
      url: imageData,
      mode: 'fallback',
      message: err.message,
    };
  }
}

/**
 * Checks Cloudinary configuration status from backend
 */
export async function getCloudinaryStatus(): Promise<{ configured: boolean; cloudName?: string }> {
  try {
    const res = await fetch(`${API_BASE}/upload/status`);
    if (!res.ok) return { configured: false };
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      cloudName: data.cloudName || undefined,
    };
  } catch {
    return { configured: false };
  }
}
