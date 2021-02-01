const log = console.log;

const iterable = {
    [Symbol.iterator](){
        let i = 3;
        return {
            next() {
                return i == 0 ? { done: true} : { value: i--, done: false };
            },
            [Symbol.iterator]() { return this; }
        }
    }
};

//yield는 순회할 값을 문장으로써 표현한다.
function *gen() {
    yield 1;
    // yield 2;
    if (false) yield 2;
    yield 3;
    return 100; // 마지막 순회할때에는 return은 인식하지 않는다. done과 같이 출력된다.
}

const _map = (data, f) => {
    let names = [];
    for (const p of data){
        names.push(f(p));
    }    
    return names;
}

const _filter = (data, f) => {
    let res = [];
    for ( const p of data ){
        if(f(p)) res.push(p);
    }
    return res;
}

const _reduce = (func, total, iter) => {
    if(!iter){
        iter = total[Symbol.iterator](); // total == iterator
        total = iter.next().value;
    }else {
        iter = iter[Symbol.iterator]();
    }

    for ( const a of iter ) {
        total = func(total, a);
    }
    return total;
}

const curry = f => (a, ..._) => _.length ? f(a, ..._) : (..._) => f(a, ..._);

const isPromise = (a, f) => a instanceof Promise ? a.then(f) : f(a);

//then의 두번째 인자에 catch처럼 동작 가능한 값을 넣을 수 있음
const reduceF = (total, t, f) => {
    return t instanceof Promise ? 
    t.then( t => f(total, t), e => e == nop ? total : Promise.reject(e)) : 
    f(total, t);
};

const head = iter => isPromise(take(1, iter), ([h]) => h);


const reduce = curry((func, total, iter) => {
    if(!iter) return reduce(func, head(iter = total[Symbol.iterator]()), iter);

    iter = iter[Symbol.iterator]();
    return isPromise(total, function recur(total) {
        let cur;
        while(!(cur = iter.next()).done){
            total = reduceF(total, cur.value, func);
            if ( total instanceof Promise ) return total.then(recur);
        }
        return total;
    });
});

const go = (...args) => reduce( (arg, f) => f(arg), args );
const pipe = (f, ...fs) => (...a) => go(f(...a), ...fs);


const mapCur = curry((f, iter) => {
    let res = [];
    iter = iter[Symbol.iterator]();
    let cur;
    while(!(cur = iter.next()).done){
        const a = cur.value;
        res.push(a);
    }
    
    return res;
});

const filterCur = curry((f, data) => {
    let res = [];
    for ( const p of data ){
        if(f(p)) res.push(p);
    }
    return res;
});

const reduceCur = curry((func, total, iter) => {
    if(!iter){
        iter = total[Symbol.iterator](); // total == iterator
        total = iter.next().value;
    }

    for ( const a of iter ) {
        total = func(total, a);
    }

    return total;
});

const range = l => {
    let i = -1;
    let result = []
    while(++i < l){
        // log(i, 'range')
        result.push(i);
    }
    return result;
};

const L = {};

L.range = function *(l){
    let i = -1;
    while(++i < l){
        // log(i, 'L.range')
        yield i; // 0-1 1-2 2-3 3-4
    }
};

const nop = Symbol('nop');

L.filter = curry(function *(f, iter) {
    for (const a of iter) {
        const b = isPromise(a, f);
        if ( b instanceof Promise ){
            /*
                a 가 Promise인 경우에도 다른 곳에서 then으로 풀어서 쓸거니깐
                정상값 외에 취소한것과 다름없는 값으로써 구분하겠다 라고 할거면 reject에 특정 값을
                담아서 보낸다.
            */
            yield b.then( b => b ? a : Promise.reject(nop))
        }else if (b) yield a
    };
});

L.map = curry(function *(f, iter) {
    for (const a of iter ) yield isPromise(a, f)
});

const take = curry((l, iter) => {
    let res = [];
    iter = iter[Symbol.iterator]();
    
    return function recur(){
        let cur;
        while ( !(cur = iter.next()).done ){
            const a = cur.value;
            if ( a instanceof Promise ) {
                return a.then(a => (res.push(a), res).length == l ? res : recur())
                .catch(e => e == nop ? recur() : Promise.reject(e));
            }
            if ( (res.push(a), res).length == l ) return res
        }
        return res;
    }();
});

const find = (f, iter) => go(
    iter,
    L.filter(f),
    take(1),
    ([a]) => a
);

const map = curry(pipe(
    L.map,
    take(Infinity)
))

const filter = curry(pipe(
    L.filter,
    take(Infinity)
))