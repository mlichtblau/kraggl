const request = require('request-promise-native');

const toggl = function (req, res, next) {
  const user = req.user;
  res.render('pages/toggl.ejs', { user });
};

const saveTogglApiKey = function (req, res, next) {
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
    res.redirect('/boards');
  }).catch(error => {
    if (error.statusCode === 403) {
      // Wrong API Key
      // TODO: Handle
    } else {
      next(error);
    }
  });
  // user.save();
};

module.exports = {
  toggl,
  saveTogglApiKey
};