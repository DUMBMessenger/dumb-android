export const useAuth = () => {
  const login = async (serverUrl, username, password) => {
    const { ChatClient } = await import('dumb_api_js');
    const client = new ChatClient({ serverUrl });
    return await client.login(username, password);
  };

  const register = async (serverUrl, username, password) => {
    const { ChatClient } = await import('dumb_api_js');
    const client = new ChatClient({ serverUrl });
    return await client.register(username, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  const getCurrentUser = () => {
    return localStorage.getItem('username');
  };

  return {
    login,
    register,
    logout,
    isAuthenticated,
    getCurrentUser
  };
};
