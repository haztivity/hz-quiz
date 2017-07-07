/**
 * @license
 * Copyright Davinchi. All Rights Reserved.
 */
import {ConfigService, IHaztivityCliConfig} from "@haztivity/cli";
export const config: IHaztivityCliConfig = {
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