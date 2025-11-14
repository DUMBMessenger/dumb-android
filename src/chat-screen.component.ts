import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatClient } from './chat-client';

@Component({
  selector: 'app-chat-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container">
      <div class="header">
        <button class="back-button" (click)="back.emit()">←</button>
        <h2># {{channel}}</h2>
      </div>
      
      <div *ngIf="replyingTo" class="reply-preview">
        <div class="reply-info">
          <span>Ответ на {{replyingTo.from}}</span>
          <button class="close-reply" (click)="cancelReply()">×</button>
        </div>
        <div class="reply-text">{{replyingTo.text}}</div>
      </div>
      
      <div class="messages-container" #messagesContainer>
        <div *ngIf="loading" class="loading">
          <div class="spinner"></div>
        </div>
        
        <div *ngIf="error" class="error">{{error}}</div>
        
        <div *ngIf="!loading && messages.length === 0" class="empty-state">
          <h3>No messages yet</h3>
          <p>Start the conversation!</p>
        </div>
        
        <div *ngFor="let message of messages" 
             class="message" 
             [class.replied]="message.replyTo"
             [class.own-message]="message.from === currentUser">
          <div class="message-header">
            <span class="message-sender">{{message.from}}</span>
            <span class="message-time">{{formatTime(message.ts)}}</span>
          </div>
          
          <div *ngIf="message.replyToMessage" class="reply-context">
            <div class="reply-sender">↳ {{message.replyToMessage.from}}</div>
            <div class="reply-text">{{message.replyToMessage.text}}</div>
          </div>
          
          <div class="message-content">
            <div class="message-text">{{message.text}}</div>
            
            <div *ngIf="message.file" class="file-attachment">
              <div class="file-icon">📎</div>
              <div class="file-info">
                <div class="file-name">{{message.file.originalName}}</div>
                <div class="file-size">{{formatFileSize(message.file.size)}}</div>
              </div>
              <button class="download-btn" (click)="downloadFile(message.file)">Скачать</button>
            </div>
            
            <div *ngIf="message.voice" class="voice-message">
              <button class="play-btn" (click)="toggleVoicePlayback(message.voice)">
                {{isPlaying(message.voice.filename) ? '⏸️' : '▶️'}}
              </button>
              <div class="voice-duration">{{formatDuration(message.voice.duration)}}</div>
              <div class="voice-waveform"></div>
            </div>
          </div>
          
          <div class="message-actions">
            <button class="action-btn" (click)="startReply(message)">Ответить</button>
            <button class="action-btn" (click)="downloadFile(message.file)" *ngIf="message.file">
              Скачать
            </button>
          </div>
        </div>
      </div>
      
      <div class="input-container">
        <div *ngIf="isRecording" class="recording-indicator">
          <div class="recording-dot"></div>
          <span>Запись... {{formatDuration(recordingTime)}}</span>
          <button class="stop-recording" (click)="stopRecording()">⏹️</button>
        </div>
        
        <div class="input-actions">
          <button class="action-icon" (click)="toggleFileInput()">📎</button>
          <button class="action-icon" 
                  [class.recording]="isRecording"
                  (click)="toggleRecording()">
            🎤
          </button>
        </div>
        
        <textarea 
          class="message-input"
          [(ngModel)]="newMessage"
          (keydown)="handleKeyPress($event)"
          placeholder="Type a message..."
          rows="1"
          #messageInput
        ></textarea>
        
        <button 
          class="send-button"
          (click)="sendMessage()"
          [disabled]="!newMessage.trim() && !isRecording"
        >
          {{ isRecording ? '⏹️' : 'Send' }}
        </button>
      </div>
      
      <input 
        type="file" 
        #fileInput
        style="display: none"
        (change)="onFileSelected($event)"
        multiple
      >
    </div>
  `,
  styles: [`
    .chat-container { 
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
      flex-shrink: 0;
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
    
    .reply-preview {
      background: var(--bg-secondary, #f5f5f5);
      border-left: 4px solid #1976d2;
      padding: 12px;
      margin: 8px 16px;
      border-radius: 8px;
      flex-shrink: 0;
    }
    
    .dark .reply-preview {
      --bg-secondary: #3d3d3d;
    }
    
    .reply-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      font-size: 12px;
      color: #666;
    }
    
    .close-reply {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #999;
    }
    
    .reply-text {
      font-size: 14px;
      color: var(--text-primary, #333);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .messages-container { 
      flex: 1; 
      overflow-y: auto; 
      padding: 16px;
      background: var(--bg-primary, #fff);
    }
    
    .message { 
      margin-bottom: 16px; 
      padding: 12px 16px; 
      border-radius: 12px; 
      background: var(--message-bg, #fff); 
      border: 1px solid var(--border-color, #eee);
      position: relative;
    }
    
    .dark .message { 
      --message-bg: #2d2d2d; 
      --border-color: #444; 
    }
    
    .message.own-message {
      background: var(--own-message-bg, #e3f2fd);
      margin-left: 20px;
    }
    
    .dark .message.own-message {
      --own-message-bg: #1a3a5c;
    }
    
    .message-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 8px; 
    }
    
    .message-sender { 
      font-weight: bold; 
      color: #1976d2; 
      font-size: 14px;
    }
    
    .message-time { 
      font-size: 11px; 
      color: #666; 
    }
    
    .dark .message-time { 
      color: #aaa; 
    }
    
    .reply-context {
      background: var(--reply-bg, #f8f9fa);
      border-left: 3px solid #1976d2;
      padding: 8px 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      font-size: 13px;
    }
    
    .dark .reply-context {
      --reply-bg: #3d3d3d;
    }
    
    .reply-sender {
      font-weight: bold;
      color: #1976d2;
      margin-bottom: 2px;
    }
    
    .reply-text {
      color: var(--text-secondary, #666);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .message-content {
      margin-bottom: 8px;
    }
    
    .message-text { 
      line-height: 1.4; 
      font-size: 15px;
      word-wrap: break-word;
    }
    
    .file-attachment {
      display: flex;
      align-items: center;
      padding: 8px;
      background: var(--file-bg, #f8f9fa);
      border-radius: 6px;
      margin-top: 8px;
    }
    
    .dark .file-attachment {
      --file-bg: #3d3d3d;
    }
    
    .file-icon {
      margin-right: 12px;
      font-size: 16px;
    }
    
    .file-info {
      flex: 1;
    }
    
    .file-name {
      font-weight: 500;
      font-size: 14px;
    }
    
    .file-size {
      font-size: 12px;
      color: #666;
    }
    
    .download-btn {
      background: #1976d2;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }
    
    .voice-message {
      display: flex;
      align-items: center;
      padding: 8px;
      background: var(--voice-bg, #f8f9fa);
      border-radius: 6px;
      margin-top: 8px;
    }
    
    .dark .voice-message {
      --voice-bg: #3d3d3d;
    }
    
    .play-btn {
      background: #1976d2;
      color: white;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .voice-duration {
      font-size: 14px;
      margin-right: 12px;
      min-width: 40px;
    }
    
    .voice-waveform {
      flex: 1;
      height: 20px;
      background: var(--waveform-bg, #e0e0e0);
      border-radius: 10px;
    }
    
    .message-actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    
    .action-btn {
      background: none;
      border: none;
      color: #666;
      font-size: 12px;
      cursor: pointer;
      padding: 4px 8px;
    }
    
    .input-container { 
      display: flex; 
      padding: 16px; 
      border-top: 1px solid var(--border-color, #eee); 
      background: var(--input-bg, #fff); 
      position: sticky; 
      bottom: 0; 
      align-items: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }
    
    .dark .input-container { 
      --input-bg: #2d2d2d; 
      --border-color: #444; 
    }
    
    .recording-indicator {
      display: flex;
      align-items: center;
      background: #ffebee;
      color: #c62828;
      padding: 8px 12px;
      border-radius: 20px;
      margin-bottom: 8px;
      gap: 8px;
    }
    
    .recording-dot {
      width: 8px;
      height: 8px;
      background: #c62828;
      border-radius: 50%;
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    
    .stop-recording {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
    }
    
    .input-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .action-icon {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      transition: background-color 0.2s;
    }
    
    .action-icon:hover {
      background: var(--bg-hover, #f5f5f5);
    }
    
    .action-icon.recording {
      background: #c62828;
      color: white;
    }
    
    .message-input { 
      flex: 1; 
      padding: 12px; 
      border: 1px solid var(--input-border, #ddd); 
      border-radius: 20px; 
      font-size: 15px; 
      background: var(--input-field-bg, #fff); 
      color: var(--input-field-color, #333); 
      resize: none; 
      min-height: 40px;
      max-height: 120px;
      font-family: inherit;
    }
    
    .dark .message-input { 
      --input-field-bg: #333; 
      --input-field-color: #fff; 
      --input-border: #555; 
    }
    
    .send-button { 
      background: #1976d2; 
      color: white; 
      border: none; 
      border-radius: 20px; 
      padding: 12px 20px; 
      cursor: pointer; 
      font-size: 14px;
      min-width: 60px;
    }
    
    .send-button:disabled { 
      background: #ccc; 
      cursor: not-allowed; 
    }
    
    .empty-state { 
      text-align: center; 
      padding: 60px 20px; 
      color: #666; 
    }
    
    .dark .empty-state { 
      color: #aaa; 
    }

    @media (max-width: 768px) {
      .header {
        padding: 12px 16px;
      }
      
      .header h2 {
        font-size: 16px;
      }
      
      .messages-container {
        padding: 12px;
      }
      
      .message {
        padding: 10px 12px;
        margin-bottom: 12px;
      }
      
      .message-header {
        margin-bottom: 6px;
      }
      
      .message-sender {
        font-size: 13px;
      }
      
      .message-time {
        font-size: 10px;
      }
      
      .message-text {
        font-size: 14px;
      }
      
      .input-container {
        padding: 12px;
        gap: 8px;
      }
      
      .message-input {
        padding: 10px 12px;
        font-size: 14px;
      }
      
      .send-button {
        padding: 10px 16px;
        min-width: 50px;
      }
      
      .action-icon {
        font-size: 18px;
        padding: 6px;
      }
      
      .file-attachment {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .download-btn {
        align-self: flex-end;
      }
    }
  `]
})
export class ChatScreenComponent implements OnInit {
  @Input() chatClient: ChatClient | null = null;
  @Input() channel = '';
  @Input() themeMode = 'system';
  @Output() back = new EventEmitter();
  
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  messages: any[] = [];
  newMessage = '';
  loading = true;
  error = '';
  replyingTo: any = null;
  currentUser = 'user';
  isRecording = false;
  recordingTime = 0;
  recordingInterval: any;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  currentlyPlaying: string | null = null;
  audioElement: HTMLAudioElement | null = null;

  async ngOnInit() {
    await this.loadMessages();
    
    if (this.chatClient) {
      this.chatClient.onMessage((data) => {
        if (data.type === 'message' && data.action === 'new' && data.channel === this.channel) {
          this.messages = [...this.messages, data];
          this.scrollToBottom();
        }
      });
    }
  }

  async loadMessages() {
    if (!this.chatClient) return;
    
    try {
      this.messages = await this.chatClient.getMessages(this.channel, 50);
      this.error = '';
      this.scrollToBottom();
    } catch (error: any) {
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        const container = this.messagesContainer.nativeElement;
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  async sendMessage() {
    if ((!this.newMessage.trim() && !this.isRecording) || !this.chatClient) return;

    if (this.isRecording) {
      this.stopRecording();
      return;
    }

    const message = this.newMessage;
    this.newMessage = '';

    try {
      await this.chatClient.sendMessage({
        channel: this.channel,
        text: message,
        replyTo: this.replyingTo?.id || null
      });
      
      this.cancelReply();
    } catch (error: any) {
      this.error = `Failed to send message: ${error.message}`;
      this.newMessage = message;
    }
  }

  handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  startReply(message: any) {
    this.replyingTo = message;
    this.messageInput.nativeElement.focus();
  }

  cancelReply() {
    this.replyingTo = null;
  }

  toggleFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any) {
    const files = event.target.files;
    if (!files.length || !this.chatClient) return;

    for (let file of files) {
      try {
        const uploadedFile = await this.chatClient.uploadFile(file);
        
        await this.chatClient.sendMessage({
          channel: this.channel,
          text: `File: ${file.name}`,
          fileId: uploadedFile.id
        });
      } catch (error: any) {
        this.error = `Failed to upload file: ${error.message}`;
      }
    }
    
    event.target.value = '';
  }

  downloadFile(file: any) {
    if (file && file.downloadUrl && this.chatClient) {
      window.open(`${this.chatClient.baseUrl}${file.downloadUrl}`, '_blank');
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.isRecording = true;
      this.recordingTime = 0;

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.sendVoiceMessage(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      
      this.recordingInterval = setInterval(() => {
        this.recordingTime++;
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      this.error = 'Не удалось начать запись. Проверьте разрешения микрофона.';
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      clearInterval(this.recordingInterval);
    }
  }

  async sendVoiceMessage(audioBlob: Blob) {
    if (!this.chatClient) return;

    try {
      const filename = `voice_${Date.now()}.webm`;
      
      const formData = new FormData();
      formData.append('voice', audioBlob, filename);

      const response = await fetch(`${this.chatClient.baseUrl}/api/upload/voice/${filename}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.chatClient['token']}`
        },
        body: formData
      });

      if (response.ok) {
        await this.chatClient.sendMessage({
          channel: this.channel,
          text: 'Голосовое сообщение',
          voiceMessage: filename
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      this.error = `Failed to send voice message: ${error.message}`;
    }
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  toggleVoicePlayback(voice: any) {
    if (this.currentlyPlaying === voice.filename) {
      this.stopVoicePlayback();
    } else {
      this.playVoiceMessage(voice);
    }
  }

  playVoiceMessage(voice: any) {
    this.stopVoicePlayback();
    
    if (this.chatClient) {
      this.audioElement = new Audio(`${this.chatClient.baseUrl}${voice.downloadUrl}`);
      this.currentlyPlaying = voice.filename;
      
      this.audioElement.play().catch(error => {
        console.error('Error playing audio:', error);
        this.stopVoicePlayback();
      });
      
      this.audioElement.onended = () => {
        this.stopVoicePlayback();
      };
    }
  }

  stopVoicePlayback() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    this.currentlyPlaying = null;
  }

  isPlaying(filename: string): boolean {
    return this.currentlyPlaying === filename;
  }

  ngOnDestroy() {
    this.stopRecording();
    this.stopVoicePlayback();
  }
}
