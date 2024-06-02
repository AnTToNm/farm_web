const express = require('express');
const router = express.Router();
const knex = require('../DB/DB');
const multer = require("multer");
const cors = require('cors');
const path = require("path");
const cookies = require("cookie-parser")

// Storage setup for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'server/public');
    },
    filename: (req, file, cb) => {
        cb(null, `${file.originalname}`);
    }
});

const upload = multer({ storage: storage }).single('file');

// Удаление, обновление, добавление категорий администратором
router.post('/change-category', async (req, res, next) => {
    try {
        const {category_id, category_name, deleted} = req.body;
        if (deleted) {
            await knex("categories").where("category_id", category_id).del();
        } else if (category_id === 0) {
            await knex("categories").insert({
                category_name
            });
        } else {
            await knex("categories").where("category_id", category_id).update({category_name});
        }
        res.status(200).send("category has been changed");
    } catch (e) {
        next(e);
    }
});

// Обновление или удаление товаров администратором
router.post('/change-product', async (req, res, next) => {
    try {
        const {product} = req.body;

        if (product.id === 0) {
            const resp = await knex("products").returning('id').insert({
                title: product.title,
                description: product.description,
                price: product.price,
                category_id: product.category_id,
                img_url: product.img_url,
                quantity: product.quantity
            });
            res.status(200).json({id: resp[0].id});
        } else {
            await knex("products").update({
                title: product.title,
                description: product.description,
                price: product.price,
                quantity: product.quantity,
                category_id: product.category_id
            }).where("id", product.id);
            res.status(200).json({id: product.id});
        }
    } catch (e) {
        next(e);
    }
});

// Отмена заказа администратором
router.post('/admin-cancel-order', async (req, res, next) => {
    try {
        const {order_id} = req.body;
        const existOrder = (await knex("orders").where("order_id", order_id))[0];

        for (const product of existOrder.order_json) {
            await knex("products").where("id", product.id).update({quantity: product.quantity});
        }

        await knex("orders").where("order_id", order_id).update({status: "Отменен администратором"});

        res.send("order has been canceled");
    } catch (e) {
        next(e);
    }
});

// Просмотр всех пользователей
router.get('/checkusers', async (req, res, next) => {
    try {
        const users = await knex
            .select('*')
            .from('users');

        res.send(users);
    } catch (e) {
        next(e);
    }
});

// Подтверждение заказа администратором
router.post('/accept-order', async (req, res, next) => {
    try {
        const {order_id} = req.body;

        await knex("orders").where("order_id", order_id).update({status: "Собирается"});

        setTimeout(async () => {
            const status = await knex.select("status").from("orders").where("order_id", order_id);
            if (status[0].status !== "Отменен") {
                await knex("orders").where("order_id", order_id).update({status: "Готов к выдаче"});
            }
        }, 15000);

        res.send("order has been created");
    } catch (e) {
        next(e);
    }
});

// Вывод всех категорий
router.get('/categories', async (req, res, next) => {
    try {
        const categories = await knex
            .select('*')
            .from('categories');

        res.send(categories);
    } catch (e) {
        next(e);
    }
});

// Получение всех заказов
router.get('/all-orders', async (req, res, next) => {
    try {
        const orders = await knex
            .select('*')
            .from('orders')
            .leftJoin("users", "orders.user_id", "users.uid");

        res.send(orders);
    } catch (e) {
        next(e);
    }
});

// Загрузка картинки для товара
router.post('/upload', async (req, res, next) => {
    try {
        await upload(req, res, async (err) => {
            await knex('products')
                .where("id", req.body.id)
                .update({
                    img_url: `${req.file.originalname}`
                });

            if (err) {
                res.sendStatus(500);
            }
            res.send(req.file);
        });
    } catch (e) {
        next(e);
    }
});

module.exports = router;
