const CLIENT_ID = process.env.GIT_KRAKEN_CLIENT_ID;
const CLIENT_SECRET = process.env.GIT_KRAKEN_CLIENT_SECRET;
const SCOPES = ['board:write', 'user:read'];

var express = require('express');
var router = express.Router();
var GloBoardApi = require('glo-board-api-node');
var request = require('request-promise-native');


const getGloBoardApi = (accessToken) => {
  const api = new GloBoardApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
  api.setAccessToken(accessToken);
  return api;
};

const models = require('../models');
const User = models.User;

/* home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

/* Redirect to GitKraken */
router.get('/login', function (req, res, next) {
  const gloBoardApi = getGloBoardApi();
  const authorizeUrl = gloBoardApi.createAuthorizeURL(SCOPES, 'blubber');
  res.redirect(authorizeUrl);
});

/* Callback from GitKraken */
router.get('/callback/oauth', function (req, res, next) {
  const code = req.query.code || null;
  if (code === null) {
    res.status(400).send('Code missing');
    return;
  }
  const gloBoardApi = getGloBoardApi();
  gloBoardApi.authorizationCodeGrant(code)
    .then(data => {
      const accessToken = data.body['access_token'];
      gloBoardApi.setAccessToken(accessToken);
      gloBoardApi.getUser({ fields: ['id', 'name', 'username'] })
        .then(data => {
          const user = data.body;
          User.findByPk(user.id)
            .then(existingUser => {
              if (!existingUser) {
                return User.create({
                  id: user.id,
                  name: user.name,
                  username: user.username,
                  gitKrakenAccessToken: accessToken
                });
              } else {
                return existingUser;
              }
            })
            .then(newUser => {
              req.login(newUser, function (err) {
                if (err) { return next(err); }
                return res.redirect('/me');
              });
            })
            .catch(err => { return next(err) });
        })
    })
    .catch(error => {
      // TODO: Handle error
    })
});

/* Logout user */
router.get('/logout', function (req, res, next) {
  req.logout();
  res.redirect('/');
});

/* let the user save his Toggl API key */
router.get('/toggl', function (req, res, next) {
  const user = req.user;
  res.send('')
});

router.post('/toggl', function (req, res, next) {
  const user = req.user;
  const togglApiKey = req.body.togglApiKey;
  request({
    uri: 'https://www.toggl.com/api/v8/me',
    json: true,
    auth: {
      username: togglApiKey,
      password: 'api_token'
    }
  }).then(data => {
    const togglUser = data.data;
    user.togglApiKey = togglApiKey;
    return user.save();
  }).then(user => {
    res.send('blubber');
  }).catch(error => {
    if (error.statusCode === 403) {
      // Wrong API Key
      // TODO: Handle
    } else {
      next(error);
    }
  });
  // user.save();
});

/* Display user profile */
router.get('/me', function (req, res, next) {
  res.json(req.user);
});

router.get('/boards', function (req, res, next) {
  const user = req.user;
  const gloBoardApi = getGloBoardApi(req.user.gitKrakenAccessToken);
  gloBoardApi.getBoards({
    fields: ['name', 'columns', 'created_by', 'members']
  }).then(boards => {
    console.log(boards);
    res.render('pages/boards', {
      user,
      boards
    })
  });
});

module.exports = router;
