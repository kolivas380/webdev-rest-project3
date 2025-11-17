import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8000;

let app = express();
app.use(express.json());

/********************************************************************
 ***   DATABASE FUNCTIONS                                         *** 
 ********************************************************************/
// Open SQLite3 database (in read-write mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Create Promise for SQLite3 database SELECT query 
function dbSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}

// Create Promise for SQLite3 database INSERT or DELETE query
function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

/********************************************************************
 ***   REST REQUEST HANDLERS                                      *** 
 ********************************************************************/
// GET request handler for crime codes
app.get('/codes', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    let sql = `SELECT code, incident_type AS type FROM Codes`;
    var codes = [];

    if('code' in req.query){
        codes = req.query.code.split(",").map(s => parseInt(s, 10));
        sql += ` WHERE code IN (${codes.map(() => "?").join(", ")})`;
    }

    sql += ' ORDER BY code desc';
    
    db.all(sql, codes, (err, rows) => {
    if (err) {
      res.status(500).type('txt').send('SQL Error');
    }
    else {
        res.status(200).type('json').send(JSON.stringify({ rows }, null, 4));
        }
    });
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    let sql = 'SELECT neighborhood_number AS id, neighborhood_name AS name FROM Neighborhoods'
    var ids = [];

    // If id param used
    if('id' in req.query){
        ids = req.query.id.split(",").map(s => parseInt(s, 10)); //converting string to int list
        const placeholders = ids.map(() => "?").join(", ");
        sql += ` WHERE neighborhood_number IN (${placeholders})`;
    }

    sql += ' ORDER BY neighborhood_number ASC'; //Ordered

    db.all(sql, ids, (err, rows) => {
        if (err) {
        res.status(500).type('txt').send('SQL Error');
        }
        else {
            res.status(200).type('json').send(JSON.stringify({ rows }, null, 4)); 
        }
    });

});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    
    res.status(200).type('json').send({}); // <-- you will need to change this
});


// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data
    const {
        case_number,
        date_time,
        code,
        incident,
        police_grid,
        neighborhood_number,
        block
    } = req.body;

    let sql = `SELECT case_number FROM Incidents
                            WHERE case_number = ?`
    db.all(sql, [case_number], (err, rows) => {
    if (err) {
      res.status(500).type('txt').send('SQL Error');
    }
    else {
        if (rows.length > 0) { 
            res.status(500).type('txt').send('error: ID already exists');
        } 
            else {
                let incident_data = dbRun(`INSERT INTO Incidents
                                (case_number, date_time, code, 
                                incident, police_grid, neighborhood_number, block)
                                VALUES(?,?,?,?,?,?,?)`,
                                [case_number, date_time, code, 
                                incident, police_grid, neighborhood_number, block]);
                res.status(200).type('txt').send('success');
            }
        }
    });
});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    console.log(req.body); // uploaded data
    const case_number = req.query.case_number;

    let sql = `SELECT case_number FROM Incidents
                            WHERE case_number = ?`
    db.all(sql, [case_number], (err, rows) => {
    if (err) {
      res.status(500).type('txt').send('SQL Error');
    }
    else {
        if (rows.length === 0) { 
            let incident_data = dbRun(`DELETE FROM Incidents
                                WHERE case_number = ?`,
                                [case_number]);
                res.status(200).type('txt').send('success');
        } 
            else {
                res.status(500).type('txt').send('error: Case number does not exist');
            
            }
        }
    });
});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
