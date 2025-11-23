import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonAvatar,
  IonAlert,
  IonInput,
  IonToggle,
  IonImg
} from '@ionic/react';
import { arrowBack, person, notifications, shield, logOut } from 'ionicons/icons';
import { useState, useRef, memo, useEffect } from 'react';
import { motion } from 'framer-motion';

function Settings({ serverUrl, onNavigate, theme, onToggleTheme }) {
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [userData, setUserData] = useState({});
  const [twoFactorData, setTwoFactorData] = useState(null);
  const [userAvatar, setUserAvatar] = useState(null);
  const fileInputRef = useRef(null);
  const clientRef = useRef(null);

  const currentUsername = localStorage.getItem('username') || 'User';

  useEffect(() => {
    initializeClient();
    loadUserAvatar();
  }, []);

  const initializeClient = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const { ChatClient } = await import('dumb_api_js');
      clientRef.current = new ChatClient({ serverUrl, token });
      
      setUserData({ username: currentUsername });
    } catch (error) {
      console.error('Error initializing client:', error);
    }
  };

  const loadUserAvatar = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${serverUrl}/api/user/${currentUsername}/avatar`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const avatarUrl = URL.createObjectURL(blob);
        setUserAvatar(avatarUrl);
      }
    } catch (error) {
      console.error('Error loading user avatar:', error);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const token = localStorage.getItem('token');
      const { ChatClient } = await import('dumb_api_js');
      const client = new ChatClient({ serverUrl, token });
      
      await client.uploadAvatar(file);
      setShowAvatarUpload(false);
      loadUserAvatar();
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  const setup2FA = async () => {
    try {
      const token = localStorage.getItem('token');
      const { ChatClient } = await import('dumb_api_js');
      const client = new ChatClient({ serverUrl, token });
      
      const result = await client.setup2FA();
      if (result.success) {
        setTwoFactorData({
          secret: result.secret,
          qrCodeUrl: result.qrCodeUrl
        });
        setShow2FASetup(true);
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error);
    }
  };

  const enable2FA = async () => {
    if (!twoFactorToken.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const { ChatClient } = await import('dumb_api_js');
      const client = new ChatClient({ serverUrl, token });
      
      await client.enable2FA(twoFactorToken);
      setShow2FASetup(false);
      setTwoFactorToken('');
      setTwoFactorData(null);
    } catch (error) {
      console.error('Error enabling 2FA:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    onNavigate('server');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.4 }
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#2d004d', '--color': 'white' }}>
          <IonButton slot="start" fill="clear" onClick={() => onNavigate('channels')} style={{ '--color': 'white' }}>
            <IonIcon icon={arrowBack} />
          </IonButton>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <IonList style={{ '--background': 'transparent' }}>
            <motion.div variants={itemVariants}>
              <IonItem style={{
                '--background': 'var(--ion-color-light)',
                '--border-radius': '12px',
                margin: '16px',
                '--padding-start': '16px',
                '--inner-padding-end': '16px'
              }}>
                {userAvatar ? (
                  <IonAvatar slot="start" style={{ width: '60px', height: '60px' }}>
                    <IonImg src={userAvatar} alt={currentUsername} style={{ objectFit: 'cover' }} />
                  </IonAvatar>
                ) : (
                  <IonAvatar slot="start" style={{ 
                    width: '60px', 
                    height: '60px',
                    background: '#2d004d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '600',
                    color: 'white'
                  }}>
                    {currentUsername[0]?.toUpperCase() || 'U'}
                  </IonAvatar>
                )}
                <IonLabel>
                  <h2 style={{ fontWeight: '600', color: '#2d004d' }}>{currentUsername}</h2>
                  <p style={{ color: 'var(--ion-color-medium)' }}>Change your profile picture</p>
                </IonLabel>
                <IonButton 
                  fill="clear" 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ '--color': '#2d004d' }}
                >
                  Change
                </IonButton>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleAvatarUpload}
                />
              </IonItem>
            </motion.div>

            <motion.div variants={itemVariants}>
              <IonItem style={{
                '--background': 'var(--ion-color-light)',
                '--border-radius': '12px',
                margin: '8px 16px',
                '--padding-start': '16px',
                '--inner-padding-end': '16px'
              }}>
                <IonIcon icon={notifications} slot="start" style={{ color: '#2d004d' }} />
                <IonLabel style={{ color: '#2d004d', fontWeight: '500' }}>Push Notifications</IonLabel>
                <IonToggle 
                  checked={true} 
                  style={{ 
                    '--handle-background-checked': '#2d004d',
                    '--background-checked': '#4a0072'
                  }}
                />
              </IonItem>
            </motion.div>

            <motion.div variants={itemVariants}>
              <IonItem 
                button 
                onClick={setup2FA}
                style={{
                  '--background': 'var(--ion-color-light)',
                  '--border-radius': '12px',
                  margin: '8px 16px',
                  '--padding-start': '16px',
                  '--inner-padding-end': '16px'
                }}
              >
                <IonIcon icon={shield} slot="start" style={{ color: '#2d004d' }} />
                <IonLabel style={{ color: '#2d004d', fontWeight: '500' }}>Two-Factor Authentication</IonLabel>
              </IonItem>
            </motion.div>

            <motion.div variants={itemVariants}>
              <IonItem 
                button 
                onClick={logout}
                style={{
                  '--background': 'var(--ion-color-light)',
                  '--border-radius': '12px',
                  margin: '16px',
                  '--padding-start': '16px',
                  '--inner-padding-end': '16px',
                  '--color': 'var(--ion-color-danger)'
                }}
              >
                <IonIcon icon={logOut} slot="start" style={{ color: 'var(--ion-color-danger)' }} />
                <IonLabel style={{ color: 'var(--ion-color-danger)', fontWeight: '500' }}>Logout</IonLabel>
              </IonItem>
            </motion.div>
          </IonList>
        </motion.div>

        <IonAlert
          isOpen={show2FASetup}
          onDidDismiss={() => {
            setShow2FASetup(false);
            setTwoFactorData(null);
            setTwoFactorToken('');
          }}
          header="Setup Two-Factor Authentication"
          message={
            twoFactorData ? (
              <div style={{ textAlign: 'center' }}>
                <p>Scan this QR code with your authenticator app:</p>
                <IonImg 
                  src={twoFactorData.qrCodeUrl} 
                  style={{ 
                    width: '200px', 
                    height: '200px', 
                    margin: '0 auto',
                    background: 'white',
                    padding: '10px',
                    borderRadius: '8px'
                  }} 
                />
                <p style={{ marginTop: '10px', fontSize: '14px' }}>
                  Or enter this secret manually: <strong>{twoFactorData.secret}</strong>
                </p>
                <p style={{ marginTop: '10px', fontSize: '14px' }}>
                  Then enter the 6-digit code from your authenticator app:
                </p>
              </div>
            ) : "Setting up 2FA..."
          }
          inputs={[
            {
              name: 'token',
              type: 'text',
              placeholder: 'Enter 6-digit code',
              value: twoFactorToken,
              attributes: {
                maxLength: 6,
                pattern: '[0-9]{6}'
              }
            }
          ]}
          buttons={[
            { 
              text: 'Cancel', 
              role: 'cancel' 
            },
            {
              text: 'Enable 2FA',
              cssClass: 'alert-button-confirm',
              handler: (data) => {
                setTwoFactorToken(data.token);
                enable2FA();
              }
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
}

export default memo(Settings);
