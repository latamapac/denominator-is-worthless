// Database models index - switches between MongoDB and FileDB
const mongoose = require('mongoose');

// Check if MongoDB is connected
const isMongoConnected = () => mongoose.connection.readyState === 1;

// Get the appropriate model
function getModels() {
    if (isMongoConnected()) {
        // Use MongoDB models
        return {
            User: require('./User'),
            Barter: require('./Barter'),
            TradeHistory: require('./TradeHistory'),
            dbType: 'mongodb'
        };
    } else {
        // Use FileDB models
        const fileDB = require('../utils/fileDB');
        return {
            User: fileDB.users,
            Barter: fileDB.barters,
            TradeHistory: { countDocuments: async () => 0 },
            dbType: 'file'
        };
    }
}

module.exports = { getModels, isMongoConnected };
