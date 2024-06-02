const knex = require('../DB/db.js');
const jwt = require('jsonwebtoken')

const refreshSecret = 'frUfFALXBHtRcBAw'
const accessSecret = 'KzPCSxEqydEtdXiM'

class TokenService {
    generateTokens(payload) {
        const accessToken = jwt.sign(payload, accessSecret, {expiresIn: '3h'})
        const refreshToken = jwt.sign(payload, refreshSecret, {expiresIn: '30d'})

        return {
            accessToken,
            refreshToken
        }
    }

    async saveToken(userId, refreshToken) {
        const tokens = await knex
            .select('*')
            .from('users')
            .joinRaw('left join user_token as token ON token.userid = users.uid', [])
            .where('userid', userId);

        await tokens.some(async function(currentObject) {
            if (currentObject.token !== 0 || currentObject.token !== undefined || currentObject.token !== '') {
                await knex
                    .select('*')
                    .from('user_token')
                    .where('userid', userId)
                    .update('token', refreshToken);
                return null;
            }
        });

        await knex('user_token').insert({
            userid: userId,
            token: refreshToken,
        });
    }


    validateAccessToken(token) {
        try {
            const userData = jwt.verify(token, accessSecret)
            return userData
        } catch (e) {
            return null;
        }
    }

    validateRefreshToken(token) {
        try {
            const userData = jwt.verify(token, refreshSecret)
            return userData
        } catch (e) {
            return null;
        }
    }

    async removeToken(refreshToken) {
        const tokenData = await knex
            .select('*')
            .from('user_token')
            .where('token', refreshToken)
            .del()

        return tokenData
    }

    async findToken(refreshToken) {
        const tokenData = await knex
            .select('token')
            .from('user_token')
            .where('token', refreshToken)

        return tokenData
    }
}

module.exports = new TokenService()
