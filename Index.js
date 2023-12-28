const axios = require('axios');
const express = require('express');
const querystring = require('querystring');
const { generateRandomString } = require("./features/GenerateRandomString");
const { getAvailableDevices, refreshAccessToken, getCurrentlyPlaying, switchToDevice } = require("./features/SpotifyPlayer");
const app = express();
const port = 3000;
require('dotenv').config();

const redirectUri = 'http://localhost:3000/redirect';
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const standbyDeviceId = process.env.STAND_BY_DEVICE;

let tokenData;

let timeComponent;

app.get('/login', function(req, res) {
  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email user-read-currently-playing user-read-playback-state user-modify-playback-state';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: clientId,
      client_secret: clientSecret,
      scope: scope,
      redirect_uri: redirectUri,
      state: state
    })
  );
});

app.get('/redirect', (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;

  if (state === null) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (new Buffer.from(clientId + ':' + clientSecret).toString('base64'))
      }
    };

    axios.post(authOptions.url, authOptions.data, {
      headers: authOptions.headers
    }).then(response => {
      tokenData = response.data;

      res.redirect('/loggedin');
    }).catch(error => {
      res.redirect('/failed');
    });
  }
});

app.get('/loggedin', async (req, res) => {
  console.log(await getAvailableDevices(tokenData.access_token));
  setCorrectDevice().catch(async () => {
    console.log('User is not logged in, refreshing tokens', new Date().toLocaleString());
    
    refreshTokenAndSetCorrectDevice();
  });
  timeComponent = setInterval(async () => {
    setCorrectDevice().catch(async () => {
      console.log('User is not logged in, refreshing tokens', new Date().toLocaleString());
      
      refreshTokenAndSetCorrectDevice();
    });
  }, 300000);

  res.send('You are logged in');
});

app.get('/failed', (req, res) => {
  res.send('We failed to log you in');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



const setCorrectDevice = async () => {
  console.log('Checking if user is listening to music', new Date().toLocaleString());
  const currentlyPlaying = await getCurrentlyPlaying(tokenData.access_token);

  if (currentlyPlaying.is_playing) {
    console.log('User is listening to music');
    return;
  }
  else {
    console.log('User is not listening to music, switching to standby device');
    await switchToDevice(tokenData.access_token, standbyDeviceId);
  }
};

const refreshTokenAndSetCorrectDevice = async () => {
  console.log('Refreshing tokens', tokenData, new Date().toLocaleString());
  let retryCount = 0;
  const maxRetries = 10;

  const refreshTokens = async () => {
    try {
      const newTokens = await refreshAccessToken(tokenData.refresh_token, { clientId, clientSecret });
      tokenData.access_token = newTokens.access_token;
      setCorrectDevice();
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      retryCount++;
      if (retryCount <= maxRetries) {
        console.log(`Retrying refresh tokens, attempt ${retryCount}`);
        await refreshTokens();
      } else {
        console.error(`Max retry count reached (${maxRetries}), stopping the program.`);
        process.exit(1);
      }
    }
  };

  await refreshTokens();
};