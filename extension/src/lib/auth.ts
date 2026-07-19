import { StorageService } from './storage';

const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'http://localhost:3000';

export class AuthService {
  static async login(): Promise<void> {
    const redirectUrl = chrome.identity.getRedirectURL();
    const authUrl = `${WEB_APP_URL}/sign-in?redirect_uri=${encodeURIComponent(redirectUrl)}`;

    try {
      const resultUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });

      if (resultUrl) {
        const url = new URL(resultUrl);
        const token = url.searchParams.get('token');
        if (token) {
          await StorageService.setToken(token);
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  }

  static async logout(): Promise<void> {
    await StorageService.removeToken();
    await StorageService.removeUser();
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await StorageService.getToken();
    return !!token;
  }
}
