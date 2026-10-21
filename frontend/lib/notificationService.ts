export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface DialogOptions {
  title?: string;
  message: string;
  type?: NotificationType;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
}

type DialogResolver = (confirmed: boolean) => void;

class NotificationService {
  private listener: ((options: DialogOptions | null, resolve: DialogResolver) => void) | null = null;

  public register(fn: (options: DialogOptions | null, resolve: DialogResolver) => void) {
    this.listener = fn;
    return () => {
      if (this.listener === fn) {
        this.listener = null;
      }
    };
  }

  public alert(message: string, options?: { title?: string; type?: NotificationType }): Promise<void> {
    return new Promise((resolve) => {
      if (this.listener) {
        this.listener(
          {
            title: options?.title || (options?.type === 'error' ? 'Thông Báo Lỗi' : 'Thông Báo Hệ Thống'),
            message,
            type: options?.type || 'info',
            isConfirm: false,
            confirmText: 'Đã hiểu',
          },
          () => resolve()
        );
      } else {
        resolve();
      }
    });
  }

  public error(message: string, title = 'Thông Báo Lỗi'): Promise<void> {
    return this.alert(message, { title, type: 'error' });
  }

  public success(message: string, title = 'Thao Tác Thành Công'): Promise<void> {
    return this.alert(message, { title, type: 'success' });
  }

  public warning(message: string, title = 'Cảnh Báo & Lưu Ý'): Promise<void> {
    return this.alert(message, { title, type: 'warning' });
  }

  public confirm(
    message: string,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      type?: NotificationType;
    }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.listener) {
        this.listener(
          {
            title: options?.title || 'Xác Nhận Thao Tác',
            message,
            type: options?.type || 'warning',
            isConfirm: true,
            confirmText: options?.confirmText || 'Đồng ý',
            cancelText: options?.cancelText || 'Hủy bỏ',
          },
          (confirmed: boolean) => resolve(confirmed)
        );
      } else {
        resolve(false);
      }
    });
  }
}

export const notify = new NotificationService();
