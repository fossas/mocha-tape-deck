import { expect } from 'chai';
import * as rp from 'request-promise';
import { TapeDeck } from './../src/index';
import express = require('express');
import http = require('http');
import path = require('path');

const PORT = 8675;
describe('Mocha Tape Deck', function() {
  let server: http.Server;
  const deck = new TapeDeck(path.join(__dirname, 'cassettes'));
  let response;

  beforeEach((done) => {
    const app = express();
    response = 'response1';

    app.get('/test', (req, res) => {
      res.send(response);
    });

    server = app.listen(PORT, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  after(() => deck.removeAllCassettes());

  describe('Mocks the http requests that were recorded', function() {
    // tests are executed in reverse order that they're compiled in
    deck.createTest('can be written', async () => {
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal('response1');
    })
    .recordCassette()
    .register(this);

    deck.createTest('can be read with an async function', async () => {
      response = 'incorrectResponse';
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal('response1');
    })
    .playCassette('Mocha Tape Deck Mocks the http requests that were recorded can be written.cassette')
    .register(this);

    deck.createTest('can be read with a done param', (done) => {
      response = 'incorrectResponse';
      rp.get(`http://localhost:${PORT}/test`)
        .then((resp) => expect(resp).to.be.equal('response1'))
        // tslint:disable-next-line:no-unnecessary-callback-wrapper
        .then(() => done())
        .catch(done);
    })
    .playCassette('Mocha Tape Deck Mocks the http requests that were recorded can be written.cassette')
    .register(this);

    deck.createTest('can be read with a returned promise', () => {
      response = 'incorrectResponse';

      return rp.get(`http://localhost:${PORT}/test`)
        .then((resp) => expect(resp).to.be.equal('response1'));
    })
    .playCassette('Mocha Tape Deck Mocks the http requests that were recorded can be written.cassette')
    .register(this);

    it('will not affect non mocked cases', async () => {
      response = 'incorrectResponse';
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal(response);
    });
  });

  describe('Non specified action cases work as expected', function() { 
    // the names for these tests must remain the same to map to the same fixture
    deck.createTest('record case', async () => {
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal('response1');
    })
    .register(this)

    deck.createTest('record case', async () => {
      response = 'incorrectResponse';
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal('response1');
    })
    .register(this)
  });

  describe('passes when there are no http calls made', function() {
    deck.createTest('namespace collision', async () => {
      expect(true).to.be.true
    })
    .register(this)

    deck.createTest('namespace collision', () => {
      expect(true).to.be.true
    })
    .register(this)

    deck.createTest('namespace collision', (done) => {
      expect(true).to.be.true
      done()
    })
    .register(this)

    deck.createTest('namespace collision', () => {
      expect(true).to.be.true
      
      return Promise.resolve()
    })
    .register(this)
  });

  // record
  deck.createTest('can/handle/paths/with/slash', async () => {
    const resp = await rp.get(`http://localhost:${PORT}/test`);
    expect(resp).to.be.equal('response1');
  })
  .register(this)

  // replay
  deck.createTest('can/handle/paths/with/slash', async () => {
    response = 'incorrectResponse';
    const resp = await rp.get(`http://localhost:${PORT}/test`);
    expect(resp).to.be.equal('response1');
  })
  .register(this)

  // TODO: figure out how to test case where test fails but still pass CI gates
});
