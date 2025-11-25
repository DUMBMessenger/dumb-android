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
import { send, attach, mic, arrowUndo, arrowBack, close, stop, play, pause } from 'ionicons/icons';
import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { CapacitorWebsocket } from '@miaz/capacitor-websocket';
import { CapacitorAudioRecorder } from '@capgo/capacitor-audio-recorder';

function Chat({ serverUrl, channel, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [userAvatars, setUserAvatars] = useState({});
  const [recordingState, setRecordingState] = useState('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioMessages, setAudioMessages] = useState({});
  const clientRef = useRef(null);
  const messagesEndRef = useRef(null);
  const contentRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const recordingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const swipeThreshold = 50;
  const wsName = 'chat';

  const currentUsername = localStorage.getItem('username') || 'You';
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    initializeChat();
    setupWebSocket();
    if (isNative) {
      initializeAudioRecorder();
    }
    return () => {
      CapacitorWebsocket.disconnect({ name: wsName });
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [channel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadUserAvatars();
  }, [messages]);

  const initializeAudioRecorder = async () => {
    if (!isNative) return;
    
    try {
      const status = await CapacitorAudioRecorder.checkPermissions();
      if (status.recordAudio !== 'granted') {
        await CapacitorAudioRecorder.requestPermissions();
      }
    } catch (error) {
      console.error('Audio recorder initialization error:', error);
    }
  };

  const setupWebSocket = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const wsUrl = serverUrl.replace('http', 'ws').replace('https', 'wss');
      
      await CapacitorWebsocket.build({
        name: wsName,
        url: `${wsUrl}/ws?token=${token}&channel=${channel}`,
        headers: { Authorization: `Bearer ${token}` }
      });

      await CapacitorWebsocket.applyListeners({ name: wsName });

      CapacitorWebsocket.addListener(`${wsName}:message`, (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message' && data.channel === channel) {
            handleIncomingMessage(data);
          }
        } catch (error) {
          console.error('WebSocket parsing error:', error);
        }
      });

      CapacitorWebsocket.addListener(`${wsName}:connected`, () => {
        console.log('Chat WebSocket connected');
        setError('');
      });

      CapacitorWebsocket.addListener(`${wsName}:disconnected`, () => {
        console.log('Chat WebSocket disconnected');
      });

      CapacitorWebsocket.addListener(`${wsName}:error`, (event) => {
        console.error('Chat WebSocket error:', event.cause);
        setError('Connection error');
      });

      await CapacitorWebsocket.connect({ name: wsName });
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

    // Загружаем аватар только если его еще нет
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
    
    // Загружаем аватары только для новых пользователей
    const usersToLoad = uniqueUsers.filter(username => 
      username && !userAvatars[username] && username !== currentUsername
    );
    
    console.log('Loading avatars for users:', usersToLoad);
    
    for (const username of usersToLoad) {
      await loadUserAvatar(username);
    }
  };

  const loadUserAvatar = async (username) => {
    // Не загружаем аватар если он уже загружается или загружен
    if (userAvatars[username] === 'loading' || userAvatars[username]) {
      return;
    }

    // Помечаем как загружающийся
    setUserAvatars(prev => ({
      ...prev,
      [username]: 'loading'
    }));

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${serverUrl}/api/user/${username}/avatar`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok && response.status !== 404) {
        const blob = await response.blob();
        if (blob && blob.size > 0) {
          const avatarUrl = URL.createObjectURL(blob);
          
          setUserAvatars(prev => ({
            ...prev,
            [username]: avatarUrl
          }));
          return;
        }
      }
      
      // Если аватар не найден, устанавливаем null чтобы больше не пытаться
      setUserAvatars(prev => ({
        ...prev,
        [username]: null
      }));
      
    } catch (error) {
      console.error(`Error loading avatar for ${username}:`, error);
      // При ошибке также устанавливаем null
      setUserAvatars(prev => ({
        ...prev,
        [username]: null
      }));
    }
  };

  const getAvatarUrl = (username) => {
    const avatar = userAvatars[username];
    return avatar && avatar !== 'loading' ? avatar : null;
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current && contentRef.current) {
      const content = contentRef.current;
      content.scrollToBottom(300);
    }
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

  const startRecording = async () => {
    if (isNative) {
      startNativeRecording();
    } else {
      startBrowserRecording();
    }
  };

  const startNativeRecording = async () => {
    try {
      setRecordingState('recording');
      setRecordingTime(0);
      
      await CapacitorAudioRecorder.startRecording();
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecordingState('idle');
      setError('Failed to start recording');
    }
  };

  const startBrowserRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1
        } 
      });
      
      const options = {
        mimeType: 'audio/ogg; codecs=opus'
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm; codecs=opus';
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current.mimeType 
        });
        await sendAudioMessage(audioBlob, recordingTime);
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordingState('recording');
      setRecordingTime(0);
      mediaRecorderRef.current.start(1000);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting browser recording:', error);
      setRecordingState('idle');
      setError('Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (isNative) {
      stopNativeRecording();
    } else {
      stopBrowserRecording();
    }
  };

  const stopNativeRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      const result = await CapacitorAudioRecorder.stopRecording();
      
      if (result.uri) {
        const response = await fetch(result.uri);
        const audioBlob = await response.blob();
        await sendAudioMessage(audioBlob, Math.floor(result.duration / 1000));
      }
      
      setRecordingState('idle');
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecordingState('idle');
      setRecordingTime(0);
      setError('Failed to stop recording');
    }
  };

  const stopBrowserRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      setRecordingState('idle');
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error stopping browser recording:', error);
      setRecordingState('idle');
      setRecordingTime(0);
      setError('Failed to stop recording');
    }
  };

  const cancelRecording = async () => {
    if (isNative) {
      cancelNativeRecording();
    } else {
      cancelBrowserRecording();
    }
  };

  const cancelNativeRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      await CapacitorAudioRecorder.cancelRecording();
      
      setRecordingState('idle');
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error canceling recording:', error);
      setRecordingState('idle');
      setRecordingTime(0);
    }
  };

  const cancelBrowserRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      }
      
      setRecordingState('idle');
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error canceling browser recording:', error);
      setRecordingState('idle');
      setRecordingTime(0);
    }
  };

  const sendAudioMessage = async (audioBlob, duration) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Используем реальную длительность из записи
      const actualDuration = duration;

      // Step 1: Get voiceId from server
      const voiceResponse = await fetch(`${serverUrl}/api/voice/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: channel,
          duration: actualDuration
        })
      });

      if (!voiceResponse.ok) {
        throw new Error('Failed to get voice upload ID');
      }

      const voiceData = await voiceResponse.json();
      
      if (!voiceData.success || !voiceData.voiceId) {
        throw new Error('Invalid response from voice upload endpoint');
      }

      const voiceId = voiceData.voiceId;

      // Step 2: Upload the audio file
      const formData = new FormData();
      const fileExtension = isNative ? 'm4a' : 'ogg';
      const audioFile = new File([audioBlob], `voice-message.${fileExtension}`, { 
        type: isNative ? 'audio/m4a' : 'audio/ogg' 
      });
      
      formData.append('voice', audioFile);

      const uploadResponse = await fetch(`${serverUrl}/api/upload/voice/${voiceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload audio file');
      }

      const uploadResult = await uploadResponse.json();
      
      if (!uploadResult.success) {
        throw new Error('Audio upload failed');
      }

      // Step 3: Send voice-only message
      const messageResponse = await fetch(`${serverUrl}/api/message/voice-only`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: channel,
          voiceMessage: voiceId
        })
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to send voice message');
      }

      const messageResult = await messageResponse.json();
      
      if (!messageResult.success) {
        throw new Error('Voice message sending failed');
      }

      setReplyingTo(null);
      await loadMessages();
      
    } catch (error) {
      console.error('Error sending audio message:', error);
      setError('Failed to send audio message: ' + error.message);
    }
  };

  const playAudioMessage = async (messageId, audioUrl) => {
    try {
      setAudioMessages(prev => ({
        ...prev,
        [messageId]: {
          status: 'playing',
          progress: 0,
          currentTime: 0,
          duration: 0
        }
      }));

      const fullAudioUrl = audioUrl.startsWith('http') ? audioUrl : `${serverUrl}${audioUrl}`;
      const audio = new Audio(fullAudioUrl);
      
      // Ждем загрузки метаданных для получения длительности
      audio.addEventListener('loadedmetadata', () => {
        setAudioMessages(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            duration: audio.duration
          }
        }));
      });

      const progressInterval = setInterval(() => {
        if (audio.duration && !isNaN(audio.duration)) {
          const progress = (audio.currentTime / audio.duration) * 100;
          setAudioMessages(prev => ({
            ...prev,
            [messageId]: {
              ...prev[messageId],
              progress: progress,
              currentTime: audio.currentTime,
              duration: audio.duration
            }
          }));
        }
      }, 100);

      audio.play();
      
      audio.onended = () => {
        clearInterval(progressInterval);
        setAudioMessages(prev => ({
          ...prev,
          [messageId]: {
            status: 'idle',
            progress: 0,
            currentTime: 0,
            duration: prev[messageId]?.duration || 0
          }
        }));
      };
      
      audio.onerror = () => {
        clearInterval(progressInterval);
        setAudioMessages(prev => ({
          ...prev,
          [messageId]: {
            status: 'idle',
            progress: 0,
            currentTime: 0,
            duration: prev[messageId]?.duration || 0
          }
        }));
      };
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioMessages(prev => ({
        ...prev,
        [messageId]: {
          status: 'idle',
          progress: 0,
          currentTime: 0,
          duration: 0
        }
      }));
    }
  };

  const pauseAudioMessage = (messageId) => {
    setAudioMessages(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        status: 'paused'
      }
    }));
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

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAudioTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const renderAudioMessage = (message) => {
    const audioState = audioMessages[message.id] || { status: 'idle', progress: 0, currentTime: 0, duration: 0 };
    const isPlaying = audioState.status === 'playing';
    const isPaused = audioState.status === 'paused';
    
    // Используем длительность из состояния воспроизведения или из сообщения
    const duration = audioState.duration || 
                    (message.voice && message.voice.duration) || 
                    0;
    
    const currentTime = audioState.currentTime || 0;
    const progress = audioState.progress || 0;
    const audioUrl = message.audioUrl || (message.voice && message.voice.downloadUrl);
    
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '12px',
        marginTop: '8px',
        minWidth: '200px'
      }}>
        <IonButton 
          fill="clear" 
          size="small"
          onClick={() => isPlaying ? pauseAudioMessage(message.id) : playAudioMessage(message.id, audioUrl)}
          style={{
            '--color': message.from === currentUsername ? 'white' : '#2d004d',
            '--background': message.from === currentUsername ? '#4a0072' : 'white',
            width: '36px',
            height: '36px',
            borderRadius: '50%'
          }}
        >
          <IonIcon icon={isPlaying ? pause : play} />
        </IonButton>
        
        <div style={{ flex: 1 }}>
          {/* Progress bar */}
          <div style={{
            height: '4px',
            background: 'rgba(255,255,255,0.3)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '8px'
          }}>
            <div style={{
              height: '100%',
              background: message.from === currentUsername ? 'white' : '#2d004d',
              width: `${progress}%`,
              transition: 'width 0.1s linear',
              borderRadius: '2px'
            }} />
          </div>
          
          {/* Time info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              color: message.from === currentUsername ? 'rgba(255,255,255,0.8)' : 'rgba(45,0,77,0.8)',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {isPlaying || isPaused ? formatAudioTime(currentTime) : 'Voice message'}
            </span>
            <span style={{
              color: message.from === currentUsername ? 'rgba(255,255,255,0.6)' : 'rgba(45,0,77,0.6)',
              fontSize: '11px',
              minWidth: '35px',
              textAlign: 'right'
            }}>
              {formatAudioTime(duration)}
            </span>
          </div>
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

      <IonContent ref={contentRef} scrollEvents={true}>
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
                      
                      {message.voice ? (
                        renderAudioMessage(message)
                      ) : (
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
                      )}
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

        {recordingState === 'recording' && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#2d004d',
              padding: '20px',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#ff3b30',
                  animation: 'pulse 1s infinite'
                }} />
                <span style={{ fontSize: '16px', fontWeight: '600' }}>
                  {formatRecordingTime(recordingTime)}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <IonButton 
                  fill="clear" 
                  onClick={cancelRecording}
                  style={{ '--color': 'white' }}
                >
                  <IonIcon icon={close} />
                </IonButton>
                
                <IonButton 
                  fill="solid"
                  onClick={stopRecording}
                  style={{
                    '--background': '#ff3b30',
                    '--background-activated': '#ff6b60',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%'
                  }}
                >
                  <IonIcon icon={stop} />
                </IonButton>
              </div>
            </div>
          </motion.div>
        )}

        {recordingState === 'idle' && (
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
              
              <IonButton 
                fill="clear" 
                size="small" 
                onClick={startRecording}
                style={{ '--color': '#2d004d' }}
              >
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
        )}
      </IonContent>
    </IonPage>
  );
}

export default memo(Chat);
