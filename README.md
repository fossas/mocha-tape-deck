# Mocha Tape Deck [![CircleCI](https://circleci.com/gh/fossas/mocha-tape-deck.svg?style=svg)](https://circleci.com/gh/fossas/mocha-tape-deck) [![codecov](https://codecov.io/gh/fossas/mocha-tape-deck/branch/master/graph/badge.svg)](https://codecov.io/gh/fossas/mocha-tape-deck)
Create, manage, and replay HTTP requests and responses for fast, deterministic tests.

## Installation
### Using npm
`npm install --save-dev mocha-tape-deck`

### Using yarn
`yarn add -D mocha-tape-deck`
## Quickstart
```javascript
const { TapeDeck } = require('mocha-tape-deck')
const express = require('express')
const rp = require('request-promise')
const { expect } = require('chai')

describe('Mocha Tape Deck', function() {
  let server;
  const deck = new TapeDeck('./cassettes');
  let response;

  beforeEach((done) => {
    const app = express();
    response = 'example response';

    app.get('/test', (req, res) => {
      res.send(response);
    });

    server = app.listen(PORT, done);
  });

  afterEach((done) => {
    server.close(done);
  });

    // If a cassette exists, this will replay the cassette. Otherwise, it will
  // create a cassette and cache it in the TapeDeck's path.
  deck.createTest('test name here', async () => {
    const resp = await rp.get(`http://localhost:${port}/test`);
    expect(resp).to.be.equal('example response');
  }).register(this);

  // If a cassette does not exist, this will fail instead of implicitly
  // recording a cassette.
  deck.createTest('test name here', async () => {
    response = 'incorrect response'
    const resp = await rp.get(`http://localhost:${port}/test`);
    expect(resp).to.be.equal('example response');
  }).register(this, { failIfNoCassette: true});
})
```
## Usage
Wrap an existing test that makes HTTP requests in a `TestTapeDeck`. For example:
ex:
```javascript
describe('Example without test dape deck', function () {
  let response = 'response1'
  let app 
  let server
  beforeEach(() => {
    app = express();
    server = app.listen(8001, done);
    app.get('/test', (req, res) => {
      res.send(response)
    }) 
  })

  it('makes an HTTP request', () => {
    return rp.get('http://localhost:8001/test')
      .then((resp) => expect(resp).to.be.equal('response1'))
  })
})
```
becomes
```javascript
const { TapeDeck } = require('mocha-tape-deck')

// the method provided to describe must use the keyword 'function', DO NOT use a fat arrow function (() => ...)
describe('Example without test dape deck', function () {
  // this must be OUTSIDE of any mocha block (e.g. before, beforeAll, etc ...), this defines where the fixtures (called cassettes) are saved
  const deck = new TapeDeck('./cassettes');

  let response = 'response1'
  let app 
  let server
  beforeEach(() => {
    app = express();
    server = app.listen(8001, done);
    app.get('/test', (req, res) => {
      res.send(response)
    }) 
  })

  // this test makes actual HTTP requests and records for replay in a cassette in the directory passed to TapeDeck, in this case cassettes
  deck.createTest('can record http calls', async () => {
    const resp = await rp.get(`http://localhost:${PORT}/test`);
    expect(resp).to.be.equal('response1');
  })
  // this tells the test to make REAL http calls and record the responses
  .recordCassette()
  .register(this)

  // this test mocks HTTP requests and records for replay in a cassette in the directory passed to TapeDeck, in this case cassettes
  deck.createTest('can replay http calls', async () => {
    const resp = await rp.get(`http://localhost:${PORT}/test`);
    expect(resp).to.be.equal('response1');
  })
  // this tells the test to use the mock responses. If a path to a .cassette file is not provided, it manages uses the test description to find the fixture. 
  .playCassette()
  .register(this)

  // If you want to dynamically decide whether to record or play a cassette, use selectCassetteAction
  deck.createTest('can decide whether to replay or record calls', async () => {
    const resp = await rp.get(`http://localhost:${PORT}/test`);
    expect(resp).to.be.equal('response1');
  })
  .selectCassetteAction(() => {
    if(shouldRecord) {
      return 'record'
    } else if (shoudPlay) {
      return 'play'
    }
  }, 'an optional path to a cassette')
  .register(this) 
}
```

## Easy integration testing
Set the environment variable `NO_CASSETTE_MOCKING` (e.g. `NO_CASSETTE_MOCKING=true mocha ....`) to ignore all mocking code. This allows your unit/component tests to also be your integration tests!