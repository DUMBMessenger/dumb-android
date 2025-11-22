import { useState, useEffect, lazy, Suspense } from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics } from '@capacitor/haptics';

setupIonicReact();

const ServerSelection = lazy(() => import('./pages/ServerSelection'));
const AuthScreen = lazy(() => import('./pages/AuthScreen'));
const Channels = lazy(() => import('./pages/Channels'));
const Chat = lazy(() => import('./pages/Chat'));
const Settings = lazy(() => import('./pages/Settings'));

export default function MainApp() {
  const [serverUrl, setServerUrl] = useState('');
  const [theme, setTheme] = useState('light');
  const [currentScreen, setCurrentScreen] = useState('server');
  const [screenParams, setScreenParams] = useState({});
  const [notificationToken, setNotificationToken] = useState('');

  useEffect(() => {
    initializePushNotifications();
  }, []);

  const initializePushNotifications = async () => {
    try {
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      
      if (permStatus.receive !== 'granted') {
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        setNotificationToken(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        Haptics.vibrate({ duration: 200 });
        
        if (notification.data && notification.data.channel) {
          showLocalNotification(notification);
        }
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        handleNotificationClick(notification);
      });

    } catch (error) {
      console.error('Push notifications initialization error:', error);
    }
  };

  const showLocalNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title || 'New Message', {
        body: notification.body,
        icon: '/assets/icon.png',
        data: notification.data
      });
    }
  };

  const handleNotificationClick = (notification) => {
    const data = notification.notification.data;
    if (data && data.channel) {
      setCurrentScreen('chat');
      setScreenParams({ channel: data.channel });
    }
  };

  const onNavigate = (screen, params = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);
  };

  const onSetServerUrl = (url) => {
    setServerUrl(url);
  };

  const onLogin = (token, username) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    
    if (notificationToken) {
      registerPushToken(token);
    }
    
    onNavigate('channels');
  };

  const registerPushToken = async (userToken) => {
    try {
      const response = await fetch(`${serverUrl}/api/register-push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          pushToken: notificationToken,
          platform: 'android'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to register push token');
      }
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  };

  const onToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const renderScreen = () => {
    const screenProps = {
      serverUrl,
      onNavigate,
      theme,
      onToggleTheme
    };

    const screens = {
      server: <ServerSelection {...screenProps} onSetServerUrl={onSetServerUrl} />,
      auth: <AuthScreen serverUrl={serverUrl} onLogin={onLogin} onNavigate={onNavigate} />,
      channels: <Channels {...screenProps} />,
      chat: <Chat serverUrl={serverUrl} channel={screenParams.channel} onNavigate={onNavigate} notificationToken={notificationToken} />,
      settings: <Settings {...screenProps} />
    };

    return screens[currentScreen] || screens.server;
  };

  return (
    <IonApp className={theme}>
      <Suspense fallback={
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3880ff', animation: 'pulse 1.5s ease-in-out infinite' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3880ff', animation: 'pulse 1.5s ease-in-out infinite 0.3s' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3880ff', animation: 'pulse 1.5s ease-in-out infinite 0.6s' }}></div>
          </div>
        </div>
      }>
        {renderScreen()}
      </Suspense>
    </IonApp>
  );
}
