export async function wait(ms: number = 0) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

type Callback<T> = (err: any, value?: T) => void;
type GetterFunc<T> = (cb: Callback<T>) => void;
type SetterFunc<T> = (newValue: T, cb: Callback<T>) => void;

export function asyncGetCallback<T>(f: () => Promise<T>): GetterFunc<T> {
    return (cb) => {
        f()
            .then(value => cb(null, value))
            .catch(err => cb(err));
    };
}

export function asyncSetCallback<T>(f: (newValue: T) => Promise<void>): SetterFunc<T> {
    return (newValue, cb) => {
        f(newValue)
            .then(() => cb(null))
            .catch(err => cb(err));
    }
}
