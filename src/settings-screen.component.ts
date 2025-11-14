import { Component, Input, Output, EventEmitter } from '@angular/core';
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
                {{ avatarUrl !== 'assets/default-avatar.png' ? 'Изменить' : 'Загрузить' }}
              </button>
              <button *ngIf="avatarUrl !== 'assets/default-avatar.png'" class="danger" (click)="removeAvatar()">
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
              Светлая
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
              Тёмная
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
              Системная
            </label>
          </div>
        </div>

        <div class="setting-section">
          <h3>Уведомления</h3>
          <label class="switch">
            <input type="checkbox" [checked]="notificationsEnabled" (change)="toggleNotifications()">
            <span class="slider"></span>
            Push-уведомления
          </label>
        </div>

        <div class="setting-section">
          <h3>О приложении</h3>
          <div class="about-info">
            <p>DUMB Chat v1.0.0</p>
            <p>Простой и удобный мессенджер</p>
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
      background: var(--bg-primary, #fff);
    }

    .header {
      display: flex;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--border-color, #eee);
      background: var(--header-bg, #fff);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .dark .header {
      --header-bg: #2d2d2d;
      --border-color: #444;
    }

    .back-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      margin-right: 16px;
      color: inherit;
      padding: 8px;
    }

    .header h2 {
      margin: 0;
      font-size: 18px;
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
      color: var(--text-primary, #333);
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
      border: 2px solid var(--border-color, #eee);
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
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
      background: var(--bg-secondary, #f5f5f5);
      transition: background-color 0.2s;
    }

    .dark .theme-option {
      --bg-secondary: #3d3d3d;
    }

    .theme-option:hover {
      background: var(--bg-hover, #e9e9e9);
    }

    .theme-option input {
      margin-right: 12px;
    }

    .theme-checkmark {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-color, #ccc);
      border-radius: 50%;
      margin-right: 12px;
      position: relative;
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

    .switch {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .switch input {
      display: none;
    }

    .slider {
      width: 44px;
      height: 24px;
      background: #ccc;
      border-radius: 24px;
      position: relative;
      margin-right: 12px;
      transition: background-color 0.3s;
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

    .about-info {
      color: var(--text-secondary, #666);
      font-size: 14px;
    }

    .actions-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color, #eee);
    }

    .logout-button {
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
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

    button.secondary {
      background: transparent;
      color: #1976d2;
      border: 1px solid #1976d2;
    }

    button.danger {
      background: transparent;
      color: #d32f2f;
      border: 1px solid #d32f2f;
    }

    button:disabled {
      background: #ccc;
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
export class SettingsScreenComponent {
  @Input() chatClient: ChatClient | null = null;
  @Input() themeMode = 'light';
  @Output() back = new EventEmitter();
  @Output() themeChange = new EventEmitter<string>();
  @Output() logout = new EventEmitter();

  avatarUrl: string = 'assets/default-avatar.png';
  notificationsEnabled = false;

  ngOnInit() {
    this.loadAvatar();
    this.loadNotificationsSetting();
  }

  loadAvatar() {
    const savedAvatar = localStorage.getItem('user_avatar');
    if (savedAvatar) {
      this.avatarUrl = savedAvatar;
    }
  }

  loadNotificationsSetting() {
    this.notificationsEnabled = localStorage.getItem('notifications_enabled') === 'true';
  }

  async onAvatarSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.chatClient) {
      try {
        const result = await this.chatClient.uploadAvatar(file);
        this.avatarUrl = result.avatarUrl;
        localStorage.setItem('user_avatar', this.avatarUrl);
      } catch (error) {
        console.error('Failed to upload avatar:', error);
        alert('Ошибка загрузки аватарки');
      }
    }
  }

  removeAvatar() {
    this.avatarUrl = 'assets/default-avatar.png';
    localStorage.removeItem('user_avatar');
  }

  onAvatarError(event: any) {
    event.target.src = 'assets/default-avatar.png';
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
