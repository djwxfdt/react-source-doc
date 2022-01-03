import { join, resolve } from 'path'
import { defineConfig } from 'vite'

/**
 * @type {import('vite').UserConfig}
 */
const config = defineConfig({
  define: {
    global: {
      "__DEV__": true,
      "__EXPERIMENTAL__": false,
      "__PROFILE__": false,
      "__REACT_DEVTOOLS_GLOBAL_HOOK__": false,
      "__VARIANT__": false
    }
  },
  server: {
    port: 4002,
  },
  resolve: {
    alias: {
      '@': join(__dirname, 'src')
    }
  }
})

export default config
