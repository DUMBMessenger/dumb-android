import React, { useState, useEffect, useRef } from 'react';
import { 
  Window, 
  WindowHeader, 
  WindowContent, 
  Button, 
  TextInput, 
  List, 
  ListItem,
  Toolbar,
  Panel,
  Hourglass
} from 'react95';
import { styled, createGlobalStyle } from 'styled-components';
import { useChat } from './brain/chat';
import { Cdplayer114, FileText, Globe } from '@react95/icons';

const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'MS Sans Serif';
    src: url('/fonts/ms_sans_serif.woff2') format('woff2'),
         url('/fonts/ms_sans_serif.woff') format('woff');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'MS Sans Serif';
    src: url('/fonts/ms_sans_serif_bold.woff2') format('woff2'),
         url('/fonts/ms_sans_serif_bold.woff') format('woff');
    font-weight: bold;
    font-style: normal;
  }
  body {
    font-family: 'MS Sans Serif', sans-serif;
  }
`;

const StyledWindow = styled(Window)`
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  height: calc(100vh - 40px);
`;

const MessageContainer = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
  padding: 2px 4px;
  
  &:hover {
    background: #f0f0f0;
  }
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  min-width: 120px;
`;

const Username = styled.span`
  font-weight: bold;
  color: #000080;
`;

const Time = styled.span`
  color: #666;
  font-size: 11px;
`;

const MessageText = styled.span`
  font-size: 13px;
  line-height: 1.3;
  flex: 1;
`;

const ReplyIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 11px;
  margin-left: 8px;
  font-style: italic;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 12px;
`;

const ChatContainer = styled.div`
  background: #ffffff;
  border: 1px inset #c0c0c0;
  padding: 4px;
  height: 400px;
  overflow-y: auto;
`;

function Chat95({ serverUrl, channel, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const clientRef = useRef(null);
  const messagesEndRef = useRef(null);

  const currentUsername = localStorage.getItem('username') || 'You';

  const { initializeClient, loadMessages, sendMessage } = useChat();

  useEffect(() => {
    initializeChat();
  }, [channel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeChat = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        onNavigate('auth');
        return;
      }

      clientRef.current = await initializeClient(serverUrl, token);
      await loadChatMessages();
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const loadChatMessages = async () => {
    try {
      const messagesArray = await loadMessages(clientRef.current, channel);
      setMessages(messagesArray);
      setError('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    const replyToId = replyingTo ? replyingTo.id : undefined;
    
    const tempMessage = {
      id: `temp-${Date.now()}`,
      from: currentUsername,
      text: messageText,
      timestamp: new Date().toISOString(),
      isTemp: true,
      replyTo: replyToId
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setReplyingTo(null);

    try {
      await sendMessage(clientRef.current, channel, messageText, replyToId);
      await loadChatMessages();
    } catch (error) {
      setError(error.message || 'Failed to send message');
      setNewMessage(messageText);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
  };

  const getReplyText = (message) => {
    if (!message.replyTo && !message.replyToMessage) return null;
    const replyData = message.replyToMessage || { from: 'Unknown', text: 'Message not found' };
    return `re: ${replyData.from}: ${replyData.text || 'Message content'}`;
  };

  if (loading) {
    return (
      <div style={{ background: '#008080', minHeight: '100vh', padding: '20px' }}>
        <GlobalStyle />
        <StyledWindow>
          <WindowHeader>#{channel}</WindowHeader>
          <WindowContent style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Hourglass size={32} />
              <div>Loading messages...</div>
            </div>
          </WindowContent>
        </StyledWindow>
      </div>
    );
  }

  return (
    <div style={{ background: '#008080', minHeight: '100vh', padding: '20px' }}>
      <GlobalStyle />
      <StyledWindow>
        <WindowHeader style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <span>#{channel}</span>
          <Toolbar>
            <Button 
              onClick={() => onNavigate('channels')}
            >
              <Globe variant="32x32_4" style={{ marginRight: 4 }} />
              Channels
            </Button>
          </Toolbar>
        </WindowHeader>
        
        <WindowContent>
          {error && (
            <Panel variant="well" style={{ 
              background: '#ffc0c0', 
              padding: '6px', 
              marginBottom: '12px',
              border: '1px inset'
            }}>
              {error}
            </Panel>
          )}

          {replyingTo && (
            <Panel variant="well" style={{ 
              marginBottom: '12px', 
              padding: '6px', 
              background: '#e0e0e0',
              border: '1px inset'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    <Cdplayer114 variant="32x32_1" style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    Replying to {replyingTo.from}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{replyingTo.text || replyingTo.content}</div>
                </div>
                <Button 
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            </Panel>
          )}

          <ChatContainer>
            {messages.map((message, index) => (
              <MessageContainer 
                key={message.id || index}
                onClick={() => handleReply(message)}
                style={{ cursor: 'pointer' }}
              >
                <MessageHeader>
                  <Username>{message.from || 'Unknown'}</Username>
                  <Time>
                    {formatTime(message.timestamp || message.ts)}
                    {message.isTemp && ' ⏳'}
                  </Time>
                </MessageHeader>
                
                <MessageText>
                  {message.text || message.content || ''}
                  {message.hasFile && <FileText variant="32x32_4" style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                </MessageText>
                
                {(message.replyTo || message.replyToMessage) && (
                  <ReplyIndicator>
                    <Cdplayer114 variant="32x32_1" style={{ marginRight: 2 }} />
                    {getReplyText(message)}
                  </ReplyIndicator>
                )}
              </MessageContainer>
            ))}
            
            {messages.length === 0 && !loading && (
              <div style={{ 
                padding: '40px', 
                textAlign: 'center', 
                color: '#666'
              }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>No messages yet</div>
                <div style={{ fontSize: '12px' }}>Start the conversation!</div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </ChatContainer>

          <InputContainer>
            <TextInput
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={replyingTo ? `Reply to ${replyingTo.from}...` : "Type a message..."}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1 }}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!newMessage.trim()}
            >
              Send
            </Button>
          </InputContainer>
        </WindowContent>
      </StyledWindow>
    </div>
  );
}

export default Chat95;
