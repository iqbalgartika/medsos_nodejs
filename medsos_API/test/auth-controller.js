const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');

const AuthController = require('../controller/auth');
const User = require('../models/user');

describe('Auth Controller', () => {
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

    it('should throw error 500 if the database fails', (done) => {
        const req = {
            body: {
                email: 'test@test.com',
                password: 'asdasd'
            }
        }
        
        sinon.stub(User, 'findOne');
        User.findOne.throws();

        AuthController.login(req, {}, ()=>{}).then(result => {
            expect(result).to.be.an('error');
            expect(result).to.have.property('statusCode', 500);
            done();
        })

        User.findOne.restore();
    });

    it('should return a response with a valid user status for an existing user', (done) => {
        const req = {
            userId: '5ed73970f2ac623ad8f8452c'
        };
        const res = {
            statusCode: 500,
            userStatus: '',
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                this.userStatus = data.status;
            }
        };
        
        AuthController.getStatus(req, res, ()=>{})
            .then(() => {
                expect(res.statusCode).to.be.equal(200);
                expect(res.userStatus).to.be.equal('I am new!');
                done();
            })
    });
})