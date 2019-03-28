const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth');
const togglController = require('../controllers/toggl');
const boardController = require('../controllers/board');

/* home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

/* Redirect to GitKraken */
router.get('/login', authController.login);

/* Callback from GitKraken */
router.get('/callback/oauth', authController.gitKrakenCallback);

/* Logout user */
router.get('/logout', authController.logout);

/* let the user enter his Toggl API key */
router.get('/toggl', togglController.toggl);

/* save the Toggl API key */
router.post('/toggl', togglController.saveTogglApiKey);

/* display the users boards */
router.get('/boards', boardController.boards);

/* display a board */
router.get('/boards/:boardId', boardController.board);

/* update board preferences */
router.post('/boards/:boardId', boardController.saveBoard);

module.exports = router;
