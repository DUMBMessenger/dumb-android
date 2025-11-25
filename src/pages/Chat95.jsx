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
import { styled } from 'styled-components';
import { useChat } from './brain/chat';

const StyledWindow = styled(Window)`
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  height: calc(100vh - 40px);
`;

const MessageContainer = styled.div`
  display: flex;
  flex-direction: ${props => props.own ? 'row-reverse' : 'row'};
  gap: 8px;
  margin-bottom: 16px;
`;

const MessageBubble = styled(Panel)`
  max-width: 70%;
  padding: 8px 12px;
  background: ${props => props.own ? '#000080' : '#c0c0c0'};
  color: ${props => props.own ? '#ffffff' : '#000000'};
  border-radius: 4px;
`;

const MessageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
`;

const InputContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

function Chat95({ serverUrl, channel, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const clientRef = useRef(null);

  const currentUsername = localStorage.getItem('username') || 'You';

  const { initializeClient, loadMessages, sendMessage } = useChat();

  useEffect(() => {
    initializeChat();
  }, [channel]);

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
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', 'minute': '2-digit' });
    } catch {
      return '';
    }
  };

  const renderReplyPreview = (message) => {
    if (!message.replyTo && !message.replyToMessage) return null;

    const replyData = message.replyToMessage || { from: 'Unknown', text: 'Message not found' };
    
    return (
      <Panel variant="well" style={{ marginBottom: '8px', padding: '4px 8px', background: 'rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '11px', color: '#666' }}>Replying to {replyData.from}</div>
        <div style={{ fontSize: '12px' }}>{replyData.text || 'Message content'}</div>
      </Panel>
    );
  };

  if (loading) {
    return (
      <div style={{ background: '#008080', minHeight: '100vh', padding: '20px' }}>
        <StyledWindow>
          <WindowHeader>#{channel}</WindowHeader>
          <WindowContent style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
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
      <StyledWindow>
        <WindowHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>#{channel}</span>
          <Toolbar>
            <Button size="sm" onClick={() => onNavigate('channels')}>Back</Button>
          </Toolbar>
        </WindowHeader>
        
        <WindowContent>
          {error && (
            <Panel variant="well" style={{ background: '#ffc0c0', padding: '8px', marginBottom: '16px' }}>
              {error}
            </Panel>
          )}

          {replyingTo && (
            <Panel variant="well" style={{ marginBottom: '16px', padding: '8px', background: '#e0e0e0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px' }}>Replying to {replyingTo.from}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{replyingTo.text || replyingTo.content}</div>
                </div>
                <Button size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
              </div>
            </Panel>
          )}

          <List style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
            {messages.map((message, index) => (
              <ListItem key={message.id || index} style={{ border: 'none', padding: '4px 0' }}>
                <MessageContainer own={message.from === currentUsername}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    background: message.from === currentUsername ? '#000080' : '#c0c0c0',
                    color: message.from === currentUsername ? '#ffffff' : '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {message.from?.[0]?.toUpperCase() || 'U'}
                  </div>
                  
                  <MessageBubble own={message.from === currentUsername}>
                    <MessageHeader>
                      <span style={{ fontWeight: 'bold' }}>{message.from || 'Unknown'}</span>
                      <span style={{ opacity: 0.7 }}>
                        {formatTime(message.timestamp || message.ts)}
                        {message.isTemp && ' ⏳'}
                      </span>
                    </MessageHeader>
                    
                    {renderReplyPreview(message)}
                    
                    <div>{message.text || message.content || ''}</div>
                  </MessageBubble>
                </MessageContainer>
              </ListItem>
            ))}
            
            {messages.length === 0 && !loading && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                <div>No messages yet</div>
                <div>Start the conversation!</div>
              </div>
            )}
          </List>

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
