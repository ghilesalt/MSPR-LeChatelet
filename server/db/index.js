const sqlite3 = require("sqlite3").verbose();

function connectDB() {
  let db = new sqlite3.Database("./db/data.db", (err) => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
    console.log(
      "Connected to the in-memory SQlite database. see in db/data.db"
    );
    generateTables(db);
  });

  return db;
}

function generateTables(db) {
  try {
    db.run(
      "CREATE TABLE IF NOT EXISTS user(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, secret TEXT, uri TEXT, qr TEXT)",
      (res, err) => {
        if (err) {
          console.log(err);
        }
      }
    );
  } catch (err) {
    console.log(err);
  }
}

function closeDB(db) {
  if (!db) return;

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Close the database connection.");
  });
}

module.exports = {
  connectDB,
  closeDB,
};
