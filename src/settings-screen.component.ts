<<<<<<< HEAD
import { Component, Input, Output, EventEmitter } from '@angular/core';
=======
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
=======
              <div *ngIf="!avatarLoaded" class="avatar-placeholder">
                <span>👤</span>
              </div>
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
                {{ avatarUrl !== 'assets/default-avatar.png' ? 'Изменить' : 'Загрузить' }}
              </button>
              <button *ngIf="avatarUrl !== 'assets/default-avatar.png'" class="danger" (click)="removeAvatar()">
=======
                {{ hasCustomAvatar ? 'Изменить' : 'Загрузить' }}
              </button>
              <button *ngIf="hasCustomAvatar" class="danger" (click)="removeAvatar()">
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
              Светлая
=======
              <span class="theme-label">Светлая</span>
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
              Тёмная
=======
              <span class="theme-label">Тёмная</span>
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
              Системная
=======
              <span class="theme-label">Системная</span>
>>>>>>> 665062c (Capacitor + update :))
            </label>
          </div>
        </div>

        <div class="setting-section">
          <h3>Уведомления</h3>
          <label class="switch">
            <input type="checkbox" [checked]="notificationsEnabled" (change)="toggleNotifications()">
            <span class="slider"></span>
<<<<<<< HEAD
            Push-уведомления
=======
            <span class="switch-label">Push-уведомления</span>
>>>>>>> 665062c (Capacitor + update :))
          </label>
        </div>

        <div class="setting-section">
          <h3>О приложении</h3>
          <div class="about-info">
<<<<<<< HEAD
            <p>DUMB Chat v1.0.0</p>
            <p>Простой и удобный мессенджер</p>
=======
            <p class="about-text">DUMB Chat v1.0.0</p>
            <p class="about-text">Простой и удобный мессенджер</p>
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
      background: var(--bg-primary, #fff);
=======
      background: var(--bg-primary);
>>>>>>> 665062c (Capacitor + update :))
    }

    .header {
      display: flex;
      align-items: center;
      padding: 16px;
<<<<<<< HEAD
      border-bottom: 1px solid var(--border-color, #eee);
      background: var(--header-bg, #fff);
=======
      border-bottom: 1px solid var(--border-color);
      background: var(--header-bg);
>>>>>>> 665062c (Capacitor + update :))
      position: sticky;
      top: 0;
      z-index: 10;
    }

<<<<<<< HEAD
    .dark .header {
      --header-bg: #2d2d2d;
      --border-color: #444;
    }

=======
>>>>>>> 665062c (Capacitor + update :))
    .back-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      margin-right: 16px;
<<<<<<< HEAD
      color: inherit;
=======
      color: var(--text-primary);
>>>>>>> 665062c (Capacitor + update :))
      padding: 8px;
    }

    .header h2 {
      margin: 0;
      font-size: 18px;
<<<<<<< HEAD
=======
      color: var(--text-primary);
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
      color: var(--text-primary, #333);
=======
      color: var(--text-primary);
      font-weight: 600;
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
      border: 2px solid var(--border-color, #eee);
=======
      border: 2px solid var(--border-color);
      background: var(--bg-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
>>>>>>> 665062c (Capacitor + update :))
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
<<<<<<< HEAD
=======
      position: absolute;
      top: 0;
      left: 0;
    }

    .avatar-placeholder {
      font-size: 32px;
      color: var(--text-muted);
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
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
=======
      background: var(--bg-secondary);
      transition: background-color 0.2s;
      color: var(--text-primary);
    }

    .theme-option:hover {
      background: var(--bg-hover);
    }

    .theme-option input {
      display: none;
>>>>>>> 665062c (Capacitor + update :))
    }

    .theme-checkmark {
      width: 18px;
      height: 18px;
<<<<<<< HEAD
      border: 2px solid var(--border-color, #ccc);
      border-radius: 50%;
      margin-right: 12px;
      position: relative;
=======
      border: 2px solid var(--border-color);
      border-radius: 50%;
      margin-right: 12px;
      position: relative;
      flex-shrink: 0;
>>>>>>> 665062c (Capacitor + update :))
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

<<<<<<< HEAD
=======
    .theme-label {
      color: var(--text-primary);
    }

>>>>>>> 665062c (Capacitor + update :))
    .switch {
      display: flex;
      align-items: center;
      cursor: pointer;
<<<<<<< HEAD
=======
      color: var(--text-primary);
>>>>>>> 665062c (Capacitor + update :))
    }

    .switch input {
      display: none;
    }

    .slider {
      width: 44px;
      height: 24px;
<<<<<<< HEAD
      background: #ccc;
=======
      background: var(--border-color);
>>>>>>> 665062c (Capacitor + update :))
      border-radius: 24px;
      position: relative;
      margin-right: 12px;
      transition: background-color 0.3s;
