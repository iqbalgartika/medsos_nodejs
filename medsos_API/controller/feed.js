const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
    const perPage = 2;
    const currentPage = req.query.page;

    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find().populate('creator').skip((currentPage - 1) * perPage).limit(perPage);
        return res.status(200).json({ posts: posts, totalItems: totalItems });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
}

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Could not find the post.');
            error.statusCode = 404;
            throw (error);
        }
        return res.status(200).json({ post: post });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
    
}

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation error. Entered data is invalid.');
        error.statusCode = 422;
        throw error;
    }
    if (!req.file) {
        const error = new Error('No image provided.');
        error.statusCode = 422;
        throw error;
    }

    const title = req.body.title;
    const content = req.body.content;
    const imageUrl = req.file.path.replace("\\", "/");
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId
    });

    try {
        await post.save();
        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();
        res.status(201).json({
            message: 'Post created successfully',
            post: post
        })
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
}

exports.updatePost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation error. Entered data is invalid.');
        error.statusCode = 422;
        throw error;
    }

    let imageUrl = req.body.image; //if image is not changed (no image submitted)
    if (req.file) { // if image is submitted -> changed
        imageUrl = req.file.path.replace("\\", "/");
    }
    if (!imageUrl) {
        const error = new Error('No image provided.');
        error.statusCode = 422;
        throw error;
    }

    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    try {
        const post = await Post.findById(postId);
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
        if (imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl)
        }

        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        const result = await post.save();
        return res.status(200).json({ post: result });

    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId)
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

        await Post.findByIdAndRemove(postId);

        const user = await User.findById(req.userId);
        user.posts.pull(postId);

        await user.save();
        return res.status(200).json({ message: 'Post is deleted.' });
    } catch (error) {
        if (!error.statusCode) {
            error.statusCode = 500;
        }
        next(error);
    }
}

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, error => console.log(error));
}
