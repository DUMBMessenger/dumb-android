import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
<<<<<<< HEAD
=======
import { FormsModule } from '@angular/forms';
>>>>>>> 665062c (Capacitor + update :))
import { ChatClient } from './chat-client';

@Component({
  selector: 'app-channels-screen',
  standalone: true,
<<<<<<< HEAD
  imports: [CommonModule],
=======
  imports: [CommonModule, FormsModule],
>>>>>>> 665062c (Capacitor + update :))
  template: `
    <div class="channels-container">
      <div class="header">
        <h1>Channels</h1>
        <div class="header-actions">
<<<<<<< HEAD
          <button class="secondary" (click)="searchChannels()">Search</button>
=======
          <button class="secondary" (click)="showSearch = !showSearch">Search</button>
>>>>>>> 665062c (Capacitor + update :))
          <button class="secondary" (click)="createChannel()">Create</button>
          <button class="icon-button" (click)="openSettings.emit()">⚙️</button>
          <button class="secondary" (click)="logout.emit()">Logout</button>
        </div>
      </div>
<<<<<<< HEAD
=======

      <div *ngIf="showSearch" class="search-container">
        <input 
          type="text" 
          [(ngModel)]="searchQuery"
          placeholder="Search channels..."
          class="search-input"
        >
        <button (click)="performSearch()">Search</button>
        
        <div *ngIf="searchResults.length > 0" class="search-results">
          <div *ngFor="let channel of searchResults" class="search-result-item">
            <div class="channel-info">
              <div class="channel-name"># {{channel.name}}</div>
              <div class="channel-members">{{channel.memberCount || 0}} members</div>
            </div>
            <button class="join-btn" (click)="joinChannel(channel.name)">Join</button>
          </div>
        </div>
      </div>
>>>>>>> 665062c (Capacitor + update :))
      
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
      </div>
      
      <div *ngIf="error" class="error">{{error}}</div>
      
      <div *ngIf="!loading && channels.length === 0" class="empty-state">
        <h3>No channels yet</h3>
        <p>Create your first channel or join existing ones</p>
      </div>
      
      <div *ngIf="!loading" class="channels-list">
        <div *ngFor="let channel of channels" class="channel-item" (click)="openChannel(channel)">
          <div class="channel-name"># {{channel.name}}</div>
          <div class="channel-meta">{{channel.memberCount || 0}} members</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .channels-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary, #fff);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 16px;
      border-bottom: 1px solid var(--border-color, #eee);
      background: var(--header-bg, #fff);
      flex-shrink: 0;
    }

    .dark .header {
      --header-bg: #2d2d2d;
      --border-color: #444;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
<<<<<<< HEAD
=======
      color: var(--text-primary, #333);
>>>>>>> 665062c (Capacitor + update :))
    }

    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
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

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .icon-button {
      background: transparent;
      color: inherit;
      border: 1px solid var(--border-color, #eee);
      padding: 10px;
      min-width: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

<<<<<<< HEAD
=======
    .search-container {
      padding: 16px;
      border-bottom: 1px solid var(--border-color, #eee);
      background: var(--bg-secondary, #f5f5f5);
    }

    .dark .search-container {
      --bg-secondary: #3d3d3d;
    }

    .search-input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--input-border, #ddd);
      border-radius: 6px;
      margin-bottom: 12px;
      background: var(--input-bg, #fff);
      color: var(--input-color, #333);
    }

    .search-results {
      margin-top: 12px;
    }

    .search-result-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--card-bg, #fff);
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .join-btn {
      background: #4caf50;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }

>>>>>>> 665062c (Capacitor + update :))
    .channels-list {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .channel-item {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border-color, #eee);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .dark .channel-item {
      --card-bg: #2d2d2d;
      --border-color: #444;
    }

    .channel-item:hover {
      background: var(--bg-hover, #f5f5f5);
      transform: translateY(-1px);
      box-shadow: var(--shadow, 0 4px 8px rgba(0,0,0,0.1));
    }

    .dark .channel-item:hover {
      --bg-hover: #3d3d3d;
    }

    .channel-name {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 4px;
      color: var(--text-primary, #333);
    }

    .channel-meta {
      font-size: 14px;
      color: var(--text-secondary, #666);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary, #666);
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .empty-state h3 {
      margin-bottom: 8px;
      font-size: 18px;
<<<<<<< HEAD
=======
      color: var(--text-primary, #333);
>>>>>>> 665062c (Capacitor + update :))
    }

    .empty-state p {
      font-size: 14px;
<<<<<<< HEAD
=======
      color: var(--text-secondary, #666);
>>>>>>> 665062c (Capacitor + update :))
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
      flex: 1;
    }

    .spinner {
      border: 3px solid var(--bg-secondary, #f3f3f3);
      border-top: 3px solid #1976d2;
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
      padding: 12px 16px;
      border-radius: 8px;
      margin: 16px;
      border: 1px solid #ffcdd2;
      font-size: 14px;
    }

    .dark .error {
      background: #311b1b;
      color: #ef9a9a;
      border-color: #7b1f1f;
    }

    @media (max-width: 768px) {
      .header {
        padding: 16px 12px;
      }
      
      .header h1 {
        font-size: 20px;
      }
      
      .header-actions {
        gap: 8px;
      }
      
      button {
        padding: 8px 12px;
        font-size: 12px;
      }
      
      .icon-button {
        padding: 8px;
        min-width: 40px;
      }
      
      .channels-list {
        padding: 16px 12px;
        gap: 8px;
      }
      
      .channel-item {
        padding: 12px;
      }
      
      .channel-name {
        font-size: 15px;
      }
      
      .channel-meta {
        font-size: 13px;
      }
    }
  `]
})
export class ChannelsScreenComponent implements OnInit {
  @Input() chatClient: ChatClient | null = null;
  @Input() themeMode = 'system';
  @Output() logout = new EventEmitter();
  @Output() openChat = new EventEmitter<string>();
  @Output() openSettings = new EventEmitter();

