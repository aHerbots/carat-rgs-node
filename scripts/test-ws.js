import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('Connected to Gateway WebSocket');
  
  const spinRequest = {
    action: 'SPIN',
    payload: {
      playerId: 'test-player-123',
      gameId: 'slot-96-profile',
      betAmount: 100
    }
  };
  
  console.log('Sending spin request:', spinRequest);
  ws.send(JSON.stringify(spinRequest));
});

ws.on('message', (data) => {
  console.log('Received from Gateway:', data.toString());
  
  const response = JSON.parse(data.toString());
  if (response.type === 'SPIN_RESULT') {
    console.log('Spin successful! Result:', response.payload);
    ws.close();
  } else if (response.type === 'ERROR') {
    console.error('Spin failed:', response.error);
    ws.close();
  }
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});

ws.on('close', () => {
  console.log('Disconnected from Gateway WebSocket');
});
