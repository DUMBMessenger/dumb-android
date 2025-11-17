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
  IonRefresherContent
} from '@ionic/react';
import { add, person, settings, logOut, colorPalette, power } from 'ionicons/icons';
import { useState, useEffect, useRef } from 'react';

export default function Channels({ serverUrl, onNavigate, theme, onToggleTheme }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const clientRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    initializeClient();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

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
      startPolling();
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const startPolling = () => {
    pollingRef.current = setInterval(async () => {
      try {
        await loadChannels();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
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
        } else {
          channelsArray = Object.values(response);
        }
      }
      
      setChannels(Array.isArray(channelsArray) ? channelsArray : []);
      setError('');
    } catch (error) {
      setError(error.message);
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      await clientRef.current.createChannel(newChannelName);
      setNewChannelName('');
      setShowCreate(false);
      await loadChannels();
    } catch (error) {
      setError(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    onNavigate('server');
  };

  const disconnect = () => {
    localStorage.removeItem('token');
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    onNavigate('auth');
  };

  const doRefresh = async (event) => {
    await loadChannels();
    event.detail.complete();
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div className="loading-container">
            <div className={`pulse-dots ${theme}`}>
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
            </div>
            Loading channels...
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Channels</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onToggleTheme}>
            <IonIcon icon={colorPalette} />
          </IonButton>
          <IonButton slot="end" fill="clear" onClick={disconnect}>
            <IonIcon icon={power} />
          </IonButton>
          <IonButton slot="end" fill="clear" onClick={logout}>
            <IonIcon icon={logOut} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div style={{ padding: '16px' }}>
          <IonButton expand="block" onClick={() => setShowCreate(true)}>
            <IonIcon icon={add} slot="start" />
            Create Channel
          </IonButton>
        </div>

        <IonList className="channels-list">
          {channels.map((channel, index) => (
            <IonItem 
              key={index} 
              button 
              onClick={() => onNavigate('chat', { channel: channel.name || channel.id })}
              className="channel-item selectable fade-list-item"
            >
              <IonLabel>
                <h2>#{channel.name || `Channel ${index + 1}`}</h2>
                <p>{channel.memberCount || 0} members</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        {channels.length === 0 && !loading && (
          <div className="empty-state">
            <p>No channels available</p>
            <p>Create your first channel to get started!</p>
          </div>
        )}

        <IonAlert
          isOpen={showCreate}
          onDidDismiss={() => setShowCreate(false)}
          header="Create Channel"
          inputs={[
            {
              name: 'name',
              type: 'text',
              placeholder: 'Channel Name',
              value: newChannelName
            }
          ]}
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Create',
              handler: (data) => {
                setNewChannelName(data.name);
                createChannel();
              }
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
}
