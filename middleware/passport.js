var passport = require('passport');

const models = require('../models');
const User = models.User;

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findByPk(id)
    .then(user => {
      console.log('user' + user);
      done(null, user);
    })
    .catch(error => {
      done(error, null);
    });
});

module.exports = passport;