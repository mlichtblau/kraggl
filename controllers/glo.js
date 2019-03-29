const authHelper = require('../helpers/auth');

const models = require('../models');
const User = models.User;
const Board = models.Board;
const Column = models.Column;

const handleMovedColumn = function (gloBoard, card, user) {
  user.getBoards({
    where: {
      id: gloBoard.id
    },
    include: {
      model: Column
    }
  })
    .then(kragglBoards => {
      if (kragglBoards && kragglBoards[0]) {
        let kragglBoard = kragglBoards[0];
        if (kragglBoard.Columns.map(col => col.id).includes(card.column_id)) {
          user.togglClient.startTimeEntry({
            pid: kragglBoard.togglProjectId,
            description: card.name,
            tags: ['Kraggl'],
            created_with: 'Kraggl'
          }, (error, timeEntry) => {
            console.log(timeEntry);
          });
          console.log('Column is tracked!');
        } else {
          console.log('Column is not tracked!');
        }
      }
    })
    .catch(error => {
      console.log(error);
    });
  console.log(`Moved card: ${ card.name } to column with id: ${ card.column_id }`);
};

const handleCardEvent = function ({ action, board, card, sequence }, user) {
  switch (action) {
    case 'added':
    case 'updated':
    case 'copied':
    case 'archived':
    case 'unarchived':
    case 'deleted':
    case 'reordered':
    case 'moved_column':
      handleMovedColumn(board, card, user);
      break;
    case 'moved_to_board':
    case 'moved_from_board':
    case 'labels_updated':
    case 'assignees_updated':
    default:
  }
};

const hook = function (req, res, next) {
  const eventType = req.header('x-gk-event');
  const eventPayload = req.body;

  authHelper.deserializeUser(eventPayload.sender.id, (error, user) => {
    if (error) return next(error);
    if (user) {
      switch (eventType) {
        case 'cards':
          handleCardEvent(req.body, user);
        case 'boards':
        case 'column':
        case 'comments':
        default:
      }
    }
    res.end();
  });
};

module.exports = {
  hook
};