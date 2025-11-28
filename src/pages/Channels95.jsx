import React, { useState, useEffect, useRef } from 'react';
import { 
  Window, 
  WindowHeader, 
  WindowContent, 
  Button, 
  List, 
  ListItem, 
  TextInput,
  Toolbar,
  Panel,
  Hourglass
} from 'react95';
import { styled, createGlobalStyle } from 'styled-components';
import { useWebSocket } from './brain/ws';
import { useChannels } from './brain/channel';
import { useAuth } from './brain/auth';
import { useChat } from './brain/chat';
import { Globe, Settings, Progman39, Faxcover3 } from '@react95/icons';

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
    max-width: 900px;
    margin: 20px auto;
    height: calc(100vh - 40px);
    border-radius: 0;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-direction: column;
  
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const ChannelList = styled(Panel)`
  height: 55vh;
  min-height: 350px;
  overflow-y: auto;
  margin-top: 16px;
  padding: 8px;
  background: #ffffff;
  border: 2px inset #c0c0c0;
  
  @media (min-width: 768px) {
    height: 450px;
    padding: 12px;
  }
  
  @media (min-height: 800px) {
    height: 65vh;
  }
`;

const StatusBadge = styled.span`
  padding: 3px 8px;
  background: ${props => props.joined ? '#00ff00' : '#c0c0c0'};
  color: #000;
  font-size: 11px;
  margin-left: 8px;
  border: 1px outset;
  border-radius: 0;
  white-space: nowrap;
`;

const ChannelInfo = styled.div`
  flex: 1;
  min-width: 0;
  margin-right: 12px;
`;

const ChannelName = styled.div`
  font-weight: bold;
  font-size: 15px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const ChannelMeta = styled.div`
  font-size: 12px;
  color: #666;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  line-height: 1.4;
`;

const ChannelDescription = styled.div`
  font-size: 11px;
  color: #444;
  margin-top: 4px;
  line-height: 1.3;
  background: #f0f0f0;
  padding: 4px 6px;
  border: 1px inset #c0c0c0;
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

const ChannelItem = styled(ListItem)`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 12px;
  margin: 8px 0;
  opacity: ${props => props.isMember ? 1 : 0.8};
  cursor: ${props => props.isMember ? 'pointer' : 'default'};
  border: 2px outset #c0c0c0;
  background: ${props => props.isMember ? '#ffffff' : '#f8f8f8'};
  min-height: 80px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.isMember ? '#f0f0f0' : '#f8f8f8'};
    border-style: inset;
  }
  
  @media (max-width: 480px) {
    padding: 12px 10px;
    min-height: 70px;
  }
`;

const JoinButton = styled(Button)`
  flex-shrink: 0;
  margin-left: 12px;
  min-width: 70px;
  
  @media (max-width: 480px) {
    min-width: 60px;
    margin-left: 8px;
    padding: 6px 8px;
    font-size: 12px;
  }
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border: 2px inset #c0c0c0;
  padding: 6px;
  background: #c0c0c0;
  
  @media (max-width: 480px) {
    gap: 6px;
  }
`;

const ModeButton = styled(Button)`
  flex: 1;
  font-size: 14px;
  padding: 8px 4px;
  
  @media (max-width: 480px) {
    font-size: 13px;
    padding: 6px 2px;
  }
`;

