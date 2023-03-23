"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MochaTapeDeck = exports.TapeDeck = exports.TestTapeDeck = void 0;
const fs = require("fs");
const nock = require("nock");
const mocha = require("mocha");
const path = require("path");
const rimraf = require("rimraf");
const sanitize = require("sanitize-filename");
function TestTapeDeck(cassettePath, title, fn) {
    return new MochaTapeDeck(cassettePath, title, fn);
}
exports.TestTapeDeck = TestTapeDeck;
class TapeDeck {
    constructor(cassettePath) {
        this.cassettePath = cassettePath;
    }
    createTest(title, fn) {
        return new MochaTapeDeck(this.cassettePath, title, fn);
    }
    removeAllCassettes() {
        return new Promise((res, rej) => {
            rimraf(this.cassettePath, (err) => {
                if (err) {
                    rej(err);
                }
                else {
                    res();
                }
            });
        });
    }
}
exports.TapeDeck = TapeDeck;
class MochaTapeDeck extends mocha.Test {
    constructor(cassettePath, title, fn) {
        super(title, fn);
        this.cassettePath = cassettePath;
        this.fnPrefix = () => { };
        this.fnSuffix = () => { };
        this.actionSpecified = false;
    }
    recordCassette(cassetteFileName) {
        this.actionSpecified = true;
        if (process.env.NO_CASSETTE_MOCKING) {
            return this;
        }
        if (!this.fn) {
            return this;
        }
        let cassetteFilePath;
        this.fnPrefix = () => {
            if (!fs.existsSync(this.cassettePath)) {
                fs.mkdirSync(this.cassettePath);
            }
            if (fs.existsSync(this.getCassetteFilePath(cassetteFileName))) {
                cassetteFilePath = cassetteFileName ? path.join(this.cassettePath, cassetteFileName) : this.getCassetteFilePath();
                fs.unlinkSync(cassetteFilePath);
            }
            nock.recorder.rec(({
                dont_print: true,
                use_separator: false,
                output_objects: true
            }));
        };
        this.fnSuffix = () => {
            const res = nock.recorder.play();
            fs.writeFileSync(this.getCassetteFilePath(cassetteFileName), JSON.stringify(res, null, 2));
        };
        return this;
    }
    playCassette(cassetteFileName) {
        this.actionSpecified = true;
        if (process.env.NO_CASSETTE_MOCKING) {
            return this;
        }
        this.fnPrefix = () => {
            const cassettePath = this.getCassetteFilePath(cassetteFileName);
            nock.load(cassettePath);
            if (!nock.isActive()) {
                nock.activate();
            }
        };
        this.fnSuffix = () => {
        };
        return this;
    }
    selectCassetteAction(fn, cassettePath) {
        return fn() === 'record' ? this.recordCassette() : this.playCassette(cassettePath);
    }
    register(suite, options = { failIfNoCassette: false }) {
        const originalFn = this.fn;
        this.fn = (done) => {
            try {
                if (!this.actionSpecified) {
                    if (this.cassetteExists(this.getCassetteFilePath())) {
                        this.playCassette();
                    }
                    else {
                        if (options.failIfNoCassette) {
                            throw new Error('Expected cassette file for mocha tape-deck player does not exist');
                        }
                        this.recordCassette();
                    }
                }
                this.fnPrefix();
                let testExecutedPromise;
                let doneWrapper;
                const donePromise = new Promise((res) => {
                    doneWrapper = res;
                });
                const returnVal = originalFn(done ? doneWrapper : undefined);
                // sanity check for promise case
                if (returnVal && returnVal.then) {
                    testExecutedPromise = returnVal;
                }
                else {
                    //test was synchronous
                    testExecutedPromise = Promise.resolve();
                }
                testExecutedPromise
                    .then(() => {
                    if (done) {
                        return donePromise
                            .then((res) => {
                            done(res);
                        });
                    }
                })
                    .then(() => this.fnSuffix())
                    .then(this.resetNock.bind(this))
                    .catch(() => {
                    this.resetNock.bind(this);
                });
                // if we return with a done fn defined, we get the error Resolution method is overspecified.
                if (!done) {
                    return testExecutedPromise;
                }
            }
            catch (e) {
                // catches timeout errors. Mocha magic handles the rest. NOTE, this is incredibly hard to test for
                this.resetNock();
            }
        };
        suite.addTest(this);
    }
    resetNock() {
        nock.recorder.clear();
        nock.cleanAll();
        nock.restore();
    }
    cassetteExists(filePath) {
        return fs.existsSync(filePath);
    }
    getCassetteFilePath(filename) {
        return path.join(this.cassettePath, filename || this.getCassetteName());
    }
    getCassetteName(filename) {
        // remove all spaces and /, replace them with _ and - respectively
        return sanitize(filename || this.fullTitle()) + '.cassette';
    }
}
exports.MochaTapeDeck = MochaTapeDeck;
//# sourceMappingURL=index.js.map