import { CapacitorWebsocket } from '@miaz/capacitor-websocket';

export const useWebSocket = () => {
  const connect = async (name, url, token) => {
    try {
      await CapacitorWebsocket.build({
        name,
        url: `${url}?token=${token}`,
        headers: { Authorization: `Bearer ${token}` }
      });

      await CapacitorWebsocket.applyListeners({ name });
      await CapacitorWebsocket.connect({ name });
      
      return true;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      throw error;
    }
  };

  const disconnect = async (name) => {
    try {
      await CapacitorWebsocket.disconnect({ name });
    } catch (error) {
      console.error('WebSocket disconnect error:', error);
    }
  };

  const addMessageListener = (name, callback) => {
    return CapacitorWebsocket.addListener(`${name}:message`, (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    });
  };

  const addConnectionListeners = (name, onConnected, onDisconnected, onError) => {
    const listeners = [];
    
    if (onConnected) {
      listeners.push(CapacitorWebsocket.addListener(`${name}:connected`, onConnected));
    }
    
    if (onDisconnected) {
      listeners.push(CapacitorWebsocket.addListener(`${name}:disconnected`, onDisconnected));
    }
    
    if (onError) {
      listeners.push(CapacitorWebsocket.addListener(`${name}:error`, onError));
    }
    
    return listeners;
  };

  const removeAllListeners = (name) => {
    CapacitorWebsocket.removeAllListeners();
  };

  return {
    connect,
    disconnect,
    addMessageListener,
    addConnectionListeners,
    removeAllListeners
  };
};
