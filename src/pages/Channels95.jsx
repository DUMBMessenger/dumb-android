import React, { useState, useEffect, useRef } from 'react';
import { 
  Window, 
  WindowHeader, 
  WindowContent, 
  Button, 
  List, 
  ListItem, 
  TextInput,
  Tabs,
  Tab,
  TabBody,
  Toolbar,
  Panel,
  Hourglass
} from 'react95';
import { styled } from 'styled-components';
import { useWebSocket } from './brain/ws';
import { useChannels } from './brain/channel';
import { useAuth } from './brain/auth';
import { useChat } from './brain/chat';

const StyledWindow = styled(Window)`
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  height: calc(100vh - 40px);
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const ChannelList = styled(Panel)`
  max-height: 400px;
  overflow-y: auto;
  margin-top: 16px;
`;

const StatusBadge = styled.span`
  padding: 2px 6px;
  background: ${props => props.joined ? '#00ff00' : '#c0c0c0'};
  color: #000;
  font-size: 11px;
  margin-left: 8px;
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
  const { initializeClient } = useChat();

  useEffect(() => {
    initializeClient();
    setupWebSocket();
    return () => {
      disconnect(wsName);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      if (searchMode === 'my') {
        setFilteredChannels(channels);
      } else {
        setFilteredChannels(allChannels);
      }
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

  const initializeClient = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        onNavigate('auth');
        return;
      }

      clientRef.current = await initializeClient(serverUrl, token);
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
        if (query.trim() === '') {
          setFilteredChannels(channelsArray);
        } else {
          const filtered = filterChannels(channelsArray, query);
          setFilteredChannels(filtered);
        }
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
    } else if (mode === 'my') {
      setFilteredChannels(searchQuery ? 
        filterChannels(channels, searchQuery) : 
        channels
      );
    }
  };

  const handleSearch = (value) => {
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
      <div style={{ background: '#008080', minHeight: '100vh', padding: '20px' }}>
        <StyledWindow>
          <WindowContent style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
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
    <div style={{ background: '#008080', minHeight: '100vh', padding: '20px' }}>
      <StyledWindow>
        <WindowHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Channels</span>
          <Toolbar>
            <Button size="sm" onClick={() => onNavigate('settings')}>Settings</Button>
            <Button size="sm" onClick={handleLogout}>Logout</Button>
          </Toolbar>
        </WindowHeader>
        
        <WindowContent>
          <Tabs value={searchMode === 'my' ? 0 : 1} onChange={(value) => handleSearchModeChange(value === 0 ? 'my' : 'global')}>
            <Tab value={0}>My Channels ({channels.length})</Tab>
            <Tab value={1}>All Channels ({allChannels.length})</Tab>
          </Tabs>
          
          <TabBody style={{ padding: '16px 0' }}>
            <SearchContainer>
              <TextInput
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={`Search ${searchMode === 'my' ? 'my' : 'all'} channels...`}
                style={{ flex: 1 }}
              />
              {searchLoading && <Hourglass size={20} />}
            </SearchContainer>

            {error && (
              <Panel variant="well" style={{ background: error.includes('Successfully') ? '#c0ffc0' : '#ffc0c0', padding: '8px', marginBottom: '16px' }}>
                {error}
              </Panel>
            )}

            <Button 
              onClick={() => setShowCreate(true)}
              style={{ marginBottom: '16px' }}
              fullWidth
            >
              Create Channel
            </Button>

            <ChannelList variant="well">
              {filteredChannels.map((channel, index) => {
                const isMember = checkChannelMembership(channels, channel);
                
                return (
                  <ListItem
                    key={channel.id || index}
                    onClick={() => {
                      if (isMember) {
                        onNavigate('chat', { channel: channel.name || channel.id });
                      }
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px',
                      margin: '4px 0',
                      opacity: isMember ? 1 : 0.8
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>
                        #{channel.name || `Channel ${index + 1}`}
                        {isMember && <StatusBadge joined>Joined</StatusBadge>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {channel.memberCount || 0} members
                        {channel.description && ` • ${channel.description}`}
                      </div>
                    </div>
                    
                    {!isMember && searchMode === 'global' && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinChannel(channel.id || channel.name);
                        }}
                      >
                        Join
                      </Button>
                    )}
                  </ListItem>
                );
              })}
              
              {filteredChannels.length === 0 && !loading && !searchLoading && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  {searchQuery ? (
                    <>
                      <div>No channels found</div>
                      <div>No channels match "{searchQuery}"</div>
                    </>
                  ) : searchMode === 'my' ? (
                    <>
                      <div>No channels available</div>
                      <div>Create your first channel or join existing ones!</div>
                    </>
                  ) : (
                    <>
                      <div>No channels found</div>
                      <div>There are no public channels available yet</div>
                    </>
                  )}
                </div>
              )}
            </ChannelList>
          </TabBody>
        </WindowContent>
      </StyledWindow>

      {showCreate && (
        <Window style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <WindowHeader>Create Channel</WindowHeader>
          <WindowContent>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Channel Name:</label>
              <TextInput
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Channel Name"
                fullWidth
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={() => setShowCreate(false)} fullWidth>
                Cancel
              </Button>
              <Button onClick={handleCreateChannel} fullWidth>
                Create
              </Button>
            </div>
          </WindowContent>
        </Window>
      )}
    </div>
  );
}

export default Channels95;