function Channels95({ serverUrl, onNavigate, theme, onToggleTheme }) {
  const [channels, setChannels] = useState([]);
  const [allChannels, setAllChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState('my');
  const clientRef = useRef(null);
  const wsName = 'channels';

  const { connect, disconnect, addMessageListener, addConnectionListeners } = useWebSocket();
  const { loadChannels, searchChannels, joinChannel, createChannel, filterChannels, checkChannelMembership } = useChannels();
  const { logout } = useAuth();
  const { initializeClient: initChatClient } = useChat();

  useEffect(() => {
    setupClient();
    setupWebSocket();
    return () => {
      disconnect(wsName);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredChannels(searchMode === 'my' ? channels : allChannels);
    } else {
      const sourceChannels = searchMode === 'my' ? channels : allChannels;
      const filtered = filterChannels(sourceChannels, searchQuery);
      setFilteredChannels(filtered);
    }
  }, [channels, allChannels, searchQuery, searchMode]);

  const setupWebSocket = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const wsUrl = serverUrl.replace('http', 'ws').replace('https', 'wss');
      
      await connect(wsName, wsUrl, token);

      addMessageListener(wsName, (data) => {
        if (data.type === 'channels-updated' || data.action === 'channels-updated') {
          loadUserChannels();
          if (searchMode === 'global') {
            searchGlobalChannels(searchQuery);
          }
        }
      });

      addConnectionListeners(
        wsName,
        () => setError(''),
        () => {},
        () => setError('Connection error')
      );

    } catch (error) {
      console.error('WebSocket setup error:', error);
    }
  };

  const setupClient = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        onNavigate('auth');
        return;
      }

      clientRef.current = await initChatClient(serverUrl, token);
      await loadUserChannels();
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const loadUserChannels = async () => {
    try {
      const channelsArray = await loadChannels(clientRef.current);
      setChannels(channelsArray);
      setFilteredChannels(channelsArray);
      setError('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchGlobalChannels = async (query = '') => {
    if (!clientRef.current) return;

    try {
      setSearchLoading(true);
      const channelsArray = await searchChannels(clientRef.current, query);
      
      setAllChannels(channelsArray);
      
      if (searchMode === 'global') {
        setFilteredChannels(query.trim() ? filterChannels(channelsArray, query) : channelsArray);
      }
      
    } catch (error) {
      setError('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchModeChange = (mode) => {
    setSearchMode(mode);
    if (mode === 'global' && allChannels.length === 0) {
      searchGlobalChannels('');
    } else {
      setFilteredChannels(searchQuery ? 
        filterChannels(channels, searchQuery) : 
        channels
      );
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (searchMode === 'global') {
      searchGlobalChannels(value);
    }
  };

  const handleJoinChannel = async (channelId) => {
    try {
      await joinChannel(clientRef.current, channelId);
      setError('');
      await loadUserChannels();
      setError(`Successfully joined channel!`);
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to join channel');
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      setError('Channel name cannot be empty');
      return;
    }

    try {
      const existingChannel = allChannels.find(
        channel => channel.name?.toLowerCase() === newChannelName.toLowerCase()
      );
      
      if (existingChannel) {
        setError(`Channel "${newChannelName}" already exists`);
        return;
      }

      const result = await createChannel(clientRef.current, newChannelName.trim());
      
      if (result && (result.success || result.id || result.channel)) {
        setNewChannelName('');
        setShowCreate(false);
        setError('');
        await loadUserChannels();
        if (searchMode === 'global') {
          searchGlobalChannels(searchQuery);
        }
      } else {
        throw new Error('Failed to create channel');
      }
    } catch (error) {
      setError(error.message || 'Failed to create channel');
    }
  };

  const handleLogout = () => {
    logout();
    disconnect(wsName);
    onNavigate('server');
  };

  if (loading) {
    return (
      <div style={{ background: '#008080', minHeight: '100vh', padding: '0' }}>
        <GlobalStyle />
        <StyledWindow>
          <WindowContent style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Hourglass size={32} />
              <div>Loading channels...</div>
            </div>
          </WindowContent>
        </StyledWindow>
      </div>
    );
  }

  return (
    <div style={{ background: '#008080', minHeight: '100vh', padding: '0' }}>
      <GlobalStyle />
      <StyledWindow>
        <WindowHeader style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 16px'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '16px' }}>
            <Globe variant="32x32_4" style={{ marginRight: 10 }} />
            Channels
          </span>
          <MobileToolbar>
            <Button 
              size="sm" 
              onClick={() => onNavigate('settings')}
              style={{ minWidth: 'auto' }}
            >
              <Settings variant="32x32_4" />
            </Button>
            <Button 
              size="sm" 
              onClick={handleLogout}
              style={{ minWidth: 'auto' }}
            >
              <Progman39 variant="32x32_4" />
            </Button>
          </MobileToolbar>
        </WindowHeader>
        
        <WindowContent style={{ padding: '20px' }}>
          {/* Search Mode Toggle */}
          <ModeToggle>
            <ModeButton
              variant={searchMode === 'my' ? 'default' : 'flat'}
              onClick={() => handleSearchModeChange('my')}
            >
              My Channels ({channels.length})
            </ModeButton>
            <ModeButton
              variant={searchMode === 'global' ? 'default' : 'flat'}
              onClick={() => handleSearchModeChange('global')}
            >
              All Channels ({allChannels.length})
            </ModeButton>
          </ModeToggle>

          {/* Search Input */}
          <SearchContainer>
            <TextInput
              value={searchQuery}
              onChange={handleSearch}
              placeholder={`Search ${searchMode === 'my' ? 'my' : 'all'} channels...`}
              style={{ flex: 1, fontSize: '14px', padding: '8px 12px' }}
            />
            {searchLoading && <Hourglass size={24} />}
          </SearchContainer>

          {/* Error/Success Messages */}
          {error && (
            <Panel variant="well" style={{ 
              background: error.includes('Successfully') ? '#c0ffc0' : '#ffc0c0', 
              padding: '12px', 
              marginBottom: '16px',
              fontSize: '13px',
              border: '2px outset'
            }}>
              {error}
            </Panel>
          )}

          {/* Create Channel Button */}
          <Button 
            onClick={() => setShowCreate(true)}
            style={{ 
              marginBottom: '20px', 
              width: '100%',
              padding: '12px',
              fontSize: '14px'
            }}
          >
            <Faxcover3 variant="32x32_4" style={{ marginRight: 10 }} />
            Create New Channel
          </Button>

          {/* Channels List */}
          <ChannelList variant="well">
            {filteredChannels.map((channel, index) => {
              const isMember = checkChannelMembership(channels, channel);
              
              return (
                <ChannelItem
                  key={channel.id || index}
                  isMember={isMember}
                  onClick={() => {
                    if (isMember) {
                      onNavigate('chat', { channel: channel.name || channel.id });
                    }
                  }}
                >
                  <ChannelInfo>
                    <ChannelName>
                      #{channel.name || `channel-${index + 1}`}
                      {isMember && <StatusBadge joined>JOINED</StatusBadge>}
                    </ChannelName>
                    <ChannelMeta>
                      <span>👥 {channel.memberCount || '0'} members</span>
                      <span>💬 {channel.messageCount || '0'} messages</span>
                      {channel.createdAt && (
                        <span>📅 {new Date(channel.createdAt).toLocaleDateString()}</span>
                      )}
                    </ChannelMeta>
                    {channel.description && (
                      <ChannelDescription>
                        {channel.description}
                      </ChannelDescription>
                    )}
                  </ChannelInfo>
                  
                  {!isMember && searchMode === 'global' && (
                    <JoinButton
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinChannel(channel.id || channel.name);
                      }}
                    >
                      Join
                    </JoinButton>
                  )}
                </ChannelItem>
              );
            })}
            
            {filteredChannels.length === 0 && !loading && !searchLoading && (
              <div style={{ 
                padding: '60px 20px', 
                textAlign: 'center', 
                color: '#666',
                fontSize: '15px'
              }}>
                {searchQuery ? (
                  <>
                    <div style={{ marginBottom: '12px', fontSize: '16px' }}>🔍 No channels found</div>
                    <div style={{ fontSize: '13px' }}>No channels match "{searchQuery}"</div>
                  </>
                ) : searchMode === 'my' ? (
                  <>
                    <div style={{ marginBottom: '12px', fontSize: '16px' }}>📭 No channels available</div>
                    <div style={{ fontSize: '13px' }}>Create your first channel or join existing ones from "All Channels"!</div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: '12px', fontSize: '16px' }}>🌐 No public channels</div>
                    <div style={{ fontSize: '13px' }}>Be the first to create a public channel!</div>
                  </>
                )}
              </div>
            )}
          </ChannelList>
        </WindowContent>
      </StyledWindow>

      {/* Create Channel Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <Window style={{ 
            width: '100%', 
            maxWidth: '450px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <WindowHeader style={{ 
              display: 'flex', 
              alignItems: 'center',
              padding: '12px 16px'
            }}>
              <Faxcover3 variant="32x32_4" style={{ marginRight: 10 }} />
              Create New Channel
            </WindowHeader>
            <WindowContent style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Channel Name:
                </label>
                <TextInput
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Enter channel name (e.g. general, random, help)"
                  fullWidth
                  style={{ fontSize: '14px', padding: '10px' }}
                />
                <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                  Channel names can contain letters, numbers, and hyphens
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button 
                  onClick={() => setShowCreate(false)} 
                  fullWidth
                  variant="flat"
                  style={{ padding: '10px' }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateChannel} 
                  fullWidth
                  style={{ padding: '10px' }}
                >
                  Create Channel
                </Button>
              </div>
            </WindowContent>
          </Window>
        </div>
      )}
    </div>
  );
}

export default Channels95;
