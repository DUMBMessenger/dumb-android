import { useState, useEffect, lazy, Suspense } from 'react';
import { IonApp, setupIonicReact } from '@ionic/react';
import { ThemeProvider } from 'styled-components';
import original from 'react95/dist/themes/original';

setupIonicReact();

const ServerSelection = lazy(() => import('./pages/ServerSelection'));
const ServerSelection95 = lazy(() => import('./pages/ServerSelection95'));
const AuthScreen = lazy(() => import('./pages/AuthScreen'));
const AuthScreen95 = lazy(() => import('./pages/AuthScreen95'));
const Channels = lazy(() => import('./pages/Channels'));
const Channels95 = lazy(() => import('./pages/Channels95'));
const Chat = lazy(() => import('./pages/Chat'));
const Chat95 = lazy(() => import('./pages/Chat95'));
const Settings = lazy(() => import('./pages/Settings'));
const Settings95 = lazy(() => import('./pages/Settings95'));

export default function MainApp() {
  const [serverUrl, setServerUrl] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [currentScreen, setCurrentScreen] = useState('server');
  const [screenParams, setScreenParams] = useState({});

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

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
    setTheme(theme === '95core' ? 'light' : '95core');
  };

  const renderScreen = () => {
    const screenProps = {
      serverUrl,
      onNavigate,
      theme,
      onToggleTheme
    };

    if (theme === '95core') {
      const screens95 = {
        server: <ServerSelection95 {...screenProps} onSetServerUrl={onSetServerUrl} />,
        auth: <AuthScreen95 serverUrl={serverUrl} onLogin={onLogin} onNavigate={onNavigate} />,
        channels: <Channels95 {...screenProps} />,
        chat: <Chat95 serverUrl={serverUrl} channel={screenParams.channel} onNavigate={onNavigate} />,
        settings: <Settings95 {...screenProps} />
      };
      return screens95[currentScreen] || screens95.server;
    } else {
      const screens = {
        server: <ServerSelection {...screenProps} onSetServerUrl={onSetServerUrl} />,
        auth: <AuthScreen serverUrl={serverUrl} onLogin={onLogin} onNavigate={onNavigate} />,
        channels: <Channels {...screenProps} />,
        chat: <Chat serverUrl={serverUrl} channel={screenParams.channel} onNavigate={onNavigate} />,
        settings: <Settings {...screenProps} />
      };
      return screens[currentScreen] || screens.server;
    }
  };

  if (theme === '95core') {
    return (
      <ThemeProvider theme={original}>
        <IonApp style={{ background: '#008080', minHeight: '100vh' }}>
          <Suspense fallback={
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100vh',
              background: '#008080',
              fontFamily: 'MS Sans Serif'
            }}>
              <div style={{ 
                padding: '20px', 
                background: '#c0c0c0',
                border: '2px outset',
                fontFamily: 'MS Sans Serif'
              }}>
                Loading...
              </div>
            </div>
          }>
            {renderScreen()}
          </Suspense>
        </IonApp>
      </ThemeProvider>
    );
  }

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
