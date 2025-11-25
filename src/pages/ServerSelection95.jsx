import React, { useState, useEffect } from 'react';
import { Window, WindowHeader, WindowContent, Button, TextInput, List, ListItem, Toolbar, Panel, Hourglass } from 'react95';
import { styled } from 'styled-components';
import { useServers } from './brain/servers';

const StyledWindow = styled(Window)`
  width: 100%;
  max-width: 600px;
  margin: 20px auto;
`;

const ServerList = styled(Panel)`
  margin: 16px 0;
  max-height: 400px;
  overflow-y: auto;
`;

const StatusBadge = styled.span`
  padding: 2px 6px;
  background: ${props => 
    props.status === 'online' ? '#00ff00' : 
    props.status === 'offline' ? '#ff0000' : 
    '#c0c0c0'};
  color: #000;
  font-size: 11px;
  margin-left: 8px;
`;

export default function ServerSelection95({ serverUrl, onSetServerUrl, onNavigate, theme, onToggleTheme }) {
  const [servers, setServers] = useState([]);
  const [newServer, setNewServer] = useState({ name: '', url: '' });
  const [selectedServer, setSelectedServer] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [serverStatus, setServerStatus] = useState({});
  const [checkingStatus, setCheckingStatus] = useState(false);

  const { loadServers, saveServer, deleteServer, renameServer, checkServerStatus } = useServers();

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
      const updated = saveServer(servers, newServer);
      setServers(updated);
      setNewServer({ name: '', url: '' });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteServer = (index) => {
    const updated = deleteServer(servers, index);
    setServers(updated);
  };

  const handleRenameServer = () => {
    try {
      const updated = renameServer(servers, selectedServer, renameValue);
      setServers(updated);
      setShowRename(false);
      setRenameValue('');
    } catch (error) {
      alert(error.message);
    }
  };

  const connectToServer = async (server) => {
    onSetServerUrl(server.url);
    
    try {
      const response = await fetch(`${server.url}/api/ping`);
      if (response.ok) {
        onNavigate('auth');
      } else {
        alert('Server not responding properly');
      }
    } catch (error) {
      alert('Cannot connect to server: ' + error.message);
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
    if (!status) return <StatusBadge status="unknown">Unknown</StatusBadge>;
    
    return <StatusBadge status={status.status}>
      {status.status === 'online' ? `Online ${status.ping}ms` : status.status}
    </StatusBadge>;
  };

  return (
    <div style={{ background: '#008080', minHeight: '100vh', padding: '20px' }}>
      <StyledWindow>
        <WindowHeader style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ flex: 1 }}>Select Server</span>
          <Button onClick={checkAllServersStatus} disabled={checkingStatus} size="sm">
            {checkingStatus ? <Hourglass size={16} /> : 'Refresh'}
          </Button>
        </WindowHeader>
        
        <WindowContent>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Server Name:</label>
            <TextInput
              value={newServer.name}
              onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
              placeholder="My Server"
              fullWidth
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Server URL:</label>
            <TextInput
              value={newServer.url}
              onChange={(e) => setNewServer(prev => ({ ...prev, url: e.target.value }))}
              placeholder="http://localhost:3000"
              fullWidth
            />
          </div>
          
          <Button onClick={handleSaveServer} style={{ marginBottom: '16px' }} fullWidth>
            Save Server
          </Button>

          <ServerList variant="well">
            {servers.map((server, index) => (
              <ListItem
                key={index}
                onClick={() => connectToServer(server)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  margin: '4px 0'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>
                    {server.name}
                    {getStatusBadge(server)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{server.url}</div>
                </div>
                
                <Toolbar style={{ padding: 0 }}>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedServer(index);
                      setRenameValue(server.name);
                      setShowRename(true);
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteServer(index);
                    }}
                  >
                    Delete
                  </Button>
                </Toolbar>
              </ListItem>
            ))}
            
            {servers.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No servers saved
              </div>
            )}
          </ServerList>

          {showRename && (
            <Window style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <WindowHeader>Rename Server</WindowHeader>
              <WindowContent>
                <TextInput
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Server name"
                  fullWidth
                  style={{ marginBottom: '16px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button onClick={() => setShowRename(false)}>Cancel</Button>
                  <Button onClick={handleRenameServer}>Save</Button>
                </div>
              </WindowContent>
            </Window>
          )}
        </WindowContent>
      </StyledWindow>
    </div>
  );
}
