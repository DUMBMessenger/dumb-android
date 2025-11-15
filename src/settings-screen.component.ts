import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatClient } from './chat-client';

@Component({
  selector: 'app-settings-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <div class="header">
        <button class="back-button" (click)="back.emit()">←</button>
        <h2>Настройки</h2>
      </div>

      <div class="settings-content">
        <div class="setting-section">
          <h3>Аватар</h3>
          <div class="avatar-section">
            <div class="avatar-preview">
              <img 
                [src]="avatarUrl" 
                alt="Avatar"
                class="avatar-image"
                (error)="onAvatarError($event)"
              >
              <div *ngIf="!avatarLoaded" class="avatar-placeholder">
                <span>👤</span>
              </div>
            </div>
            <div class="avatar-actions">
              <input 
                type="file" 
                #avatarInput
                (change)="onAvatarSelected($event)"
                accept="image/*"
                style="display: none"
              >
              <button class="secondary" (click)="avatarInput.click()">
                {{ hasCustomAvatar ? 'Изменить' : 'Загрузить' }}
              </button>
              <button *ngIf="hasCustomAvatar" class="danger" (click)="removeAvatar()">
                Удалить
              </button>
            </div>
          </div>
        </div>

        <div class="setting-section">
          <h3>Тема</h3>
          <div class="theme-options">
            <label class="theme-option">
              <input 
                type="radio" 
                name="theme" 
                value="light" 
                [checked]="themeMode === 'light'"
                (change)="onThemeChange('light')"
              >
              <span class="theme-checkmark"></span>
              <span class="theme-label">Светлая</span>
            </label>
            <label class="theme-option">
              <input 
                type="radio" 
                name="theme" 
                value="dark" 
                [checked]="themeMode === 'dark'"
                (change)="onThemeChange('dark')"
              >
              <span class="theme-checkmark"></span>
              <span class="theme-label">Тёмная</span>
            </label>
            <label class="theme-option">
              <input 
                type="radio" 
                name="theme" 
                value="system" 
                [checked]="themeMode === 'system'"
                (change)="onThemeChange('system')"
              >
              <span class="theme-checkmark"></span>
              <span class="theme-label">Системная</span>
            </label>
          </div>
        </div>

        <div class="setting-section">
          <h3>Уведомления</h3>
          <label class="switch">
            <input type="checkbox" [checked]="notificationsEnabled" (change)="toggleNotifications()">
            <span class="slider"></span>
            <span class="switch-label">Push-уведомления</span>
          </label>
        </div>

        <div class="setting-section">
          <h3>О приложении</h3>
          <div class="about-info">
            <p class="about-text">DUMB Chat v1.0.0</p>
            <p class="about-text">Простой и удобный мессенджер</p>
          </div>
        </div>

        <div class="actions-section">
          <button class="logout-button" (click)="logout.emit()">
            Выйти
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
    }

    .header {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--header-bg);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .back-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      margin-right: 16px;
      color: var(--text-primary);
      padding: 8px;
    }

    .header h2 {
      margin: 0;
      font-size: 18px;
      color: var(--text-primary);
    }

    .settings-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
    }

    .setting-section {
      margin-bottom: 32px;
    }

    .setting-section h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: var(--text-primary);
      font-weight: 600;
    }

    .avatar-section {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .avatar-preview {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--border-color);
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: absolute;
      top: 0;
      left: 0;
    }

    .avatar-placeholder {
      font-size: 32px;
      color: var(--text-muted);
    }

    .avatar-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .theme-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .theme-option {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 12px;
      border-radius: 8px;
      background: var(--bg-secondary);
      transition: background-color 0.2s;
      color: var(--text-primary);
    }

    .theme-option:hover {
      background: var(--bg-hover);
    }

    .theme-option input {
      display: none;
    }

    .theme-checkmark {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-color);
      border-radius: 50%;
      margin-right: 12px;
      position: relative;
      flex-shrink: 0;
    }

    .theme-option input:checked + .theme-checkmark {
      border-color: #1976d2;
    }

    .theme-option input:checked + .theme-checkmark::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 10px;
      height: 10px;
      background: #1976d2;
      border-radius: 50%;
    }

    .theme-label {
      color: var(--text-primary);
    }

    .switch {
      display: flex;
      align-items: center;
      cursor: pointer;
      color: var(--text-primary);
    }

    .switch input {
      display: none;
    }

    .slider {
      width: 44px;
      height: 24px;
      background: var(--border-color);
      border-radius: 24px;
      position: relative;
      margin-right: 12px;
      transition: background-color 0.3s;
      flex-shrink: 0;
    }

    .slider::before {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      top: 2px;
      left: 2px;
      transition: transform 0.3s;
    }

    input:checked + .slider {
      background: #1976d2;
    }

    input:checked + .slider::before {
      transform: translateX(20px);
    }

    .switch-label {
      color: var(--text-primary);
    }

    .about-info {
      font-size: 14px;
    }

    .about-text {
      margin-bottom: 8px;
      color: var(--text-secondary);
    }

    .actions-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    }

    .logout-button {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
      transition: background-color 0.2s;
    }

    .logout-button:hover {
      background: #c82333;
    }

    button {
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;
    }

    button:hover {
      background: #1565c0;
    }

    button.secondary {
      background: transparent;
      color: #1976d2;
      border: 1px solid #1976d2;
    }

    button.secondary:hover {
      background: #1976d2;
      color: white;
    }

    button.danger {
      background: transparent;
      color: #dc3545;
      border: 1px solid #dc3545;
    }

    button.danger:hover {
      background: #dc3545;
      color: white;
    }

    button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .settings-content {
        padding: 16px 12px;
      }

      .avatar-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .avatar-actions {
        flex-direction: row;
      }

      .theme-option {
        padding: 16px;
      }
    }
  `]
})
export class SettingsScreenComponent implements OnInit {
  @Input() chatClient: ChatClient | null = null;
  @Input() themeMode = 'light';
  @Output() back = new EventEmitter();
  @Output() themeChange = new EventEmitter<string>();
  @Output() logout = new EventEmitter();

  defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM2Yzc1N2QiLz4KPHN2ZyB4PSIyMCIgeT0iMjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNNDAgMjBDNDQuNDE4MyAyMCA0OCAxNi40MTgzIDQ4IDEyQzQ4IDcuNTgxNzIgNDQuNDE4MyA0IDQwIDRDMzUuNTgxNyA0IDMyIDcuNTgxNzIgMzIgMTJDMzIgMTYuNDE4MyAzNS41ODE3IDIwIDQwIDIwWk00MCAyNEMzMS4xNjM0IDI0IDI0IDMxLjE2MzQgMjQgNDBWMjRINDBaTTU2IDQwQzU2IDMxLjE2MzQgNDguODM2NiAyNCA0MCAyNFY0MEg1NloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
  avatarUrl: string = this.defaultAvatar;
  avatarLoaded = false;
  hasCustomAvatar = false;
  notificationsEnabled = false;

  ngOnInit() {
    this.loadAvatar();
    this.loadNotificationsSetting();
  }

  loadAvatar() {
    const savedAvatar = localStorage.getItem('user_avatar');
    const username = localStorage.getItem('username');
    
    if (savedAvatar) {
      this.avatarUrl = savedAvatar;
      this.hasCustomAvatar = true;
      this.avatarLoaded = true;
    } else if (username) {
      this.avatarUrl = `${this.chatClient?.baseUrl || ''}/api/user/${username}/avatar?t=${Date.now()}`;
      this.hasCustomAvatar = false;
      this.avatarLoaded = true;
    } else {
      this.avatarUrl = this.defaultAvatar;
      this.hasCustomAvatar = false;
      this.avatarLoaded = true;
    }
  }

  async onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.chatClient) {
      try {
        const result = await this.chatClient.uploadAvatar(file);
        if (result.avatarUrl) {
          const username = localStorage.getItem('username');
          if (username) {
            const fullAvatarUrl = `${this.chatClient.baseUrl}/api/user/${username}/avatar?t=${Date.now()}`;
            
            this.avatarUrl = fullAvatarUrl;
            this.hasCustomAvatar = true;
            localStorage.setItem('user_avatar', fullAvatarUrl);
          }
        }
      } catch (error) {
        console.error('Failed to upload avatar:', error);
        alert('Ошибка загрузки аватарки');
      }
    }
    event.target.value = '';
  }

  loadNotificationsSetting() {
    this.notificationsEnabled = localStorage.getItem('notifications_enabled') === 'true';
  }

  removeAvatar() {
    this.avatarUrl = this.defaultAvatar;
    this.hasCustomAvatar = false;
    localStorage.removeItem('user_avatar');
  }

  onAvatarError(event: any) {
    this.avatarUrl = this.defaultAvatar;
    this.avatarLoaded = true;
    this.hasCustomAvatar = false;
  }

  onThemeChange(theme: string) {
    this.themeChange.emit(theme);
  }

  toggleNotifications() {
    this.notificationsEnabled = !this.notificationsEnabled;
    localStorage.setItem('notifications_enabled', this.notificationsEnabled.toString());
    
    if (this.notificationsEnabled) {
      this.requestNotificationPermission();
    }
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        this.notificationsEnabled = false;
        localStorage.setItem('notifications_enabled', 'false');
      }
    }
  }
}
