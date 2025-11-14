export class ChatClient {
  public baseUrl: string;
  private token: string | null;
  private ws: WebSocket | null = null;
  private messageHandlers = new Set<(data: any) => void>();

  constructor(baseUrl: string, token: string | null = null) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: any = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
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
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
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
    
    return this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
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

  async getChannels() {
    const result = await this.request('/api/channels');
    return result.channels || [];
  }

  async createChannel(name: string) {
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
    return this.request('/api/channels/join', {
      method: 'POST',
      body: JSON.stringify({ channel })
    });
  }

  async getMessages(channel: string, limit = 50) {
    const result = await this.request(`/api/messages?channel=${encodeURIComponent(channel)}&limit=${limit}`);
    return result.messages || [];
  }

  async sendMessage(message: { channel: string; text: string; replyTo?: string | null; fileId?: string | null; voiceMessage?: string | null }) {
    return this.request('/api/message', {
      method: 'POST',
      body: JSON.stringify(message)
    });
  }

  async sendVoiceMessage(channel: string, voiceFilename: string) {
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

    const response = await fetch(`${this.baseUrl}/api/upload/file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data.file;
  }

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${this.baseUrl}/api/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  }

  async uploadVoiceMessage(voiceBlob: Blob, filename: string) {
    const formData = new FormData();
    formData.append('voice', voiceBlob, filename);

    const response = await fetch(`${this.baseUrl}/api/upload/voice/${filename}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Voice upload failed');
    }

    return data;
  }

  async getUserInfo(username: string) {
    const result = await this.request(`/api/user/${username}`);
    return result.user;
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

  createWebSocketChannel() {
    if (this.ws) {
      this.ws.close();
    }

    const wsUrl = this.baseUrl.replace('http', 'ws') + `?token=${this.token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(data));
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      setTimeout(() => {
        this.createWebSocketChannel();
      }, 5000);
    };

    return this.ws;
  }

  onMessage(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
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
