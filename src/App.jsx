import { useState, useEffect } from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Haptics } from '@capacitor/haptics';

import ServerSelection from './pages/ServerSelection';
import AuthScreen from './pages/AuthScreen';
import Channels from './pages/Channels';
import Chat from './pages/Chat';

setupIonicReact();

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
        console.log('User denied push notifications');
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token:', token.value);
        setNotificationToken(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received:', notification);
        
        Haptics.vibrate({ duration: 200 });
        
        if (notification.data && notification.data.channel) {
          showLocalNotification(notification);
        }
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed:', notification);
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

  const onLogin = (token) => {
    localStorage.setItem('token', token);
    
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
      
      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Error registering push token:', error);
    }
  };

  const onToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'server':
        return (
          <ServerSelection
            serverUrl={serverUrl}
            onSetServerUrl={onSetServerUrl}
            onNavigate={onNavigate}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        );
      case 'auth':
        return (
          <AuthScreen
            serverUrl={serverUrl}
            onLogin={onLogin}
            onNavigate={onNavigate}
          />
        );
      case 'channels':
        return (
          <Channels
            serverUrl={serverUrl}
            onNavigate={onNavigate}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        );
      case 'chat':
        return (
          <Chat
            serverUrl={serverUrl}
            channel={screenParams.channel}
            onNavigate={onNavigate}
            notificationToken={notificationToken}
          />
        );
      default:
        return (
          <ServerSelection
            serverUrl={serverUrl}
            onSetServerUrl={onSetServerUrl}
            onNavigate={onNavigate}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        );
    }
  };

  return (
    <IonApp className={theme}>
      {renderScreen()}
    </IonApp>
  );
}
