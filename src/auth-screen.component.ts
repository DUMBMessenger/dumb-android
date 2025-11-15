import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatClient } from './chat-client';

@Component({
  selector: 'app-auth-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-container">
      <button class="back-button" (click)="back.emit()">← Back to servers</button>
      
      <div class="server-info">Connected to: {{serverUrl}}</div>
      
      <div class="card">
        <div class="header">
          <h2>{{isLogin ? 'Login' : 'Register'}}</h2>
          <p>{{isLogin ? 'Welcome back!' : 'Create your account'}}</p>
        </div>
        
        <div *ngIf="error" class="error">{{error}}</div>
        
        <div class="form-group">
          <label>Username</label>
          <input 
            type="text" 
            [(ngModel)]="username"
            placeholder="Enter your username"
            [disabled]="loading"
          >
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input 
            type="password" 
            [(ngModel)]="password"
            placeholder="Enter your password"
            [disabled]="loading"
          >
        </div>
        
        <button 
          (click)="authenticate()"
          [disabled]="!username.trim() || !password.trim() || loading"
        >
          {{loading ? '...' : (isLogin ? 'Login' : 'Register')}}
        </button>
        
        <button 
          class="secondary" 
          (click)="switchMode()"
          [disabled]="loading"
        >
          {{isLogin ? 'Need an account? Register' : 'Have an account? Login'}}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .auth-container { max-width: 400px; margin: 40px auto; }
    .card { background: var(--card-bg, #fff); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 32px; }
    .dark .card { --card-bg: #2d2d2d; }
    .header { text-align: center; margin-bottom: 32px; }
    .form-group { margin-bottom: 20px; }
<<<<<<< HEAD
    label { display: block; margin-bottom: 8px; font-weight: 500; }
=======
    label { display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-primary, #333); }
>>>>>>> 665062c (Capacitor + update :))
    input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; background: var(--input-bg, #fff); color: var(--input-color, #333); }
    .dark input { --input-bg: #333; --input-color: #fff; border-color: #555; }
    button { background: #1976d2; color: white; border: none; border-radius: 4px; padding: 12px 24px; cursor: pointer; font-size: 14px; width: 100%; margin-bottom: 12px; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    button.secondary { background: transparent; color: #1976d2; border: 1px solid #1976d2; }
    .error { background: #ffebee; color: #c62828; padding: 12px; border-radius: 4px; margin-bottom: 16px; border: 1px solid #ffcdd2; }
    .dark .error { background: #311b1b; color: #ef9a9a; border-color: #7b1f1f; }
    .back-button { background: none; border: none; color: #666; cursor: pointer; margin-bottom: 16px; padding: 8px 0; }
    .dark .back-button { color: #aaa; }
    .server-info { text-align: center; margin-bottom: 20px; padding: 12px; background: #e3f2fd; border-radius: 4px; font-size: 14px; }
    .dark .server-info { background: #1a3a5c; color: #90caf9; }
  `]
})
export class AuthScreenComponent {
  @Input() serverUrl = '';
<<<<<<< HEAD
  @Output() login = new EventEmitter<string>();
=======
  @Output() login = new EventEmitter<{token: string, username: string}>();
>>>>>>> 665062c (Capacitor + update :))
  @Output() back = new EventEmitter();

  username = '';
  password = '';
  isLogin = true;
  loading = false;
  error = '';

  async authenticate() {
    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Please enter username and password';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const client = new ChatClient(this.serverUrl);
<<<<<<< HEAD
      
      // Используем правильный метод в зависимости от режима
=======
>>>>>>> 665062c (Capacitor + update :))
      const result = this.isLogin 
        ? await client.login(this.username, this.password)
        : await client.register(this.username, this.password);

      if (result.success) {
<<<<<<< HEAD
        this.login.emit(result.token);
=======
        client.setToken(result.token);
        this.login.emit({token: result.token, username: this.username});
>>>>>>> 665062c (Capacitor + update :))
      } else {
        this.error = result.error || 'Authentication failed';
      }
    } catch (error: any) {
      this.error = error.message || 'Authentication failed';
    } finally {
      this.loading = false;
    }
  }

  switchMode() {
    this.isLogin = !this.isLogin;
    this.error = '';
  }
}
