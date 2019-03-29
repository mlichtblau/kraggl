const models = require('../models');
const Board = models.Board;

const boards = function (req, res, next) {
  const user = req.user;
  const gloBoardApi = user.gloBoardApi;
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
    res.render('pages/boards', {
      user,
      boards: mergedBoards
    })
  });
};

const board = function (req, res, next) {
  const user = req.user;
  let board;
  let cards;
  const boardId = req.params.boardId;
  const gloBoardApi = user.gloBoardApi;

  const getProjectsForWorkspace = (workspace) => {
    return new Promise(function (resolve, reject) {
      user.togglClient.getWorkspaceProjects(workspace.id, {}, function (error, projects) {
        if (error) reject(error);
        resolve({
          id: workspace.id,
          name: workspace.name,
          projects
        })
      })
    });
  };

  Promise.all([
    gloBoardApi.getBoard(boardId, {
      fields: ['name', 'columns', 'members']
    }),
    Board.findByPk(boardId),
    gloBoardApi.getCardsOfBoard(boardId, {
      fields: ['name', 'assignees', 'description', 'labels', 'column_id']
    })])
    .then(([gloBoardData, kragglBoard, cardsData]) => {
      const gloBoard = gloBoardData.body;
      board = kragglBoard ? { ...gloBoard, ...kragglBoard.dataValues } : gloBoard;
      cards = cardsData.body;

      return new Promise(function (resolve, reject) {
        user.togglClient.getWorkspaces((error, workspaces) => {
          if (error) reject(error);
          resolve(workspaces);
        });
      });
    })
    .then(workspaces => Promise.all(workspaces.map(workspace => getProjectsForWorkspace(workspace))))
    .then(workspacesWithProjects => res.render('pages/board.ejs', {
        cards,
        board,
        workspaces: workspacesWithProjects
      }))
    .catch(error => {
      next(error);
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