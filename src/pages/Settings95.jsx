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
  Panel
} from 'react95';
import { styled } from 'styled-components';

const StyledWindow = styled(Window)`
  width: 100%;
  max-width: 600px;
  margin: 20px auto;
`;

const Avatar = styled.div`
  width: 60px;
  height: 60px;
  background: #c0c0c0;
  border: 2px outset;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  margin-right: 16px;
`;

function Settings95({ serverUrl, onNavigate, theme, onToggleTheme }) {
  const [activeTab, setActiveTab] = useState(0);
  const [notifications, setNotifications] = useState(true);
  const [userData, setUserData] = useState({});
  const fileInputRef = useRef(null);

  const currentUsername = localStorage.getItem('username') || 'User';

  useEffect(() => {
    setUserData({ username: currentUsername });
  }, []);

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const token = localStorage.getItem('token');
      const { ChatClient } = await import('dumb_api_js');
      const client = new ChatClient({ serverUrl, token });
      
      await client.uploadAvatar(file);
      alert('Avatar updated successfully!');
    } catch (error) {
      alert('Error uploading avatar: ' + error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    onNavigate('server');
  };

  return (
    <div style={{ background: '#008080', minHeight: '100vh', padding: '20px' }}>
      <StyledWindow>
        <WindowHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Settings</span>
          <Toolbar>
            <Button size="sm" onClick={() => onNavigate('channels')}>Back</Button>
          </Toolbar>
        </WindowHeader>
        
        <WindowContent>
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tab value={0}>Profile</Tab>
            <Tab value={1}>Preferences</Tab>
            <Tab value={2}>Security</Tab>
          </Tabs>
          
          <TabBody style={{ height: 300, padding: '16px 0' }}>
            {activeTab === 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <Avatar>
                    {currentUsername[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{currentUsername}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Change your profile picture</div>
                  </div>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Change
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </div>
                
                <Panel variant="well" style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '8px' }}>User Information</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Username: {currentUsername}
                  </div>
                </Panel>
              </div>
            )}
            
            {activeTab === 1 && (
              <List>
                <ListItem style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Push Notifications</span>
                  <Checkbox
                    checked={notifications}
                    onChange={() => setNotifications(!notifications)}
                  />
                </ListItem>
                
                <ListItem style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>95Core Theme</span>
                  <Checkbox
                    checked={theme === '95core'}
                    onChange={onToggleTheme}
                  />
                </ListItem>
              </List>
            )}
            
            {activeTab === 2 && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <Button fullWidth style={{ marginBottom: '8px' }}>
                    Setup Two-Factor Authentication
                  </Button>
                  <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    Enhance your account security
                  </div>
                </div>
                
                <Panel variant="well" style={{ padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Security Tips</div>
                  <div style={{ fontSize: '12px' }}>
                    • Use a strong password<br/>
                    • Enable two-factor authentication<br/>
                    • Don't share your login details
                  </div>
                </Panel>
              </div>
            )}
          </TabBody>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Button onClick={logout} variant="flat">
              Logout
            </Button>
          </div>
        </WindowContent>
      </StyledWindow>
    </div>
  );
}

export default Settings95;
