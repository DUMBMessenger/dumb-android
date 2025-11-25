import React, { useState } from 'react';
import { Window, WindowHeader, WindowContent, Button, TextInput, Tab, Tabs, TabBody } from 'react95';
import { styled } from 'styled-components';
import { useAuth } from './brain/auth';

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
  border: 1px solid #ff0000;
  padding: 8px;
  margin: 16px 0;
  color: #000;
`;

function AuthScreen95({ serverUrl, onLogin, onNavigate }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ username: '', password: '' });

  const { login, register } = useAuth();

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

      let result;
      
      if (isLogin) {
        result = await login(serverUrl, form.username, form.password);
      } else {
        result = await register(serverUrl, form.username, form.password);
        if (result.success) {
          result = await login(serverUrl, form.username, form.password);
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

  return (
    <div style={{ background: '#008080', minHeight: '100vh', padding: '20px' }}>
      <StyledWindow>
        <WindowHeader>
          <span>{isLogin ? 'Login' : 'Register'}</span>
        </WindowHeader>
        
        <WindowContent>
          <Tabs value={isLogin ? 0 : 1} onChange={(value) => setIsLogin(value === 0)}>
            <Tab value={0}>Login</Tab>
            <Tab value={1}>Register</Tab>
          </Tabs>
          
          <TabBody style={{ padding: '16px 0' }}>
            <FormGroup>
              <label style={{ display: 'block', marginBottom: '4px' }}>Username:</label>
              <TextInput
                value={form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
                fullWidth
              />
            </FormGroup>
            
            <FormGroup>
              <label style={{ display: 'block', marginBottom: '4px' }}>Password:</label>
              <TextInput
                type="password"
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
                fullWidth
              />
            </FormGroup>
            
            {error && (
              <ErrorMessage>
                {error}
              </ErrorMessage>
            )}
            
            <Button 
              onClick={handleAuth} 
              disabled={loading}
              fullWidth
              style={{ marginBottom: '8px' }}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
            </Button>
            
            <Button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setForm({ username: '', password: '' });
              }}
              disabled={loading}
              fullWidth
              variant="flat"
            >
              {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </Button>
            
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button 
                onClick={() => onNavigate('server')}
                variant="flat"
              >
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
