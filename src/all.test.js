/* eslint-env jest */

const configPaths = require('../config/paths.json')
const PORT = configPaths.ports.test

const { renderSass } = require('../lib/jest-helpers')

let baseUrl = 'http://localhost:' + PORT

beforeAll(async (done) => {
  // Capture JavaScript errors.
  page.on('pageerror', error => {
    // If the stack trace includes 'all.js' then we want to fail these tests.
    if (error.stack.includes('all.js')) {
      throw error
    }
  })
  done()
})

describe('GOV.UK Frontend', () => {
  describe('javascript', () => {
    it('can be accessed via `GOVUKFrontend`', async () => {
      await page.goto(baseUrl + '/', { waitUntil: 'load' })

      const GOVUKFrontendGlobal = await page.evaluate(() => window.GOVUKFrontend)

      expect(typeof GOVUKFrontendGlobal).toBe('object')
    })
    it('exports `initAll` function', async () => {
      await page.goto(baseUrl + '/', { waitUntil: 'load' })

      const typeofInitAll = await page.evaluate(() => typeof window.GOVUKFrontend.initAll)

      expect(typeofInitAll).toEqual('function')
    })
    it('exports Components', async () => {
      await page.goto(baseUrl + '/', { waitUntil: 'load' })

      const GOVUKFrontendGlobal = await page.evaluate(() => window.GOVUKFrontend)

      var components = Object.keys(GOVUKFrontendGlobal).filter(method => method !== 'initAll')

      // Ensure GOV.UK Frontend exports the expected components
      expect(components).toEqual([
        'Accordion',
        'Button',
        'Details',
        'CharacterCount',
        'Checkboxes',
        'ErrorSummary',
        'Header',
        'Radios',
        'Tabs'
      ])
    })
    it('exported Components can be initialised', async () => {
      await page.goto(baseUrl + '/', { waitUntil: 'load' })

      const GOVUKFrontendGlobal = await page.evaluate(() => window.GOVUKFrontend)

      var components = Object.keys(GOVUKFrontendGlobal).filter(method => method !== 'initAll')

      // Check that all the components on the GOV.UK Frontend global can be initialised
      components.forEach(component => {
        page.evaluate(component => {
          const Component = window.GOVUKFrontend[component]
          const $module = document.documentElement
          new Component($module).init()
        }, component)
      })
    })
    it('can be initialised scoped to certain sections of the page', async () => {
      await page.goto(baseUrl + '/examples/scoped-initialisation', { waitUntil: 'load' })

      // To test that certain parts of the page are scoped we have two similar components
      // that we can interact with to check if they're interactive.

      // Check that the conditional reveal component has a conditional section that would open if enhanced.
      await page.waitForSelector('#conditional-not-scoped', { hidden: true })

      await page.click('[for="not-scoped"]')

      // Check that when it is clicked that nothing opens, which shows that it has not been enhanced.
      await page.waitForSelector('#conditional-not-scoped', { hidden: true })

      // Check the other conditional reveal which has been enhanced based on it's scope.
      await page.waitForSelector('#conditional-scoped', { hidden: true })

      await page.click('[for="scoped"]')

      // Check that it has opened as expected.
      await page.waitForSelector('#conditional-scoped', { hidden: false })
    })
  })
  describe('global styles', () => {
    it('are disabled by default', async () => {
      const sass = `
        @import "all";
      `
      const results = await renderSass({ data: sass })
      expect(results.css.toString()).not.toContain(', a {')
      expect(results.css.toString()).not.toContain(', p {')
    })
    it('are enabled if $global-styles variable is set to true', async () => {
      const sass = `
        $govuk-global-styles: true;
        @import "all";
      `
      const results = await renderSass({ data: sass })
      expect(results.css.toString()).toContain(', a {')
      expect(results.css.toString()).toContain(', p {')
    })
  })

  // Sass functions will be automatically evaluated at compile time and the
  // return value from the function will be used in the compiled CSS.
  //
  // However, CSS has native 'function'-esque syntax as well
  // (e.g. `background-image: url(...)`) and so if you call a non-existent
  // function then Sass will just include it as part of your CSS. This means if
  // you rename a function, or accidentally include a typo in the function name,
  // these function calls can end up in the compiled CSS.
  //
  // Example:
  //
  //   @function govuk-double($number) {
  //     @return $number * 2;
  //   }
  //
  //   .my-class {
  //     height: govuk-double(10px);
  //     width: govuk-duoble(10px);
  //   }
  //
  // Rather than throwing an error, the compiled CSS would look like:
  //
  //   .my-class {
  //     height: 20px;
  //     width: govuk-duoble(10px); // intentional typo
  //   }
  //
  // This test attempts to match anything that looks like a function call within
  // the compiled CSS - if it finds anything, it will result in the test
  // failing.
  it('does not contain any unexpected govuk- function calls', async () => {
    const sass = `@import "all"`

    const results = await renderSass({ data: sass })
    const css = results.css.toString()

    const functionCalls = css.match(/_?govuk-[\w-]+\(.*?\)/g)

    expect(functionCalls).toBeNull()
  })
})
