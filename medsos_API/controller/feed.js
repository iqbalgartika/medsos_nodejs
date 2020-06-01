const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = (req, res, next) => {
    const perPage = 2;
    const currentPage = req.query.page;
    let totalItems;

    Post.find().countDocuments()
        .then(count => {
            totalItems = count;
            return Post.find().skip((currentPage - 1) * perPage).limit(perPage);
        })
        .then(posts => {
            return res.status(200).json({ posts: posts, totalItems: totalItems });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not find the post.');
                error.statusCode = 404;
                throw (error);
            }
            return res.status(200).json({ post: post });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}

exports.createPost = (req, res, next) => {
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
    let creator;
    post.save()
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            creator = user;
            user.posts.push(post);
            return user.save();
        })
        .then(result => {
            res.status(201).json({
                message: 'Post created successfully',
                post: post
            })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}

exports.updatePost = (req, res, next) => {
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
    Post.findById(postId)
        .then(post => {
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
            return post.save();
        })
        .then(result => {
            return res.status(200).json({ post: result });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
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
            return Post.findByIdAndRemove(postId);
        })
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            user.posts.pull(postId);
            return user.save();
        })
        .then(result => {
            return res.status(200).json({ message: 'Post is deleted.' });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
}
