const CLIENT_ID = process.env.GIT_KRAKEN_CLIENT_ID;
const CLIENT_SECRET = process.env.GIT_KRAKEN_CLIENT_SECRET;
const SCOPES = ['board:write', 'user:read'];

var express = require('express');
var router = express.Router();
var GloBoardApi = require('glo-board-api-node');

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
      return gloBoardApi.getUser();
    })
    .then(data => {
      const user = data.body;
      console.log(user);
      req.login(user, function (err) {
        if (err) { return next(err); }
        return res.redirect('/me');
      });
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
  res.json(req.session);
});

module.exports = router;