  channels: any[] = [];
<<<<<<< HEAD
=======
  searchResults: any[] = [];
  searchQuery = '';
  showSearch = false;
>>>>>>> 665062c (Capacitor + update :))
  loading = true;
  error = '';

  async ngOnInit() {
    if (this.chatClient) {
      await this.loadChannels();
<<<<<<< HEAD
      this.chatClient.createWebSocketChannel();
      this.chatClient.onMessage((data) => {
        if (data.type === 'message' && data.action === 'new') {
          this.loadChannels();
        }
      });
    }
  }

=======
      this.setupWebSocket();
    }
  }

  setupWebSocket() {
    if (!this.chatClient) return;
    
    this.chatClient.createWebSocketChannel();
    this.chatClient.onMessage((data) => {
      if (data.type === 'channel_update') {
        this.loadChannels();
      }
      if (data.type === 'message' && data.action === 'new') {
        this.loadChannels();
      }
    });
  }

>>>>>>> 665062c (Capacitor + update :))
  async loadChannels() {
    if (!this.chatClient) return;
    
    try {
      this.channels = await this.chatClient.getChannels();
      this.error = '';
    } catch (error: any) {
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  }

  openChannel(channel: any) {
    this.openChat.emit(channel.name);
  }

<<<<<<< HEAD
  createChannel() {
    const name = prompt('Enter channel name:');
    if (name && this.chatClient) {
      this.chatClient.createChannel(name).then(() => {
        this.loadChannels();
      }).catch((error: any) => {
        alert(`Failed to create channel: ${error.message}`);
      });
    }
  }

  searchChannels() {
    const query = prompt('Search channels:');
    if (query && this.chatClient) {
      this.chatClient.searchChannels(query).then(channels => {
        if (channels.length === 0) {
          alert('No channels found');
          return;
        }
        
        const channelList = channels.map((c: any) => `• ${c.name}`).join('\n');
        const joinName = prompt(`Found channels:\n${channelList}\n\nEnter channel name to join:`);
        
        if (joinName && this.chatClient) {
          this.chatClient.joinChannel(joinName).then(() => {
            this.loadChannels();
          }).catch((error: any) => {
            alert(`Failed to join channel: ${error.message}`);
          });
        }
      });
=======
  async createChannel() {
    const name = prompt('Enter channel name:');
    if (name && this.chatClient) {
      try {
        await this.chatClient.createChannel(name);
        await this.loadChannels();
      } catch (error: any) {
        alert(`Failed to create channel: ${error.message}`);
      }
    }
  }

  async performSearch() {
    if (!this.searchQuery.trim() || !this.chatClient) return;

    try {
      this.searchResults = await this.chatClient.searchChannels(this.searchQuery);
    } catch (error: any) {
      alert(`Search failed: ${error.message}`);
    }
  }

  async joinChannel(channelName: string) {
    if (!this.chatClient) return;

    try {
      await this.chatClient.joinChannel(channelName);
      await this.loadChannels();
      this.showSearch = false;
      this.searchQuery = '';
      this.searchResults = [];
    } catch (error: any) {
      alert(`Failed to join channel: ${error.message}`);
>>>>>>> 665062c (Capacitor + update :))
    }
  }
}
