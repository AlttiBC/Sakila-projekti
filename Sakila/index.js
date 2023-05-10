const express = require('express');
const dbconfig = require('./config.json');
const mariadb = require('mariadb');
const path = require('path');
const app = express();
const paginate = require("express-paginate");

app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(paginate.middleware(20, 20));

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
    const elokuvatmaara = await connection.query(`
    SELECT COUNT(*) as count FROM film; 
    `);
    if(req.query.category) {
        elokuvat = await connection.query(`
        SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating 
        FROM film
        INNER JOIN film_category
        ON film.film_id = film_category.film_id  
        INNER JOIN category
        ON film_category.category_id = category.category_id
        WHERE film_category.category_id = ${req.query.category}
        OFFSET ${req.query.page * req.query.limit} 
        LIMIT 20 ROWS;
        `);
    } else {
        elokuvat = await connection.query(`
        SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating 
        FROM film
        INNER JOIN film_category
        ON film.film_id = film_category.film_id  
        INNER JOIN category
        ON film_category.category_id = category.category_id
        LIMIT 20
        OFFSET ${req.query.page * req.query.limit};
        `);
    }
    const kategoriat = await connection.query(`SELECT name, category_id FROM category;`)
    const sivumaara = Number(elokuvatmaara[0].count) / 20;

    res.render('elokuvat', { elokuvat, kategoriat, pages: paginate.getArrayPages(req)(1, sivumaara, req.query.page) });
    connection.end();
});

app.get('/näyttelijät', (req, res) => {
    res.render('nayttelijat')
});

app.get('/kategoriat/:id', (req, res) => {
    res.render('kategoriat')
});

app.all('*', (req, res) => {
    res.status(404);
    res.render('404');
});

const port = 3000;
const host = 'localhost';

app.listen(port, host, () => console.log(`${host}:${port} kuuntelee...`));