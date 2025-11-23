import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonAvatar,
  IonText,
  IonImg
} from '@ionic/react';
import { send, attach, mic, arrowUndo, arrowBack, close } from 'ionicons/icons';
import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebSocket } from '@miaz/capacitor-websocket';

function Chat({ serverUrl, channel, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [userAvatars, setUserAvatars] = useState({});
  const clientRef = useRef(null);
  const messagesEndRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const swipeThreshold = 50;
  const wsName = 'chat';

  const currentUsername = localStorage.getItem('username') || 'You';

  useEffect(() => {
    initializeChat();
    setupWebSocket();
    return () => {
      WebSocket.disconnect({ name: wsName });
    };
  }, [channel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadUserAvatars();
  }, [messages]);

  const setupWebSocket = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const wsUrl = serverUrl.replace('http', 'ws').replace('https', 'wss');
      
      await WebSocket.build({
        name: wsName,
        url: `${wsUrl}/ws?token=${token}&channel=${channel}`,
        headers: { Authorization: `Bearer ${token}` }
      });

      await WebSocket.applyListeners({ name: wsName });

      WebSocket.addListener(`${wsName}:message`, (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message' && data.channel === channel) {
            handleIncomingMessage(data);
          }
        } catch (error) {
          console.error('WebSocket parsing error:', error);
        }
      });

      WebSocket.addListener(`${wsName}:connected`, () => {
        console.log('Chat WebSocket connected');
        setError('');
      });

      WebSocket.addListener(`${wsName}:disconnected`, () => {
        console.log('Chat WebSocket disconnected');
      });

      WebSocket.addListener(`${wsName}:error`, (event) => {
        console.error('Chat WebSocket error:', event.cause);
        setError('Connection error');
      });

      await WebSocket.connect({ name: wsName });
    } catch (error) {
      console.error('WebSocket setup error:', error);
    }
  };

  const initializeChat = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        onNavigate('auth');
        return;
      }

      const { ChatClient } = await import('dumb_api_js');
      clientRef.current = new ChatClient({ serverUrl, token });
      await loadMessages();
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleIncomingMessage = (message) => {
    setMessages(prev => {
      const messageExists = prev.some(msg => msg.id === message.id);
      
      if (messageExists) {
        return prev;
      }

      const processedMessage = processMessageWithReply(message, prev);
      return [...prev, processedMessage];
    });

    if (message.from && !userAvatars[message.from]) {
      loadUserAvatar(message.from);
    }
  };

  const processMessageWithReply = (message, allMessages) => {
    if (message.replyTo && !message.replyToMessage) {
      const parentMessage = allMessages.find(msg => msg.id === message.replyTo);
      if (parentMessage) {
        return {
          ...message,
          replyToMessage: {
            id: parentMessage.id,
            from: parentMessage.from,
            text: parentMessage.text || parentMessage.content || '',
            timestamp: parentMessage.timestamp || parentMessage.ts
          }
        };
      }
    }
    return message;
  };

  const loadMessages = async () => {
    try {
      const response = await clientRef.current.getMessages(channel);
      
      let messagesArray = response;
      if (response && !Array.isArray(response)) {
        if (response.messages && Array.isArray(response.messages)) {
          messagesArray = response.messages;
        } else if (response.data && Array.isArray(response.data)) {
          messagesArray = response.data;
        } else if (response.success && Array.isArray(response.channels)) {
          messagesArray = response.channels;
        } else {
          messagesArray = Object.values(response);
        }
      }
      
      const processedMessages = Array.isArray(messagesArray) 
        ? processMessagesWithReplies(messagesArray)
        : [];
      
      setMessages(processedMessages);
      setError('');
    } catch (error) {
      setError(error.message);
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMessagesWithReplies = (messages) => {
    return messages.map(message => {
      if (message.replyTo && !message.replyToMessage) {
        const parentMessage = messages.find(msg => msg.id === message.replyTo);
        if (parentMessage) {
          return {
            ...message,
            replyToMessage: {
              id: parentMessage.id,
              from: parentMessage.from,
              text: parentMessage.text || parentMessage.content || '',
              timestamp: parentMessage.timestamp || parentMessage.ts
            }
          };
        }
      }
      return message;
    });
  };

  const loadUserAvatars = async () => {
    const uniqueUsers = [...new Set(messages.map(msg => msg.from).filter(Boolean))];
    
    for (const username of uniqueUsers) {
      if (username && !userAvatars[username]) {
        await loadUserAvatar(username);
      }
    }
  };

  const loadUserAvatar = async (username) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${serverUrl}/api/user/${username}/avatar`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const avatarUrl = URL.createObjectURL(blob);
        
        setUserAvatars(prev => ({
          ...prev,
          [username]: avatarUrl
        }));
      }
    } catch (error) {
      console.error(`Error loading avatar for ${username}:`, error);
    }
  };

  const getAvatarUrl = (username) => {
    return userAvatars[username] || null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTouchStart = (e, message) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e, message) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (message) => {
    const distance = touchStartX.current - touchEndX.current;
    
    if (distance > swipeThreshold) {
      handleSwipeLeft(message);
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleSwipeLeft = (message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleReplyClick = (message) => {
    setReplyingTo(message);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    
    const replyToId = replyingTo ? replyingTo.id : undefined;
    
    const tempMessage = {
      id: `temp-${Date.now()}`,
      from: currentUsername,
      text: messageText,
      timestamp: new Date().toISOString(),
      isTemp: true,
      replyTo: replyToId,
      replyToMessage: replyingTo ? {
        id: replyingTo.id,
        from: replyingTo.from,
        text: replyingTo.text || replyingTo.content || '',
        timestamp: replyingTo.timestamp || replyingTo.ts
      } : null
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setReplyingTo(null);

    try {
      console.log('Sending message with replyTo:', replyToId);
      const result = await clientRef.current.sendMessage(
        channel, 
        messageText, 
        { replyTo: replyToId }
      );
      
      console.log('Message sent successfully:', result);
      
      await loadMessages();
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
      
      setNewMessage(messageText);
      
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', 'minute': '2-digit' });
    } catch {
      return '';
    }
  };

  const renderReplyPreview = (message) => {
    if (!message.replyTo && !message.replyToMessage) return null;

    const replyData = message.replyToMessage || { from: 'Unknown', text: 'Message not found' };
    
    return (
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '8px 12px',
        borderRadius: '8px',
        marginBottom: '8px',
        borderLeft: '3px solid #4a0072',
        fontSize: '12px',
        lineHeight: '1.3'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          marginBottom: '4px'
        }}>
          <IonIcon icon={arrowUndo} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }} />
          <span style={{ 
            color: 'rgba(255,255,255,0.9)', 
            fontWeight: '600',
            fontSize: '11px'
          }}>
            {replyData.from}
          </span>
        </div>
        <div style={{ 
          color: 'rgba(255,255,255,0.8)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {replyData.text || 'Message content'}
        </div>
      </div>
    );
  };

  const messageVariants = {
    hidden: (direction) => ({
      opacity: 0,
      x: direction === 'left' ? -20 : 20
    }),
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.4 }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const replyBannerVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { duration: 0.3 }
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
            <p style={{ color: '#2d004d', fontSize: '16px' }}>Loading messages...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#2d004d', '--color': 'white' }}>
          <IonButton slot="start" fill="clear" onClick={() => onNavigate('channels')} style={{ '--color': 'white' }}>
            <IonIcon icon={arrowBack} />
          </IonButton>
          <IonTitle>#{channel}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                background: 'var(--ion-color-danger)',
                color: 'white',
                padding: '12px',
                margin: '16px',
                borderRadius: '12px',
                textAlign: 'center'
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {replyingTo && (
            <motion.div
              variants={replyBannerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: 'var(--ion-color-light)',
                padding: '12px 16px',
                borderBottom: '1px solid var(--ion-color-medium)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <IonIcon icon={arrowUndo} style={{ color: '#2d004d', fontSize: '16px' }} />
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#2d004d', fontSize: '14px', fontWeight: '600' }}>
                    Replying to {replyingTo.from}
                  </span>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--ion-color-medium)',
                    background: 'rgba(45, 0, 77, 0.1)',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    marginTop: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {replyingTo.text || replyingTo.content}
                  </div>
                </div>
              </div>
              <IonButton 
                fill="clear" 
                size="small" 
                onClick={cancelReply}
                style={{ '--color': '#2d004d', '--padding-start': '0', '--padding-end': '0' }}
              >
                <IonIcon icon={close} />
              </IonButton>
            </motion.div>
          )}
        </AnimatePresence>

        <IonList style={{ '--background': 'transparent', paddingBottom: '80px' }}>
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id || index}
                custom={message.from === currentUsername ? 'right' : 'left'}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <IonItem 
                  style={{
                    '--background': 'transparent',
                    '--border-style': 'none',
                    '--padding-start': '16px',
                    '--inner-padding-end': '16px',
                    marginBottom: '8px'
                  }}
                  onTouchStart={(e) => handleTouchStart(e, message)}
                  onTouchMove={(e) => handleTouchMove(e, message)}
                  onTouchEnd={() => handleTouchEnd(message)}
                  onClick={() => handleReplyClick(message)}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    gap: '12px',
                    width: '100%',
                    flexDirection: message.from === currentUsername ? 'row-reverse' : 'row'
                  }}>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      {getAvatarUrl(message.from) ? (
                        <IonAvatar style={{ 
                          width: '40px', 
                          height: '40px'
                        }}>
                          <IonImg 
                            src={getAvatarUrl(message.from)} 
                            alt={message.from}
                            style={{ objectFit: 'cover' }}
                          />
                        </IonAvatar>
                      ) : (
                        <IonAvatar style={{ 
                          width: '40px', 
                          height: '40px',
                          background: message.from === currentUsername ? '#4a0072' : '#2d004d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: 'white'
                        }}>
                          {message.from?.[0]?.toUpperCase() || 'U'}
                        </IonAvatar>
                      )}
                    </motion.div>
                    
                    <div style={{
                      maxWidth: '70%',
                      background: message.from === currentUsername ? '#2d004d' : 'var(--ion-color-light)',
                      padding: '12px 16px',
                      borderRadius: '18px',
                      borderBottomLeftRadius: message.from === currentUsername ? '18px' : '4px',
                      borderBottomRightRadius: message.from === currentUsername ? '4px' : '18px',
                      cursor: 'pointer',
                      opacity: message.isTemp ? 0.7 : 1
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px',
                        gap: '8px'
                      }}>
                        <IonText style={{ 
                          color: message.from === currentUsername ? 'white' : '#2d004d',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          {message.from || 'Unknown'}
                        </IonText>
                        <small style={{ 
                          color: message.from === currentUsername ? 'rgba(255,255,255,0.7)' : 'var(--ion-color-medium)',
                          fontSize: '11px'
                        }}>
                          {formatTime(message.timestamp || message.ts)}
                          {message.isTemp && ' ⏳'}
                        </small>
                      </div>
                      
                      {renderReplyPreview(message)}
                      
                      <motion.p 
                        style={{ 
                          margin: 0,
                          color: message.from === currentUsername ? 'white' : 'var(--ion-color-dark)',
                          fontSize: '14px',
                          lineHeight: '1.4',
                          wordBreak: 'break-word'
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        {message.text || message.content || ''}
                      </motion.p>
                    </div>
                  </div>
                </IonItem>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </IonList>

        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: 'var(--ion-color-medium)'
            }}
          >
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No messages yet</p>
            <p>Start the conversation!</p>
          </motion.div>
        )}

        <motion.div 
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'var(--ion-color-light)',
            padding: '16px',
            borderTop: '1px solid var(--ion-color-medium)'
          }}
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'white',
            borderRadius: '24px',
            padding: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <IonButton fill="clear" size="small" style={{ '--color': '#2d004d' }}>
              <IonIcon icon={attach} />
            </IonButton>
            <IonButton fill="clear" size="small" style={{ '--color': '#2d004d' }}>
              <IonIcon icon={mic} />
            </IonButton>
            <IonInput
              value={newMessage}
              placeholder={replyingTo ? `Reply to ${replyingTo.from}...` : "Type a message..."}
              onIonInput={e => setNewMessage(e.detail.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              style={{ 
                flex: 1,
                '--padding-start': '16px',
                '--padding-end': '16px'
              }}
            />
            <motion.div
              whileTap={{ scale: 0.95 }}
            >
              <IonButton 
                onClick={sendMessage} 
                disabled={!newMessage.trim()}
                style={{
                  '--background': '#2d004d',
                  '--background-activated': '#4a0072',
                  '--border-radius': '50%',
                  width: '44px',
                  height: '44px'
                }}
              >
                <IonIcon icon={send} />
              </IonButton>
            </motion.div>
          </div>
        </motion.div>
      </IonContent>
    </IonPage>
  );
}

export default memo(Chat);
