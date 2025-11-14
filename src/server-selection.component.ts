import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatClient } from './chat-client';

@Component({
  selector: 'app-server-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="server-selection-container">
      <div class="header">
        <h1>DUMB Chat</h1>
        <p>Connect to your chat server</p>
      </div>
      
      <div class="card">
        <h2>Add New Server</h2>
        <div class="form-group">
          <label>Server Name</label>
          <input 
            type="text" 
            [(ngModel)]="serverName"
            placeholder="My Chat Server"
          >
        </div>
        <div class="form-group">
          <label>Server URL</label>
          <input 
            type="text" 
            [(ngModel)]="serverUrl"
            placeholder="http://localhost:3000"
          >
        </div>
        <button 
          (click)="saveServer()"
          [disabled]="!serverName.trim() || !serverUrl.trim()"
        >
          Save Server
        </button>
      </div>
      
      <div class="server-list">
        <h2>Saved Servers</h2>
        
        <div *ngIf="loading" class="loading">
          <div class="spinner"></div>
        </div>
        
        <div *ngIf="savedServers.length === 0" class="empty-state">
          No servers saved yet. Add one above.
        </div>
        
        <div *ngFor="let server of savedServers" class="server-item" (click)="connectToServer(server)">
          <div class="server-name">{{server.name}}</div>
          <div class="server-url">{{server.url}}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .server-selection-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 20px 0;
    }

    .header { 
      text-align: center; 
      padding: 40px 0 20px; 
    }
    
    .header h1 {
      margin-bottom: 8px;
      font-size: 32px;
    }
    
    .header p {
      color: var(--text-secondary, #666);
      font-size: 16px;
    }

    .card { 
      background: var(--card-bg, #fff); 
      border-radius: 12px; 
      box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.1)); 
      padding: 24px; 
      margin-bottom: 20px; 
    }
    
    .dark .card { 
      --card-bg: #2d2d2d; 
    }
    
    .card h2 {
      margin-bottom: 20px;
      font-size: 20px;
    }

    .form-group { 
      margin-bottom: 16px; 
    }
    
    label { 
      display: block; 
      margin-bottom: 8px; 
      font-weight: 500; 
      color: var(--text-primary, #333);
    }
    
    input { 
      width: 100%; 
      padding: 12px; 
      border: 1px solid var(--input-border, #ddd); 
      border-radius: 8px; 
      font-size: 14px; 
      box-sizing: border-box; 
      background: var(--input-field-bg, #fff); 
      color: var(--input-field-color, #333); 
      transition: border-color 0.2s;
    }
    
    input:focus {
      outline: none;
      border-color: #1976d2;
    }
    
    .dark input { 
      --input-field-bg: #333; 
      --input-field-color: #fff; 
      --input-border: #555; 
    }
    
    button { 
      background: #1976d2; 
      color: white; 
      border: none; 
      border-radius: 8px; 
      padding: 12px 24px; 
      cursor: pointer; 
      font-size: 14px; 
      width: 100%; 
      transition: background-color 0.2s;
    }
    
    button:hover {
      background: #1565c0;
    }
    
    button:disabled { 
      background: #ccc; 
      cursor: not-allowed; 
    }
    
    .server-list { 
      margin-top: 24px; 
    }
    
    .server-list h2 {
      margin-bottom: 16px;
      font-size: 20px;
    }
    
    .server-item { 
      padding: 16px; 
      border: 1px solid var(--border-color, #eee); 
      border-radius: 8px; 
      margin-bottom: 12px; 
      cursor: pointer; 
      transition: all 0.2s; 
      background: var(--card-bg, #fff);
    }
    
    .dark .server-item { 
      border-color: #444; 
      background: #2d2d2d; 
    }
    
    .server-item:hover { 
      background: var(--bg-hover, #f5f5f5); 
      transform: translateY(-1px); 
      box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.1));
    }
    
    .dark .server-item:hover { 
      background: #3d3d3d; 
    }
    
    .server-name { 
      font-weight: bold; 
      margin-bottom: 4px; 
      color: var(--text-primary, #333);
    }
    
    .server-url { 
      font-size: 12px; 
      color: var(--text-secondary, #666); 
    }
    
    .dark .server-url { 
      color: #aaa; 
    }
    
    .empty-state { 
      text-align: center; 
      padding: 40px 20px; 
      color: var(--text-secondary, #666); 
    }
    
    .dark .empty-state { 
      color: #aaa; 
    }
    
    .loading { 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      padding: 20px; 
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

    @media (max-width: 768px) {
      .server-selection-container {
        padding: 16px 12px;
      }
      
      .header {
        padding: 20px 0;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .card {
        padding: 20px;
      }
      
      .server-item {
        padding: 12px;
      }
    }
  `]
})
export class ServerSelectionComponent {
  @Input() themeMode = 'system';
  @Output() connect = new EventEmitter<string>();
  @Output() themeChange = new EventEmitter<string>();

  savedServers: any[] = JSON.parse(localStorage.getItem('saved_servers') || '[]');
  serverName = '';
  serverUrl = '';
  loading = false;

  saveServer() {
    if (!this.serverName.trim() || !this.serverUrl.trim()) return;

    const server = {
      name: this.serverName.trim(),
      url: this.serverUrl.trim().replace(/\/+$/, '')
    };

    this.savedServers = [...this.savedServers, server];
    localStorage.setItem('saved_servers', JSON.stringify(this.savedServers));
    
    this.serverName = '';
    this.serverUrl = '';
  }

  async connectToServer(server: any) {
    this.loading = true;
    const client = new ChatClient(server.url);
    
    try {
      await client.createWebSocketChannel();
      this.connect.emit(server.url);
    } catch (error: any) {
      alert(`Connection failed: ${error.message}`);
    } finally {
      this.loading = false;
    }
  }
}
