'use strict';
module.exports = (sequelize, DataTypes) => {
  const Board = sequelize.define('Board', {
    id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    trackingEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    togglProjectId: DataTypes.INTEGER,
    chatbotEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    userId: {
      type: DataTypes.STRING,
      primaryKey: true,
    }
  }, {});

  Board.associate = function(models) {
    // associations can be defined here
    Board.belongsTo(models.User, {
      foreignKey: 'userId'
    });
    Board.hasMany(models.Column, {
      foreignKey: 'boardId'
    })
  };

  /* Instance Methods */

  Board.prototype.updateBoard = function ({togglProjectId, trackingEnabled, chatbotEnabled, trackedColumnIds}) {
    return this.update({ trackingEnabled, togglProjectId, chatbotEnabled }, { returning: true })
      .then(board => {
        let existingColumnIds = board.Columns.map(Col => Col.id);
        let createColumns = trackedColumnIds.filter(columnId => !existingColumnIds.includes(columnId));
        let deleteColumns = board.Columns.filter(column => !trackedColumnIds.includes(column.id));

        const $createdColumns = Promise.all(createColumns.map(columnId => {
          return sequelize.models.Column.create({ id: columnId, boardId: board.id });
        }));

        const $deletedColumns = Promise.all(deleteColumns.map(column => {
          return column.destroy();
        }));

        return Promise.all([$createdColumns, $deletedColumns])
          .then(() => board.reload());
      })
  };

  Board.prototype.getTrackedColumns = function () {
    return this.Columns ? this.Columns.map(col => col.id) : [];
  };

  return Board;
};