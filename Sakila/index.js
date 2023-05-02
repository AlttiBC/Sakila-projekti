const express = require('express');
const dbconfig = require('./config.json');
const mariadb = require('mariadb');
const path = require('path');
const app = express();

app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, '/public/sivupohjat'));

app.get('/', async (req, res) => {
    const connection = await mariadb.createConnection(dbconfig);

    const elokuvat = await connection.query(`
    SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating 
    FROM film
    INNER JOIN film_category
    ON film.film_id = film_category.film_id  
    INNER JOIN category
    ON film_category.category_id = category.category_id 
    LIMIT 6;
    `);
    const kategoriat = await connection.query(`SELECT name, category_id FROM category LIMIT 6;`)

    res.render('etusivu', { elokuvat, kategoriat });
    connection.end();
});

app.get('/elokuvat', async (req, res) => {
    const connection = await mariadb.createConnection(dbconfig);
    
    let elokuvat;
    if(req.query.category) {
        elokuvat = await connection.query(`
        SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating 
        FROM film
        INNER JOIN film_category
        ON film.film_id = film_category.film_id  
        INNER JOIN category
        ON film_category.category_id = category.category_id
        WHERE film_category.category_id = ${req.query.category}
        LIMIT 20;
        `);
    } else {
        elokuvat = await connection.query(`
        SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating 
        FROM film
        INNER JOIN film_category
        ON film.film_id = film_category.film_id  
        INNER JOIN category
        ON film_category.category_id = category.category_id
        LIMIT 20;
        `);
    }
    const kategoriat = await connection.query(`SELECT name, category_id FROM category;`)

    res.render('elokuvat', { elokuvat, kategoriat });
    connection.end();
});

const port = 3000;
const host = 'localhost';

app.listen(port, host, () => console.log(`${host}:${port} kuuntelee...`));