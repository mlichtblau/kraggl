const models = require('../models');
const User = models.User;

const handleMovedColumn = function (board, card, user) {
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

  User.findByPk(eventPayload.sender.id)
    .then(user => {
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
    })
    .catch(error => {
      next(error);
    });
};

module.exports = {
  hook
};