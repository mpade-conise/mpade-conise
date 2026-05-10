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
      // These are the real details from your Metered table
      urls: 'turn:standard.metered.ca:443', 
      username: '28087eceaa61e6de7d551200', 
      credential: 'KW6Vsm7ZTUwjjDWn', 
    },
  ],
  iceCandidatePoolSize: 10,
};
