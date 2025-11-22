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
  IonActionSheet,
  IonAlert
} from '@ionic/react';
import { settings, trash, colorPalette, pencil } from 'ionicons/icons';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ServerSelection({ serverUrl, onSetServerUrl, onNavigate, theme, onToggleTheme }) {
  const [servers, setServers] = useState([]);
  const [newServer, setNewServer] = useState({ name: '', url: '' });
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [showRenameAlert, setShowRenameAlert] = useState(false);
  const [renameValue, setRenameValue] = useState('');

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

  const renameServer = (index) => {
    if (!renameValue.trim()) return;
    
    const updated = servers.map((server, i) => 
      i === index ? { ...server, name: renameValue } : server
    );
    localStorage.setItem('servers', JSON.stringify(updated));
    setServers(updated);
    setShowRenameAlert(false);
    setRenameValue('');
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

  const openRenameDialog = (index) => {
    setSelectedServer(index);
    setRenameValue(servers[index].name);
    setShowRenameAlert(true);
    setShowActionSheet(false);
  };

  const openActionSheet = (index) => {
    setSelectedServer(index);
    setShowActionSheet(true);
  };

  // Анимация для появления серверов
  const fadeUpAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#2d004d', '--color': 'white' }}>
          <IonTitle>Select Server</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: '16px' }}>
          <IonList style={{ '--ion-item-background': 'transparent' }}>
            <IonItem style={{ '--border-style': 'none', '--padding-start': '0', '--inner-padding-end': '0' }}>
              <IonLabel position="stacked" style={{ fontSize: '18px', marginBottom: '5px' }}>Server Name</IonLabel>
              <IonInput
                value={newServer.name}
                onIonInput={e => setNewServer(prev => ({ ...prev, name: e.detail.value }))}
                placeholder="My Server"
                style={{ 
                  '--border-radius': '8px',
                  '--padding-start': '12px',
                  '--padding-end': '12px',
                  '--background': 'var(--ion-color-light)'
                }}
              />
            </IonItem>
            <IonItem style={{ '--border-style': 'none', '--padding-start': '0', '--inner-padding-end': '0', marginTop: '16px' }}>
              <IonLabel position="stacked" style={{ fontSize: '18px', marginBottom: '5px' }}>Server URL</IonLabel>
              <IonInput
                value={newServer.url}
                onIonInput={e => setNewServer(prev => ({ ...prev, url: e.detail.value }))}
                placeholder="http://localhost:3000"
                style={{ 
                  '--border-radius': '8px',
                  '--padding-start': '12px',
                  '--padding-end': '12px',
                  '--background': 'var(--ion-color-light)'
                }}
              />
            </IonItem>
          </IonList>
          
          <IonButton 
            expand="block" 
            onClick={saveServer} 
            style={{ 
              margin: '21px 0 16px 0',
              '--border-radius': '12px',
              '--background': '#2d004d',
              '--background-activated': '#4a0072',
              '--background-focused': '#4a0072',
              '--background-hover': '#4a0072'
            }}
          >
            Save Server
          </IonButton>

          <AnimatePresence>
            {servers.map((server, index) => (
              <motion.div
                key={`${server.url}-${index}`}
                {...fadeUpAnimation}
                transition={{ ...fadeUpAnimation.transition, delay: index * 0.1 }}
              >
                <IonItem 
                  button 
                  onClick={() => connectToServer(server)}
                  className="server-item selectable fade-list-item"
                  style={{ 
                    '--border-radius': '8px',
                    '--background': 'var(--ion-color-light)',
                    marginBottom: '8px'
                  }}
                >
                  <IonLabel>
                    <h3>{server.name}</h3>
                    <p>{server.url}</p>
                  </IonLabel>
                  <IonButton
                    fill="clear"
                    color="dark"
                    onClick={(e) => {
                      e.stopPropagation();
                      openActionSheet(index);
                    }}
                  >
                    <IonIcon icon={settings} />
                  </IonButton>
                </IonItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          buttons={[
            {
              text: 'Rename',
              icon: pencil,
              handler: () => openRenameDialog(selectedServer)
            },
            {
              text: 'Delete',
              role: 'destructive',
              icon: trash,
              handler: () => deleteServer(selectedServer)
            },
            {
              text: 'Cancel',
              role: 'cancel'
            }
          ]}
        />

        <IonAlert
          isOpen={showRenameAlert}
          onDidDismiss={() => setShowRenameAlert(false)}
          header={'Rename Server'}
          inputs={[
            {
              name: 'name',
              type: 'text',
              value: renameValue,
              placeholder: 'Server name'
            }
          ]}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Save',
              handler: (data) => {
                setRenameValue(data.name);
                setTimeout(() => renameServer(selectedServer), 100);
              }
            }
          ]}
        />
      </IonContent>
    </IonPage>
  );
}
