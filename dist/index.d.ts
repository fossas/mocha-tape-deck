import * as mocha from 'mocha';
export declare type RegistrationOptions = {
    failIfNoCassette: boolean;
};
export interface ICompilable {
    register(suite: mocha.Suite, options?: RegistrationOptions): void;
    timeout(n: number | string): ICompilable;
}
export interface IRecordable {
    recordCassette(cassetteFileName?: string): ICompilable;
}
export interface IPlayable {
    playCassette(cassetteFileName?: string): ICompilable;
}
export declare function TestTapeDeck(cassettePath: string, title: string, fn?: mocha.Func | mocha.AsyncFunc): MochaTapeDeck;
export declare class TapeDeck {
    private cassettePath;
    constructor(cassettePath: string);
    createTest(title: string, fn?: mocha.Func | mocha.AsyncFunc): MochaTapeDeck;
    removeAllCassettes(): Promise<void>;
}
export declare class MochaTapeDeck extends mocha.Test implements ICompilable, IRecordable, IPlayable {
    private cassettePath;
    private fnPrefix;
    private fnSuffix;
    private actionSpecified;
    constructor(cassettePath: string, title: string, fn?: mocha.Func | mocha.AsyncFunc);
    recordCassette(cassetteFileName?: string): ICompilable;
    playCassette(cassetteFileName?: string): ICompilable;
    selectCassetteAction(fn: () => 'record' | 'play', cassettePath?: string): ICompilable;
    register(suite: mocha.Suite, options?: RegistrationOptions): void;
    private resetNock;
    private cassetteExists;
    private getCassetteFilePath;
    private getCassetteName;
}
