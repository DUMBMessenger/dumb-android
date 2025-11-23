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
  IonAlert,
  IonSpinner,
  IonBadge,
  IonToast
} from '@ionic/react';
import { settings, trash, colorPalette, pencil, wifi, warning } from 'ionicons/icons';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    // Проверяем статус всех серверов при загрузке
    if (servers.length > 0) {
      checkAllServersStatus();
    }
  }, [servers]);

  const loadServers = () => {
    const saved = JSON.parse(localStorage.getItem('servers') || '[]');
    setServers(saved);
  };

  const saveServer = () => {
    if (!newServer.name || !newServer.url) {
      showToastMessage('Please enter both server name and URL');
      return;
    }
    
    // Проверяем уникальность имени
    if (servers.some(server => server.name === newServer.name)) {
      showToastMessage('Server name already exists');
      return;
    }

    // Проверяем уникальность URL
    if (servers.some(server => server.url === newServer.url)) {
      showToastMessage('Server URL already exists');
      return;
    }
    
    const updated = [...servers, { ...newServer }];
    localStorage.setItem('servers', JSON.stringify(updated));
    setServers(updated);
    setNewServer({ name: '', url: '' });
    showToastMessage('Server saved successfully');
  };

  const deleteServer = (index) => {
    const updated = servers.filter((_, i) => i !== index);
    localStorage.setItem('servers', JSON.stringify(updated));
    setServers(updated);
    setShowActionSheet(false);
    showToastMessage('Server deleted');
  };

  const renameServer = () => {
    if (!renameValue.trim()) {
      showToastMessage('Please enter a server name');
      return;
    }

    // Проверяем уникальность нового имени
    if (servers.some((server, i) => i !== selectedServer && server.name === renameValue)) {
      showToastMessage('Server name already exists');
      return;
    }
    
    const updated = servers.map((server, i) => 
      i === selectedServer ? { ...server, name: renameValue } : server
    );
    localStorage.setItem('servers', JSON.stringify(updated));
    setServers(updated);
    setShowRenameAlert(false);
    setRenameValue('');
    showToastMessage('Server renamed successfully');
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

  const checkServerStatus = async (serverUrl, serverName) => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${serverUrl}/api/ping`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const endTime = performance.now();
      const ping = Math.round(endTime - startTime);
      
      if (response.ok) {
        setServerStatus(prev => ({
          ...prev,
          [serverUrl]: { status: 'online', ping, lastChecked: new Date().toISOString() }
        }));
        return { status: 'online', ping };
      } else {
        setServerStatus(prev => ({
          ...prev,
          [serverUrl]: { status: 'error', ping: null, lastChecked: new Date().toISOString() }
        }));
        return { status: 'error', ping: null };
      }
    } catch (error) {
      setServerStatus(prev => ({
        ...prev,
        [serverUrl]: { status: 'offline', ping: null, lastChecked: new Date().toISOString() }
      }));
      return { status: 'offline', ping: null };
    }
  };

  const checkAllServersStatus = async () => {
    setCheckingStatus(true);
    
    const statusPromises = servers.map(server => 
      checkServerStatus(server.url, server.name)
    );
    
    await Promise.allSettled(statusPromises);
    setCheckingStatus(false);
  };

  const checkSingleServerStatus = async (server, index) => {
    setCheckingStatus(true);
    const result = await checkServerStatus(server.url, server.name);
    
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
                // Используем setTimeout чтобы дать время обновиться состоянию
                setTimeout(() => renameServer(), 100);
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
