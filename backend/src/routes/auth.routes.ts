import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.model';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'cbp_atelier_jwt_secret_super_secure_key_2026';

// 1. Register new user
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ Tên, Email và Mật khẩu.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await UserModel.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await UserModel.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      avatar: '',
      title: 'CBP Atelier Member',
      bio: 'Ready to master focus and time in CBP OS.',
      role: 'user',
    });

    const token = jwt.sign(
      { id: newUser._id.toString(), email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Chào mừng đến với CBP Atelier.',
      token,
      user: newUser.toJSON(),
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng ký: ' + (error.message || 'Không xác định'),
    });
  }
});

// 2. Login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Email và Mật khẩu.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại. Vui lòng kiểm tra lại email hoặc đăng ký mới.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu không chính xác. Vui lòng thử lại.',
      });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: `Chào mừng trở lại, ${user.name}!`,
      token,
      user: user.toJSON(),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đăng nhập: ' + (error.message || 'Không xác định'),
    });
  }
});

// 3. Get current user profile (Me)
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin tài khoản người dùng.',
      });
    }

    return res.json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi tải hồ sơ: ' + error.message,
    });
  }
});

// 4. Update profile (Avatar, Name, Bio, Wallpaper, etc.)
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, title, bio, avatar, coverImage, wallpaper, pomodoroStats, streak } = req.body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (title !== undefined) updates.title = title;
    if (bio !== undefined) updates.bio = bio;
    if (avatar !== undefined) updates.avatar = avatar;
    if (coverImage !== undefined) updates.coverImage = coverImage;
    if (wallpaper !== undefined) updates.wallpaper = wallpaper;
    if (pomodoroStats !== undefined) updates.pomodoroStats = pomodoroStats;
    if (streak !== undefined) updates.streak = streak;

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.user?.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản người dùng.',
      });
    }

    return res.json({
      success: true,
      message: 'Cập nhật thông tin hồ sơ thành công!',
      user: updatedUser.toJSON(),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật hồ sơ: ' + error.message,
    });
  }
});

// 5. Change Password
authRouter.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
      });
    }

    const user = await UserModel.findById(req.user?.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.',
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đổi mật khẩu: ' + error.message,
    });
  }
});

// 6. Request Password Reset OTP
authRouter.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp địa chỉ email tài khoản của bạn.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản nào khớp với email này. Vui lòng kiểm tra lại.',
      });
    }

    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.resetPasswordCode = code;
    user.resetPasswordExpires = expires;
    await user.save();

    console.log(`[Auth 🔑] Password reset code generated for ${cleanEmail}: ${code}`);

    // Send email via emailService
    const emailResult = await emailService.sendPasswordResetEmail(user.email, code, user.name);

    if (!emailResult.success) {
      if (emailResult.error === 'NO_SMTP') {
        return res.status(503).json({
          success: false,
          error: 'NO_SMTP',
          message: 'Hệ thống chưa thiết lập tài khoản gửi thư (SMTP_USER và SMTP_PASS trong file backend/.env). Vui lòng cấu hình tài khoản Gmail để gửi mã OTP thực tế vào hộp thư của bạn.',
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Không thể gửi email xác thực lúc này: ' + (emailResult.error || 'Lỗi kết nối máy chủ gửi thư.'),
      });
    }

    return res.json({
      success: true,
      message: 'Mã xác thực 6 chữ số đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam).',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xử lý quên mật khẩu: ' + (error.message || 'Không xác định'),
    });
  }
});

// 7. Verify OTP & Reset Password
authRouter.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ Email, Mã xác thực và Mật khẩu mới.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const user = await UserModel.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản người dùng.',
      });
    }

    if (!user.resetPasswordCode || !user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: 'Chưa có yêu cầu đặt lại mật khẩu nào cho email này hoặc mã đã bị vô hiệu.',
      });
    }

    if (new Date() > new Date(user.resetPasswordExpires)) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng yêu cầu mã mới.',
      });
    }

    if (user.resetPasswordCode !== cleanCode) {
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực không chính xác. Vui lòng kiểm tra lại.',
      });
    }

    // Hash new password and clear reset tokens
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Auto-generate fresh login token for seamless UX
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn đã được đăng nhập tự động.',
      token,
      user: user.toJSON(),
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đặt lại mật khẩu: ' + (error.message || 'Không xác định'),
    });
  }
});


