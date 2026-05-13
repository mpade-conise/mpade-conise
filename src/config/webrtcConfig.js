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
      // THIS SECTION IS THE FIX FOR MOBILE DATA
      urls: 'turn:your-metered-domain.metered.ca:443', 
      username: 'your-unique-username',
      credential: 'your-unique-password',
    },
  ],
  iceCandidatePoolSize: 10,
};