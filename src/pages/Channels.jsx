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
  IonAlert,
  IonRefresher,
  IonRefresherContent,
  IonBadge
} from '@ionic/react';
import { add, settings, logOut, people, globe } from 'ionicons/icons';
import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CapacitorWebsocket } from '@miaz/capacitor-websocket';
import Search from './Search';

function Channels({ serverUrl, onNavigate, theme, onToggleTheme }) {
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

  useEffect(() => {
    initializeClient();
    setupWebSocket();
    return () => {
      CapacitorWebsocket.disconnect({ name: wsName });
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
      const filtered = sourceChannels.filter(channel => 
        channel.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.id?.toString().includes(searchQuery) ||
        channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChannels(filtered);
    }
  }, [channels, allChannels, searchQuery, searchMode]);

  const setupWebSocket = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const wsUrl = serverUrl.replace('http', 'ws').replace('https', 'wss');
      
      await CapacitorWebsocket.build({
        name: wsName,
        url: `${wsUrl}?token=${token}`,
        headers: { Authorization: `Bearer ${token}` }
      });

      await CapacitorWebsocket.applyListeners({ name: wsName });

      CapacitorWebsocket.addListener(`${wsName}:message`, (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'channels-updated' || data.action === 'channels-updated') {
            loadChannels();
            if (searchMode === 'global') {
              searchGlobalChannels(searchQuery);
            }
          }
        } catch (error) {
          console.error('WebSocket parsing error:', error);
        }
      });

      CapacitorWebsocket.addListener(`${wsName}:connected`, () => {
        console.log('WebSocket connected');
        setError('');
      });

      CapacitorWebsocket.addListener(`${wsName}:disconnected`, () => {
        console.log('WebSocket disconnected');
      });

      CapacitorWebsocket.addListener(`${wsName}:error`, (event) => {
        console.error('WebSocket error:', event.cause);
        setError('Connection error');
      });

      await CapacitorWebsocket.connect({ name: wsName });
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

      const { ChatClient } = await import('dumb_api_js');
      clientRef.current = new ChatClient({ serverUrl, token });
      await loadChannels();
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await clientRef.current.getChannels();
      
      let channelsArray = response;
      if (response && !Array.isArray(response)) {
        if (response.channels && Array.isArray(response.channels)) {
          channelsArray = response.channels;
        } else if (response.data && Array.isArray(response.data)) {
          channelsArray = response.data;
        } else if (response.success && Array.isArray(response.channels)) {
          channelsArray = response.channels;
        } else {
          channelsArray = Object.values(response);
        }
      }
      
      const formattedChannels = Array.isArray(channelsArray) ? channelsArray : [];
      setChannels(formattedChannels);
      setFilteredChannels(formattedChannels);
      setError('');
    } catch (error) {
      setError(error.message);
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGlobalChannels = async (query = '') => {
    if (!clientRef.current) return;

    try {
      setSearchLoading(true);
      const response = await clientRef.current.searchChannels(query);
      
      let channelsArray = [];
      if (response && response.success && response.channels) {
        channelsArray = response.channels;
      } else if (Array.isArray(response)) {
        channelsArray = response;
      }
      
      setAllChannels(channelsArray);
      
      if (searchMode === 'global') {
        if (query.trim() === '') {
          setFilteredChannels(channelsArray);
        } else {
          const filtered = channelsArray.filter(channel => 
            channel.name?.toLowerCase().includes(query.toLowerCase()) ||
            channel.id?.toString().includes(query) ||
            channel.description?.toLowerCase().includes(query.toLowerCase())
          );
          setFilteredChannels(filtered);
        }
      }
      
    } catch (error) {
      console.error('Error searching channels:', error);
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
        channels.filter(channel => 
          channel.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          channel.id?.toString().includes(searchQuery)
        ) : 
        channels
      );
    }
  };

  const handleSearch = (event) => {
    const query = event.detail.value || '';
    setSearchQuery(query);
    
    if (searchMode === 'global') {
      searchGlobalChannels(query);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (searchMode === 'global') {
      searchGlobalChannels('');
    }
  };

  const joinChannel = async (channelId) => {
    try {
      await clientRef.current.joinChannel(channelId);
      setError('');
      await loadChannels();
      setError(`Successfully joined channel!`);
      setTimeout(() => setError(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to join channel');
    }
  };

  const createChannel = async () => {
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

      const result = await clientRef.current.createChannel(newChannelName.trim());
      
      if (result && (result.success || result.id || result.channel)) {
        console.log('Channel created successfully:', result);
        setNewChannelName('');
        setShowCreate(false);
        setError('');
        await loadChannels();
        if (searchMode === 'global') {
          searchGlobalChannels(searchQuery);
        }
      } else {
        throw new Error('Failed to create channel: Invalid response from server');
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      setError(error.message || 'Failed to create channel');
    }
  };

  const handleCreateChannel = () => {
    if (newChannelName.trim()) {
      createChannel();
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    CapacitorWebsocket.disconnect({ name: wsName });
    onNavigate('server');
  };

  const doRefresh = async (event) => {
    await loadChannels();
    if (searchMode === 'global') {
      await searchGlobalChannels(searchQuery);
    }
    event.detail.complete();
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

  const loadingVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.div
                style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2d004d' }}
                variants={loadingVariants}
                animate="animate"
              />
              <motion.div
                style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2d004d' }}
                variants={loadingVariants}
                animate="animate"
                transition={{ delay: 0.2 }}
              />
              <motion.div
                style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2d004d' }}
                variants={loadingVariants}
                animate="animate"
                transition={{ delay: 0.4 }}
              />
            </div>
            <p style={{ color: '#2d004d', fontSize: '16px' }}>Loading channels...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#2d004d', '--color': 'white' }}>
          <IonTitle>Channels</IonTitle>
          <IonButton slot="end" fill="clear" onClick={() => onNavigate('settings')} style={{ '--color': 'white' }}>
            <IonIcon icon={settings} />
          </IonButton>
          <IonButton slot="end" fill="clear" onClick={logout} style={{ '--color': 'white' }}>
            <IonIcon icon={logOut} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <Search
          searchMode={searchMode}
          handleSearchModeChange={handleSearchModeChange}
          channels={channels}
          allChannels={allChannels}
          searchQuery={searchQuery}
          handleSearch={handleSearch}
          clearSearch={clearSearch}
          searchLoading={searchLoading}
        />

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: error.includes('Successfully') ? 'var(--ion-color-success)' : 'var(--ion-color-danger)',
                color: 'white',
                padding: '12px',
                margin: '16px',
                borderRadius: '12px',
                textAlign: 'center'
              }}
            >
              {error}
              <IonButton 
                fill="clear" 
                size="small" 
                onClick={() => setError('')}
                style={{ '--color': 'white', marginLeft: '8px' }}
              >
                Dismiss
              </IonButton>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ padding: '16px', paddingTop: '8px' }}>
          <motion.div
            whileTap={{ scale: 0.95 }}
          >
            <IonButton 
              expand="block" 
              onClick={() => setShowCreate(true)}
              style={{
                '--border-radius': '12px',
                '--background': '#2d004d',
                '--background-activated': '#4a0072',
                height: '48px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              <IonIcon icon={add} slot="start" />
              Create Channel
            </IonButton>
          </motion.div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <IonList style={{ '--background': 'transparent', padding: '0 16px' }}>
            <AnimatePresence>
              {filteredChannels.map((channel, index) => {
                const isMember = channels.some(c => c.id === channel.id || c.name === channel.name);
                
                return (
                  <motion.div
                    key={channel.id || index}
                    variants={itemVariants}
                    layout
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <IonItem 
                      button={isMember}
                      onClick={() => {
                        if (isMember) {
                          onNavigate('chat', { channel: channel.name || channel.id });
                        }
                      }}
                      style={{ 
                        '--border-radius': '12px',
                        '--background': isMember ? 'var(--ion-color-light)' : 'var(--ion-color-light-shade)',
                        '--background-activated': 'var(--ion-color-medium)',
                        marginBottom: '8px',
                        '--padding-start': '16px',
                        '--inner-padding-end': '16px',
                        opacity: isMember ? 1 : 0.8
                      }}
                    >
                      <IonLabel>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h2 style={{ fontWeight: '600', color: '#2d004d' }}>#{channel.name || `Channel ${index + 1}`}</h2>
                            <p style={{ color: 'var(--ion-color-medium)', fontSize: '14px' }}>
                              {channel.memberCount || 0} members
                              {channel.description && ` • ${channel.description}`}
                            </p>
                          </div>
                          {!isMember && searchMode === 'global' && (
                            <IonButton 
                              size="small"
                              fill="solid"
                              onClick={(e) => {
                                e.stopPropagation();
                                joinChannel(channel.id || channel.name);
                              }}
                              style={{
                                '--background': '#2d004d',
                                '--background-activated': '#4a0072',
                                '--border-radius': '8px',
                                margin: '0',
                                minWidth: '60px'
                              }}
                            >
                              Join
                            </IonButton>
                          )}
                          {isMember && (
                            <IonBadge 
                              color="success" 
                              style={{ 
                                margin: '0',
                                fontSize: '12px'
                              }}
                            >
                              Joined
                            </IonBadge>
                          )}
                        </div>
                      </IonLabel>
                    </IonItem>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </IonList>
        </motion.div>

        {filteredChannels.length === 0 && !loading && !searchLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: 'var(--ion-color-medium)'
            }}
          >
            {searchQuery ? (
              <>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>No channels found</p>
                <p>No channels match "{searchQuery}"</p>
                <IonButton 
                  fill="clear" 
                  onClick={clearSearch}
                  style={{ marginTop: '16px' }}
                >
                  Clear Search
                </IonButton>
              </>
            ) : searchMode === 'my' ? (
              <>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>No channels available</p>
                <p>Create your first channel or join existing ones!</p>
                <IonButton 
                  fill="solid"
                  onClick={() => handleSearchModeChange('global')}
                  style={{ 
                    marginTop: '16px',
                    '--background': '#2d004d'
                  }}
                >
                  Browse All Channels
                </IonButton>
              </>
            ) : (
              <>
                <p style={{ fontSize: '18px', marginBottom: '8px' }}>No channels found</p>
                <p>There are no public channels available yet</p>
                <IonButton 
                  fill="solid"
                  onClick={() => setShowCreate(true)}
                  style={{ 
                    marginTop: '16px',
                    '--background': '#2d004d'
                  }}
                >
                  Create First Channel
                </IonButton>
              </>
            )}
          </motion.div>
        )}

        <IonAlert
          isOpen={showCreate}
          onDidDismiss={() => {
            setShowCreate(false);
            setNewChannelName('');
          }}
          header="Create Channel"
          message="Enter a name for your new channel"
          inputs={[
            {
              name: 'name',
              type: 'text',
              placeholder: 'Channel Name',
              value: newChannelName,
              attributes: {
                maxLength: 50,
                minLength: 1
              }
            }
          ]}
          buttons={[
            { 
              text: 'Cancel', 
              role: 'cancel',
              cssClass: 'alert-button-cancel',
              handler: () => {
                setNewChannelName('');
              }
            },
            {
              text: 'Create',
              cssClass: 'alert-button-confirm',
              handler: (data) => {
                if (data.name && data.name.trim()) {
                  setNewChannelName(data.name.trim());
                  setTimeout(() => {
                    handleCreateChannel();
                  }, 100);
                }
                return false;
              }
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
}

export default memo(Channels);
