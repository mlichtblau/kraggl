const models = require('../models');
const Board = models.Board;
const Column = models.Column;

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
    Board.findByPk(boardId, {
      include: {
        model: Column,
      }
    }),
    gloBoardApi.getCardsOfBoard(boardId, {
      fields: ['name', 'assignees', 'description', 'labels', 'column_id']
    })])
    .then(([gloBoardData, kragglBoard, cardsData]) => {
      const gloBoard = gloBoardData.body;
      board = kragglBoard ? { ...gloBoard, ...kragglBoard.dataValues } : gloBoard;
      cards = cardsData.body;

      if (board.Columns) {
        board.selectedColumns = board.Columns.map(col => col.dataValues);
      }

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
  // const trackedColumns = formData.trackedColumns;
  const trackedColumns = ['5ba25f2c8586640e0055a455'];
  const chatbotEnabled = !!formData.chatbotEnabled;
  Board.findByPk(boardId, {
    include: [{
      model: Column
    }]
  })
    .then(board => {
      if (board) {
        board.update({
          trackingEnabled,
          togglProjectId,
          chatbotEnabled
        });
        let columns = board.Columns.slice();
        let $newColumns = [];
        trackedColumns.forEach(trackedColumnId => {
          const index = columns.findIndex(col => {
            return col.id === trackedColumnId;
          });
          if (index > -1) {
            columns.splice(index, 1);
          } else {
            $newColumns.push(Column.create({
              id: trackedColumnId,
              boardId: board.id
            }));
          }
        });
        const $deletedColumns = columns.map(column => column.destroy());
        return Promise.all([...$newColumns, ...$deletedColumns])
          .then(_ => board.update());
      } else {
        return Board.create({
          id: boardId,
          trackingEnabled,
          togglProjectId,
          chatbotEnabled,
          userId: user.id
        }).then(board => {
          $columns = trackedColumns.map(columnId => {
            return Column.create({
              id: columnId,
              boardId: board.id
            });
          });
          return Promise.all($columns).then(columns => board.update());
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