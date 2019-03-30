const models = require('../models');
const User = models.User;

const serializeUser = function (user, done) {
  done(null, user.id);
};

const deserializeUser = function (id, done) {
  User.findByPk(id)
    .then(user => { done(null, user); })
    .catch(error => { done(error, null); });
};

module.exports = {
  serializeUser,
  deserializeUser
};