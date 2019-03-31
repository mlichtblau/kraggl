const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth');
const togglController = require('../controllers/toggl');
const boardController = require('../controllers/board');
const gloController = require('../controllers/glo');

const requireLogIn = function (req, res, next) {
  if (!req.user) return res.redirect('/login');
  else next();
};

const requireTogglKey = function (req, res, next) {
  if (!req.user.togglApiKey) return res.redirect('/toggl');
  else next();
};

/* home page. */
router.get('/',
  (req, res, next) => {
    if (req.user) {
      if (req.user.togglApiKey) {
        return res.redirect('/boards')
      } else {
        return res.redirect('/toggl')
      }
    } else {
      next();
    }
  },
  (req, res, next) => {
    res.render('index');
  }
);

/* Redirect to GitKraken */
router.get('/login', authController.login);

/* Callback from GitKraken */
router.get('/callback/oauth', authController.gitKrakenCallback);

/* Logout user */
router.post('/logout', authController.logout);

/* let the user enter his Toggl API key */
router.get('/toggl',
  requireLogIn,
  togglController.toggl
);

/* save the Toggl API key */
router.post('/toggl', requireLogIn, togglController.saveTogglApiKey);

/* display the users boards */
router.get('/boards', requireLogIn, requireTogglKey, boardController.boards);

/* display a board */
router.get('/boards/:boardId', requireLogIn, requireTogglKey, boardController.board);

/* update board preferences */
router.post('/boards/:boardId', requireLogIn, requireTogglKey, boardController.saveBoard);

/* provide glo board hook */
router.post('/glo/hook', gloController.hook);

module.exports = router;
