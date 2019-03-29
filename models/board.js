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
  return Board;
};