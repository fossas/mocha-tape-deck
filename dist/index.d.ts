import * as mocha from 'mocha';
export declare class TestCassette extends mocha.Test {
    constructor(title: string, fn?: mocha.Func | mocha.AsyncFunc);
    writeCassets(): void;
    playCassette(file: string): void;
    private getCassetteName;
    private appendToFile;
}
