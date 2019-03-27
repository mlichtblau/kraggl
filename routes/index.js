const CLIENT_ID = process.env.GIT_KRAKEN_CLIENT_ID;
const CLIENT_SECRET = process.env.GIT_KRAKEN_CLIENT_SECRET;
const SCOPES = ['board:write', 'user:read'];

var express = require('express');
var router = express.Router();
var GloBoardApi = require('glo-board-api-node');

const models = require('../models');
const User = models.User;

const gloBoardApi = new GloBoardApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });

/* home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

/* Redirect to GitKraken */
router.get('/login', function (req, res, next) {
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

/* Display user profile */
router.get('/me', function (req, res, next) {
  res.json(req.user);
});

module.exports = router;
