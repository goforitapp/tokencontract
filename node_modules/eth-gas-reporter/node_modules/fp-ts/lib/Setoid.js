"use strict";
/**
 * @file The `Setoid` type class represents types which support decidable equality.
 *
 * Instances must satisfy the following laws:
 *
 * 1. Reflexivity: `S.equals(a, a) === true`
 * 2. Symmetry: `S.equals(a, b) === S.equals(b, a)`
 * 3. Transitivity: if `S.equals(a, b) === true` and `S.equals(b, c) === true`, then `S.equals(a, c) === true`
 *
 * See [Getting started with fp-ts: Setoid](https://dev.to/gcanti/getting-started-with-fp-ts-setoid-39f3)
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @since 1.14.0
 * @deprecated
 */
// tslint:disable-next-line: deprecation
exports.fromEquals = function (equals) {
    return {
        equals: function (x, y) { return x === y || equals(x, y); }
    };
};
/**
 * @since 1.0.0
 * @deprecated
 */
exports.strictEqual = function (a, b) {
    return a === b;
};
// tslint:disable-next-line: deprecation
var setoidStrict = { equals: exports.strictEqual };
/**
 * @since 1.0.0
 * @deprecated
 */
// tslint:disable-next-line: deprecation
exports.setoidString = setoidStrict;
/**
 * @since 1.0.0
 * @deprecated
 */
// tslint:disable-next-line: deprecation
exports.setoidNumber = setoidStrict;
/**
 * @since 1.0.0
 * @deprecated
 */
// tslint:disable-next-line: deprecation
exports.setoidBoolean = setoidStrict;
/**
 * @since 1.0.0
 * @deprecated
 */
// tslint:disable-next-line: deprecation
exports.getArraySetoid = function (S) {
    // tslint:disable-next-line: deprecation
    return exports.fromEquals(function (xs, ys) { return xs.length === ys.length && xs.every(function (x, i) { return S.equals(x, ys[i]); }); });
};
/**
 * @since 1.14.2
 * @deprecated
 */
exports.getStructSetoid = function (
// tslint:disable-next-line: deprecation
setoids
// tslint:disable-next-line: deprecation
) {
    // tslint:disable-next-line: deprecation
    return exports.fromEquals(function (x, y) {
        for (var k in setoids) {
            if (!setoids[k].equals(x[k], y[k])) {
                return false;
            }
        }
        return true;
    });
};
/**
 * Use `getStructSetoid` instead
 * @since 1.0.0
 * @deprecated
 */
exports.getRecordSetoid = function (
// tslint:disable-next-line: deprecation
setoids
// tslint:disable-next-line: deprecation
) {
    // tslint:disable-next-line: deprecation
    return exports.getStructSetoid(setoids);
};
/**
 * Given a tuple of `Setoid`s returns a `Setoid` for the tuple
 *
 * @example
 * import { getTupleSetoid, setoidString, setoidNumber, setoidBoolean } from 'fp-ts/lib/Setoid'
 *
 * const S = getTupleSetoid(setoidString, setoidNumber, setoidBoolean)
 * assert.strictEqual(S.equals(['a', 1, true], ['a', 1, true]), true)
 * assert.strictEqual(S.equals(['a', 1, true], ['b', 1, true]), false)
 * assert.strictEqual(S.equals(['a', 1, true], ['a', 2, true]), false)
 * assert.strictEqual(S.equals(['a', 1, true], ['a', 1, false]), false)
 *
 * @since 1.14.2
 * @deprecated
 */
// tslint:disable-next-line: deprecation
exports.getTupleSetoid = function () {
    var setoids = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        setoids[_i] = arguments[_i];
    }
    // tslint:disable-next-line: deprecation
    return exports.fromEquals(function (x, y) { return setoids.every(function (S, i) { return S.equals(x[i], y[i]); }); });
};
/**
 * Use `getTupleSetoid` instead
 * @since 1.0.0
 * @deprecated
 */
// tslint:disable-next-line: deprecation
exports.getProductSetoid = function (SA, SB) {
    // tslint:disable-next-line: deprecation
    return exports.getTupleSetoid(SA, SB);
};
/**
 * Returns the `Setoid` corresponding to the partitions of `B` induced by `f`
 *
 * @since 1.2.0
 * @deprecated
 */
// tslint:disable-next-line: deprecation
exports.contramap = function (f, fa) {
    // tslint:disable-next-line: deprecation
    return exports.fromEquals(function (x, y) { return fa.equals(f(x), f(y)); });
};
/**
 * @since 1.4.0
 * @deprecated
 */
// tslint:disable-next-line: deprecation
exports.setoidDate = exports.contramap(function (date) { return date.valueOf(); }, exports.setoidNumber);
