const authHelper = require('../helpers/auth');

const models = require('../models');
const User = models.User;
const Board = models.Board;
const Column = models.Column;

const isColumnTracked = (columnId, board) => {
  return board.Columns.map(col => col.id).includes(columnId);
};

const handleMovedColumn = function (gloBoard, card, user) {
  user.getBoards({
    where: { id: gloBoard.id },
    include: { model: Column }
  }).then(([kragglBoard]) => {
    if (kragglBoard) {
      if (isColumnTracked(card.column_id, kragglBoard))  {
        // Case: Column is tracked
        return user.startTimerForCard(card, kragglBoard.togglProjectId)
          .then(timeEntry => console.log(`Started Time Entry with ID: ${ timeEntry.id }`))
      } else {
        // Case: Column is not tracked
        return user.getCurrentTimeEntry()
          .then(timeEntry => {
            if (timeEntry && timeEntry.tags.includes(card.id)) {
              return user.stopTimeEntry(timeEntry.id)
            }
          })
          .then(stoppedTimeEntry => {
            if (stoppedTimeEntry) console.log(`Stopped Time Entry with ID: ${ stoppedTimeEntry.id }`);
            else console.log('No timer running for this card');
          })
      }
    }
  }).catch(error => {
    console.log(error);
  });
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