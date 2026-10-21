export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  coverImage?: string;
  title?: string;
  bio?: string;
  wallpaper?: string;
  role?: 'user' | 'admin';
  streak?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'cbp_auth_token';
const USER_KEY = 'cbp_auth_user';

export const authService = {
  // Get stored token from localStorage
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  // Set token
  setToken(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  // Get cached user
  getCachedUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // Set cached user
  setCachedUser(user: AuthUser) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Clear auth data
  logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // Auth headers for api requests
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
    };
  },

  // Register API
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token && data.user) {
        this.setToken(data.token);
        this.setCachedUser(data.user);
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Không thể kết nối đến máy chủ.' };
    }
  },

  // Login API
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token && data.user) {
        this.setToken(data.token);
        this.setCachedUser(data.user);
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Không thể kết nối đến máy chủ.' };
    }
  },

  // Get Current Authenticated User (Me)
  async getMe(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401) {
          this.logout();
        }
        return null;
      }
      const data = await res.json();
      if (data.user) {
        this.setCachedUser(data.user);
        return data.user;
      }
      return null;
    } catch {
      return this.getCachedUser();
    }
  },

  // Update Cloud Profile
  async updateProfile(updates: Partial<AuthUser>): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        this.setCachedUser(data.user);
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Change Password API
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const token = this.getToken();
    if (!token) return { success: false, message: 'Bạn chưa đăng nhập.' };

    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ.' };
    }
  },

  // Request Password Reset OTP
  async forgotPassword(email: string): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ.' };
    }
  },

  // Verify OTP & Reset Password
  async resetPassword(email: string, code: string, newPassword: string): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.token && data.user) {
        this.setToken(data.token);
        this.setCachedUser(data.user);
      }
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ.' };
    }
  },
};
