export const useChannels = () => {
  const loadChannels = async (client) => {
    const response = await client.getChannels();
    
    let channelsArray = response;
    if (response && !Array.isArray(response)) {
      if (response.channels && Array.isArray(response.channels)) {
        channelsArray = response.channels;
      } else if (response.data && Array.isArray(response.data)) {
        channelsArray = response.data;
      } else if (response.success && Array.isArray(response.channels)) {
        channelsArray = response.channels;
      } else {
        channelsArray = Object.values(response);
      }
    }
    
    return Array.isArray(channelsArray) ? channelsArray : [];
  };

  const searchChannels = async (client, query = '') => {
    const response = await client.searchChannels(query);
    
    let channelsArray = [];
    if (response && response.success && response.channels) {
      channelsArray = response.channels;
    } else if (Array.isArray(response)) {
      channelsArray = response;
    }
    
    return channelsArray;
  };

  const joinChannel = async (client, channelId) => {
    return await client.joinChannel(channelId);
  };

  const createChannel = async (client, channelName) => {
    return await client.createChannel(channelName.trim());
  };

  const filterChannels = (channels, query) => {
    if (!query.trim()) return channels;
    
    return channels.filter(channel => 
      channel.name?.toLowerCase().includes(query.toLowerCase()) ||
      channel.id?.toString().includes(query) ||
      channel.description?.toLowerCase().includes(query.toLowerCase())
    );
  };

  const checkChannelMembership = (userChannels, channel) => {
    return userChannels.some(c => c.id === channel.id || c.name === channel.name);
  };

  return {
    loadChannels,
    searchChannels,
    joinChannel,
    createChannel,
    filterChannels,
    checkChannelMembership
  };
};
