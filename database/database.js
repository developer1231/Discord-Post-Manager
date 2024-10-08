const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");

function isMoreThanFourMonthsAgo(timestamp) {
  // Get the current date in milliseconds
  const currentTime = Date.now();

  // Calculate the difference in milliseconds
  const differenceInMilliseconds = timestamp - currentTime;

  // Convert the difference to months
  const millisecondsInOneMonth = 1000 * 60 * 60 * 24 * 30; // Approximation: 30 days in a month
  const differenceInMonths = differenceInMilliseconds / millisecondsInOneMonth;
  console.log(differenceInMonths)
  // Check if the difference is greater than 4 months
  return differenceInMonths > 4;
}

function makeid(length) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function getCurrentDateTime() {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year}, ${hours}:${minutes}`;
}

function execute(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, function (err, rows) {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

async function Initialization() {
  try {
    await run(`CREATE TABLE IF NOT EXISTS posts (
      member_id TEXT PRIMARY KEY ,
      timestamp TIMESTAMP NOT NULL,
      message_id TEXT NOT NULL
      )`)
   
    console.log("created table posts");
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

module.exports = { makeid, execute, run, Initialization, getCurrentDateTime, isMoreThanFourMonthsAgo };
