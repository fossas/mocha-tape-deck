"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mocha = require("mocha");
const nock = require("nock");
const fs = require("fs");
const path = require("path");
class TestCassette extends mocha.Test {
    constructor(title, fn) {
        super(title, fn);
    }
    writeCassets() {
        if (!this.fn) {
            return;
        }
        const originalFn = this.fn;
        this.fn = ((context, done) => {
            nock.recorder.rec(({
                dont_print: true,
                use_separator: false,
                output_objects: true,
                logging: this.appendToFile.bind(this),
            }));
            let testExecutedPromise;
            const returnVal = originalFn(context, done);
            // sanity check for promise case
            if (returnVal && returnVal.then) {
                testExecutedPromise = returnVal;
            }
            else {
                //test was synchronous
                testExecutedPromise = Promise.resolve();
            }
            return returnVal;
        });
    }
    playCassette(file) {
    }
    getCassetteName() {
        return this.title.replace(" ", "_");
    }
    appendToFile(content) {
        fs.appendFileSync(path.join('./cassettes/', this.getCassetteName()), content);
    }
}
exports.TestCassette = TestCassette;
//# sourceMappingURL=index.js.map