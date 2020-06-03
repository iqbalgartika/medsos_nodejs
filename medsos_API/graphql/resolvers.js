const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');

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
    login: async ({ email, password }, req) => {
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
        return { token: token, userId: user._id.toString() };
    },
    posts: async ({ page }, req) => {
        if (!req.isAuth) {
            const error = new Error('Not authenticated!');
            error.code = 401;
            throw error;
        }

        const perPage = 2;
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage);
        return { 
            posts: posts.map(p => {
                return {
                    ...p._doc, 
                    createdAt: p._doc.createdAt.toISOString(),
                    updatedAt: p._doc.updatedAt.toISOString()
                };
            }), 
            totalPosts: totalItems 
        };
    },
    createPost: async ({ postInput }, req) => {
        if (!req.isAuth) {
            const error = new Error('Not authenticated!');
            error.code = 401;
            throw error;
        }

        const errors = [];
        if (!validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Title is too short' });
        }
        if (!validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: 'Content is too short' });
        }
        if (errors.length > 0) {
            const error = new Error('Invalid inputs');
            error.code = 422;
            error.data = errors;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error('Not authenticated!');
            error.code = 401;
            throw error;
        }
        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user
        });
        const createdPost = await post.save();
        user.posts.push(post);
        await user.save();
        return {
            ...createdPost._doc,
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString(),
        };
    }
};