import { PluginObject } from 'vue'
import { Store } from 'vuex'
import { Once } from 'lodash-decorators'

interface ListenerFn<S> {
  (payload: any, state: S): void
}

interface UnsubscribeFn {
  (): void
}

interface SubscriberFn<S> {
  (key: string, listener: ListenerFn<S>): UnsubscribeFn
}

interface Listeners<S> {
  mutationListeners: Partial<Record<string, ListenerFn<S>[]>>
  beforeActionListeners: Partial<Record<string, ListenerFn<S>[]>>
  afterActionListeners: Partial<Record<string, ListenerFn<S>[]>>
}

export class Listener<S> {
  private store: Store<S>
  private listeners: Listeners<S>
  public readonly addMutationListener: SubscriberFn<S>
  public readonly addBeforeActionListener: SubscriberFn<S>
  public readonly addAfterActionListener: SubscriberFn<S>

  constructor (store: Store<S>) {
    this.store = store
    this.listeners = {
      mutationListeners: {},
      beforeActionListeners: {},
      afterActionListeners: {}
    }

    // Set up subscriber methods
    this.addMutationListener = this.createSubscriber('mutationListeners', this.subscribeToMutations.bind(this))
    this.addBeforeActionListener = this.createSubscriber('beforeActionListeners', this.subscribeToActions.bind(this))
    this.addAfterActionListener = this.createSubscriber('afterActionListeners', this.subscribeToActions.bind(this))
  }

  @Once
  private subscribeToMutations () {
    this.store.subscribe((mutation, state) => {
      if (this.listeners.mutationListeners[mutation.type] === undefined) return
      this.listeners.mutationListeners[mutation.type]!.forEach(listener => listener(mutation.payload, state))
    })
  }

  @Once
  private subscribeToActions () {
    this.store.subscribeAction({
      before: (action, state) => {
        if (this.listeners.beforeActionListeners[action.type] === undefined) return
        this.listeners.beforeActionListeners[action.type]!.forEach(listener => listener(action.payload, state))
      },
      after: (action, state) => {
        if (this.listeners.afterActionListeners[action.type] === undefined) return
        this.listeners.afterActionListeners[action.type]!.forEach(listener => listener(action.payload, state))
      }
    })
  }

  /**
   * SubscriberFn method factory, used to reduce bundle size and avoid duplication
   */
  private createSubscriber (listeners: keyof Listener<S>['listeners'], subscribe: () => void): SubscriberFn<S> {
    return (key: string, listener: ListenerFn<S>) => {
      // Lazily subscribe to the store
      subscribe()

      // Set up listeners
      if (this.listeners[listeners][key] === undefined) {
        this.listeners[listeners][key] = []
      }

      // Add listener
      this.listeners[listeners][key]!.push(listener)

      // Unsubscribe function
      return () => {
        this.listeners[listeners][key] = this.listeners[listeners][key]!.filter(l => l !== listener)
      }
    }
  }
}

export const VuexListener: PluginObject<void> = {
  install (Vue) {
    Vue.mixin({
      beforeCreate () {
        const options = this.$options

        // Vuex is installed at the parent as a 'store' option:
        // ```
        // new Vue({
        //   store // Vuex instance
        // })
        // ```
        // We use this instance in order to initialise our listener.
        // From that point onwards, all children inherit the listener
        // as a static instance, just like Vuex.
        if (options.store) {
          this.$storeListener = new Listener(options.store)
        } else if (options.parent && options.parent.$storeListener) {
          this.$storeListener = options.parent.$storeListener
        }
      }
    })
  }
}
