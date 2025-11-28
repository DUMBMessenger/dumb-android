import React, { useState, useRef, useEffect } from 'react';
import { 
  Window, 
  WindowHeader, 
  WindowContent, 
  Button, 
  List, 
  ListItem,
  Toolbar,
  Tabs,
  Tab,
  TabBody,
  Checkbox,
  Panel,
  Hourglass
} from 'react95';
import { styled, createGlobalStyle } from 'styled-components';
import { Settings, Password1010, Globe, Progman24, User } from '@react95/icons';

const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'MS Sans Serif';
    src: url('/fonts/ms_sans_serif.woff2') format('woff2'),
         url('/fonts/ms_sans_serif.woff') format('woff');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'MS Sans Serif';
    src: url('/fonts/ms_sans_serif_bold.woff2') format('woff2'),
         url('/fonts/ms_sans_serif_bold.woff') format('woff');
    font-weight: bold;
    font-style: normal;
  }
  body {
    font-family: 'MS Sans Serif', sans-serif;
    margin: 0;
    padding: 0;
  }
`;

const StyledWindow = styled(Window)`
  width: 100%;
  max-width: 100%;
  margin: 0;
  height: 100vh;
  border-radius: 0;
  
  @media (min-width: 768px) {
    max-width: 600px;
    margin: 20px auto;
    height: calc(100vh - 40px);
    border-radius: 0;
  }
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  background: #c0c0c0;
  border: 2px outset;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: bold;
  margin-right: 16px;
  flex-shrink: 0;
  
  @media (max-width: 480px) {
    width: 60px;
    height: 60px;
    font-size: 24px;
    margin-right: 12px;
  }
`;

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  border: 2px inset;
  background: #c0c0c0;
  
  @media (max-width: 480px) {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const MobileToolbar = styled(Toolbar)`
  @media (max-width: 480px) {
    display: flex;
    gap: 4px;
    
    button {
      min-width: auto;
      padding: 4px 8px;
    }
  }
`;

const TabContent = styled.div`
  height: 50vh;
  min-height: 300px;
  overflow-y: auto;
  padding: 8px 0;
  
  @media (min-height: 800px) {
    height: 60vh;
  }
