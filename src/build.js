import ClosureCompiler from "google-closure-compiler";
import { minify } from "html-minifier-terser";
import fs from "fs";

console.log("Building...");

const args = new Set(process.argv.slice(2));
const debug = args.has("--debug");
const symbols = args.has("--symbols");
const format = args.has("--format");

/**
 * 
 * @param {string} entry 
 * @returns {Promise<string>}
 */
function compileJS(entry) {
	return new Promise((resolve, reject) => {
		const compiler = new ClosureCompiler.compiler(
			/** @type {Record<String,string|boolean|string[]>} */({
				js: '"src/js/**.js"',
				compilation_level: "ADVANCED",
				assume_function_wrapper: true,
				language_out: "ECMASCRIPT_2015",
				dependency_mode: "PRUNE",
				entry_point: entry,
				warning_level: "VERBOSE",
				isolation_mode: "IIFE",
				define: ["compiled=true", ...(debug ? ["release=false"] : ["release=true"])],
				rewrite_polyfills: false,
				//jscomp_error: "*",
				jscomp_off: ["lintChecks", "extraRequire", "checkTypes"],
				...(format ? { formatting: "PRETTY_PRINT" } : {}),
				...(symbols ? { debug: true } : {})
			})
		);
		compiler.run((exitCode, stdout, stderr) => {
			if (exitCode === 0) {
				resolve(stdout);
			} else {
				reject(
					`Google Closure Compiler failed to compile "${entry}" with exit code ` +
					`${exitCode}:\n${stderr}`
				);
			}
		})
	});
}


const client = compileJS("src/js/app.js");

const file = fs.readFileSync("./src/app.html", { encoding: "utf-8" });
let minified = await minify(file, {
	removeAttributeQuotes: true,
	removeComments: true,
	collapseWhitespace: true,
	minifyCSS: true,
	collapseBooleanAttributes: true
});

minified = minified
	.replace(
		'<script type=module src=./js/app-test.js defer></script>',
		`<script defer>\n${await client}</script>`
	);

const out = "index.html";

fs.writeFileSync(out, minified, { encoding: "utf-8" });

console.log("Build complete");




