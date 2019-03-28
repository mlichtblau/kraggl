const CLIENT_ID = process.env.GIT_KRAKEN_CLIENT_ID;
const CLIENT_SECRET = process.env.GIT_KRAKEN_CLIENT_SECRET;
const SCOPES = ['board:write', 'user:read'];

const models = require('../models');
const User = models.User;

const GloBoardApi = require('glo-board-api-node');
const getGloBoardApi = (accessToken) => {
  const api = new GloBoardApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
  api.setAccessToken(accessToken);
  return api;
};

const login = function (req, res, next) {
  const gloBoardApi = getGloBoardApi();
  const authorizeUrl = gloBoardApi.createAuthorizeURL(SCOPES, 'blubber');
  res.redirect(authorizeUrl);
};

const gitKrakenCallback = function (req, res, next) {
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
                return res.redirect('/toggl');
              });
            })
            .catch(err => { return next(err) });
        })
    })
    .catch(error => {
      // TODO: Handle error
    })
};

const logout = function (req, res, next) {
  req.logout();
  res.redirect('/');
};

module.exports = {
  login,
  gitKrakenCallback,
  logout
};