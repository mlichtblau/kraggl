var passport = require('passport');

passport.serializeUser(function(user, done) {
  console.log('Serialize User');
  console.log(user);
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  console.log('Desirialize User');
  console.log(id);
  done(null, { id, username: 'test' });
});

module.exports = passport;