`;

function Settings95({ serverUrl, onNavigate, theme, onToggleTheme }) {
  const [activeTab, setActiveTab] = useState(0);
  const [notifications, setNotifications] = useState(true);
  const [userData, setUserData] = useState({});
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef(null);

  const currentUsername = localStorage.getItem('username') || 'User';

  useEffect(() => {
    setUserData({ username: currentUsername });
  }, []);

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setAvatarLoading(true);
      const token = localStorage.getItem('token');
      const { ChatClient } = await import('dumb_api_js');
      const client = new ChatClient({ serverUrl, token });
      
      await client.uploadAvatar(file);
      alert('Avatar updated successfully!');
    } catch (error) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setAvatarLoading(false);
      event.target.value = '';
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    onNavigate('server');
  };

  return (
    <div style={{ background: '#008080', minHeight: '100vh', padding: '0' }}>
      <GlobalStyle />
      <StyledWindow>
        <WindowHeader style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '8px 12px'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
            <Settings variant="32x32_4" style={{ marginRight: 8 }} />
            Settings
          </span>
          <MobileToolbar>
            <Button 
              size="sm" 
              onClick={() => onNavigate('channels')}
              style={{ minWidth: 'auto' }}
            >
              <Globe variant="32x32_4" />
            </Button>
          </MobileToolbar>
        </WindowHeader>
        
        <WindowContent style={{ padding: '16px' }}>
          <Tabs 
            value={activeTab} 
            onChange={setActiveTab}
            style={{ marginBottom: '16px' }}
          >
            <Tab value={0}>
              <User variant="32x32_4" style={{ marginRight: 4 }} />
              <span style={{ fontSize: '12px' }}>Profile</span>
            </Tab>
            <Tab value={1}>
              <Settings variant="32x32_4" style={{ marginRight: 4 }} />
              <span style={{ fontSize: '12px' }}>Prefs</span>
            </Tab>
            <Tab value={2}>
              <Password1010 variant="32x32_4" style={{ marginRight: 4 }} />
              <span style={{ fontSize: '12px' }}>Security</span>
            </Tab>
          </Tabs>
          
          <TabBody style={{ height: 'auto', minHeight: '300px' }}>
            <TabContent>
              {activeTab === 0 && (
                <div>
                  <ProfileSection>
                    {avatarLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Hourglass size={32} />
                        <span>Uploading avatar...</span>
                      </div>
                    ) : (
                      <>
                        <Avatar>
                          {currentUsername[0]?.toUpperCase() || 'U'}
                        </Avatar>
                        <ProfileInfo>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                            {currentUsername}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            Click change to update your profile picture
                          </div>
                        </ProfileInfo>
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          style={{ flexShrink: 0 }}
                        >
                          Change
                        </Button>
                      </>
                    )}
                  </ProfileSection>
                  
                  <Panel variant="well" style={{ padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                      User Information
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                      <div><strong>Username:</strong> {currentUsername}</div>
                      <div><strong>Status:</strong> Online</div>
                      <div><strong>Member since:</strong> {new Date().toLocaleDateString()}</div>
                    </div>
                  </Panel>

                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </div>
              )}
              
              {activeTab === 1 && (
                <List style={{ background: 'transparent' }}>
                  <ListItem style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 8px',
                    border: '1px outset',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '14px' }}>Push Notifications</span>
                    <Checkbox
                      checked={notifications}
                      onChange={() => setNotifications(!notifications)}
                    />
                  </ListItem>
                  
                  <ListItem style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 8px',
                    border: '1px outset',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '14px' }}>95Core Theme</span>
                    <Checkbox
                      checked={theme === '95core'}
                      onChange={onToggleTheme}
                    />
                  </ListItem>

                  <ListItem style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 8px',
                    border: '1px outset',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '14px' }}>Sound Effects</span>
                    <Checkbox
                      defaultChecked
                    />
                  </ListItem>

                  <ListItem style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 8px',
                    border: '1px outset'
                  }}>
                    <span style={{ fontSize: '14px' }}>Auto-login</span>
                    <Checkbox
                      defaultChecked
                    />
                  </ListItem>
                </List>
              )}
              
              {activeTab === 2 && (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <Button 
                      fullWidth 
                      style={{ marginBottom: '8px' }}
                      onClick={() => alert('2FA setup coming soon!')}
                    >
                      <Password1010 variant="32x32_4" style={{ marginRight: 8 }} />
                      Setup Two-Factor Authentication
                    </Button>
                    <div style={{ fontSize: '11px', color: '#666', textAlign: 'center' }}>
                      Enhance your account security
                    </div>
                  </div>
                  
                  <Panel variant="well" style={{ padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                      Security Tips
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                      • Use a strong password<br/>
                      • Enable two-factor authentication<br/>
                      • Don't share your login details<br/>
                      • Log out from shared devices<br/>
                      • Regularly update your password
                    </div>
                  </Panel>

                  <Button 
                    fullWidth 
                    variant="flat"
                    onClick={() => alert('Password change coming soon!')}
                    style={{ marginBottom: '8px' }}
                  >
                    Change Password
                  </Button>

                  <Button 
                    fullWidth 
                    variant="flat"
                    onClick={() => alert('Session management coming soon!')}
                  >
                    Manage Sessions
                  </Button>
                </div>
              )}
            </TabContent>
          </TabBody>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Button 
              onClick={logout} 
              variant="flat"
              style={{ width: '100%' }}
            >
              Logout
            </Button>
          </div>
        </WindowContent>
      </StyledWindow>
    </div>
  );
}

export default Settings95;
