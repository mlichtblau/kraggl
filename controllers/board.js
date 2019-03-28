const CLIENT_ID = process.env.GIT_KRAKEN_CLIENT_ID;
const CLIENT_SECRET = process.env.GIT_KRAKEN_CLIENT_SECRET;

const GloBoardApi = require('glo-board-api-node');
const getGloBoardApi = (accessToken) => {
  const api = new GloBoardApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
  api.setAccessToken(accessToken);
  return api;
};

const models = require('../models');
const Board = models.Board;

const boards = function (req, res, next) {
  const user = req.user;
  const gloBoardApi = getGloBoardApi(req.user.gitKrakenAccessToken);
  Promise.all([
    gloBoardApi.getBoards({
      fields: ['name', 'columns', 'created_by', 'members']
    }),
    Board.findAll({
      where: {
        userId: user.id
      }
    })
  ]).then(([gloBoardData, kragglBoards]) => {
    const gloBoards = gloBoardData.body;
    const mergedBoards = gloBoards.map(gloBoard => {
      const kragglBoard = kragglBoards.find(kragglBoard => kragglBoard.id === gloBoard.id);
      if (!kragglBoard) return gloBoard;
      else return {...gloBoard, ...kragglBoard.dataValues };
    });
    console.log(mergedBoards);
    res.render('pages/boards', {
      user,
      boards: mergedBoards
    })
  });
};

const board = function (req, res, next) {
  const user = req.user;
  const boardId = req.params.boardId;
  const gloBoardApi = getGloBoardApi(req.user.gitKrakenAccessToken);
  Promise.all([
    gloBoardApi.getBoard(boardId, {
      fields: ['name', 'columns', 'members']
    }),
    gloBoardApi.getCardsOfBoard(boardId, {
      fields: ['name', 'assignees', 'description', 'labels', 'column_id']
    })])
    .then(([boardData, cardsData]) => {
      const board = boardData.body;
      const cards = cardsData.body;
      res.render('pages/board.ejs', {
        cards,
        board
      })
    })
    .catch(error => {
      console.log(error);
    })
};

const saveBoard = function (req, res, next) {
  const user = req.user;
  const boardId = req.params.boardId;
  const formData = req.body;
  const trackingEnabled = !!formData.trackingEnabled;
  const togglProjectId = formData.togglProjectId;
  const chatbotEnabled = !!formData.chatbotEnabled;
  Board.findByPk(boardId)
    .then(board => {
      if (board) {
        return board.update({
          trackingEnabled,
          togglProjectId,
          chatbotEnabled
        });
      } else {
        return Board.create({
          id: boardId,
          trackingEnabled,
          togglProjectId,
          chatbotEnabled,
          userId: user.id
        })
      }
    })
    .then(newBoard => {
      res.json(newBoard);
      //res.redirect('/boards/' + newBoard.id);
    })
    .catch(error => {
      console.log(error);
      // TODO: Handle error
    });
};

module.exports = {
  boards,
  board,
  saveBoard
};