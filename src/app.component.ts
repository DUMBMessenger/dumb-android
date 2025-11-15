import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServerSelectionComponent } from './server-selection.component';
import { AuthScreenComponent } from './auth-screen.component';
import { ChannelsScreenComponent } from './channels-screen.component';
import { ChatScreenComponent } from './chat-screen.component';
import { SettingsScreenComponent } from './settings-screen.component';
import { ChatClient } from './chat-client';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ServerSelectionComponent,
    AuthScreenComponent,
    ChannelsScreenComponent,
    ChatScreenComponent,
    SettingsScreenComponent
  ],
  template: `
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
}
