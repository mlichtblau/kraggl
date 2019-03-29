'use strict';
module.exports = (sequelize, DataTypes) => {
  const Column = sequelize.define('Column', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.STRING
    },
    boardId: {
      allowNull: false,
      type: DataTypes.STRING
    },
  }, {});
  Column.associate = function(models) {
    // associations can be defined here
    Column.belongsTo(models.Board, {
      foreignKey: 'boardId'
    })
  };
  return Column;
};