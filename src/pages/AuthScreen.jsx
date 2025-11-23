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
import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function AuthScreen({ serverUrl, onLogin, onNavigate }) {
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
        onLogin(result.token, form.username);
      } else {
        setError(result.message || 'Authentication failed');
      }
      
    } catch (error) {
      setError(error.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const errorVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { 
      opacity: 1, 
      height: "auto",
      transition: { duration: 0.3 }
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#2d004d', '--color': 'white' }}>
          <IonTitle>{isLogin ? 'Login' : 'Register'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent>
        <div style={{ padding: '16px', maxWidth: '400px', margin: '0 auto' }}>
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            key={isLogin ? 'login' : 'register'}
          >
            <IonCard style={{ 
              '--background': 'var(--ion-color-light)',
              'border-radius': '16px',
              'box-shadow': '0 4px 20px rgba(45, 0, 77, 0.1)'
            }}>
              <IonCardContent>
                <h2 style={{ 
                  textAlign: 'center', 
                  marginBottom: '20px',
                  color: '#2d004d',
                  fontWeight: '600'
                }}>
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                
                <IonItem style={{ 
                  '--border-radius': '12px',
                  '--padding-start': '0', 
                  '--inner-padding-end': '0',
                  '--background': 'transparent',
                  marginBottom: '16px'
                }}>
                  <IonLabel position="stacked" style={{ fontSize: '16px', marginBottom: '8px', fontWeight: '500' }}>Username</IonLabel>
                  <IonInput
                    value={form.username}
                    onIonInput={e => setForm(prev => ({ ...prev, username: e.detail.value }))}
                    placeholder="Enter username"
                    style={{ 
                      '--background': 'white',
                      '--color': 'var(--ion-color-dark)',
                      '--padding-start': '16px',
                      '--padding-end': '16px',
                      'border-radius': '12px',
                      'border': '1px solid var(--ion-color-medium)'
                    }}
                  />
                </IonItem>
                
                <IonItem style={{ 
                  '--border-radius': '12px',
                  '--padding-start': '0', 
                  '--inner-padding-end': '0',
                  '--background': 'transparent',
                  marginBottom: '24px'
                }}>
                  <IonLabel position="stacked" style={{ fontSize: '16px', marginBottom: '8px', fontWeight: '500' }}>Password</IonLabel>
                  <IonInput
                    type="password"
                    value={form.password}
                    onIonInput={e => setForm(prev => ({ ...prev, password: e.detail.value }))}
                    placeholder="Enter password"
                    style={{ 
                      '--background': 'white',
                      '--color': 'var(--ion-color-dark)',
                      '--padding-start': '16px',
                      '--padding-end': '16px',
                      'border-radius': '12px',
                      'border': '1px solid var(--ion-color-medium)'
                    }}
                  />
                </IonItem>
                
                <AnimatePresence>
                  {error && (
                    <motion.div
                      variants={errorVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      style={{
                        background: 'rgba(244, 67, 54, 0.1)',
                        border: '1px solid rgba(244, 67, 54, 0.3)',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '16px'
                      }}
                    >
                      <IonText color="danger" style={{ 
                        display: 'block', 
                        textAlign: 'center',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {error}
                      </IonText>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <IonButton
                  expand="block"
                  onClick={handleAuth}
                  disabled={loading}
                  style={{ 
                    marginTop: '16px',
                    '--border-radius': '12px',
                    '--background': '#2d004d',
                    '--background-activated': '#4a0072',
                    '--background-focused': '#4a0072',
                    height: '48px',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
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
                  style={{ 
                    marginTop: '8px',
                    '--color': '#2d004d',
                    fontSize: '14px'
                  }}
                >
                  {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
                </IonButton>
              </IonCardContent>
            </IonCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ textAlign: 'center', marginTop: '20px' }}
          >
            <IonButton 
              fill="outline" 
              onClick={() => onNavigate('server')}
              style={{
                '--border-color': '#2d004d',
                '--color': '#2d004d',
                '--border-radius': '12px'
              }}
            >
              Back to Server Selection
            </IonButton>
          </motion.div>
        </div>
      </IonContent>
    </IonPage>
  );
}

export default memo(AuthScreen);
