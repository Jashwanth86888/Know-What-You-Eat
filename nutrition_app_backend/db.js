const oracledb = require('oracledb');

const dbConfig = {
    user: "nutrition_app",
    password: "pass123",
    connectString: "localhost:1521/XEPDB1"
};

async function connectDB() {
    return await oracledb.getConnection(dbConfig);
}

module.exports = connectDB;
