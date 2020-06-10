const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const sinon = require('sinon');

const authMiddleware = require('../middleware/is-auth');

describe('Auth Middleware', () => {
    it('should throw error if authorization header is not present', () => {
        const req = {
            get: () => { return null; },
        }
        expect(authMiddleware.bind(this, req, {}, ()=>{})).to.throw('Not authenticated.');
    });
    
    it('should throw error if authorization header is only one string', () => {
        const req = {
            get: () => { return 'xyz'; },
        }
        expect(authMiddleware.bind(this, req, {}, ()=>{})).to.throw();
    });

    it('should yield a userId after decoding the token', () => {
        const req = {
            get: () => { return 'Bearer xyz'; },
        }
        sinon.stub(jwt, 'verify');
        jwt.verify.returns({userId: 'userOne'});
        
        authMiddleware(req, {}, ()=>{});
        expect(req).to.have.property('userId');
        expect(req).to.have.property('userId', 'userOne');
        expect(jwt.verify.called).to.be.true;

        jwt.verify.restore();
    });

    it('should throw error if the token cannot be verified', () => {
        const req = {
            get: () => { return 'Bearer xyz'; },
        }
        expect(authMiddleware.bind(this, req, {}, ()=>{})).to.throw();
    });

    
});