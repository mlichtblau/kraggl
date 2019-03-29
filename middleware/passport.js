const passport = require('passport');
const GloBoardApi = require('glo-board-api-node');
const TogglClient = require('toggl-api');

const CLIENT_ID = process.env.GIT_KRAKEN_CLIENT_ID;
const CLIENT_SECRET = process.env.GIT_KRAKEN_CLIENT_SECRET;

const getGloBoardApi = (accessToken) => {
  const api = new GloBoardApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
  api.setAccessToken(accessToken);
  return api;
};

const models = require('../models');
const User = models.User;

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findByPk(id)
    .then(user => {
      user.gloBoardApi = getGloBoardApi(user.gitKrakenAccessToken);
      if (user.togglApiKey) {
        user.togglClient = new TogglClient({ apiToken: user.togglApiKey });
      }
      done(null, user);
    })
    .catch(error => {
      done(error, null);
    });
});

module.exports = passport;