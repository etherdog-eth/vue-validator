import ValidityControl from '../../../src/components/validity/index'
import Validity from '../../../src/components/validity.js'
import classes from 'component-classes'

const validityControl = ValidityControl(Vue)
const validity = Validity(Vue)

describe('validity functional component', () => {
  let el
  const components = {
    validityControl,
    validity,
    comp: {
      data () {
        return { value: 'hello' }
      },
      render (h) {
        return h('input', { attrs: { type: 'text' }})
      }
    },
    'comp-input': {
      props: ['options', 'value'],
      mounted () {
        this._handle = e => {
          this.$emit('input', e.target.value)
        }
        this.$el.addEventListener('change', this._handle)
      },
      destroyed () {
        this.$el.removeEventListener('change', this._handle)
      },
      render (h) {
        const options = this.options.map((option, index) => {
          return h('option', { ref: `option${index + 1}`, domProps: { value: option.value }}, [option.text])
        })
        return h('select', { ref: 'select' }, options)
      }
    }
  }

  beforeEach(() => {
    el = document.createElement('div')
  })

  describe('rendering', () => {
    it('should be work', done => {
      const vm = new Vue({
        components,
        render (h) {
          return h('div', [
            h('validity', {
              props: {
                field: 'field1',
                validators: { required: true }
              }
            }, [
              h('input', { attrs: { type: 'text' }})
            ])
          ])
        }
      }).$mount(el)
      waitForUpdate(() => {
        assert.equal(vm.$el.outerHTML, '<div><input type="text" class="untouched pristine"></div>')
      }).then(done)
    })
  })

  describe('properties', () => {
    it('should be work', done => {
      const vm = new Vue({
        components,
        render (h) {
          return h('div', [
            h('validity', {
              props: {
                field: 'field1',
                validators: { required: { rule: true, message: 'required !!' }}
              },
              ref: 'validity'
            }, [
              h('input', { attrs: { type: 'text' }})
            ])
          ])
        }
      }).$mount(el)
      const { validity } = vm.$refs
      const input = vm.$el.querySelector('input')
      let result = validity.result
      // created instance
      assert(result.valid === true)
      assert(result.invalid === false)
      assert(result.dirty === false)
      assert(result.pristine === true)
      assert(result.touched === false)
      assert(result.untouched === true)
      assert(result.modified === false)
      assert(result.required === false)
      // simulate inputing
      input.value = 'hello'
      triggerEvent(input, 'input')
      waitForUpdate(() => {
        result = validity.result
        assert(result.valid === true)
        assert(result.invalid === false)
        assert(result.dirty === true) // change
        assert(result.pristine === false) // change
        assert(result.touched === false)
        assert(result.untouched === true)
        assert(result.modified === true) // change
        assert(result.required === false)
      }).then(() => {
        // simulate focusout
        triggerEvent(input, 'focusout')
      }).thenWaitFor(1).then(() => {
        result = validity.result
        assert(result.valid === true)
        assert(result.invalid === false)
        assert(result.dirty === true)
        assert(result.pristine === false)
        assert(result.touched === true) // change
        assert(result.untouched === false) // change
        assert(result.modified === true)
        assert(result.required === false)
      }).then(() => {
        // simulate inputing
        input.value = ''
        // validate
        validity.validate()
        assert.equal(validity.progresses.required, 'running')
      }).thenWaitFor(1).then(() => {
        assert.equal(validity.progresses.required, '')
        result = validity.result
        assert(result.valid === false) // change
        assert(result.invalid === true) // change
        assert(result.dirty === true)
        assert(result.pristine === false)
        assert(result.touched === true)
        assert(result.untouched === false)
        assert(result.modified === true)
        assert.equal(result.required, 'required !!') // change
        assert.deepEqual(result.errors, [{
          field: 'field1',
          validator: 'required',
          message: 'required !!'
        }]) // add
      }).then(done)
    })
  })

  describe('event handling', () => {
    it('should be work', done => {
      const valid = jasmine.createSpy()
      const invalid = jasmine.createSpy()
      const touched = jasmine.createSpy()
      const dirty = jasmine.createSpy()
      const modified = jasmine.createSpy()
      const vm = new Vue({
        components,
        render (h) {
          return h('div', [
            h('validity', {
              props: {
                field: 'field1',
                validators: { required: true }
              },
              on: {
                valid,
                invalid,
                touched,
                dirty,
                modified
              }
            }, [
              h('input', {
                attrs: { type: 'text' },
                on: {
                  focusout (e) {
                    e.target.$validity.validate()
                  }
                }
              })
            ])
          ])
        }
      }).$mount(el)
      const input = vm.$el.querySelector('input')
      input.value = 'hello'
      triggerEvent(input, 'input')
      waitForUpdate(() => {
        assert(dirty.calls.count() === 1)
        assert(modified.calls.count() === 1)
      }).then(() => {
        triggerEvent(input, 'focusout')
      }).thenWaitFor(1).then(() => {
        assert(touched.calls.count() === 1)
        assert(valid.calls.count() === 1)
        assert(invalid.calls.count() === 0)
      }).then(() => {
        input.value = ''
        triggerEvent(input, 'input')
      }).thenWaitFor(1).then(() => {
        assert(dirty.calls.count() === 1)
        assert(modified.calls.count() === 2)
      }).then(() => {
        triggerEvent(input, 'focusout')
      }).thenWaitFor(1).then(() => {
        assert(touched.calls.count() === 1)
        assert(valid.calls.count() === 1)
        assert(invalid.calls.count() === 1)
      }).then(done)
    })
  })

  describe('multiple validate', () => {
    it('should be work', done => {
      const vm = new Vue({
        components,
        render (h) {
          return h('div', [
            h('validity', {
              props: {
                field: 'field1',
                validators: {
                  pattern: { rule: '/^[-+]?[0-9]+$/', message: 'not pattern !!' },
                  maxlength: { rule: 4, message: 'too long !!' }
                }
              },
              ref: 'validity'
            }, [
              h('input', { attrs: { type: 'text' }})
            ])
          ])
        }
      }).$mount(el)
      const { validity } = vm.$refs
      const input = vm.$el.querySelector('input')
      let result
      waitForUpdate(() => {
        input.value = 'hello' // invalid value inputing
        validity.validate() // validate !!
      }).thenWaitFor(1).then(() => {
        result = validity.result
        assert.equal(result.pattern, 'not pattern !!')
        assert.equal(result.maxlength, 'too long !!')
        assert.deepEqual(result.errors, [{
          field: 'field1',
          validator: 'pattern',
          message: 'not pattern !!'
        }, {
          field: 'field1',
          validator: 'maxlength',
          message: 'too long !!'
        }])
        assert(validity.valid === false)
        assert(validity.invalid === true)
        assert(result.valid === false)
        assert(result.invalid === true)
      }).then(() => {
        // valid value inputing
        input.value = '123' // valid value inputing
        validity.validate() // validate !!
      }).thenWaitFor(1).then(() => {
        result = validity.result
        assert(result.pattern === false)
        assert(result.maxlength === false)
        assert(result.errors === undefined)
        assert(validity.valid === true)
        assert(validity.invalid === false)
        assert(result.valid === true)
        assert(result.invalid === false)
      }).then(done)
    })
  })

  describe('custom validate', () => {
    it('should be work', done => {
      const vm = new Vue({
        components,
        render (h) {
          return h('div', [
            h('validity', {
              props: {
                field: 'field1',
                validators: ['required', 'numeric']
              },
              ref: 'validity'
            }, [
              h('input', { attrs: { type: 'text' }})
            ])
          ])
        },
        validators: {
          numeric: {
            message (field) {
              return `invalid ${field} value`
            },
            check (val) {
              return /^[-+]?[0-9]+$/.test(val)
            }
          }
        }
      }).$mount(el)
      const { validity } = vm.$refs
      const input = vm.$el.querySelector('input')
      let result
      waitForUpdate(() => {
        input.value = '' // invalid value inputing
        validity.validate() // validate !!
      }).thenWaitFor(1).then(() => {
        result = validity.result
        assert(result.required === true)
        assert.equal(result.numeric, 'invalid field1 value')
        assert.deepEqual(result.errors, [{
          field: 'field1',
          validator: 'required'
        }, {
          field: 'field1',
          validator: 'numeric',
          message: 'invalid field1 value'
        }])
        assert(validity.valid === false)
        assert(validity.invalid === true)
        assert(result.valid === false)
        assert(result.invalid === true)
      }).then(() => {
        input.value = '-123' // valid value inputing
        validity.validate() // validate !!
      }).thenWaitFor(1).then(() => {
        result = validity.result
        assert(result.required === false)
        assert(result.numeric === false)
        assert(result.errors === undefined)
        assert(validity.valid === true)
        assert(validity.invalid === false)
        assert(result.valid === true)
        assert(result.invalid === false)
      }).then(done)
    })
  })

  describe('async validate', () => {
    it('should be work', done => {
      const vm = new Vue({
        components,
        render (h) {
          return h('div', [
            h('validity', {
              props: {
                field: 'field1',
                validators: ['exist']
              },
              ref: 'validity'
            }, [
              h('input', { attrs: { type: 'text' }})
            ])
          ])
        },
        validators: {
          exist (val) {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                val === 'dio' ? resolve() : reject()
              }, 5)
            })
          }
        }
      }).$mount(el)
      const { validity } = vm.$refs
      const input = vm.$el.querySelector('input')
      let result
      waitForUpdate(() => {
        input.value = '' // invalid value inputing
        validity.validate() // validate !!
      }).thenWaitFor(6).then(() => {
        result = validity.result
        assert(result.exist === true)
        assert.deepEqual(result.errors, [{
          field: 'field1',
          validator: 'exist'
        }])
        assert(validity.valid === false)
        assert(validity.invalid === true)
        assert(result.valid === false)
        assert(result.invalid === true)
      }).then(() => {
        input.value = 'dio' // valid value inputing
        validity.validate() // validate !!
      }).thenWaitFor(6).then(() => {
        result = validity.result
        assert(result.exist === false)
        assert(result.errors === undefined)
        assert(validity.valid === true)
        assert(validity.invalid === false)
        assert(result.valid === true)
        assert(result.invalid === false)
      }).then(done)
    })
  })

  describe('component validate', () => {
    it('should be work', done => {
      const vm = new Vue({
        components,
        render (h) {
          return h('div', [
            h('validity', {
              props: {
                field: 'field1',
                validators: ['required']
              },
              ref: 'validity'
            }, [
              h('comp', { ref: 'my' })
            ])
          ])
        }
      }).$mount(el)
      const { validity, my } = vm.$refs
      let result
      waitForUpdate(() => {
        my.value = ''
        validity.validate() // validate !!
      }).thenWaitFor(1).then(() => {
        result = validity.result
        assert(result.required === true)
        assert.deepEqual(result.errors, [{
          field: 'field1',
          validator: 'required'
        }])
        assert(validity.valid === false)
        assert(validity.invalid === true)
        assert(result.valid === false)
        assert(result.invalid === true)
      }).then(() => {
        my.value = 'hello'
        validity.validate() // validate !!
      }).thenWaitFor(1).then(() => {
        result = validity.result
        assert(result.required === false)
        assert(result.errors === undefined)
        assert(validity.valid === true)
        assert(validity.invalid === false)
        assert(result.valid === true)
        assert(result.invalid === false)
      }).then(done)
    })
  })

  describe('classes', () => {
    describe('basic', () => {
      it('should be work', done => {
        const vm = new Vue({
          components,
          render (h) {
            return h('div', [
              h('validity', {
                props: {
                  field: 'field1',
                  validators: ['required', 'numeric']
                },
                ref: 'validity1'
              }, [
                h('input', { class: ['class1'], attrs: { type: 'text' }})
              ]),
              h('validity', {
                props: {
                  field: 'field2',
                  validators: ['required']
                },
                ref: 'validity2'
              }, [
                h('comp', { ref: 'my', class: ['class2'] })
              ])
            ])
          }
        }).$mount(el)
        const { validity1, validity2, my } = vm.$refs
        let classes1, classes2
        classes1 = classes(validity1.$el)
        classes2 = classes(validity2.$el)
        // initialized
        assert(classes1.has('class1'))
        assert(!classes1.has('touched'))
        assert(classes1.has('untouched'))
        assert(!classes1.has('dirty'))
        assert(classes1.has('pristine'))
        assert(!classes1.has('valid'))
        assert(!classes1.has('invalid'))
        assert(!classes1.has('modified'))
        assert(classes2.has('class2'))
        assert(!classes2.has('touched'))
        assert(classes2.has('untouched'))
        assert(!classes2.has('dirty'))
        assert(classes2.has('pristine'))
        assert(!classes2.has('valid'))
        assert(!classes2.has('invalid'))
        assert(!classes2.has('modified'))
        waitForUpdate(() => {
          // validate
          validity1.validate()
          validity2.validate()
        }).thenWaitFor(1).then(() => {
          assert(classes1.has('class1'))
          assert(!classes1.has('touched'))
          assert(classes1.has('untouched'))
          assert(!classes1.has('dirty'))
          assert(classes1.has('pristine'))
          assert(!classes1.has('modified'))
          assert(!classes1.has('valid'))
          assert(classes1.has('invalid'))
          assert(classes2.has('class2'))
          assert(!classes2.has('touched'))
          assert(classes2.has('untouched'))
          assert(!classes2.has('dirty'))
          assert(classes2.has('pristine'))
          assert(!classes2.has('modified'))
          assert(classes2.has('valid'))
          assert(!classes2.has('invalid'))
          // focus
          triggerEvent(validity1.$el, 'focusout')
          triggerEvent(validity2.$el, 'focusout')
        }).thenWaitFor(1).then(() => {
          assert(classes1.has('class1'))
          assert(classes1.has('touched'))
          assert(!classes1.has('untouched'))
          assert(!classes1.has('dirty'))
          assert(classes1.has('pristine'))
          assert(!classes1.has('modified'))
          assert(!classes1.has('valid'))
          assert(classes1.has('invalid'))
          assert(classes2.has('class2'))
          assert(classes2.has('touched'))
          assert(!classes2.has('untouched'))
          assert(!classes2.has('dirty'))
          assert(classes2.has('pristine'))
          assert(!classes2.has('modified'))
          assert(classes2.has('valid'))
          assert(!classes2.has('invalid'))
          // update
          validity1.$el.value = 'hello'
          triggerEvent(validity1.$el, 'input')
          my.value = ''
          // validate
          validity1.validate()
          validity2.validate()
        }).thenWaitFor(1).then(() => {
          assert(classes1.has('class1'))
          assert(classes1.has('touched'))
          assert(!classes1.has('untouched'))
          assert(classes1.has('dirty'))
          assert(!classes1.has('pristine'))
          assert(classes1.has('modified'))
          assert(classes1.has('valid'))
          assert(!classes1.has('invalid'))
          assert(classes2.has('class2'))
          assert(classes2.has('touched'))
          assert(!classes2.has('untouched'))
          assert(classes2.has('dirty'))
          assert(!classes2.has('pristine'))
          assert(classes2.has('modified'))
          assert(!classes2.has('valid'))
          assert(classes2.has('invalid'))
          // back to initial data
          validity1.$el.value = ''
          triggerEvent(validity1.$el, 'input')
          my.value = 'hello'
        }).thenWaitFor(1).then(() => {
          assert(classes1.has('class1'))
          assert(classes1.has('touched'))
          assert(!classes1.has('untouched'))
          assert(classes1.has('dirty'))
          assert(!classes1.has('pristine'))
          assert(!classes1.has('modified'))
          assert(classes1.has('valid'))
          assert(!classes1.has('invalid'))
          assert(classes2.has('class2'))
          assert(classes2.has('touched'))
          assert(!classes2.has('untouched'))
          assert(classes2.has('dirty'))
          assert(!classes2.has('pristine'))
          assert(!classes2.has('modified'))
          assert(!classes2.has('valid'))
          assert(classes2.has('invalid'))
          // reset
          validity1.reset()
          validity2.reset()
        }).thenWaitFor(1).then(() => {
          assert(classes1.has('class1'))
          assert(!classes1.has('touched'))
          assert(classes1.has('untouched'))
          assert(!classes1.has('dirty'))
          assert(classes1.has('pristine'))
          assert(!classes1.has('valid'))
          assert(!classes1.has('invalid'))
          assert(!classes1.has('modified'))
          assert(classes2.has('class2'))
          assert(!classes2.has('touched'))
          assert(classes2.has('untouched'))
          assert(!classes2.has('dirty'))
          assert(classes2.has('pristine'))
          assert(!classes2.has('valid'))
          assert(!classes2.has('invalid'))
          assert(!classes2.has('modified'))
        }).then(done)
      })
    })

    describe('local custom class name', () => {
      it('should be work', done => {
        const classesProp1 = {
          valid: 'valid-1',
          invalid: 'invalid-1',
          touched: 'touched-1',
          untouched: 'untouched-1',
          pristine: 'pristine-1',
          dirty: 'dirty-1',
          modified: 'modified-1'
        }
        const classesProp2 = {
          valid: 'valid-2',
          invalid: 'invalid-2',
          touched: 'touched-2',
          untouched: 'untouched-2',
          pristine: 'pristine-2',
          dirty: 'dirty-2',
          modified: 'modified-2'
        }
        const vm = new Vue({
          components,
          render (h) {
            return h('div', [
              h('validity', {
                props: {
                  field: 'field1',
                  validators: ['required', 'numeric'],
                  classes: classesProp1
                },
                ref: 'validity1'
              }, [
                h('input', { class: ['class1'], attrs: { type: 'text' }})
              ]),
              h('validity', {
                props: {
                  field: 'field2',
                  validators: ['required'],
                  classes: classesProp2
                },
                ref: 'validity2'
              }, [
                h('comp', { ref: 'my', class: ['class2'] })
              ])
            ])
          }
        }).$mount(el)
        const { validity1, validity2, my } = vm.$refs
        let classes1, classes2
        classes1 = classes(validity1.$el)
        classes2 = classes(validity2.$el)
        waitForUpdate(() => {
          // focus
          triggerEvent(validity1.$el, 'focusout')
          triggerEvent(validity2.$el, 'focusout')
          // update
          validity1.$el.value = 'hello'
          triggerEvent(validity1.$el, 'input')
          my.value = ''
          // validate
          validity1.validate()
          validity2.validate()
        }).thenWaitFor(1).then(() => {
          assert(classes1.has('class1'))
          assert(classes1.has(classesProp1.touched))
          assert(!classes1.has(classesProp1.untouched))
          assert(classes1.has(classesProp1.dirty))
          assert(!classes1.has(classesProp1.pristine))
          assert(classes1.has(classesProp1.modified))
          assert(classes1.has(classesProp1.valid))
          assert(!classes1.has(classesProp1.invalid))
          assert(classes2.has('class2'))
          assert(classes2.has(classesProp2.touched))
          assert(!classes2.has(classesProp2.untouched))
          assert(classes2.has(classesProp2.dirty))
          assert(!classes2.has(classesProp2.pristine))
          assert(classes2.has(classesProp2.modified))
          assert(!classes2.has(classesProp2.valid))
          assert(classes2.has(classesProp2.invalid))
          // reset
          validity1.reset()
          validity2.reset()
        }).thenWaitFor(1).then(() => {
          assert(classes1.has('class1'))
          assert(!classes1.has(classesProp1.touched))
          assert(classes1.has(classesProp1.untouched))
          assert(!classes1.has(classesProp1.dirty))
          assert(classes1.has(classesProp1.pristine))
          assert(!classes1.has(classesProp1.modified))
          assert(!classes1.has(classesProp1.valid))
          assert(!classes1.has(classesProp1.invalid))
          assert(classes2.has('class2'))
          assert(!classes2.has(classesProp2.touched))
          assert(classes2.has(classesProp2.untouched))
          assert(!classes2.has(classesProp2.dirty))
          assert(classes2.has(classesProp2.pristine))
          assert(!classes2.has(classesProp2.modified))
          assert(!classes2.has(classesProp2.valid))
          assert(!classes2.has(classesProp2.invalid))
        }).then(done)
      })
    })

    describe('global custom class name', () => {
      let orgSetting
      const localClasses = {
        valid: 'valid-1',
        invalid: 'invalid-1',
        touched: 'touched-1',
        untouched: 'untouched-1',
        pristine: 'pristine-1',
        dirty: 'dirty-1',
        modified: 'modified-1'
      }
      const globalClasses = {
        valid: 'valid-2',
        invalid: 'invalid-2',
        touched: 'touched-2',
        untouched: 'untouched-2',
        pristine: 'pristine-2',
        dirty: 'dirty-2',
        modified: 'modified-2'
      }
      beforeEach(() => {
        orgSetting = Vue.config.validator.classes
        Vue.config.validator.classes = globalClasses
      })
      afterEach(() => {
        Vue.config.validator.classes = orgSetting
      })

      it('should be work', done => {
        const vm = new Vue({
          components,
          render (h) {
            return h('div', [
              h('validity', {
                props: {
                  field: 'field1',
                  validators: ['required', 'numeric'],
                  classes: localClasses
                },
                ref: 'validity1'
              }, [
                h('input', { class: ['class1'], attrs: { type: 'text' }})
              ]),
              h('validity', {
                props: {
                  field: 'field2',
                  validators: ['required']
                },
                ref: 'validity2'
              }, [
                h('comp', { ref: 'my', class: ['class2'] })
              ])
            ])
          }
        }).$mount(el)
        const { validity1, validity2, my } = vm.$refs
        let classes1, classes2
        classes1 = classes(validity1.$el)
        classes2 = classes(validity2.$el)
        waitForUpdate(() => {
          // focus
          triggerEvent(validity1.$el, 'focusout')
          triggerEvent(validity2.$el, 'focusout')
          // update
          validity1.$el.value = 'hello'
          triggerEvent(validity1.$el, 'input')
          my.value = ''
          // validate
          validity1.validate()
          validity2.validate()
        }).thenWaitFor(1).then(() => {
          assert(classes1.has('class1'))
          assert(classes1.has(localClasses.touched))
          assert(!classes1.has(localClasses.untouched))
          assert(classes1.has(localClasses.dirty))
          assert(!classes1.has(localClasses.pristine))
          assert(classes1.has(localClasses.modified))
          assert(classes1.has(localClasses.valid))
          assert(!classes1.has(localClasses.invalid))
          assert(classes2.has('class2'))
          assert(classes2.has(globalClasses.touched))
          assert(!classes2.has(globalClasses.untouched))
          assert(classes2.has(globalClasses.dirty))
          assert(!classes2.has(globalClasses.pristine))
          assert(classes2.has(globalClasses.modified))
          assert(!classes2.has(globalClasses.valid))
          assert(classes2.has(globalClasses.invalid))
          // reset
          validity1.reset()
          validity2.reset()
        }).thenWaitFor(1).then(() => {
          assert(classes1.has('class1'))
          assert(!classes1.has(localClasses.touched))
          assert(classes1.has(localClasses.untouched))
          assert(!classes1.has(localClasses.dirty))
          assert(classes1.has(localClasses.pristine))
          assert(!classes1.has(localClasses.modified))
          assert(!classes1.has(localClasses.valid))
          assert(!classes1.has(localClasses.invalid))
          assert(classes2.has('class2'))
          assert(!classes2.has(globalClasses.touched))
          assert(classes2.has(globalClasses.untouched))
          assert(!classes2.has(globalClasses.dirty))
          assert(classes2.has(globalClasses.pristine))
          assert(!classes2.has(globalClasses.modified))
          assert(!classes2.has(globalClasses.valid))
          assert(!classes2.has(globalClasses.invalid))
        }).then(done)
      })
    })
  })

  describe('v-model integrations', () => {
    const props = {
      field: 'field1',
      validators: { required: { rule: true, message: 'required !!' }}
    }

    function createModelDirective (key, value, modifier) {
      const modifiers = modifier ? { validity: true } : {}
      return [{
        expression: key,
        modifiers,
        name: 'model',
        value: value
      }]
    }

    function textboxModelHanlder (prop) {
      return function ($event) {
        if ($event.target.composing) { return }
        this[prop] = $event.target.value
      }
    }

    function checkboxModelHandler (prop, value) {
      return function ($event) {
        const $$a = this[prop]
        const $$el = $event.target
        const $$c = $$el.checked ? true : false
        if (Array.isArray($$a)) {
          const $$v = value
          const $$i = this._i($$a, $$v)
          if ($$c) {
            $$i < 0 && (this[prop] = $$a.concat($$v))
          } else {
            $$i > -1 && (this[prop] = $$a.slice(0, $$i).concat($$a.slice($$i + 1)))
          }
        } else {
          this[prop]= $$c
        }
      }
    }

    function radioModelHanlder (prop, value) {
      return function ($event) { this[prop] = value }
    }

    function selectModelHandler (prop) {
      return function ($event) {
        this[prop] = Array.prototype.filter.call(
          $event.target.options, function (o) {
            return o.selected
        }).map(function (o) {
          return '_value' in o ? o._value : o.value
        })[0]
      }
    }

    function componentModelHandler (prop) {
      return function ($event) { this[prop] = $event }
    }

    describe('up to model', () => {
      describe('text', () => {
        it('should be work', done => {
          let valid = true
          const vm = new Vue({
            data: { msg: 'hello' },
            components,
            render (h) {
              return h('div', [
                h('p', [this.msg]),
                h('validity', { props }, [
                  h('input', {
                    ref: 'input',
                    attrs: { type: 'text' },
                    directives: createModelDirective('msg', 'hello', true),
                    on: {
                      input: [
                        textboxModelHanlder('msg'),
                        (e, $apply) => { valid && $apply() }
                      ]
                    }
                  })
                ])
              ])
            }
          }).$mount(el)
          const { input } = vm.$refs
          waitForUpdate(() => {
            input.value = 'world'
            triggerEvent(input, 'input')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.msg, 'world')
            // simulate valid value changing
            valid = false
            input.value = ''
            triggerEvent(input, 'input')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.msg, 'world')
            // simulate invalid value changing
            valid = true
            triggerEvent(input, 'input')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.msg, '')
          }).then(done)
        })
      })

      describe('checkbox', () => {
        describe('single', () => {
          it('should be work', done => {
            let valid = true
            const vm = new Vue({
              data: { checked: false },
              components,
              render (h) {
                return h('div', [
                  h('p', [this.checked]),
                  h('validity', { props }, [
                    h('input', {
                      ref: 'checkbox',
                      attrs: { type: 'checkbox' },
                      directives: createModelDirective('checked', false, true),
                      on: {
                        change: [
                          checkboxModelHandler('checked'),
                          (e, $apply) => { valid && $apply() }
                        ]
                      }
                    })
                  ])
                ])
              }
            }).$mount(el)
            const { checkbox } = vm.$refs
            waitForUpdate(() => {
              checkbox.checked = true
              triggerEvent(checkbox, 'change')
            }).thenWaitFor(1).then(() => {
              assert(vm.checked)
              // simulate valid value changing
              valid = false
              checkbox.checked = false
              triggerEvent(checkbox, 'change')
            }).thenWaitFor(1).then(() => {
              assert(vm.checked)
              // simulate invalid value changing
              valid = true
              triggerEvent(checkbox, 'change')
            }).thenWaitFor(1).then(() => {
              assert(!vm.checked)
            }).then(done)
          })
        })

        describe('multiple', () => {
          it('should be work', done => {
            let valid = true
            const vm = new Vue({
              data: { items: [] },
              components,
              render (h) {
                return h('div', [
                  h('p', [this.items]),
                  h('validity', { props }, [
                    h('input', {
                      ref: 'checkbox1',
                      attrs: { type: 'checkbox', value: 'one' },
                      directives: createModelDirective('items', 'one', true),
                      on: {
                        change: [
                          checkboxModelHandler('items', 'one'),
                          (e, $apply) => { valid && $apply() }
                        ]
                      }
                    }),
                    h('input', {
                      ref: 'checkbox2',
                      attrs: { type: 'checkbox', value: 'two' },
                      directives: createModelDirective('items', 'two', true),
                      on: {
                        change: [
                          checkboxModelHandler('items', 'two'),
                          (e, $apply) => { valid && $apply() }
                        ]
                      }
                    })
                  ])
                ])
              }
            }).$mount(el)
            const { checkbox1, checkbox2 } = vm.$refs
            waitForUpdate(() => {
              checkbox1.checked = true
              triggerEvent(checkbox1, 'change')
            }).thenWaitFor(1).then(() => {
              assert.deepEqual(vm.items, ['one'])
              // simulate valid value changing
              valid = false
              checkbox2.checked = true
              triggerEvent(checkbox2, 'change')
            }).thenWaitFor(1).then(() => {
              assert.deepEqual(vm.items, ['one'])
              // simulate invalid value changing
              valid = true
              triggerEvent(checkbox2, 'change')
            }).thenWaitFor(1).then(() => {
              assert.deepEqual(vm.items, ['one', 'two'])
            }).then(done)
          })
        })
      })

      describe('radio', () => {
        it('should be work', done => {
          let valid = true
          const vm = new Vue({
            data: { checked: '' },
            components,
            render (h) {
              return h('div', [
                h('p', [this.checked]),
                h('validity', { props }, [
                  h('input', {
                    ref: 'radio1',
                    attrs: { type: 'radio', name: 'g1', value: 'one' },
                    directives: createModelDirective('checked', 'one', true),
                    on: {
                      change: [
                        radioModelHanlder('checked', 'one'),
                        (e, $apply) => { valid && $apply() }
                      ]
                    }
                  }),
                  h('input', {
                    ref: 'radio2',
                    attrs: { type: 'radio', name: 'g1', value: 'two' },
                    directives: createModelDirective('checked', 'two', true),
                    on: {
                      change: [
                        radioModelHanlder('checked', 'two'),
                        (e, $apply) => { valid && $apply() }
                      ]
                    }
                  })
                ])
              ])
            }
          }).$mount(el)
          const { radio1, radio2 } = vm.$refs
          waitForUpdate(() => {
            radio1.checked = true
            triggerEvent(radio1, 'change')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.checked, 'one')
            // simulate valid value changing
            valid = false
            radio2.checked = true
            triggerEvent(radio2, 'change')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.checked, 'one')
            // simulate invalid value changing
            valid = true
            triggerEvent(radio2, 'change')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.checked, 'two')
          }).then(done)
        })
      })

      describe('select', () => {
        it('should be work', done => {
          let valid = true
          const vm = new Vue({
            data: { selected: 'one' },
            components,
            render (h) {
              return h('div', [
                h('p', [this.selected]),
                h('validity', { props }, [
                  h('select', {
                    ref: 'select',
                    directives: createModelDirective('selected', this.selected, true),
                    on: {
                      change: [
                        selectModelHandler('selected'),
                        (e, $apply) => { valid && $apply() }
                      ]
                    }
                  }, [
                    h('option', { attrs: { value: 'one' }}),
                    h('option', { attrs: { value: 'two' }}),
                    h('option', { attrs: { value: 'three' }})
                  ])
                ])
              ])
            }
          }).$mount(el)
          const { select } = vm.$refs
          waitForUpdate(() => {
            select.selectedIndex = 1
            triggerEvent(select, 'change')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.selected, 'two')
            // simulate valid value changing
            valid = false
            select.selectedIndex = 2
            triggerEvent(select, 'change')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.selected, 'two')
            // simulate invalid value changing
            valid = true
            triggerEvent(select, 'change')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.selected, 'three')
          }).then(done)
        })
      })

      describe('component', () => {
        it('should be work', done => {
          let valid = true
          const vm = new Vue({
            data: {
              selected: '',
              options: [
                { text: 'One', value: 'one' },
                { text: 'Two', value: 'two' },
                { text: 'Three', value: 'three' }
              ]
            },
            components,
            render (h) {
              return h('div', [
                h('p', [this.selected]),
                h('validity', { props }, [
                  h('comp-input', {
                    ref: 'comp',
                    props: { options: this.options },
                    directives: createModelDirective('selected', 'one', true),
                    on: {
                      input: [
                        componentModelHandler('selected'),
                        (e, $apply) => { valid && $apply() }
                      ]
                    }
                  })
                ])
              ])
            }
          }).$mount(el)
          const { comp } = vm.$refs
          const { select } = comp.$refs
          waitForUpdate(() => {
            select.selectedIndex = 1
            triggerEvent(select, 'change')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.selected, 'two')
            // simulate valid value changing
            valid = false
            select.selectedIndex = 2
            triggerEvent(select, 'change')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.selected, 'two')
            // simulate invalid value changing
            valid = true
            triggerEvent(select, 'change')
          }).thenWaitFor(1).then(() => {
            assert.equal(vm.selected, 'three')
          }).then(done)
        })
      })
    })
  })
})
