/**
 * @jest-environment jsdom
 */


import { createContainer } from "../.."
import { LegacyRoot } from "../ReactRootTags"

test('测试createContainer', () => {

  const container = document.createElement('div')
  const root = createContainer(container,LegacyRoot, false, null, false, null)
  expect(root.tag).toBe(LegacyRoot)
})