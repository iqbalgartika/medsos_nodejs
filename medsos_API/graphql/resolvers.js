const bcrypt = require('bcryptjs');
const validator = require('validator');

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
    }
};