<<<<<<< HEAD
=======
      flex-shrink: 0;
>>>>>>> 665062c (Capacitor + update :))
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 665062c (Capacitor + update :))
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
<<<<<<< HEAD
=======
      transition: background-color 0.2s;
    }

    .logout-button:hover {
      background: #c82333;
>>>>>>> 665062c (Capacitor + update :))
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

<<<<<<< HEAD
=======
    button:hover {
      background: #1565c0;
    }

>>>>>>> 665062c (Capacitor + update :))
    button.secondary {
      background: transparent;
      color: #1976d2;
      border: 1px solid #1976d2;
    }

<<<<<<< HEAD
    button.danger {
      background: transparent;
      color: #d32f2f;
      border: 1px solid #d32f2f;
    }

    button:disabled {
      background: #ccc;
=======
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
>>>>>>> 665062c (Capacitor + update :))
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
<<<<<<< HEAD
export class SettingsScreenComponent {
=======
export class SettingsScreenComponent implements OnInit {
>>>>>>> 665062c (Capacitor + update :))
  @Input() chatClient: ChatClient | null = null;
  @Input() themeMode = 'light';
  @Output() back = new EventEmitter();
  @Output() themeChange = new EventEmitter<string>();
  @Output() logout = new EventEmitter();

<<<<<<< HEAD
  avatarUrl: string = 'assets/default-avatar.png';
=======
  defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iNDAiIGZpbGw9IiM2Yzc1N2QiLz4KPHN2ZyB4PSIyMCIgeT0iMjAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNNDAgMjBDNDQuNDE4MyAyMCA0OCAxNi40MTgzIDQ4IDEyQzQ4IDcuNTgxNzIgNDQuNDE4MyA0IDQwIDRDMzUuNTgxNyA0IDMyIDcuNTgxNzIgMzIgMTJDMzIgMTYuNDE4MyAzNS41ODE3IDIwIDQwIDIwWk00MCAyNEMzMS4xNjM0IDI0IDI0IDMxLjE2MzQgMjQgNDBWMjRINDBaTTU2IDQwQzU2IDMxLjE2MzQgNDguODM2NiAyNCA0MCAyNFY0MEg1NloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo8L3N2Zz4K';
  avatarUrl: string = this.defaultAvatar;
  avatarLoaded = false;
  hasCustomAvatar = false;
>>>>>>> 665062c (Capacitor + update :))
  notificationsEnabled = false;

  ngOnInit() {
    this.loadAvatar();
    this.loadNotificationsSetting();
  }

  loadAvatar() {
<<<<<<< HEAD
    const savedAvatar = localStorage.getItem('user_avatar');
    if (savedAvatar) {
      this.avatarUrl = savedAvatar;
    }
  }
=======
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
>>>>>>> 665062c (Capacitor + update :))

  loadNotificationsSetting() {
    this.notificationsEnabled = localStorage.getItem('notifications_enabled') === 'true';
  }

<<<<<<< HEAD
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
=======
  removeAvatar() {
    this.avatarUrl = this.defaultAvatar;
    this.hasCustomAvatar = false;
>>>>>>> 665062c (Capacitor + update :))
    localStorage.removeItem('user_avatar');
  }

  onAvatarError(event: any) {
<<<<<<< HEAD
    event.target.src = 'assets/default-avatar.png';
=======
    this.avatarUrl = this.defaultAvatar;
    this.avatarLoaded = true;
    this.hasCustomAvatar = false;
>>>>>>> 665062c (Capacitor + update :))
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
