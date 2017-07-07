"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.config = {
    homeDir: "./examples/course",
    scoTest: /sco*/,
    dev: {
        server: {
            root: ".",
            port: 4444,
            hmr: true
        },
        fusebox: {
            cache: false,
            log: true,
            debug: true,
            shim: {
                jquery: {
                    source: "node_modules/jquery/dist/jquery.js",
                    exports: "$",
                }
            }
        }
    }
};
