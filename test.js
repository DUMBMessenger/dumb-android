import { ChatClient } from 'dumb_api_js';

async function testServer() {
  const serverUrl = 'http://localhost:3000'; //change ip to your wanted
  
  try {
    console.log('Testing server connection...');
    
    const ping = await fetch(`${serverUrl}/api/ping`);
    console.log('Ping status:', ping.status);
    
    const client = new ChatClient({ serverUrl });
    console.log('Client created successfully');
    
    const channels = await client.getChannels();
    console.log('Public channels:', channels);
    
    console.log('✅ Server is working correctly');
    
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
  }
}

testServer();
