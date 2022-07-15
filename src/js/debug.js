/**
 * Utility methods for performing runtime checks and logging. When debug mode is enabled, the checks
 * and logging are performed. When disabled, no checks or logging are done at all.
 */
export class Debug {
    /**
     * @param {boolean} assertion 
     * @param {...*} message
     */
    static assert(assertion, ...message) {
        if (Debug.enabled && !assertion) {
            let display = message.join("");
            throw new Error(display ? display : "Assertion failed.");
        }
    }

    /**
     * 
     * @param {*} message 
     */
    static log(message) {
        if (Debug.enabled) {
            console.log(message);
        }
    }

    /**
     * 
     * @param {*} message 
     */
    static warn(message) {
        if (Debug.enabled) {
            console.warn(message);
        }
    }

    /**
     * 
     * @param {*} instance 
     * @param {Function} superType 
     * @param {boolean=} nullable 
     */
    static type(instance, superType, nullable) {
        if (Debug.enabled) {
            if (instance === null) {
                if (!nullable) {
                    throw new Error("Instance is null.");
                }
            } else if (!(instance instanceof superType)) {
                throw new Error(instance + " is not an instance of " + superType);
            }
        }
    }

    /**
     * Unwraps the given nullable value into its nonnullable counterpart, throwing an error if the
     * value is null.
     * @template T
     * @param {Extract<T, null> extends never ? never : T} value 
     * @return {NonNullable<T>}
     */
    static unwrap(value) {
        if (Debug.enabled) {
            if (value !== null) {
                return /** @type {*} */(value);
            } else {
                throw new Error("Unwrapped null");
            }
        } else {
            return /** @type {*} */ (value);
        }
    }

    /**
     * @template T
     * @param {Record<number,T>} record
     * @param {number} key
     * @returns {T}
     */
    static index(record, key) {
        if (Debug.enabled) {
            const element = record[key];
            if (element === undefined) {
                throw new Error(`${element} is out of bounds`);
            }
            return element;
        } else {
            return /** @type {*} */(record[key]);
        }
    }

    /**
     * @template K
     * @template V
     * @param {Map<K,V>} map 
     * @param {K} key 
     * @returns {V}
     */
    static get(map, key) {
        if (Debug.enabled) {
            const value = map.get(key);
            if (value === undefined) {
                throw new Error(`"${value}" is not in the map`);
            }
            return value;
        } else {
            return /** @type {*} */(map.get(key));
        }
    }

    /**
     * @template T
     * @param {Record<string,T>} record 
     * @param {string} key 
     * @returns {T}
     */
    static indexString(record, key) {
        if (Debug.enabled) {
            const value = record[key];
            if (value === undefined) {
                throw new Error(`"${value}" is not in the record`);
            }
            return value;
        } else {
            return /** @type {*} */(record[key]);
        }
    }

    /**
     * @template {object} T
     * @template {new (...args:any[]) => InstanceType<C>} C
     * @param {(T extends InstanceType<C> ? never : T) & (InstanceType<C> extends T ? T : never)} object 
     * @param {C} type 
     * @returns {InstanceType<C>}
     */
    static cast(object, type) {
        if (Debug.enabled) {
            if (object instanceof type) {
                return object;
            } else {
                throw new Error(`${object.constructor.name} is not assignable to ${type.name}`);
            }
        } else {
            return /** @type {*} */(object);
        }
    }

    /**
     * Asserts that the given value is a string.
     * @param {*} value 
     * @return {string}
     */
    static string(value) {
        if (Debug.enabled) {
            if (typeof value === "string") {
                return value;
            } else {
                throw new Error("Value is not a string.");
            }
        } else {
            return value;
        }
    }

    /**
     * Asserts that the given value is a number.
     * @param {*} value 
     * @return {number}
     */
    static number(value) {
        if (Debug.enabled) {
            if (typeof value === "number" && !isNaN(value)) {
                return value;
            } else {
                throw new Error("Value is not a number");
            }
        } else {
            return value;
        }
    }

    /**
     * 
     * @param {*} value 
     * @returns {boolean}
     */
    static boolean(value) {
        if (Debug.enabled) {
            if (typeof value === "boolean") {
                return value;
            } else {
                throw new Error("Value is not a boolean");
            }
        } else {
            return value;
        }
    }

    /**
     * @template T
     * @param {T} value 
     * @param {string=} label 
     * @returns {T}
     */
    static value(value, label) {
        if (Debug.enabled) {
            console.log({ [label === undefined ? "debug" : label]: value });
        }
        return value;
    }

    /**
     * @template {Debug.TupleTemplate} T
     * @param {*[]} tuple 
     * @param {T} template
     * @returns {Debug.TemplateToTuple<T>}
     */
    static tuple(tuple, template) {
        if (Debug.enabled) {
            if (
                tuple.length === template.length &&
                template.reduce(
                    (matched, current, index) => {
                        const element = Debug.index(tuple, index);
                        return (matched && (
                            typeof element === current ||
                            element instanceof /** @type {Function} */(current)
                        ));
                    },
                    true
                )
            ) {
                return /** @type {*} */(tuple);
            } else {
                throw Error("Tuple does not match the template");
            }
        } else {
            return /** @type {*} */(tuple);
        }
    }

    /**
     * @template T
     * @param {T|undefined} value 
     * @returns {T}
     */
    static defined(value) {
        if (Debug.enabled) {
            if (value === undefined) {
                throw new Error("Value is undefined")
            } else {
                return value;
            }
        } else {
            return /** @type {T} */(value);
        }
    }
}

// @ts-expect-error Google Closure Compiler will rewrite this into a constant.
/** @define {boolean} @suppress {undefinedVars} */ const release = goog.define("release", false);

/** @const */ Debug.enabled = !release;

// @ts-expect-error Google Closure Compiler will rewrite this into a constant.
/** @define {boolean} @suppress {undefinedVars} */ const compiled = goog.define("compiled", false);

/** @const */ Debug.compiled = Boolean(compiled);

/**
 * @typedef {readonly (
 *      "string" | "number" | "boolean" | (abstract new (...args: any) => any)
 * )[]} Debug.TupleTemplate
 */

/**
 * @template {Debug.TupleTemplate} T
 * @typedef {any[] & {[K in keyof T]:
 *      T[K] extends "string" ? string :
 *      T[K] extends "number" ? number :
 *      T[K] extends "boolean" ? boolean :
 *      T[K] extends (abstract new (...args: any) => any) ? InstanceType<T[K]> :
 *      never
 * }} Debug.TemplateToTuple
 */