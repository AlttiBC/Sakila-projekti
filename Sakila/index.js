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
    SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating, film.film_id
    FROM film
    INNER JOIN film_category
    ON film.film_id = film_category.film_id  
    INNER JOIN category
    ON film_category.category_id = category.category_id 
    ORDER BY title
    LIMIT 6;
    `);
    const kategoriat = await connection.query(`SELECT name, category_id FROM category LIMIT 6;`)

    res.render('etusivu', { elokuvat, kategoriat });
    connection.end();
});

app.get('/elokuvat', async (req, res) => {
    const connection = await mariadb.createConnection(dbconfig);

    let elokuvat;
    let elokuvatmaara;
    if(req.query.category) {
        elokuvat = await connection.query(`
        SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating, film.film_id
        FROM film
        INNER JOIN film_category
        ON film.film_id = film_category.film_id  
        INNER JOIN category
        ON film_category.category_id = category.category_id
        WHERE film_category.category_id = ${req.query.category}
        ORDER BY title
        LIMIT 20
        OFFSET ${req.query.page * req.query.limit - req.query.limit}; 
        `);
        elokuvatmaara = await connection.query(`
        SELECT COUNT(*) as count FROM film
        INNER JOIN film_category
        ON film.film_id = film_category.film_id  
        INNER JOIN category
        ON film_category.category_id = category.category_id
        WHERE film_category.category_id = ${req.query.category}; 
        `);
    } else if (req.query.nayttelija) {
        elokuvat = await connection.query(`
        SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating, film.film_id
        FROM film
        INNER JOIN film_category
        ON film.film_id = film_category.film_id  
        INNER JOIN category
        ON film_category.category_id = category.category_id
        INNER JOIN film_actor
        ON film.film_id = film_actor.film_id
        INNER JOIN actor
        ON film_actor.actor_id = actor.actor_id
        WHERE film_actor.actor_id = ${req.query.nayttelija}
        ORDER BY title
        LIMIT 20
        OFFSET ${req.query.page * req.query.limit - req.query.limit};
        `);
        elokuvatmaara = await connection.query(`
        SELECT COUNT(*) as count FROM film
        INNER JOIN film_actor
        ON film.film_id = film_actor.film_id
        INNER JOIN actor
        ON film_actor.actor_id = actor.actor_id
        WHERE film_actor.actor_id = ${req.query.nayttelija}
        `);
    } else {
        elokuvat = await connection.query(`
        SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating, film.film_id
        FROM film
        INNER JOIN film_category
        ON film.film_id = film_category.film_id  
        INNER JOIN category
        ON film_category.category_id = category.category_id
        ORDER BY title
        LIMIT 20
        OFFSET ${req.query.page * req.query.limit - req.query.limit};
        `);
        elokuvatmaara = await connection.query(`
        SELECT COUNT(*) as count FROM film; 
        `);
    }
    const kategoriat = await connection.query(`SELECT name, category_id FROM category;`)
    const sivumaara = Math.floor(Number(elokuvatmaara[0].count) / 20);

    res.render('elokuvat', { elokuvat, kategoriat, sivumaara, pages: paginate.getArrayPages(req)(1, sivumaara, req.query.page) });
    connection.end();
});

app.get('/haku', async (req, res) => {
    const search = req.query.haku;

    if (!search || !search[0]) return res.redirect('/');
    const connection = await mariadb.createConnection(dbconfig);

    const elokuvatmaara = await connection.query(`
    SELECT COUNT(*) as count 
    FROM film 
    WHERE (title LIKE '%${search}%'); 
    `);
    const elokuvat = await connection.query(`
    SELECT category.name AS category_name, title, description, release_year, rental_duration, rental_rate, rating, film.film_id 
    FROM film 
    INNER JOIN film_category
    ON film.film_id = film_category.film_id  
    INNER JOIN category
    ON film_category.category_id = category.category_id
    WHERE (title LIKE '%${search}%')
    LIMIT 20
    OFFSET ${req.query.page * req.query.limit - req.query.limit};
    `);
    const kategoriat = await connection.query(`
    SELECT name, category_id 
    FROM category
    WHERE (name LIKE '%${search}%');
    `);
    const sivumaara = Number(elokuvatmaara[0].count) / 20;

    res.render('elokuvat', { elokuvat, kategoriat, sivumaara, pages: paginate.getArrayPages(req)(1, sivumaara, req.query.page) });
    
    connection.end();
});

app.get('/nayttelijat', async (req, res) => {
    const connection = await mariadb.createConnection(dbconfig);
    
    const nayttelijat = await connection.query(`
    SELECT actor_id, first_name, last_name 
    FROM actor
    LIMIT 20
    OFFSET ${req.query.page * req.query.limit - req.query.limit};
    `);
    const nayttelijamaara = await connection.query(`
    SELECT COUNT(*) as count
    FROM actor
    `)
    const sivumaara = Number(nayttelijamaara[0].count) / 20;

    res.render('nayttelijat', { nayttelijat, sivumaara, pages: paginate.getArrayPages(req)(1, sivumaara, req.query.page)});
    
    connection.end();
});

app.get('/elokuva/:id', async (req, res) => {
    const connection = await mariadb.createConnection(dbconfig);
    const elokuvaid = req.params.id;

    const elokuvat = await connection.query(`
    SELECT category.name AS category_name, category.category_id AS category_id, title, description, release_year, language.name AS language, og_language.name AS og_language, rental_duration, rental_rate, length, replacement_cost, rating, special_features 
    FROM film 
    INNER JOIN film_category
    ON film.film_id = film_category.film_id  
    INNER JOIN category
    ON film_category.category_id = category.category_id
    INNER JOIN language
    ON language.language_id = film.language_id
    LEFT OUTER JOIN language AS og_language
    ON og_language.language_id = film.original_language_id
    WHERE film.film_id = ${elokuvaid};
    `);
    const nayttelijat = await connection.query(`
    SELECT actor.actor_id as nayttelija_id, actor.first_name, actor.last_name FROM film_actor
    INNER JOIN actor
    ON film_actor.actor_id = actor.actor_id 
    WHERE film_actor.film_id = ${elokuvaid};
    `)

    res.render('elokuva', { elokuva: elokuvat[0], nayttelijat });
    
    connection.end();
});

app.all('*', (req, res) => {
    res.status(404);
    res.render('404');
});

const port = 3000;
const host = 'localhost';

app.listen(port, host, () => console.log(`${host}:${port} kuuntelee...`));