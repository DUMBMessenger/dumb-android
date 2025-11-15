<<<<<<< HEAD
import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatClient } from './chat-client';
=======
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
>>>>>>> 665062c (Capacitor + update :))
import { ServerSelectionComponent } from './server-selection.component';
import { AuthScreenComponent } from './auth-screen.component';
import { ChannelsScreenComponent } from './channels-screen.component';
import { ChatScreenComponent } from './chat-screen.component';
import { SettingsScreenComponent } from './settings-screen.component';
<<<<<<< HEAD
=======
import { ChatClient } from './chat-client';
>>>>>>> 665062c (Capacitor + update :))

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
<<<<<<< HEAD
    FormsModule,
=======
>>>>>>> 665062c (Capacitor + update :))
    ServerSelectionComponent,
    AuthScreenComponent,
    ChannelsScreenComponent,
    ChatScreenComponent,
    SettingsScreenComponent
  ],
  template: `
<<<<<<< HEAD
    <div [class]="'app ' + (themeMode === 'dark' ? 'dark' : 'light')">
      <div class="container">
        <div *ngIf="error" class="error">{{error}}</div>
        
        <div *ngIf="loading" class="loading">
          <div class="spinner"></div>
        </div>

        <app-server-selection *ngIf="currentScreen === 'server-selection'"
          [themeMode]="themeMode"
          (connect)="handleServerConnect($event)"
          (themeChange)="setTheme($event)">
        </app-server-selection>

        <app-auth-screen *ngIf="currentScreen === 'auth'"
          [serverUrl]="serverUrl"
          (login)="handleLogin($event)"
          (back)="currentScreen = 'server-selection'">
        </app-auth-screen>

        <app-channels-screen *ngIf="currentScreen === 'channels'"
          [chatClient]="chatClient"
          [themeMode]="themeMode"
          (logout)="handleLogout()"
          (openChat)="openChat($event)"
          (openSettings)="currentScreen = 'settings'">
        </app-channels-screen>

        <app-chat-screen *ngIf="currentScreen === 'chat'"
          [chatClient]="chatClient"
          [channel]="activeChannel"
          [themeMode]="themeMode"
          (back)="currentScreen = 'channels'">
        </app-chat-screen>

        <app-settings-screen *ngIf="currentScreen === 'settings'"
          [chatClient]="chatClient"
          [themeMode]="themeMode"
          (back)="currentScreen = 'channels'"
          (themeChange)="setTheme($event)"
          (logout)="handleLogout()">
        </app-settings-screen>

        <div *ngIf="showInstallPrompt" class="install-prompt">
          <span>Установить DUMB Chat?</span>
          <button (click)="installPWA()">Установить</button>
          <button class="secondary" (click)="showInstallPrompt = false">Позже</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app { 
      min-height: 100vh; 
      transition: all 0.3s ease; 
      -webkit-tap-highlight-color: transparent;
    }
    .app.light { background-color: #f5f5f5; color: #333; }
    .app.dark { background-color: #1e1e1e; color: #fff; }
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 0 16px; 
      height: 100vh;
      overflow: hidden;
    }
    .loading { 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 200px; 
    }
    .spinner { 
      border: 3px solid #f3f3f3; 
      border-top: 3px solid #3498db; 
      border-radius: 50%; 
      width: 24px; 
      height: 24px; 
      animation: spin 1s linear infinite; 
    }
    @keyframes spin { 
      0% { transform: rotate(0deg); } 
      100% { transform: rotate(360deg); } 
    }
    .error { 
      background: #ffebee; 
      color: #c62828; 
      padding: 12px; 
      border-radius: 4px; 
      margin: 16px 0; 
      border: 1px solid #ffcdd2; 
      font-size: 14px;
    }
    .dark .error { 
      background: #311b1b; 
      color: #ef9a9a; 
      border-color: #7b1f1f; 
    }
    .install-prompt { 
      position: fixed; 
      bottom: 20px; 
      right: 20px; 
      background: #1976d2; 
      color: white; 
      padding: 12px 16px; 
      border-radius: 8px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); 
      z-index: 1000; 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      font-size: 14px;
    }
    .install-prompt button { 
      background: white; 
      color: #1976d2; 
      border: none; 
      padding: 6px 12px; 
      border-radius: 4px; 
      cursor: pointer; 
      font-weight: bold; 
      font-size: 12px;
    }
    .install-prompt button.secondary { 
      background: transparent; 
      color: white; 
      border: 1px solid white; 
    }

    @media (max-width: 768px) {
      .container {
        padding: 0 12px;
        max-width: 100%;
      }
      
      .install-prompt {
        bottom: 10px;
        right: 10px;
        left: 10px;
        flex-direction: column;
        gap: 8px;
      }
      
      .install-prompt button {
        width: 100%;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  currentScreen = 'server-selection';
  themeMode = localStorage.getItem('theme_mode') || 'light';
  serverUrl = localStorage.getItem('server_url') || 'http://localhost:3000';
  chatClient: ChatClient | null = null;
  loading = false;
  error = '';
  showInstallPrompt = false;
  deferredPrompt: any = null;
  activeChannel = '';

  ngOnInit() {
    this.loadToken();
    this.setupPWA();
    this.applyTheme();
  }

  setupPWA() {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt = true;
    });

    window.addEventListener('appinstalled', () => {
      this.showInstallPrompt = false;
      this.deferredPrompt = null;
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
    }
  }

  async installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.showInstallPrompt = false;
        this.deferredPrompt = null;
      }
    }
  }

  async loadToken() {
    const token = localStorage.getItem('token');
    if (token) {
      this.chatClient = new ChatClient(this.serverUrl, token);
      this.loading = true;
      
      try {
        await this.chatClient.getChannels();
        this.currentScreen = 'channels';
      } catch (error) {
        console.error('Token validation failed:', error);
        localStorage.removeItem('token');
        this.chatClient = null;
      } finally {
        this.loading = false;
      }
    }
  }

  setTheme(mode: string) {
    this.themeMode = mode;
    localStorage.setItem('theme_mode', mode);
    this.applyTheme();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.themeMode);
  }

  handleServerConnect(url: string) {
    this.serverUrl = url;
    localStorage.setItem('server_url', url);
    this.currentScreen = 'auth';
  }

  handleLogin(token: string) {
    localStorage.setItem('token', token);
    this.chatClient = new ChatClient(this.serverUrl, token);
    this.currentScreen = 'channels';
  }

  handleLogout() {
    localStorage.removeItem('token');
    this.chatClient?.close();
    this.chatClient = null;
    this.currentScreen = 'server-selection';
  }

  openChat(channel: string) {
    this.activeChannel = channel;
    this.currentScreen = 'chat';
  }
=======
    <div [class.dark]="themeMode === 'dark'" [attr.data-theme]="themeMode">
      <app-server-selection 
        *ngIf="currentScreen === 'server-selection'"
        [themeMode]="themeMode"
        (connect)="onServerConnect($event)"
        (themeChange)="onThemeChange($event)"
      ></app-server-selection>
      
      <app-auth-screen 
        *ngIf="currentScreen === 'auth'"
        [serverUrl]="currentServerUrl"
        (login)="onLogin($event)"
        (back)="currentScreen = 'server-selection'"
      ></app-auth-screen>
      
      <app-channels-screen 
        *ngIf="currentScreen === 'channels'"
        [chatClient]="chatClient"
        [themeMode]="themeMode"
        (logout)="onLogout()"
        (openChat)="onOpenChat($event)"
        (openSettings)="currentScreen = 'settings'"
      ></app-channels-screen>
      
      <app-chat-screen 
        *ngIf="currentScreen === 'chat'"
        [chatClient]="chatClient"
        [channel]="currentChannel"
        [themeMode]="themeMode"
        (back)="currentScreen = 'channels'"
      ></app-chat-screen>
      
      <app-settings-screen 
        *ngIf="currentScreen === 'settings'"
        [chatClient]="chatClient"
        [themeMode]="themeMode"
        (back)="currentScreen = 'channels'"
        (themeChange)="onThemeChange($event)"
        (logout)="onLogout()"
      ></app-settings-screen>
    </div>
  `
})
export class AppComponent implements OnInit {
  currentScreen: 'server-selection' | 'auth' | 'channels' | 'chat' | 'settings' = 'server-selection';
  currentServerUrl = '';
  currentChannel = '';
  chatClient: ChatClient | null = null;
  themeMode = 'light';

  ngOnInit() {
    this.detectSystemTheme();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.themeMode = savedTheme;
    }
  }

  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.themeMode = 'system';
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  onServerConnect(serverUrl: string) {
    this.currentServerUrl = serverUrl;
    this.currentScreen = 'auth';
  }

  onLogin(loginData: {token: string, username: string}) {
    this.chatClient = new ChatClient(this.currentServerUrl, loginData.token);
    localStorage.setItem('auth_token', loginData.token);
    localStorage.setItem('username', loginData.username);
    this.currentScreen = 'channels';
  }

  onOpenChat(channel: string) {
    this.currentChannel = channel;
    this.currentScreen = 'chat';
  }

  onLogout() {
    this.chatClient = null;
    this.currentScreen = 'server-selection';
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
  }

  onThemeChange(theme: string) {
    this.themeMode = theme;
    localStorage.setItem('theme', theme);
    
    if (theme === 'system') {
      this.detectSystemTheme();
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
>>>>>>> 665062c (Capacitor + update :))
}
