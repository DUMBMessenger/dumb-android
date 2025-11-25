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
  IonAlert,
  IonSpinner,
  IonBadge,
  IonToast
} from '@ionic/react';
import { settings, trash, pencil, wifi, warning } from 'ionicons/icons';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServers } from './brain/servers';

export default function ServerSelection({ serverUrl, onSetServerUrl, onNavigate, theme, onToggleTheme }) {
  const [servers, setServers] = useState([]);
  const [newServer, setNewServer] = useState({ name: '', url: '' });
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [showRenameAlert, setShowRenameAlert] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [serverStatus, setServerStatus] = useState({});
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
      showToastMessage('Server saved successfully');
    } catch (error) {
      showToastMessage(error.message);
    }
  };

  const handleDeleteServer = (index) => {
    const updated = deleteServer(servers, index);
    setServers(updated);
    setShowActionSheet(false);
    showToastMessage('Server deleted');
  };

  const handleRenameServer = () => {
    try {
      const updated = renameServer(servers, selectedServer, renameValue);
      setServers(updated);
      setShowRenameAlert(false);
      setRenameValue('');
      showToastMessage('Server renamed successfully');
    } catch (error) {
      showToastMessage(error.message);
    }
  };

  const connectToServer = async (server) => {
    onSetServerUrl(server.url);
    
    try {
      const response = await fetch(`${server.url}/api/ping`);
      if (response.ok) {
        onNavigate('auth');
      } else {
        showToastMessage('Server not responding properly');
      }
    } catch (error) {
      showToastMessage('Cannot connect to server: ' + error.message);
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
        newStatus[servers[index].url] = {
          ...result.value,
          lastChecked: new Date().toISOString()
        };
      }
    });
    
    setServerStatus(newStatus);
    setCheckingStatus(false);
  };

  const checkSingleServerStatus = async (server, index) => {
    setCheckingStatus(true);
    const result = await checkServerStatus(server.url);
    
    let message = `${server.name}: `;
    if (result.status === 'online') {
      message += `Online (Ping: ${result.ping}ms)`;
    } else if (result.status === 'error') {
      message += 'Server error';
    } else {
      message += 'Offline';
    }
    
    showToastMessage(message);
    setCheckingStatus(false);
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

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const getStatusBadge = (server) => {
    const status = serverStatus[server.url];
    if (!status) {
      return <IonBadge color="medium">Unknown</IonBadge>;
    }
    
    switch (status.status) {
      case 'online':
        return <IonBadge color="success">Online {status.ping}ms</IonBadge>;
      case 'offline':
        return <IonBadge color="danger">Offline</IonBadge>;
      case 'error':
        return <IonBadge color="warning">Error</IonBadge>;
      default:
        return <IonBadge color="medium">Unknown</IonBadge>;
    }
  };

  const getStatusIcon = (server) => {
    const status = serverStatus[server.url];
    if (!status) {
      return <IonSpinner name="dots" style={{ width: '16px', height: '16px' }} />;
    }
    
    switch (status.status) {
      case 'online':
        return <IonIcon icon={wifi} color="success" />;
      case 'offline':
      case 'error':
        return <IonIcon icon={warning} color="danger" />;
      default:
        return <IonSpinner name="dots" style={{ width: '16px', height: '16px' }} />;
    }
  };

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
          <IonButton 
            fill="clear" 
            slot="end" 
            onClick={checkAllServersStatus}
            disabled={checkingStatus}
          >
            {checkingStatus ? (
              <IonSpinner name="dots" />
            ) : (
              <IonIcon icon={wifi} />
            )}
          </IonButton>
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
            onClick={handleSaveServer} 
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
                  <div slot="start" style={{ marginRight: '12px' }}>
                    {getStatusIcon(server)}
                  </div>
                  <IonLabel>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {server.name}
                      {getStatusBadge(server)}
                    </h3>
                    <p>{server.url}</p>
                  </IonLabel>
                  <IonButton
                    fill="clear"
                    color="dark"
                    onClick={(e) => {
                      e.stopPropagation();
                      openActionSheet(index);
                    }}
                    style={{ marginRight: '8px' }}
                  >
                    <IonIcon icon={settings} />
                  </IonButton>
                  <IonButton
                    fill="clear"
                    color="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      checkSingleServerStatus(server, index);
                    }}
                    disabled={checkingStatus}
                  >
                    {checkingStatus ? (
                      <IonSpinner name="dots" style={{ width: '16px', height: '16px' }} />
                    ) : (
                      <IonIcon icon={wifi} />
                    )}
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
              handler: () => handleDeleteServer(selectedServer)
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
                setTimeout(() => handleRenameServer(), 100);
              }
            }
          ]}
        />

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
}
