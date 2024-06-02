const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const knex = require('../DB/DB');
const ApiError = require('../exeptions/apiError');
const userDto = require('../dtos/user-dto');
const tokenService = require('../services/token-services');

// Регистрация
router.post('/registration',
    body('email').isEmail(),
    body('password').isLength({ min: 6, max: 36 }),
    async (req, res, next) => {
        const users = await knex.select('email').from('users');
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(ApiError.BadRequest('Ошибка при валидации', errors.array()));
            }
            const hasDuplicates = users.some(currentObject => currentObject.email.toLowerCase() === req.body.email);
            if (hasDuplicates) {
                throw ApiError.BadRequest('Пользователь уже зарегестрирован');
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            await knex('users').insert({
                email: req.body.email,
                password: hashedPassword,
                name: req.body.name
            });
            const currentUser = await knex.select('email', 'uid').from('users').where('email', req.body.email);
            const userdto = new userDto(currentUser[0]);
            const tokens = tokenService.generateTokens({ ...userdto });
            await tokenService.saveToken(userdto.id, tokens.refreshToken);
            res.cookie('refreshToken', tokens.refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
            res.send({ ...tokens, user: userdto });
        } catch (e) {
            next(e);
        }
    }
);

// Авторизация
router.post('/login', async (req, res, next) => {
    try {
        const user = await knex.select('*').from('users')
            .leftJoin('roles', 'users.role_ids', 'roles.role_id')
            .where('email', req.body.email);

        if (!user[0]) {
            throw ApiError.BadRequest('Данный пользователь не найден!');
        }
        const PassCompare = await bcrypt.compare(req.body.password, user[0].password);
        if (!PassCompare) {
            throw ApiError.BadRequest('Неверный пароль');
        }
        const userdto = new userDto(user[0]);
        const tokens = tokenService.generateTokens({ ...userdto });
        await tokenService.saveToken(userdto.id, tokens.refreshToken);
        res.cookie('refreshToken', tokens.refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.send({ ...tokens, user: userdto });
    } catch (e) {
        next(e);
    }
});

// Обновление access token’ов с помощью refresh token’а
router.get('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            throw ApiError.UnauthorizedError();
        }

        const userData = tokenService.validateRefreshToken(refreshToken);
        const tokenFromDB = await tokenService.findToken(refreshToken);

        if (!userData || !tokenFromDB) {
            throw ApiError.UnauthorizedError();
        }

        const user = await knex.select('*').from('users')
            .leftJoin('roles', 'users.role_ids', 'roles.role_id')
            .where('uid', userData.id);

        const userdto = new userDto(user[0]);
        const tokens = tokenService.generateTokens({ ...userdto });
        await tokenService.saveToken(userdto.id, tokens.refreshToken);

        res.cookie('refreshToken', tokens.refreshToken, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
        res.send({ ...tokens, user: userdto });
    } catch (e) {
        next(e);
    }
});

// Выход из аккаунта
router.post('/logout', async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        await tokenService.removeToken(refreshToken);
        res.clearCookie('refreshToken');
        res.send('Выход успешен');
    } catch (e) {
        next(e);
    }
});

module.exports = router;
