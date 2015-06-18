'use babel';
/*eslint-env jasmine */
let processor = require('../lib/javascript-processor.js');

const findLine = function(target, sourceLines) {
    let reg = new RegExp(`\\b${target}\\b`);
    for (let i = 0; i < sourceLines.length; i++) {
        if (reg.test(sourceLines[i])) {
            return i;
        }
    }
};

const linkForLine = function (links, lineNumber) {
    return links.filter(function( { range } ){
        return range[0][0] === lineNumber;
    })[0];
};

describe('javascript-processor', function() {
    let editor = null;

    beforeEach(function() {
      return waitsForPromise(function() {
        return atom.workspace.open('sample.js').then(function(e) {
          editor = e;
        });
      });
    });

    describe('process()', function() {
        beforeEach(function() {
            const source = `
            let relativeJS = require('./same.js')
            var relativeLESS = require('./same.less')
            const relative = require('./same')
            let relativeParent = require('../parent')
            let moduleName = require('some-module')
            let modulePath = require('some/complex/path')
            import ImportedModule from './imported_module';
            `;
            editor.setText(source);
            let result = processor.process(editor);
            console.log(result);

            this.addMatchers({
                toMatchPath(expectedPath) {
                    let lines = source.split('\n');
                    let i = findLine(this.actual, lines);
                    expect(i).not.toBeUndefined();

                    let link = linkForLine(result, i);

                    if (!link) {
                        return false;
                    }

                    // Services may attach any useful properties they want that
                    // might be useful when being passed back into followLink.
                    expect(link.moduleName).toBe(expectedPath);

                    let [
                        [startLine, startCol],
                        [endLine, endCol]
                    ] = link.range;
                    expect(startLine).toBe(endLine);

                    // Remove the quotes before comparing
                    startCol += 1;
                    endCol -= 1;
                    expect(lines[startLine].slice(startCol, endCol)).toBe(expectedPath);
                    return true;
                },
                toNotBeDetected() {
                    let lines = source.split('\n');
                    let i = findLine(this.actual, lines);
                    let link = linkForLine(result, i);

                    return link === undefined;
                }
            });
        });
        it('should mark these modules', function() {
            expect('relativeJS').toMatchPath('./same.js');
            expect('relativeLESS').toMatchPath('./same.less');
            expect('relative').toMatchPath('./same');
            expect('relativeParent').toMatchPath('../parent');

            expect('moduleName').toMatchPath('some-module');
            expect('modulePath').toMatchPath('some/complex/path');
            expect('ImportedModule').toMatchPath('./imported_module');
        });
    });
    describe('followLink()', function() {
        // I don't know how to write tests for this.
    });
    describe('scanForDestination()', function() {
        let scanFor = function(editor, target) {

            let [ lineNum, col ] = processor.scanForDestination(editor, {});
            let actual = editor.getText().split('\n')[lineNum]
                .slice(col, col + target.length );

            expect(actual).toBe(target);
        };

        it('locates module.exports', function() {
            let source = `
            class Same {

            }

            module.exports = Same
            `;
            editor.setText(source);
            scanFor(editor, 'module.exports');
        });
    });
});
