// AuthScreen.jsx
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonLabel,
  IonCard,
  IonCardContent,
  IonText
} from '@ionic/react';
import { useState } from 'react';

export default function AuthScreen({ serverUrl, onLogin, onNavigate }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '' });

  const handleAuth = async () => {
    if (!form.username || !form.password) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const ping = await fetch(`${serverUrl}/api/ping`);
      if (!ping.ok) {
        throw new Error('Server not responding');
      }

      const { ChatClient } = await import('dumb_api_js');
      const client = new ChatClient({ serverUrl });

      let result;
      
      if (isLogin) {
        result = await client.login(form.username, form.password);
      } else {
        result = await client.register(form.username, form.password);
        if (result.success) {
          result = await client.login(form.username, form.password);
        }
      }

      if (result.success && result.token) {
        onLogin(result.token);
      } else {
        setError(result.message || 'Authentication failed');
      }
      
    } catch (error) {
      setError(error.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isLogin ? 'Login' : 'Register'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        <div style={{ padding: '16px', maxWidth: '400px', margin: '0 auto' }}>
          <IonCard className="auth-card">
            <IonCardContent>
              <h2 style={{ textAlign: 'center', marginBottom: '20px' }} className="auth-title">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              
              <IonItem>
                <IonLabel position="stacked">Username</IonLabel>
                <IonInput
                  value={form.username}
                  onIonInput={e => setForm(prev => ({ ...prev, username: e.detail.value }))}
                />
              </IonItem>
              
              <IonItem>
                <IonLabel position="stacked">Password</IonLabel>
                <IonInput
                  type="password"
                  value={form.password}
                  onIonInput={e => setForm(prev => ({ ...prev, password: e.detail.value }))}
                />
              </IonItem>
              
              {error && (
                <IonText color="danger" style={{ display: 'block', margin: '10px 0', textAlign: 'center' }}>
                  {error}
                </IonText>
              )}
              
              <IonButton
                expand="block"
                onClick={handleAuth}
                disabled={loading}
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
              </IonButton>
              
              <IonButton
                expand="block"
                fill="clear"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setForm({ username: '', password: '' });
                }}
                disabled={loading}
              >
                {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
              </IonButton>
            </IonCardContent>
          </IonCard>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <IonButton 
              fill="outline" 
              onClick={() => onNavigate('server')}
            >
              Back to Server Selection
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
