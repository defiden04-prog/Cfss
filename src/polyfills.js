import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
    window.global = window;
    window.process = {
        env: {},
        version: '',
        nextTick: (fn) => setTimeout(fn, 0),
        listeners: () => [],
        on: () => {},
        removeListener: () => {},
        emit: () => {},
    };
}
