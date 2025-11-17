// Chat.jsx
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
  IonText
} from '@ionic/react';
import { send, attach, mic, arrowUndo } from 'ionicons/icons';
import { useState, useEffect, useRef } from 'react';

export default function Chat({ serverUrl, channel, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // Сообщение, на которое отвечаем
  const clientRef = useRef(null);
  const pollingRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const swipeThreshold = 50; // Минимальное расстояние свайпа

  useEffect(() => {
    initializeChat();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [channel]);

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
      startPolling();
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(async () => {
      try {
        await loadMessages();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
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
      
      setMessages(Array.isArray(messagesArray) ? messagesArray : []);
      setError('');
    } catch (error) {
      setError(error.message);
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обработчики свайпа
  const handleTouchStart = (e, message) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e, message) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (message) => {
    const distance = touchStartX.current - touchEndX.current;
    
    // Свайп влево (расстояние больше порога)
    if (distance > swipeThreshold) {
      handleSwipeLeft(message);
    }
    
    // Сброс значений
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const handleSwipeLeft = (message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage;
    let finalMessage = messageText;
    
    // Добавляем упоминание, если отвечаем на сообщение
    if (replyingTo) {
      finalMessage = `@${replyingTo.from} ${messageText}`;
    }
    
    const tempMessage = {
      id: Date.now(),
      from: 'You',
      text: finalMessage,
      timestamp: new Date().toISOString(),
      isTemp: true,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        from: replyingTo.from,
        text: replyingTo.text
      } : null
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setReplyingTo(null); // Сбрасываем ответ после отправки

    try {
      await clientRef.current.sendMessage(channel, finalMessage);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      await loadMessages();
    } catch (error) {
      setError(error.message);
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

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div className="loading-container">
            <div className="pulse-dots light">
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
              <div className="pulse-dot"></div>
            </div>
            Loading messages...
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>#{channel}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="chat-messages">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Баннер ответа на сообщение */}
        {replyingTo && (
          <div className="reply-banner">
            <div className="reply-banner-content">
              <IonIcon icon={arrowUndo} />
              <span>Replying to {replyingTo.from}</span>
              <IonButton fill="clear" size="small" onClick={cancelReply}>
                Cancel
              </IonButton>
            </div>
            <div className="reply-preview">
              {replyingTo.text}
            </div>
          </div>
        )}

        <IonList>
          {messages.map((message, index) => (
            <IonItem 
              key={message.id || index}
              className={`message-item ${message.from === 'You' ? 'own-message' : ''} ${message.isTemp ? 'temp-message' : ''}`}
              onTouchStart={(e) => handleTouchStart(e, message)}
              onTouchMove={(e) => handleTouchMove(e, message)}
              onTouchEnd={() => handleTouchEnd(message)}
            >
              <IonAvatar slot="start" className="message-avatar">
                {message.from?.[0]?.toUpperCase() || 'U'}
              </IonAvatar>
              <IonLabel>
                <div className="message-header">
                  <IonText color="primary" className="message-username">
                    {message.from || 'Unknown'}
                  </IonText>
                  <small className="message-time">
                    {formatTime(message.timestamp)}
                    {message.isTemp && ' ⏳'}
                  </small>
                </div>
                
                {/* Превью ответа (если сообщение является ответом) */}
                {message.replyTo && (
                  <div className="reply-preview-message">
                    <IonText color="medium">
                      Replying to {message.replyTo.from}: {message.replyTo.text}
                    </IonText>
                  </div>
                )}
                
                <p className="message-text">{message.text || message.content || ''}</p>
                {message.isTemp && <IonText color="medium">Sending...</IonText>}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>

        {messages.length === 0 && !loading && (
          <div className="empty-state">
            <p>No messages yet</p>
            <p>Start the conversation!</p>
          </div>
        )}

        <div className="message-input-container">
          <div className="message-input-wrapper">
            <IonButton fill="clear" size="small">
              <IonIcon icon={attach} />
            </IonButton>
            <IonButton fill="clear" size="small">
              <IonIcon icon={mic} />
            </IonButton>
            <IonInput
              value={newMessage}
              placeholder={replyingTo ? `Reply to ${replyingTo.from}...` : "Type a message..."}
              onIonInput={e => setNewMessage(e.detail.value)}
              onKeyPress={e => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1 }}
            />
            <IonButton onClick={sendMessage} disabled={!newMessage.trim()}>
              <IonIcon icon={send} />
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
