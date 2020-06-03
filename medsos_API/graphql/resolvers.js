const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

module.exports = {
    createUser: async ({ userInput }, req) => {
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
            errors.push({ message: 'Email is invalid' });
        }
        if (!validator.isLength(userInput.password, { min: 5 })) {
            errors.push({ message: 'Password is too short' });
        }
        if (errors.length > 0) {
            const error = new Error('Invalid inputs');
            error.code = 422;
            error.data = errors;
            throw error;
        }

        //const email = args.userInput.email
        const existingUser = await User.findOne({ email: userInput.email });
        if (existingUser) {
            const error = new Error('User already exists!');
            throw error;
        }
        const hashedPassword = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            email: userInput.email,
            password: hashedPassword,
            name: userInput.name
        })
        const savedUser = await user.save();
        return savedUser;
    },
    login: async ({email, password}, req) => {
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                const error = new Error('Incorrect username or password');
                error.code = 401;
                throw error;
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                const error = new Error('Incorrect username or password');
                error.code = 401;
                throw error;
            }
            const token = jwt.sign(
                {
                    email: user.email,
                    userId: user._id.toString()
                },
                'SuperConfidentialSecretKey',
                { expiresIn: '1h' }
            )
            return{ token: token, userId: user._id.toString() };
        } catch (error) {
            if (!error.code) {
                error.code = 500;
            }
            throw error;
        }
    }
};