const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');
const { clearImage } = require('../util/file');

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
    user: async (args, req) => {
        if (!req.isAuth) {
            const error = new Error('Not authenticated!');
            error.code = 401;
            throw error;
        }
        
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }
        return {...user._doc, password: false};
    },
    updateStatus: async ({ status }, req) => {
        if (!req.isAuth) {
            const error = new Error('Not authenticated!');
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error('User not found.');
            error.statusCode = 404;
            throw error;
        }
        user.status = status;
        await user.save();
        return {...user._doc, password: false};
    },
    posts: async ({ page }, req) => {
        page = page || 1;
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
    post: async ({ id }, req) => {
        if (!req.isAuth) {
            const error = new Error('Not authenticated!');
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id).populate('creator');
        if (!post) {
            const error = new Error('Could not find the post.');
            error.statusCode = 404;
            throw (error);
        }
        return {
            ...post._doc,
            createdAt: post._doc.createdAt.toISOString(),
            updatedAt: post._doc.updatedAt.toISOString(),
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
        const savedPost = await post.save();
        user.posts.push(post);
        await user.save();
        return {
            ...savedPost._doc,
            createdAt: savedPost._doc.createdAt.toISOString(),
            updatedAt: savedPost._doc.updatedAt.toISOString(),
        };
    },
    updatePost: async ({ id, postInput }, req) => {
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

        const post = await Post.findById(id).populate('creator');
        if (!post) {
            const error = new Error('Could not find the post.');
            error.statusCode = 404;
            throw (error);
        }
        if (req.userId.toString() !== post.creator._id.toString()) {
            const error = new Error('Not authorized!');
            error.statusCode = 403;
            throw (error);
        }

        post.title = postInput.title;
        post.content = postInput.content;
        if (postInput.imageUrl !== 'undefined') {
            post.imageUrl = postInput.imageUrl;
        }
        const savedPost = await post.save();
        return {
            ...savedPost._doc,
            createdAt: savedPost._doc.createdAt.toISOString(),
            updatedAt: savedPost._doc.updatedAt.toISOString(),
        };
    },
    deletePost: async ({ id }, req) => {
        if (!req.isAuth) {
            const error = new Error('Not authenticated!');
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id)
        if (!post) {
            const error = new Error('Could not find the post.');
            error.statusCode = 404;
            throw (error);
        }
        if (req.userId.toString() !== post.creator.toString()) {
            const error = new Error('Not authorized!');
            error.statusCode = 403;
            throw (error);
        }
        clearImage(post.imageUrl);

        await Post.findByIdAndRemove(id);

        const user = await User.findById(req.userId);
        user.posts.pull(id);

        await user.save();
        return true;
    },
};