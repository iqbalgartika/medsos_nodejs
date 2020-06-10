const { expect } = require('chai');
const mongoose = require('mongoose');

const FeedController = require('../controller/feed');
const User = require('../models/user');

describe('Feed Controller', () => {
    before(function(done) {
        mongoose.connect('mongodb+srv://admin:Admin123@cluster0-elxt9.mongodb.net/medsos-test?authSource=admin&replicaSet=Cluster0-shard-0&readPreference=primary&ssl=true')
            .then(result => {
                const user = new User({
                    email: 'test@test.com',
                    password: 'tester',
                    name: 'test',
                    _id: '5ed73970f2ac623ad8f8452c'
                })
                return user.save();
            })
            .then(() => done())
    });
    
    after(function(done) {
        User.deleteMany({})
            .then(() => {
                return mongoose.disconnect();
            })
            .then(() => {
                done();
            })
    });

    it('should return user with created post added', (done) => {
        const req = {
            userId: '5ed73970f2ac623ad8f8452c',
            body: {
                title: 'Test post',
                content: 'Content of a test post'
            },
            file: {
                path: 'image/url'
            }
        };
        const res = {
            status: function() {
                return this;
            },
            json: function() {}
        };
        
        FeedController.createPost(req, res, ()=>{})
            .then((user) => {
                expect(user).to.have.property('posts');
                expect(user.posts).to.have.length(1);
                done();
            })
    });
})