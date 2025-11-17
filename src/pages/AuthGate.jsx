import { IonPage, IonContent } from '@ionic/react';
import { useEffect, useState } from 'react';
import AuthScreen from './AuthScreen';

export default function AuthGate({ serverUrl, onNavigate }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem('token');
      
      if (!savedToken) {
        setChecking(false);
        return;
      }

      const { ChatClient } = await import('dumb_api_js');
      const client = new ChatClient({ 
        serverUrl, 
        token: savedToken,
        autoReconnect: false 
      });
      
      await client.getChannels();
      onNavigate('channels');
      
    } catch (error) {
      localStorage.removeItem('token');
      setChecking(false);
    }
  };

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    onNavigate('channels');
  };

  if (checking) {
    return (
      <IonPage>
        <IonContent>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            Checking authentication...
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return <AuthScreen serverUrl={serverUrl} onLogin={handleLogin} />;
}
