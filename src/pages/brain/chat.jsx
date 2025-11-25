export const useChat = () => {
  const initializeClient = async (serverUrl, token) => {
    const { ChatClient } = await import('dumb_api_js');
    return new ChatClient({ serverUrl, token });
  };

  const loadMessages = async (client, channel) => {
    const response = await client.getMessages(channel);
    
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
    
    return Array.isArray(messagesArray) ? messagesArray : [];
  };

  const sendMessage = async (client, channel, text, replyTo = null) => {
    return await client.sendMessage(channel, text, { replyTo });
  };

  const sendVoiceMessage = async (serverUrl, token, channel, audioBlob, duration) => {
    const voiceResponse = await fetch(`${serverUrl}/api/voice/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channel,
        duration: duration
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

    const formData = new FormData();
    const audioFile = new File([audioBlob], `voice-message.m4a`, { 
      type: 'audio/m4a'
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

    return await messageResponse.json();
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

  const loadUserAvatar = async (serverUrl, token, username) => {
    try {
      const response = await fetch(`${serverUrl}/api/user/${username}/avatar`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok && response.status !== 404) {
        const blob = await response.blob();
        if (blob && blob.size > 0) {
          return URL.createObjectURL(blob);
        }
      }
      return null;
    } catch (error) {
      console.error(`Error loading avatar for ${username}:`, error);
      return null;
    }
  };

  return {
    initializeClient,
    loadMessages,
    sendMessage,
    sendVoiceMessage,
    processMessagesWithReplies,
    loadUserAvatar
  };
};
