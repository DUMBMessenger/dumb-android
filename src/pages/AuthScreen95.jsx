import React, { useState } from 'react';
import { Window, WindowHeader, WindowContent, Button, TextInput, Tab, Tabs, TabBody } from 'react95';
import { styled, createGlobalStyle } from 'styled-components';
import { useAuth } from './brain/auth';
import { Key, Mcm502, Password1010, Computer } from '@react95/icons';

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
  }
`;

const StyledWindow = styled(Window)`
  width: 100%;
  max-width: 400px;
  margin: 50px auto;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const ErrorMessage = styled.div`
  background: #ffc0c0;
  border: 2px outset #ff0000;
  padding: 8px;
  margin: 16px 0;
  color: #000;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SuccessMessage = styled.div`
  background: #c0ffc0;
  border: 2px outset #00ff00;
  padding: 8px;
  margin: 16px 0;
  color: #000;
  display: flex;
  align-items: center;
  gap: 8px;
`;

function AuthScreen95({ serverUrl, onLogin, onNavigate }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ username: '', password: '' });

  const { login, register } = useAuth();

  const handleAuth = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter username and password');
      return;
    }

    if (form.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const pingResponse = await fetch(`${serverUrl}/api/ping`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000
      });

      if (!pingResponse.ok) {
        throw new Error(`Server error: ${pingResponse.status}`);
      }

      let result;
      
      if (isLogin) {
        result = await login(serverUrl, form.username.trim(), form.password);
      } else {
        result = await register(serverUrl, form.username.trim(), form.password);
        if (result.success) {
          setSuccess('Account created successfully! Logging in...');
          setTimeout(async () => {
            try {
              const loginResult = await login(serverUrl, form.username.trim(), form.password);
              if (loginResult.success && loginResult.token) {
                onLogin(loginResult.token, form.username.trim());
              } else {
                setError(loginResult.message || 'Auto-login failed');
              }
            } catch (loginError) {
              setError('Auto-login failed: ' + loginError.message);
            }
          }, 1000);
          return;
        }
      }

      if (result.success && result.token) {
        onLogin(result.token, form.username.trim());
      } else {
        setError(result.message || 'Authentication failed');
      }
      
    } catch (error) {
      console.error('Auth error:', error);
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Check the URL and try again.');
      } else {
        setError(error.message || 'Connection failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value) => {
    setIsLogin(value === 0);
    setError('');
    setSuccess('');
    setForm({ username: '', password: '' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleAuth();
    }
  };

  return (
    <div style={{ background: '#008080', minHeight: '100vh', padding: '20px' }}>
      <GlobalStyle />
      <StyledWindow>
        <WindowHeader style={{ 
          display: 'flex', 
          alignItems: 'center'
        }}>
          {isLogin ? <Key variant="32x32_4" style={{ marginRight: 8 }} /> : <Mcm502 variant="32x32_4" style={{ marginRight: 8 }} />}
          <span>{isLogin ? 'Login' : 'Register'}</span>
        </WindowHeader>
        
        <WindowContent>
          <Tabs value={isLogin ? 0 : 1} onChange={handleTabChange}>
            <Tab value={0}>
              <Key variant="32x32_4" style={{ marginRight: 4 }} />
              Login
            </Tab>
            <Tab value={1}>
              <Mcm502 variant="32x32_4" style={{ marginRight: 4 }} />
              Register
            </Tab>
          </Tabs>
          
          <TabBody style={{ padding: '16px 0' }}>
            <FormGroup>
              <label style={{ display: 'block', marginBottom: '4px' }}>Username:</label>
              <TextInput
                value={form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                onKeyPress={handleKeyPress}
                placeholder="Enter username"
                style={{ width: '100%' }}
                disabled={loading}
              />
            </FormGroup>
            
            <FormGroup>
              <label style={{ display: 'block', marginBottom: '4px' }}>Password:</label>
              <TextInput
                type="password"
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                onKeyPress={handleKeyPress}
                placeholder="Enter password"
                style={{ width: '100%' }}
                disabled={loading}
              />
            </FormGroup>
            
            {error && (
              <ErrorMessage>
                {error}
              </ErrorMessage>
            )}
            
            {success && (
              <SuccessMessage>
                {success}
              </SuccessMessage>
            )}
            
            <Button 
              onClick={handleAuth} 
              disabled={loading}
              style={{ 
                width: '100%', 
                marginBottom: '8px'
              }}
            >
              {isLogin ? <Key variant="32x32_4" style={{ marginRight: 4 }} /> : <Mcm502 variant="32x32_4" style={{ marginRight: 4 }} />}
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
            </Button>
            
            <Button 
              onClick={() => handleTabChange(isLogin ? 1 : 0)}
              disabled={loading}
              style={{ 
                width: '100%'
              }}
              variant="flat"
            >
              {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </Button>
            
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button 
                onClick={() => onNavigate('server')}
                variant="flat"
              >
                <Computer variant="32x32_4" style={{ marginRight: 4 }} />
                Back to Server Selection
              </Button>
            </div>
          </TabBody>
        </WindowContent>
      </StyledWindow>
    </div>
  );
}

export default AuthScreen95;
