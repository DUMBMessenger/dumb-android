export const useServers = () => {
  const loadServers = () => {
    return JSON.parse(localStorage.getItem('servers') || '[]');
  };

  const saveServer = (servers, newServer) => {
    if (!newServer.name || !newServer.url) {
      throw new Error('Please enter both server name and URL');
    }
    
    if (servers.some(server => server.name === newServer.name)) {
      throw new Error('Server name already exists');
    }

    if (servers.some(server => server.url === newServer.url)) {
      throw new Error('Server URL already exists');
    }
    
    const updated = [...servers, { ...newServer }];
    localStorage.setItem('servers', JSON.stringify(updated));
    return updated;
  };

  const deleteServer = (servers, index) => {
    const updated = servers.filter((_, i) => i !== index);
    localStorage.setItem('servers', JSON.stringify(updated));
    return updated;
  };

  const renameServer = (servers, index, newName) => {
    if (!newName.trim()) {
      throw new Error('Please enter a server name');
    }

    if (servers.some((server, i) => i !== index && server.name === newName)) {
      throw new Error('Server name already exists');
    }
    
    const updated = servers.map((server, i) => 
      i === index ? { ...server, name: newName } : server
    );
    localStorage.setItem('servers', JSON.stringify(updated));
    return updated;
  };

  const checkServerStatus = async (serverUrl) => {
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
        return { status: 'online', ping };
      } else {
        return { status: 'error', ping: null };
      }
    } catch (error) {
      return { status: 'offline', ping: null };
    }
  };

  return {
    loadServers,
    saveServer,
    deleteServer,
    renameServer,
    checkServerStatus
  };
};
