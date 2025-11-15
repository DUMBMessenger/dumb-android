export class ChatClient {
  public baseUrl: string;
  private token: string | null;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_TTL = 30000;

  constructor(baseUrl: string, token: string | null = null) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    }
  }

  private async request(endpoint: string, options: any = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const config = {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API request failed:', error);
      throw error;
    }
  }

  async register(username: string, password: string) {
    return this.request('/api/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  async login(username: string, password: string, twoFactorToken: string | null = null) {
    const data: any = { username, password };
    if (twoFactorToken) {
      data.twoFactorToken = twoFactorToken;
    }

    const result = await this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (result.success && result.token) {
      this.token = result.token;
      localStorage.setItem('username', username);
      localStorage.setItem('token', result.token);
    }

    return result;
  }

  async verify2FALogin(username: string, sessionId: string, twoFactorToken: string) {
    return this.request('/api/2fa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ username, sessionId, twoFactorToken })
    });
  }

  async setup2FA() {
    return this.request('/api/2fa/setup', { method: 'POST' });
  }

  async enable2FA(token: string) {
    return this.request('/api/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  async disable2FA(password: string) {
    return this.request('/api/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
  }

  async get2FAStatus() {
    const result = await this.request('/api/2fa/status');
    return result.enabled;
  }

  async getChannels(forceRefresh = false): Promise<any[]> {
    const cacheKey = 'channels';
    
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    const result = await this.request('/api/channels');
    const channels = result.channels || [];
    
    this.cache.set(cacheKey, {
      data: channels,
      timestamp: Date.now()
    });
    
    return channels;
  }

  async createChannel(name: string) {
    this.cache.delete('channels');
    return this.request('/api/channels/create', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  async searchChannels(query: string) {
    const result = await this.request('/api/channels/search', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
    return result.channels || [];
  }

  async joinChannel(channel: string) {
    this.cache.delete('channels');
    return this.request('/api/channels/join', {
      method: 'POST',
      body: JSON.stringify({ channel })
    });
  }

  async getMessages(channel: string, limit = 50, forceRefresh = false): Promise<any[]> {
    const cacheKey = `messages:${channel}:${limit}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
    }

    const result = await this.request(`/api/messages?channel=${encodeURIComponent(channel)}&limit=${limit}`);
    const messages = result.messages || [];
    
    this.cache.set(cacheKey, {
      data: messages,
      timestamp: Date.now()
    });
    
    return messages;
  }

  async sendMessage(message: { channel: string; text: string; replyTo?: string | null; fileId?: string | null; voiceMessage?: string | null }) {
    this.cache.delete(`messages:${message.channel}:50`);
    return this.request('/api/message', {
      method: 'POST',
      body: JSON.stringify(message)
    });
  }

  async sendVoiceMessage(channel: string, voiceFilename: string) {
    this.cache.delete(`messages:${channel}:50`);
    return this.request('/api/message/voice-only', {
      method: 'POST',
      body: JSON.stringify({
        channel,
        voiceMessage: voiceFilename
      })
    });
  }

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseUrl}/api/upload/file`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.file;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseUrl}/api/upload/avatar`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async uploadVoiceMessage(voiceBlob: Blob, filename: string) {
    const formData = new FormData();
    formData.append('voice', voiceBlob, filename);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.baseUrl}/api/upload/voice/${filename}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Voice upload failed');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async getUserInfo(username: string) {
    const cacheKey = `user:${username}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const result = await this.request(`/api/user/${username}`);
    const user = result.user;
    
    this.cache.set(cacheKey, {
      data: user,
      timestamp: Date.now()
    });
    
    return user;
  }

  async enableNotifications() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
      });
      
      return this.request('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription })
      });
    }
  }

  createWebSocketChannel(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/ws';
      const ws = new WebSocket(wsUrl);

      const timeoutId = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        console.log('WebSocket connected');
        
        if (this.token) {
          ws.send(JSON.stringify({
            type: 'auth',
            token: this.token
          }));
        }
        
        resolve(ws);
      };

      ws.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(error);
      };
    });
  }

  onMessage(handler: (data: any) => void) {
    return () => {};
  }

  clearCache() {
    this.cache.clear();
  }

  invalidateCache(key: string) {
    this.cache.delete(key);
  }

  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}
