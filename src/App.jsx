import { useState, useEffect, lazy, Suspense } from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';

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
    onNavigate('channels');
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
      chat: <Chat serverUrl={serverUrl} channel={screenParams.channel} onNavigate={onNavigate} />,
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
