/**
 * Unit Tests — aiClassifier
 *
 * Tests the stub path (no API key) and the fallback path (API call throws).
 * We never call the real OpenAI API in tests.
 */

// Make sure no API key is set for these tests
process.env.OPENAI_API_KEY = ''

const { classifyGarment, stubClassify, STUB_RESPONSES } = require('../../src/services/aiClassifier')

describe('aiClassifier', () => {
  describe('stubClassify()', () => {
    it('returns a random entry from STUB_RESPONSES', () => {
      const result = stubClassify()
      expect(STUB_RESPONSES).toContainEqual(expect.objectContaining({ type: result.type }))
    })

    it('includes _source: stub', () => {
      expect(stubClassify()._source).toBe('stub')
    })

    it('always has required fields', () => {
      for (let i = 0; i < 10; i++) {
        const r = stubClassify()
        expect(r).toHaveProperty('type')
        expect(r).toHaveProperty('material')
        expect(r).toHaveProperty('damage')
        expect(r).toHaveProperty('complexity')
        expect(r).toHaveProperty('notes')
        expect(r.confidence).toMatchObject({
          type: expect.any(Number),
          material: expect.any(Number),
          damage: expect.any(Number),
          complexity: expect.any(Number),
        })
      }
    })
  })

  describe('classifyGarment() — stub mode (no API key)', () => {
    it('returns stub result when OPENAI_API_KEY is not set', async () => {
      const result = await classifyGarment('/any/path.jpg')
      expect(['stub', 'stub_fallback']).toContain(result._source)
    })

    it('does not throw even for a non-existent file', async () => {
      await expect(classifyGarment('/does/not/exist.jpg')).resolves.toBeDefined()
    })
  })

  describe('classifyGarment() — fallback on API error', () => {
    beforeAll(() => {
      // Mutate the already-loaded config singleton to inject a fake key
      // so the real code path (callGpt4o) is exercised and then caught
      const config = require('../../src/config')
      config.ai.openaiApiKey = 'fake-key-for-test'
    })

    afterAll(() => {
      const config = require('../../src/config')
      config.ai.openaiApiKey = ''
    })

    it('falls back to stub when API call fails (fs.readFileSync throws for missing file)', async () => {
      // /non/existent/path.jpg does not exist → fs.readFileSync throws → caught → stub_fallback
      const result = await classifyGarment('/non/existent/path.jpg')
      expect(result._source).toBe('stub_fallback')
      expect(result).toHaveProperty('_error')
      expect(result.type).toBeDefined()
    })
  })
})
