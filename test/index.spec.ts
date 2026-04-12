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

  // Unskip this to test timeout cases. If timeout catching is not implemented properly a nock error like
  // "Module's request already overridden for http protocol." or  "Nock recording already in progress" will be thrown
  // If it is implemented properly, then only the third test will fail, and it willbe a timeout error
  describe.skip('timeout suite', function () {
    // record
    deck.createTest('can handle a timeout', async () => {
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal('response1');
    })
    .register(this)

    // replay
    deck.createTest('can handle a timeout', async () => {
      response = 'incorrectResponse';
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal('response1');
    })
    .register(this)
    
    deck.createTest('can handle a timeout', (done) => {
      setTimeout(() => {
        done()
      }, 10000)
    })
    .timeout(500)
    .register(this)
    
    // replay
    deck.createTest('can handle a timeout', async () => {
      response = 'incorrectResponse';
      const resp = await rp.get(`http://localhost:${PORT}/test`);
      expect(resp).to.be.equal('response1');
    })
    .register(this)
});

  // Regression test: mocha-tape-deck wrapper declares `done` parameter (fn.length === 1),
  // causing newer mocha versions to always pass a `done` callback. For async test functions
  // that don't call `done`, the wrapper waited on a `donePromise` that never resolved → deadlock.
  // This test exercises the bug directly by calling the wrapper with a `done` argument.
  describe('done parameter deadlock fix', function() {
    it('calls done for async test functions that do not expect done', function(testDone) {
      this.timeout(2000);

      const origEnv = process.env.NO_CASSETTE_MOCKING;
      process.env.NO_CASSETTE_MOCKING = '1';

      const test = deck.createTest('async no-done', async () => {
        // async function: does not accept or call done
        return;
      });
      test.playCassette();

      const mockSuite = { addTest: () => {} } as any;
      test.register(mockSuite);

      // Directly invoke the wrapper with a done callback, simulating newer mocha behavior
      // where fn.length === 1 causes mocha to pass done.
      // Before the fix: donePromise never resolves → done never called → timeout
      const wrappedFn = test.fn as any;
      wrappedFn((err?: any) => {
        process.env.NO_CASSETTE_MOCKING = origEnv || '';
        if (origEnv === undefined) { delete process.env.NO_CASSETTE_MOCKING; }
        testDone(err);
      });
    });

    it('still waits for done when the original test expects done', function(testDone) {
      this.timeout(2000);

      const origEnv = process.env.NO_CASSETTE_MOCKING;
      process.env.NO_CASSETTE_MOCKING = '1';

      const test = deck.createTest('done-style', (done) => {
        // done-style test: calls done after async work
        setTimeout(() => done(), 50);
      });
      test.playCassette();

      const mockSuite = { addTest: () => {} } as any;
      test.register(mockSuite);

      const wrappedFn = test.fn as any;
      wrappedFn((err?: any) => {
        process.env.NO_CASSETTE_MOCKING = origEnv || '';
        if (origEnv === undefined) { delete process.env.NO_CASSETTE_MOCKING; }
        testDone(err);
      });
    });

    it('calls done for sync test functions that return a promise', function(testDone) {
      this.timeout(2000);

      const origEnv = process.env.NO_CASSETTE_MOCKING;
      process.env.NO_CASSETTE_MOCKING = '1';

      const test = deck.createTest('sync-promise', () => {
        return Promise.resolve();
      });
      test.playCassette();

      const mockSuite = { addTest: () => {} } as any;
      test.register(mockSuite);

      const wrappedFn = test.fn as any;
      wrappedFn((err?: any) => {
        process.env.NO_CASSETTE_MOCKING = origEnv || '';
        if (origEnv === undefined) { delete process.env.NO_CASSETTE_MOCKING; }
        testDone(err);
      });
    });
  });

  // TODO: figure out how to test case where test fails but still pass CI gates
});
