import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'nbpf7c4u',
    dataset: 'production'
  },
  deployment: {
    appId: 'fnctso8udd893thun0y04d0f',
    autoUpdates: true,
  }
})
