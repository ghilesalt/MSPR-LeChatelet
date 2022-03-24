async function getUserById(db, id) {
  return new Promise((resolve, reject) => {
    let sql = `SELECT *
           FROM user
           WHERE id = ?`;

    db.get(sql, [id], (err, row) => {
      if (err) {
        console.error(err.message);
        resolve(null);
      }
      resolve(row);
    });
  });
}

async function getUserByName(db, name) {
  return new Promise((resolve, reject) => {
    let sql = `SELECT *
           FROM user
           WHERE name = ?`;

    db.get(sql, [name], (err, row) => {
      if (err) {
        console.error(err.message);
        resolve(null);
      }
      resolve(row);
    });
  });
}

async function saveUser(db, data) {
  let sql = "INSERT INTO user(name, secret, uri, qr) VALUES (?, ?, ?, ?)";

  db.run(sql, [data.name, data.secret, data.uri, data.qr], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
  });
  return getUserByName(db, data.name);
}

module.exports = {
  getUserById,
  getUserByName,
  saveUser,
};

