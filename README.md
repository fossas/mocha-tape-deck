# Mocha Tape Deck [![CircleCI](https://circleci.com/gh/fossas/mocha-tape-deck.svg?style=svg)](https://circleci.com/gh/fossas/mocha-tape-deck) [![codecov](https://codecov.io/gh/fossas/mocha-tape-deck/branch/master/graph/badge.svg)](https://codecov.io/gh/fossas/mocha-tape-deck)
Create, manage, and replay HTTP requests and responses for fast, deterministic tests.

## Installation
### Using `npm`
`npm install --save-dev mocha-tape-deck`

### Using `yarn`
`yarn add -D mocha-tape-deck`

## Usage
Wrap an existing test that makes HTTP requests in a `TestTapeDeck`. For example:

```javascript
const rp = require('request-promise');

describe('Example without test tape deck', function () {
  let response = 'example response';
  let app;
  let server;

  beforeEach(() => {
    app = express();
    app.get('/test', (req, res) => {
      res.send(response);
    });
    server = app.listen(8001, done);
  });

  it('makes an HTTP request', () => {
    return rp.get('http://localhost:8001/test')
      .then((resp) => expect(resp).to.be.equal('example response'));
  });
});
```

becomes:

```javascript
const { TapeDeckFactory } = require('mocha-tape-deck');

// The method provided to describe must use the keyword 'function', DO NOT use a fat arrow function (() => ...)
describe('Example without test tape deck', function () {
  // This must be OUTSIDE of any mocha block (e.g. before, beforeAll, etc ...), this defines where the fixtures (called cassettes) are saved
  const tapeDeckFactory = new TapeDeckFactory(path.join(__dirname, 'cassettes'));

  let response = 'example response';
  let app;
  let server;

  beforeEach(() => {
    app = express();
    server = app.listen(8001, done);
    app.get('/test', (req, res) => {
      res.send(response);
    });
  });

  // this test makes actual HTTP requests and records for replay in a cassette in the directory passed to TapeDeckFactory, in this case cassettes
  tapeDeckFactory.createTestTapeDeck('can record http calls', async () => {
    const resp = await rp.get(`http://localhost:8001/test`);
    expect(resp).to.be.equal('example response');
  })
  // this tells the test to make REAL http calls and record the responses
  .recordCassette()
  .compile(this);

  // this test mocks HTTP requests and records for replay in a cassette in the directory passed to TapeDeckFactory, in this case cassettes
  tapeDeckFactory.createTestTapeDeck('can replay http calls', async () => {
    const resp = await rp.get(`http://localhost:8001/test`);
    expect(resp).to.be.equal('example response');
  })
  // this tells the test to use the mock responses. If a path to a .cassette file is not provided, it uses the test description to find the fixture. 
  .recordCassette()
  .compile(this)

  // If you want to dynamically decide whether to record or play a cassette, use selectCassetteAction
  tapeDeckFactory.createTestTapeDeck('can decide whether to replay or record calls', async () => {
    const resp = await rp.get(`http://localhost:${PORT}/test`);
    expect(resp).to.be.equal('example response');
  })
  .selectCassetteAction(() => {
    if(shouldRecord) {
      return 'record'
    } else if (shoudPlay) {
      return 'play'
    }
  }, 'an optional path to a cassette')
  .compile(this) 
}
```

## Easy integration testing
Set the environment variable `NO_CASSETTE_MOCKING` (e.g. `NO_CASSETTE_MOCKING=true mocha ....`) to ignore all mocking code. This allows your unit/component tests to also be your integration tests!
