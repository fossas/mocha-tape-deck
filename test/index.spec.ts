import { expect } from 'chai';
import * as rp from 'request-promise';
import { TapeDeckFactory } from '../src';
import express = require('express');
import http = require('http');
import path = require('path');

const PORT = 8675;
describe('Mocha Tape Deck', function () {
  let app: express.Express;
  let server: http.Server;
  const tapeDeckFactory = new TapeDeckFactory(path.join(__dirname, 'cassettes'));

  beforeEach((done) => {
    app = express();
    server = app.listen(PORT, done);
  });

  afterEach((done) => {
    server.close(done);
  });

  describe('Mocks the http requests that were recorded', function () {
    let response = 'response1';
    beforeEach(() => {
      app.get('/test', (req, res) => {
        res.send(response);
      });
    });

    after(() => tapeDeckFactory.removeAllCassettes());

    // tests are executed in reverse order that they're compiled in
    tapeDeckFactory.createTestTapeDeck('can be written', async () => {
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal('response1');
    })
    .recordCassette()
    .compile(this);

    tapeDeckFactory.createTestTapeDeck('can be read with an async function', async () => {
      response = 'incorrectResponse';
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal('response1');
    })
    .playCassette(path.join(__dirname, 'cassettes', 'Mocha_Tape_Deck_Mocks_the_http_requests_that_were_recorded_can_be_written.cassette'))
    .compile(this);

    tapeDeckFactory.createTestTapeDeck('can be read with a done param', (done) => {
      response = 'incorrectResponse';
      rp.get(`http://localhost:${PORT}/test`)
        .then((resp) => expect(resp).to.be.equal('response1'))
        .then(done)
        .catch(done);
    })
    .playCassette(path.join(__dirname, 'cassettes', 'Mocha_Tape_Deck_Mocks_the_http_requests_that_were_recorded_can_be_written.cassette'))
    .compile(this);

    tapeDeckFactory.createTestTapeDeck('can be read with a returned promise', () => {
      response = 'incorrectResponse';

      return rp.get(`http://localhost:${PORT}/test`)
        .then((resp) => expect(resp).to.be.equal('response1'));
    })
    .playCassette(path.join(__dirname, 'cassettes', 'Mocha_Tape_Deck_Mocks_the_http_requests_that_were_recorded_can_be_written.cassette'))
    .compile(this);

    it('will not affect non mocked cases', async () => {
      response = 'incorrectResponse';
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal(response);
    });
  });
});
