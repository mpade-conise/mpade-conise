// netlify/functions/spotify-search.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { query } = event.queryStringParameters;
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  // 1. Get Access Token
  const authRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  const { access_token } = await authRes.json();

  // 2. Search Spotify
  const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=10`, {
    headers: { 'Authorization': `Bearer ${access_token}` }
  });
  const data = await searchRes.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data.tracks.items)
  };
};