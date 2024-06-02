const express = require('express');
const router = express.Router();
const knex = require("../DB/DB");

// Вывод отчета по всем животным
router.get('/cattle-otchetnic', async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const sortColumn = req.query.column || 'date';
    const sortDirection = req.query.direction || 'asc';

    const offset = (page - 1) * limit;

    const [countResult, reports] = await Promise.all([
        knex.withSchema("public").count("* as count").from("otchetnic").first(),
        knex.withSchema("public")
            .select("*")
            .from("otchetnic")
            .orderBy(sortColumn, sortDirection)
            .limit(limit)
            .offset(offset),
    ]);
    const total_pages = Math.ceil(countResult.count / limit);
    res.send({ results: reports, total_pages });
});

// Получение списка животных
router.get('/cattle-animal-list', async (req, res, next) => {
    try {
        const animals = await knex('animal-list').select('*');
        res.send(animals);
    } catch (e) {
        next(e);
    }
});

// Добавление животного в список
router.post('/cattle-animal-list', async (req, res, next) => {
    try {
        const { animal } = req.body;
        await knex('animal-list').insert({ animal: req.body.animal });
        res.send('Животное успешно добавлено!');
    } catch (e) {
        next(e);
    }
});

// Удаление животного из списка
router.delete('/cattle-animal-list/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        await knex('animal-list').where('id', id).del();
        res.send('Животное успешно удалено!');
    } catch (e) {
        next(e);
    }
});

// Добавление новой записи
router.post('/cattle-report', async (req, res, next) => {
    try {
        await knex('report').insert({
            data: req.body.data,
            event: req.body.event,
            animal: req.body.animal,
            quantity: req.body.quantity,
            weight: req.body.weight,
            note: req.body.note
        });
        res.send("Отчет успешно отправлен!");
    } catch (e) {
        next(e);
    }
});

// Получение всех записей таблицы report
router.get("/cattle-report", async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const sortColumn = req.query.column || 'quantity';
    const sortDirection = req.query.direction || 'asc';

    const offset = (page - 1) * limit;

    const [countResult, report] = await Promise.all([
        knex.withSchema("public").count("* as count").from("report").first(),
        knex.withSchema("public")
            .select("*")
            .from("report")
            .orderBy(sortColumn, sortDirection)
            .limit(limit)
            .offset(offset),
    ]);

    const total_pages = Math.ceil(countResult.count / limit);
    res.send({ results: report, total_pages });
});

// Удаление записи из таблицы report
router.delete('/cattle-report/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        await knex('report').where('id', id).del();
        res.send('Запись успешно удалена');
    } catch (e) {
        next(e);
    }
});

// Обновление записи в таблице report
router.put('/cattle-report/:id', async (req, res, next) => {
    try {
        const id = req.params.id;
        const { data, event, animal, quantity, weight, note } = req.body;
        await knex('report').where('id', id).update({ data, event, animal, quantity, weight, note });
        res.send('Запись успешно обновлена');
    } catch (e) {
        next(e);
    }
});

module.exports = router;
