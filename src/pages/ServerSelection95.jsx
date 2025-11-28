import React, { useState, useEffect } from 'react';
import { Window, WindowHeader, WindowContent, Button, TextInput, List, ListItem, Panel, Hourglass } from 'react95';
import { createGlobalStyle } from 'styled-components';
import { Globe, Shell3210, Shell3211, Shell32144, Faxcover108 } from '@react95/icons';

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

export default function ServerSelection95({ serverUrl, onSetServerUrl, onNavigate, theme, onToggleTheme }) {
  const [servers, setServers] = useState([]);
  const [newServer, setNewServer] = useState({ name: '', url: '' });
  const [selectedServer, setSelectedServer] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [serverStatus, setServerStatus] = useState({});
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState('');

  const checkServerStatus = async (url) => {
    try {
      const start = Date.now();
      const response = await fetch(`${url}/api/ping`);
      const end = Date.now();
      
      if (response.ok) {
        return { status: 'online', ping: end - start };
      } else {
        return { status: 'offline', ping: null };
      }
    } catch (error) {
      return { status: 'offline', ping: null };
    }
  };

  const loadServers = () => {
    try {
      const saved = localStorage.getItem('chatServers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveServer = (serversList, server) => {
    if (!server.name.trim() || !server.url.trim()) {
      throw new Error('Server name and URL are required');
    }

    if (!server.url.startsWith('http://') && !server.url.startsWith('https://')) {
      throw new Error('Server URL must start with http:// or https://');
    }

    const updated = [...serversList, server];
    localStorage.setItem('chatServers', JSON.stringify(updated));
    return updated;
  };

  const deleteServer = (serversList, index) => {
    const updated = serversList.filter((_, i) => i !== index);
    localStorage.setItem('chatServers', JSON.stringify(updated));
    return updated;
  };

  const renameServer = (serversList, index, newName) => {
    if (!newName.trim()) {
      throw new Error('Server name cannot be empty');
    }

    const updated = serversList.map((server, i) => 
      i === index ? { ...server, name: newName.trim() } : server
    );
    localStorage.setItem('chatServers', JSON.stringify(updated));
    return updated;
  };

  useEffect(() => {
    setServers(loadServers());
  }, []);

  useEffect(() => {
    if (servers.length > 0) {
      checkAllServersStatus();
    }
  }, [servers]);

  const handleSaveServer = () => {
    try {
      setError('');
      const updated = saveServer(servers, newServer);
      setServers(updated);
      setNewServer({ name: '', url: '' });
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteServer = (index) => {
    const updated = deleteServer(servers, index);
    setServers(updated);
  };

  const handleRenameServer = () => {
    try {
      setError('');
      const updated = renameServer(servers, selectedServer, renameValue);
      setServers(updated);
      setShowRename(false);
      setRenameValue('');
    } catch (error) {
      setError(error.message);
    }
  };

  const connectToServer = async (server) => {
    onSetServerUrl(server.url);
    
    try {
      const response = await fetch(`${server.url}/api/ping`);
      if (response.ok) {
        onNavigate('auth');
      } else {
        setError('Server not responding properly');
      }
    } catch (error) {
      setError('Cannot connect to server: ' + error.message);
    }
  };

  const checkAllServersStatus = async () => {
    setCheckingStatus(true);
    
    const statusPromises = servers.map(server => 
      checkServerStatus(server.url)
    );
    
    const results = await Promise.allSettled(statusPromises);
    
    const newStatus = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        newStatus[servers[index].url] = result.value;
      }
    });
    
    setServerStatus(newStatus);
    setCheckingStatus(false);
  };

  const getStatusBadge = (server) => {
    const status = serverStatus[server.url];
    let bgColor = '#c0c0c0';
    let text = 'Unknown';
    
    if (status) {
      if (status.status === 'online') {
        bgColor = '#00ff00';
        text = `Online ${status.ping}ms`;
      } else if (status.status === 'offline') {
        bgColor = '#ff0000';
        text = 'Offline';
      }
    }
    
    return (
      <span style={{
        padding: '2px 6px',
        background: bgColor,
        color: '#000',
        fontSize: '10px',
        marginLeft: '6px',
        border: '1px outset'
      }}>
        {text}
      </span>
    );
  };

  const getStatusIcon = (server) => {
    const status = serverStatus[server.url];
    if (status) {
      return status.status === 'online' ? <Shell3210 /> : <Shell3211 />;
    }
    return <Shell3211 />;
  };

  return (
    <div style={{ background: '#008080', minHeight: '100vh', padding: '10px' }}>
      <GlobalStyle />
      <div style={{ 
        width: '100%', 
        maxWidth: '100%', 
        margin: '0',
        height: '100vh',
        boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, inset -2px -2px grey, inset 2px 2px #fff',
        background: '#c0c0c0'
      }}>
        <WindowHeader style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: '#000080', 
          color: 'white', 
          padding: '3px 2px 3px 3px', 
          fontWeight: 'bold' 
        }}>
          <span style={{ flex: 1 }}>Select Server</span>
          <Button 
            onClick={checkAllServersStatus} 
            disabled={checkingStatus}
            style={{ padding: '4px 8px' }}
          >
            {checkingStatus ? <Hourglass size={16} /> : <Globe />}
          </Button>
        </WindowHeader>
        
        <WindowContent style={{ padding: '12px' }}>
          {error && (
            <Panel variant="well" style={{ 
              background: '#ffc0c0', 
              padding: '6px', 
              marginBottom: '12px',
              border: '1px inset'
            }}>
              {error}
            </Panel>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Server Name:</label>
            <TextInput
              value={newServer.name}
              onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Server"
              style={{ width: '100%' }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Server URL:</label>
            <TextInput
              value={newServer.url}
              onChange={(e) => setNewServer(prev => ({ ...prev, url: e.target.value }))}
              placeholder="http://localhost:3000"
              style={{ width: '100%' }}
            />
          </div>
          
          <Button 
            onClick={handleSaveServer} 
            style={{ marginBottom: '16px', width: '100%' }}
          >
            Save Server
          </Button>

          <Panel variant="well" style={{ margin: '12px 0', maxHeight: '50vh', overflowY: 'auto' }}>
            {servers.map((server, index) => (
              <ListItem
                key={index}
                onClick={() => connectToServer(server)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  margin: '4px 0',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getStatusIcon(server)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                      {server.name}
                      {getStatusBadge(server)}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    style={{ padding: '4px', width: '32px', height: '32px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedServer(index);
                      setRenameValue(server.name);
                      setShowRename(true);
                    }}
                  >
                    <Faxcover108 />
                  </Button>
                  <Button
                    style={{ padding: '4px', width: '32px', height: '32px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteServer(index);
                    }}
                  >
                    <Shell32144 />
                  </Button>
                </div>
              </ListItem>
            ))}
            
            {servers.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                <div>No servers saved. Add your first server above</div>
              </div>
            )}
          </Panel>

          {showRename && (
            <Window style={{ 
              position: 'fixed', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              width: '90%',
              maxWidth: '400px'
            }}>
              <WindowHeader>
                Rename Server
              </WindowHeader>
              <WindowContent>
                <TextInput
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Server name"
                  style={{ width: '100%', marginBottom: '16px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button onClick={() => setShowRename(false)} style={{ flex: 1 }}>Cancel</Button>
                  <Button onClick={handleRenameServer} style={{ flex: 1 }}>
                    Save
                  </Button>
                </div>
              </WindowContent>
            </Window>
          )}
        </WindowContent>
      </div>
    </div>
  );
}
