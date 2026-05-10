// config/webrtcConfig.js
export const webrtcConfig = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
    {
      urls: 'turn:standard.metered.ca:443', 
      username: '28087eceaa61e6de7d551200', 
      credential: 'KW6Vsm7ZTUwjjDWn', 
    },
  ],
  // CRITICAL: Forces the connection to use the TURN relay
  // This is what bypasses the strict mobile network 'walls'
  iceTransportPolicy: 'relay', 
  iceCandidatePoolSize: 10,
};
