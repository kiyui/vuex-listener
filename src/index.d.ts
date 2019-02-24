import { Listener } from './plugin'
export { Listener, VuexListener } from './plugin'

// Please redefine this in your source repository
declare module 'vue/types/vue' {
  interface Vue {
    $storeListener: Listener<any>
  }
}
