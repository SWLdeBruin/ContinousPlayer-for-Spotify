const axios = require('axios');

const getCurrentlyPlaying = async (accessToken) => {
  const options = {
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  };

  const result = await axios.get(options.url, {
    headers: options.headers
  });

  return result.data;
};

const getAvailableDevices = async (accessToken) => {
  const options = {
    url: 'https://api.spotify.com/v1/me/player/devices',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  };

  const result = await axios.get(options.url, {
    headers: options.headers
  });

  return result.data;
};

const switchToDevice = async (accessToken, deviceId) => {
  const options = {
    url: 'https://api.spotify.com/v1/me/player',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    data: {
      device_ids: [deviceId],
      play: true
    }
  };

  const result = await axios.put(options.url, options.data, {
    headers: options.headers
  });

  return result.data;
};

const refreshAccessToken = async (refreshToken, applicationIdentification) => {
  const options = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from(applicationIdentification.clientId + ':' + applicationIdentification.clientSecret).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }
  };

  const result = await axios.post(options.url, options.data, {
    headers: options.headers
  });

  return result.data;
};

module.exports = { getAvailableDevices, refreshAccessToken, getCurrentlyPlaying, switchToDevice };