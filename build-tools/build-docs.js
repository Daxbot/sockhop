
const jsdoc2md = require('jsdoc-to-markdown');
const { readFileSync, writeFileSync } = require('fs');
const { resolve, join } = require('path');
const { sync:glob } = require('glob');

const EMPTY_STRING = '​';

set_empty_string = function(data) {
    // Hacky fix for: https://github.com/jsdoc/jsdoc/issues/1529
    data.forEach((e)=>{
        if (typeof(e.params) === 'object') {
                e.params.forEach((p)=>{
                    if (p.defaultvalue === '""') {
                        p.defaultvalue = EMPTY_STRING;
                    }
                })
        }
    })
}

const output_fp = resolve(join(__dirname,`../API.md`))
let files = []

glob(resolve(join(__dirname,"../*.js"))).forEach((fp)=> {

    console.log(`[build_documentation] : Found file '${fp}'`);
    let data = readFileSync(fp, 'utf-8');
    if (
        data.includes("/**") // all jsdoc-style comments
    ) {
        files.push(fp)
    }
})
glob(resolve(join(__dirname,"../lib/*.js"))).forEach((fp)=> {

    console.log(`[build_documentation] : Found file '${fp}'`);
    let data = readFileSync(fp, 'utf-8');
    if (
        data.includes("/**") // all jsdoc-style comments
    ) {
        files.push(fp)
    }
})

console.log();
console.log(`[build_documentation] : Building documentation into '${output_fp}'`);
data = jsdoc2md.getTemplateDataSync({files: files, configure: "build-tools/jsdoc_configuration.json"})
set_empty_string(data)
output = jsdoc2md.renderSync({ data: data })
writeFileSync(output_fp, output)
