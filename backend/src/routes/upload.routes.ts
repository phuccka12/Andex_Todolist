import { Router, Request, Response } from 'express';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';

export const uploadRouter = Router();

// GET /api/upload/status - Check if Cloudinary is configured & live ping test
uploadRouter.get('/status', async (req: Request, res: Response) => {
  const configured = isCloudinaryConfigured();
  if (!configured) {
    return res.json({
      success: true,
      configured: false,
      cloudName: null,
      message: 'Cloudinary chưa được cấu hình. Vui lòng thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET vào backend/.env',
    });
  }

  try {
    const pingResult = await cloudinary.api.ping();
    return res.json({
      success: true,
      configured: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      ping: pingResult,
      message: 'Kết nối Cloudinary thành công! API Key và Secret hoàn toàn chính xác. 🚀',
    });
  } catch (pingError: any) {
    return res.status(400).json({
      success: false,
      configured: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      message: 'Không thể kết nối đến Cloudinary: ' + (pingError.message || 'Kiểm tra lại Cloud Name, API Key hoặc API Secret.'),
    });
  }
});

// POST /api/upload - Upload base64 or image URL to Cloudinary
uploadRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { image, folder = 'cbp_todolist' } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu dữ liệu hình ảnh (field: image).',
      });
    }

    // If Cloudinary is configured, upload directly to Cloudinary
    if (isCloudinaryConfigured()) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      return res.json({
        success: true,
        mode: 'cloudinary',
        url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
        bytes: uploadResponse.bytes,
        format: uploadResponse.format,
        message: 'Tải ảnh lên Cloudinary thành công!',
      });
    }

    // Graceful fallback if user hasn't added Cloudinary API keys to .env yet
    return res.json({
      success: true,
      mode: 'fallback',
      url: image,
      message: 'Cloudinary chưa có API key trong backend/.env. Đang lưu tạm ảnh tối ưu trên máy.',
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tải ảnh lên Cloudinary: ' + (error.message || 'Lỗi không xác định'),
    });
  }
});
