import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
    window.global = window;
    // @ts-ignore
    window.globalThis = window;
    window.process = {
        env: { NODE_ENV: 'production' },
        version: '',
        nextTick: (fn) => setTimeout(fn, 0),
        listeners: () => [],
        on: () => {},
        removeListener: () => {},
        emit: () => {},
    };
}
