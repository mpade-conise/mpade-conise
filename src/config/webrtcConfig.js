// This word 'export' is mandatory!
export const webrtcConfig = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:standard.metered.ca:443',
      username: '28087eceaa61e6de7d551200',
      credential: 'KW6Vsm7ZTUwjjDWn',
    },
  ],
  iceTransportPolicy: 'relay',
  iceCandidatePoolSize: 10,
};
