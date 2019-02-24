import Vue from 'vue'
import Vuex, { Store } from 'vuex'
import { VuexListener, Listener } from './plugin'
import _ from 'lodash'

describe('vuex-listener', () => {
  beforeAll(() => {
    Vue.use(Vuex)
    Vue.use(VuexListener)
  })

  beforeEach(() => {
    document.body.innerHTML = `<div id="app"></div>`
  })

  test('$storeListener instance is attached and working in Vue instance', async done => {
    const beforeActionListener = jest.fn()
    const afterActionListener = jest.fn()
    const mutationListener = jest.fn()

    const store = new Vuex.Store<any>({
      state () {
        return {
          fruits: []
        }
      },
      mutations: {
        ADD_FRUIT (state, { fruit }) {
          state.fruits.push(fruit.toUpperCase())
        }
      },
      actions: {
        addFruits (context, { fruits }) {
          fruits.forEach((fruit: string) => {
            context.commit('ADD_FRUIT', { fruit })
          })
        }
      }
    })

    const vm = new Vue({
      el: '#app',
      store,
      computed: Vuex.mapState(['fruits']),
      mounted () {
        this.$storeListener.addBeforeActionListener('addFruits', (payload: any, state: any) => {
          beforeActionListener({
            payload: _.cloneDeep(payload),
            state: _.cloneDeep(state)
          })
        })

        this.$storeListener.addAfterActionListener('addFruits', (payload: any, state: any) => {
          afterActionListener({
            payload: _.cloneDeep(payload),
            state: _.cloneDeep(state)
          })
        })

        this.$storeListener.addMutationListener('ADD_FRUIT', (payload: any, state: any) => {
          mutationListener({
            payload: _.cloneDeep(payload),
            state: _.cloneDeep(state)
          })
        })
      },
      render: h => h('div')
    })

    // Make sure instance is a Listener
    expect(vm.$storeListener).toBeInstanceOf(Listener)

    // Attempt call on empty state
    await vm.$store.dispatch('addFruits', {
      fruits: ['lasŭ', 'sibu']
    })

    expect(beforeActionListener.mock.calls).toEqual([
      [{ payload: { fruits: ['lasŭ', 'sibu'] }, state: { fruits: [] } }]
    ])

    expect(afterActionListener.mock.calls).toEqual([
      [{ payload: { fruits: ['lasŭ', 'sibu'] }, state: { fruits: ['LASŬ', 'SIBU'] } }]
    ])

    expect(mutationListener.mock.calls).toEqual([
      [{ payload: { fruit: 'lasŭ' }, state: { fruits: ['LASŬ'] } }],
      [{ payload: { fruit: 'sibu' }, state: { fruits: ['LASŬ', 'SIBU'] } }]
    ])

    // Attempt call on populated state
    await vm.$store.dispatch('addFruits', {
      fruits: ['dihan', 'pi\'an']
    })

    expect(beforeActionListener.mock.calls).toEqual([
      [{ payload: { fruits: ['lasŭ', 'sibu'] }, state: { fruits: [] } }],
      [{ payload: { fruits: ['dihan', 'pi\'an'] }, state: { fruits: ['LASŬ', 'SIBU'] } }]
    ])

    expect(afterActionListener.mock.calls).toEqual([
      [{ payload: { fruits: ['lasŭ', 'sibu'] }, state: { fruits: ['LASŬ', 'SIBU'] } }],
      [{ payload: { fruits: ['dihan', 'pi\'an'] }, state: { fruits: ['LASŬ', 'SIBU', 'DIHAN', 'PI\'AN'] } }]
    ])

    expect(mutationListener.mock.calls).toEqual([
      [{ payload: { fruit: 'lasŭ' }, state: { fruits: ['LASŬ'] } }],
      [{ payload: { fruit: 'sibu' }, state: { fruits: ['LASŬ', 'SIBU'] } }],
      [{ payload: { fruit: 'dihan' }, state: { fruits: ['LASŬ', 'SIBU', 'DIHAN'] } }],
      [{ payload: { fruit: 'pi\'an' }, state: { fruits: ['LASŬ', 'SIBU', 'DIHAN', 'PI\'AN'] } }]
    ])

    done()
  })

  test('$storeListener instance is passed to component children', () => {
    const store = new Vuex.Store({})
    let childStoreListener, parentStoreListener

    const childOptions: any = {
      mounted () {
        childStoreListener = this.$storeListener
      },
      render: (h: Vue.CreateElement) => h('span', {}, ['I am the child'])
    }

    const vm = new Vue({
      el: '#app',
      store,
      mounted () {
        parentStoreListener = this.$storeListener
      },
      render: (h: Vue.CreateElement) => h('div', {}, [ 'I am the parent', h(childOptions) ])
    })

    // Assert that child has listener
    expect(childStoreListener).toBeInstanceOf(Listener)
    expect(childStoreListener).toEqual(parentStoreListener)
  })

  test('$storeListener methods can be unsubscribed', async done => {
    const beforeActionListener = jest.fn()
    const afterActionListener = jest.fn()
    const mutationListener = jest.fn()

    // These listeners would not be unsubbed
    const beforeActionListenerStays = jest.fn()
    const afterActionListenerStays = jest.fn()
    const mutationListenerStays = jest.fn()

    const store = new Vuex.Store<any>({
      state () {
        return {
          distros: []
        }
      },
      mutations: {
        ADD_DISTRO (state, { distro }) {
          state.distros.push(`${distro} Linux`)
        }
      },
      actions: {
        addDistros (context, { distros }) {
          distros.forEach((distro: string) => {
            context.commit('ADD_DISTRO', { distro })
          })
        }
      }
    })

    const listener = new Listener(store)
    const unsubBeforeActions = listener.addBeforeActionListener('addDistros', beforeActionListener)
    const unsubAfterActions = listener.addAfterActionListener('addDistros', afterActionListener)
    const unsubMutations = listener.addMutationListener('ADD_DISTRO', mutationListener)
    listener.addBeforeActionListener('addDistros', beforeActionListenerStays)
    listener.addAfterActionListener('addDistros', afterActionListenerStays)
    listener.addMutationListener('ADD_DISTRO', mutationListenerStays)

    await store.dispatch('addDistros', { distros: ['Arch', 'Debian', 'Fedora'] })

    // Assert initial call times
    expect(beforeActionListener).toHaveBeenCalledTimes(1)
    expect(afterActionListener).toHaveBeenCalledTimes(1)
    expect(mutationListener).toHaveBeenCalledTimes(3)
    expect(beforeActionListenerStays).toHaveBeenCalledTimes(1)
    expect(afterActionListenerStays).toHaveBeenCalledTimes(1)
    expect(mutationListenerStays).toHaveBeenCalledTimes(3)

    unsubAfterActions()
    unsubBeforeActions()
    unsubMutations()

    await store.dispatch('addDistros', { distros: ['Kali', 'Trisquel'] })

    // Assert unsub call times
    expect(beforeActionListener).toHaveBeenCalledTimes(1)
    expect(afterActionListener).toHaveBeenCalledTimes(1)
    expect(mutationListener).toHaveBeenCalledTimes(3)
    expect(beforeActionListenerStays).toHaveBeenCalledTimes(2)
    expect(afterActionListenerStays).toHaveBeenCalledTimes(2)
    expect(mutationListenerStays).toHaveBeenCalledTimes(5)

    done()
  })

  test('Listener is invoked lazily', async done => {
    const store = new Vuex.Store({
      mutations: { noop: () => false, oop: () => true },
      actions: { noop: () => false, oop: () => true }
    })

    const listener: any = new Listener(store)

    // Spies
    const mutationSubscribe = jest.spyOn(store, 'subscribe')
    const actionSubscribe = jest.spyOn(store, 'subscribeAction')
    const beforeActionListener = jest.fn()
    const afterActionListener = jest.fn()
    const mutationListener = jest.fn()

    // Run store methods
    await store.commit('noop')
    await store.dispatch('noop')

    // Assert that store is unsubscribed
    expect(mutationSubscribe).toHaveBeenCalledTimes(0)
    expect(actionSubscribe).toHaveBeenCalledTimes(0)

    listener.addBeforeActionListener('oop', beforeActionListener)
    listener.addAfterActionListener('oop', afterActionListener)
    listener.addMutationListener('oop', mutationListener)

    // Assert that store is subscribed
    expect(mutationSubscribe).toHaveBeenCalledTimes(1)
    expect(actionSubscribe).toHaveBeenCalledTimes(1)

    await store.commit('noop')
    await store.dispatch('noop')

    // Assert that unlistened invocations are not listened to
    expect(beforeActionListener).toHaveBeenCalledTimes(0)
    expect(afterActionListener).toHaveBeenCalledTimes(0)
    expect(mutationListener).toHaveBeenCalledTimes(0)

    done()
  })
})
