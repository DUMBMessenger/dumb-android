// ServerSelection.jsx
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonActionSheet
} from '@ionic/react';
import { settings, trash, colorPalette } from 'ionicons/icons';
import { useState, useEffect } from 'react';

export default function ServerSelection({ serverUrl, onSetServerUrl, onNavigate, theme, onToggleTheme }) {
  const [servers, setServers] = useState([]);
  const [newServer, setNewServer] = useState({ name: '', url: '' });
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = () => {
    const saved = JSON.parse(localStorage.getItem('servers') || '[]');
    setServers(saved);
  };

  const saveServer = () => {
    if (!newServer.name || !newServer.url) return;
    
    const updated = [...servers, { ...newServer }];
    localStorage.setItem('servers', JSON.stringify(updated));
    setServers(updated);
    setNewServer({ name: '', url: '' });
  };

  const deleteServer = (index) => {
    const updated = servers.filter((_, i) => i !== index);
    localStorage.setItem('servers', JSON.stringify(updated));
    setServers(updated);
    setShowActionSheet(false);
  };

  const connectToServer = async (server) => {
    onSetServerUrl(server.url);
    
    try {
      const response = await fetch(`${server.url}/api/ping`);
      if (response.ok) {
        onNavigate('auth');
      } else {
        alert('Server not responding');
      }
    } catch (error) {
      alert('Cannot connect to server: ' + error.message);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Select Server</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onToggleTheme}>
            <IonIcon icon={colorPalette} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '16px' }}>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Server Name</IonLabel>
              <IonInput
                value={newServer.name}
                onIonInput={e => setNewServer(prev => ({ ...prev, name: e.detail.value }))}
                placeholder="My Server"
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Server URL</IonLabel>
              <IonInput
                value={newServer.url}
                onIonInput={e => setNewServer(prev => ({ ...prev, url: e.detail.value }))}
                placeholder="http://localhost:3000"
              />
            </IonItem>
          </IonList>
          
          <IonButton expand="block" onClick={saveServer} style={{ margin: '16px 0' }}>
            Save Server
          </IonButton>

          {servers.map((server, index) => (
            <IonItem 
              key={index} 
              button 
              onClick={() => connectToServer(server)}
              className="server-item selectable fade-list-item"
            >
              <IonLabel>
                <h3>{server.name}</h3>
                <p>{server.url}</p>
              </IonLabel>
              <IonButton
                fill="clear"
                color="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedServer(index);
                  setShowActionSheet(true);
                }}
              >
                <IonIcon icon={trash} />
              </IonButton>
            </IonItem>
          ))}
        </div>

        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          buttons={[
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => deleteServer(selectedServer)
            },
            {
              text: 'Cancel',
              role: 'cancel'
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
}
