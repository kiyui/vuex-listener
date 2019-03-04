# vuex-listener
[![Build Status](https://travis-ci.org/TimurKiyivinski/vuex-listener.svg?branch=master)](https://travis-ci.org/TimurKiyivinski/vuex-listener)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

A global Vuex `action` and `mutation` listener plugin, for optimisation purposes.

## justification
The `Vuex.Store` instance provides `subscribe` and `subscribeAction` methods, but every invocation of this method sets up another global listener that listens to every single mutation and action.

This plugin provides a `$storeListener` singleton such that all listeners are dispatched from a single source.

## demo
Check out the [demo](https://stackblitz.com/edit/vuex-listener-demo) on StackBlitz.

## usage
```
# requires vuex@^3.1.0
npm install --save vuex-listener@latest
```

`vuex-listener` exposes both the `Vue` plugin as well as the underlying `Listener` class for maximum flexibility.

### as global plugin
```typescript
import Vue from 'vue'
import Vuex from 'vuex'
import { VuexListener } from 'vuex-listener'

Vue.use(Vuex)
Vue.use(VuexListener)

interface State {
  ...etc
}

const store = new Vuex.Store<State>({
  ...etc
})

const vm = new Vue({
  store,
  created () {
    this.$storeListener.addMutationListener('MUTATION', (payload: any, state: State) => {
      // do your thing
    })
  },
  ...etc
})
```

### as a standalone class
You can use the exported `Listener` class over your global `Vuex.Store` instance:
```typescript
import Vuex from 'vuex'
import { Listener } from 'vuex-listener'

const store = new Vuex.Store<State>({ ...etc })
const listener = new Listener<State>(store)
```
The `Listener` class can be used as a standalone class in your component:
```typescript
import { Vue, Component } from 'vue-property-decorator'
import { Listener } from 'vuex-listener'

@Component
export default class ExampleComponent extends Vue {
  private listener: Listener<State>
  private unsubscribers: Array<Function>

  public created () {
    this.listener = new Listener(this.$store)
    this.unsubscribers = []

    this.unsubscribers.push(this.listener.addMutationListener('MUTATION', (payload: any, state: State) => {
      // do your thing
    }))
  }

  public beforeDestroy () {
    this.unsubscribers.forEach((unsub) => unsub())
  }
}
```
## as a vuex plugin
```typescript
import Vuex from 'vuex'
import { VuexListener } from 'vuex-listener'

function VuexListenerPlugin (store) {
  const listener = new Listener(store)
  // do your thing
}

const store = new Vuex.Store({
  plugins: [VuexListenerPlugin]
})
```

## api
The `Listener` class exposes 3 methods:
```typescript
type addMutationListener = (mutation: string, (payload: any, state: S)) => UnsubscribeFn
type addBeforeActionListener = (action: string, (payload: any, state: S)) => UnsubscribeFn
type addAfterActionListener = (action: string, (payload: any, state: S)) => UnsubscribeFn
```
Each method returns an `UnsubscribeFn` that can be used to remove a particular listener.
