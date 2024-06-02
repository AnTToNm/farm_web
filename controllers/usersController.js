const express = require('express');
const router = express.Router();
const knex = require("../DB/DB");
const bcrypt = require("bcrypt");
const ApiError = require("../exeptions/apiError");
const uuid = require("uuid");
const cors = require('cors');
const path = require("path");
const cookies = require("cookie-parser")

// Отмена заказа пользователем
router.post('/cancel-order', async (req, res, next) => {
    try {
        const {order_id} = req.body;
        const existOrder = (await knex("orders").where("order_id", order_id))[0];

        for (const product of existOrder.order_json) {
            await knex("products").where("id", product.id).update({quantity: product.quantity});
        }

        await knex("orders").where("order_id", order_id).update({status: "Отменен"});

        res.send("order has been canceled");
    } catch (e) {
        next(e);
    }
});

// Получение списка заказов определенного пользователя по id
router.get('/orders/:id', async (req, res, next) => {
    try {
        const {id} = req.params;
        const orders = await knex
            .select('*')
            .from('orders')
            .where("user_id", id);

        res.send(orders);
    } catch (e) {
        next(e);
    }
});

// Оформление заказа пользователем
router.post('/create-order', async (req, res, next) => {
    try {
        const {password, order, user_id} = req.body;
        const hashedPassword = await knex.select("password").from("users").where("uid", user_id);
        const isCorrectPassword = await bcrypt.compare(password, hashedPassword[0].password);

        if (!isCorrectPassword) {
            throw ApiError.NotCorrectPassword();
        }

        const parsedOrder = JSON.parse(order);

        for (const product of parsedOrder) {
            await knex("products")
                .where("id", product.id)
                .update({quantity: (product.quantity - product.selected_quantity)});
        }

        const title = uuid.v4();

        await knex("orders").insert({
            user_id: user_id,
            order_json: order,
            status: "Обработка",
            title: title
        });

        res.send("order has been created");
    } catch (e) {
        next(e);
    }
});

// Отправка нового отзыва о продукте
router.post('/send-review', async (req, res, next) => {
    try {
        const {product_id, order_id, review, rating, name} = req.body;

        await knex("reviews").insert({
            review,
            rating,
            product_id,
            name
        });

        const orderJson = await knex.select("*").from("orders").where("order_id", order_id);

        if (orderJson instanceof Array) {
            const newOrderJson = orderJson[0].order_json.map((product) => {
                if (product.id == product_id) {
                    const nProduct = {...product};
                    nProduct.review = "reviewed";
                    return nProduct;
                } else {
                    return product;
                }
            });
            await knex("orders").update({order_json: JSON.stringify(newOrderJson)}).where("order_id", order_id);
        }

        res.send("new review");
    } catch (e) {
        next(e);
    }
});

// Отзывы о конкректном продукте
router.get('/products/reviews/:id', async (req, res, next) => {
    try {
        const {id} = req.params;

        const reviews = await knex
            .select('*')
            .from('reviews')
            .where('product_id', id);

        res.send(reviews);
    } catch (e) {
        next(e);
    }
});

// Выводит все продукты
router.get('/products', async (req, res, next) => {
    try {
        const products = await knex
            .select('*')
            .from('products')
            .leftJoin("categories", "products.category_id", "categories.category_id");

        res.send(products);
    } catch (e) {
        next(e);
    }
});

// Выводит информацию о конкретном продукте по id
router.get('/products/:id', async (req, res, next) => {
    try {
        const {id} = req.params;
        const product = await knex
            .select('*')
            .from('products')
            .leftJoin("categories", "products.category_id", "categories.category_id")
            .where("id", id);

        const extractedProduct = product[0];

        res.send(extractedProduct);
    } catch (e) {
        next(e);
    }
});

module.exports = router;
