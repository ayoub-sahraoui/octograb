# MobX & MobX-React: Complete Reference Guide for LLMs

> This document serves as a comprehensive reference for Large Language Models to correctly use MobX and MobX-React in JavaScript/TypeScript applications.

---

## Table of Contents

1. [Introduction & Philosophy](#introduction--philosophy)
2. [Installation & Configuration](#installation--configuration)
3. [Core Concepts](#core-concepts)
4. [Observable State](#observable-state)
5. [Actions](#actions)
6. [Computed Values](#computed-values)
7. [Reactions](#reactions)
8. [React Integration](#react-integration)
9. [API Reference](#api-reference)
10. [Best Practices](#best-practices)
11. [Common Patterns & Examples](#common-patterns--examples)
12. [Advanced Features](#advanced-features)
13. [Configuration Options](#configuration-options)
14. [Troubleshooting & Common Mistakes](#troubleshooting--common-mistakes)

---

## Introduction & Philosophy

### What is MobX?

MobX is a **signal-based, battle-tested library** that makes state management simple and scalable by transparently applying functional reactive programming (TFRP). The philosophy is simple:

> **"Anything that can be derived from the application state, should be. Automatically."**

### Three Core Principles

1. **Straightforward**: Write minimalistic, boilerplate-free code. Use normal JavaScript assignments - the reactivity system detects changes automatically.

2. **Effortless optimal rendering**: All changes and uses of data are tracked at runtime, building a dependency tree. Computations run only when strictly needed.

3. **Architectural freedom**: MobX is unopinionated and allows you to manage state outside of any UI framework.

### Unidirectional Data Flow

```
Actions → State → Derivations (Views/Computed/Reactions)
```

- **Actions** modify **State**
- **State** changes trigger **Derivations**
- All derivations are updated **automatically**, **atomically**, and **synchronously**

---

## Installation & Configuration

### Package Installation

```bash
# Core MobX
npm install mobx
# or
yarn add mobx

# React bindings (choose one)
npm install mobx-react-lite    # Lightweight, function components only
npm install mobx-react          # Full package, supports class components
```

### TypeScript Configuration

**IMPORTANT**: Set `"useDefineForClassFields": true` in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "useDefineForClassFields": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Babel Configuration (if using)

```json
{
  "plugins": [
    ["@babel/plugin-proposal-class-properties", { "loose": false }]
  ],
  "assumptions": {
    "setPublicClassFields": false
  }
}
```

### Verification Snippet

Add this at the start of your code to verify transpilation is correct:

```javascript
if (!new class { x }().hasOwnProperty('x')) 
    throw new Error('Transpiler is not configured correctly');
```

---

## Core Concepts

### The Three Pillars

| Concept | Description | Annotation |
|---------|-------------|------------|
| **State** | The data that drives your application | `observable` |
| **Actions** | Code that modifies state | `action` |
| **Derivations** | Values/effects derived from state | `computed`, reactions |

### Derivation Types

1. **Computed Values**: Pure functions deriving new facts from state (cached, lazy)
2. **Reactions**: Side effects that run automatically when state changes

### Golden Rule

> Always use `computed` if you want to create a value based on current state. Use reactions only for side effects.

---

## Observable State

### `makeObservable`

Explicitly annotates class members:

```javascript
import { makeObservable, observable, computed, action } from "mobx"

class Todo {
    id = Math.random()
    title = ""
    finished = false

    constructor(title) {
        makeObservable(this, {
            title: observable,
            finished: observable,
            toggle: action
        })
        this.title = title
    }

    toggle() {
        this.finished = !this.finished
    }
}
```

### `makeAutoObservable`

Automatically infers annotations (recommended for most cases):

```javascript
import { makeAutoObservable } from "mobx"

class Timer {
    secondsPassed = 0

    constructor() {
        makeAutoObservable(this)
    }

    increase() {
        this.secondsPassed += 1
    }

    get displayTime() {
        return `${this.secondsPassed} seconds`
    }
}
```

**Inference Rules:**
- All own properties → `observable`
- All getters → `computed`
- All setters → `action`
- All functions → `autoAction`
- All generator functions → `flow`

### `observable` Function

Creates observable clones of objects/arrays:

```javascript
import { observable } from "mobx"

// Objects
const todosById = observable({
    "TODO-123": { title: "Task", done: false }
})

// Arrays
const tags = observable(["high prio", "medium prio"])

// Factory function pattern
function createTimer() {
    return makeAutoObservable({
        secondsPassed: 0,
        increase() { this.secondsPassed++ }
    })
}
```

### Modern Decorators (TC-39)

```javascript
import { observable, computed, action } from "mobx"

class Doubler {
    @observable accessor value = 0

    @computed
    get double() {
        return this.value * 2
    }

    @action
    increment() {
        this.value++
    }
}
```

### Legacy Decorators

```javascript
import { observable, computed, action, makeObservable } from "mobx"

class Doubler {
    @observable value = 0

    constructor() {
        makeObservable(this)  // Required for legacy decorators
    }

    @computed get double() {
        return this.value * 2
    }

    @action increment() {
        this.value++
    }
}
```

### Available Annotations

| Annotation | Description |
|------------|-------------|
| `observable` / `observable.deep` | Trackable field, deep conversion |
| `observable.ref` | Only track reassignments, don't convert values |
| `observable.shallow` | For collections - make collection observable but not contents |
| `observable.struct` | Ignore structurally equal values |
| `action` | Method that modifies state |
| `action.bound` | Action bound to instance |
| `computed` | Cached derived getter |
| `computed.struct` | Computed with structural comparison |
| `flow` | Generator for async processes |
| `flow.bound` | Flow bound to instance |
| `false` | Exclude from processing |

### Observable Collections

**Observable Arrays:**
```javascript
const todos = observable([
    { title: "Task 1", completed: true },
    { title: "Task 2", completed: false }
])

// Extra methods:
todos.clear()              // Remove all entries
todos.replace(newItems)    // Replace all entries
todos.remove(value)        // Remove by value, returns boolean
```

**Observable Maps:**
```javascript
const userMap = observable.map()
userMap.set("user1", { name: "John" })
userMap.get("user1")
userMap.has("user1")
userMap.delete("user1")
userMap.toJSON()           // Plain object
userMap.merge(values)      // Merge entries
userMap.replace(values)    // Replace all
```

**Observable Sets:**
```javascript
const uniqueTags = observable.set(["tag1", "tag2"])
uniqueTags.add("tag3")
uniqueTags.has("tag1")
uniqueTags.delete("tag1")
```

---

## Actions

### Basic Usage

```javascript
import { makeAutoObservable, action } from "mobx"

class Store {
    value = 0

    constructor() {
        makeAutoObservable(this)
    }

    // Action - modifies state
    increment() {
        this.value++
    }

    // Action with multiple state changes (transactional)
    resetAndIncrement() {
        this.value = 0  // Intermediate state
        this.value++    // Not visible to observers
        this.value++    // Only final state triggers reactions
    }
}
```

### `action` as Higher-Order Function

```javascript
import { action } from "mobx"

const state = observable({ count: 0 })

const increment = action(state => {
    state.count++
})

increment(state)
```

### `action.bound`

Auto-binds `this` to instance:

```javascript
class Store {
    value = 0

    constructor() {
        makeObservable(this, {
            value: observable,
            increment: action.bound
        })
    }

    increment() {
        this.value++
    }
}

const store = new Store()
setInterval(store.increment, 1000)  // Safe - `this` is bound
```

### `runInAction`

One-time action for async operations:

```javascript
import { runInAction, makeAutoObservable } from "mobx"

class Store {
    data = null
    state = "pending"

    constructor() {
        makeAutoObservable(this)
    }

    async fetchData() {
        this.state = "pending"
        try {
            const response = await fetch("/api/data")
            const data = await response.json()
            
            runInAction(() => {
                this.data = data
                this.state = "done"
            })
        } catch (error) {
            runInAction(() => {
                this.state = "error"
            })
        }
    }
}
```

### `flow` for Async Operations

Generator-based async flow (preferred for complex async):

```javascript
import { flow, makeAutoObservable, flowResult } from "mobx"

class Store {
    data = null
    state = "pending"

    constructor() {
        makeAutoObservable(this, {
            fetchData: flow
        })
    }

    *fetchData() {
        this.state = "pending"
        try {
            const response = yield fetch("/api/data")
            const data = yield response.json()
            this.data = data
            this.state = "done"
            return data
        } catch (error) {
            this.state = "error"
        }
    }
}

// Usage:
const store = new Store()
const result = await flowResult(store.fetchData())
```

### Async Actions: Comparison

| Approach | Use Case |
|----------|----------|
| `action` wrapping handlers | Simple promise chains |
| Separate action methods | Cleaner code organization |
| `async/await` + `runInAction` | Familiar async/await pattern |
| `flow` + generators | Complex async with cancellation |

---

## Computed Values

### Basic Usage

```javascript
import { makeObservable, observable, computed } from "mobx"

class OrderLine {
    price = 0
    amount = 1

    constructor(price) {
        makeObservable(this, {
            price: observable,
            amount: observable,
            total: computed
        })
        this.price = price
    }

    get total() {
        console.log("Computing...")  // Shows when recomputed
        return this.price * this.amount
    }
}

const order = new OrderLine(2)

// Computed values are cached and lazy
console.log(order.total)  // "Computing..." then 2
console.log(order.total)  // No recomputation - cached!
```

### Key Properties

1. **Lazy**: Only computed when accessed
2. **Cached**: Result cached until dependencies change
3. **Suspends**: Stops computing when not observed
4. **Pure**: Should not modify state

### Computed with Setter

```javascript
class Dimension {
    length = 2

    constructor() {
        makeAutoObservable(this)
    }

    get squared() {
        return this.length * this.length
    }
    set squared(value) {
        this.length = Math.sqrt(value)
    }
}
```

### `computed.struct`

For structural comparison (when output objects may be structurally equal):

```javascript
class Box {
    width = 0
    height = 0

    constructor() {
        makeObservable(this, {
            width: observable,
            height: observable,
            topRight: computed.struct
        })
    }

    get topRight() {
        return { x: this.width, y: this.height }
    }
}
```

### Computed Options

```javascript
makeObservable(this, {
    expensiveValue: computed({
        name: "debugName",
        equals: comparer.structural,  // or custom comparison
        requiresReaction: true,        // Throw if read outside reaction
        keepAlive: true                // Don't suspend when unobserved
    })
})
```

### Built-in Comparers

```javascript
import { comparer } from "mobx"

comparer.identity     // === comparison
comparer.default      // === but NaN === NaN
comparer.structural   // Deep structural comparison
comparer.shallow      // Shallow comparison
```

---

## Reactions

### `autorun`

Runs effect immediately and on every dependency change:

```javascript
import { autorun, makeAutoObservable } from "mobx"

const state = makeAutoObservable({
    count: 0
})

const dispose = autorun(() => {
    console.log("Count:", state.count)
})
// Immediately prints: "Count: 0"

state.count = 1  // Prints: "Count: 1"

dispose()  // Stop the reaction
state.count = 2  // No print - reaction disposed
```

### `reaction`

Fine-grained control with data and effect functions:

```javascript
import { reaction, makeAutoObservable } from "mobx"

const state = makeAutoObservable({
    items: [],
    selectedId: null
})

reaction(
    // Data function - only these observables are tracked
    () => state.selectedId,
    // Effect function - runs when data changes
    (selectedId, previousId) => {
        console.log(`Selection changed from ${previousId} to ${selectedId}`)
    }
)
```

### `when`

Runs once when condition becomes true:

```javascript
import { when, makeAutoObservable } from "mobx"

const state = makeAutoObservable({
    loading: true,
    data: null
})

// With effect
when(
    () => !state.loading,
    () => console.log("Data loaded!")
)

// As promise
async function waitForData() {
    await when(() => !state.loading)
    console.log("Now we have:", state.data)
}
```

### Reaction Rules

1. Reactions run **synchronously** after state changes
2. Reactions track only **synchronous** reads
3. Actions called inside reactions are **untracked**
4. **Always dispose** reactions to prevent memory leaks

### Memory Leak Prevention

```javascript
class Component {
    disposers = []

    constructor() {
        this.disposers.push(
            autorun(() => { /* ... */ }),
            reaction(() => this.value, () => { /* ... */ }),
            when(() => this.ready, () => { /* ... */ })
        )
    }

    dispose() {
        this.disposers.forEach(d => d())
    }
}
```

---

## React Integration

### `observer` HoC

The core integration point - wraps components to react to observable changes:

```javascript
import React from "react"
import { observer } from "mobx-react-lite"
import { makeAutoObservable } from "mobx"

class Timer {
    secondsPassed = 0

    constructor() {
        makeAutoObservable(this)
    }

    increase() {
        this.secondsPassed++
    }
}

const myTimer = new Timer()

const TimerView = observer(({ timer }) => (
    <span>Seconds passed: {timer.secondsPassed}</span>
))

ReactDOM.render(<TimerView timer={myTimer} />, document.body)

setInterval(() => myTimer.increase(), 1000)
```

### Key Rules for React

1. **Apply `observer` to ALL components that read observables**
2. **Read observables INSIDE `observer` components**
3. **Pass object references, not dereferenced values**

### External State Patterns

**Via Props:**
```javascript
const TimerView = observer(({ timer }) => (
    <span>{timer.secondsPassed}</span>
))
```

**Via Context:**
```javascript
import { createContext, useContext } from "react"

const TimerContext = createContext()

const TimerView = observer(() => {
    const timer = useContext(TimerContext)
    return <span>{timer.secondsPassed}</span>
})

// In parent:
<TimerContext.Provider value={new Timer()}>
    <TimerView />
</TimerContext.Provider>
```

### Local Observable State

**Using `useState` with class:**
```javascript
const TimerView = observer(() => {
    const [timer] = useState(() => new Timer())
    return <span>{timer.secondsPassed}</span>
})
```

**Using `useLocalObservable`:**
```javascript
import { observer, useLocalObservable } from "mobx-react-lite"

const TimerView = observer(() => {
    const timer = useLocalObservable(() => ({
        secondsPassed: 0,
        increase() { this.secondsPassed++ }
    }))
    return <span>{timer.secondsPassed}</span>
})
```

### Common React Mistakes

**WRONG - Dereferencing outside observer:**
```javascript
const TimerView = observer(({ secondsPassed }) => (
    <span>{secondsPassed}</span>
))
// TimerView won't react!
<TimerView secondsPassed={myTimer.secondsPassed} />
```

**CORRECT - Pass observable reference:**
```javascript
const TimerView = observer(({ timer }) => (
    <span>{timer.secondsPassed}</span>
))
<TimerView timer={myTimer} />
```

### Integration with Non-Observer Components

```javascript
import { toJS } from "mobx"

const TodoView = observer(({ todo }) => {
    // For non-observer third-party components:
    return <GridRow data={{
        title: todo.title,
        done: todo.done
    }} />
    
    // Or using toJS:
    return <GridRow data={toJS(todo)} />
})
```

---

## API Reference

### Core APIs

| API | Usage | Description |
|-----|-------|-------------|
| `makeObservable(target, annotations?, options?)` | Classes | Explicit property annotations |
| `makeAutoObservable(target, overrides?, options?)` | Classes/Objects | Auto-infer annotations |
| `observable(source, overrides?, options?)` | Objects/Arrays | Create observable clone |
| `observable.box(value)` | Primitives | Box primitive values |
| `observable.array(values)` | Arrays | Create observable array |
| `observable.map(values)` | Maps | Create observable Map |
| `observable.set(values)` | Sets | Create observable Set |

### Action APIs

| API | Usage | Description |
|-----|-------|-------------|
| `action` | Annotation/Function | Mark state-modifying functions |
| `action.bound` | Annotation | Action bound to instance |
| `runInAction(fn)` | Function | One-time action wrapper |
| `flow` | Annotation/Function | Async generator wrapper |
| `flowResult(flowFn)` | TypeScript | Type-safe flow result |

### Computed APIs

| API | Usage | Description |
|-----|-------|-------------|
| `computed` | Annotation | Cached derived value |
| `computed.struct` | Annotation | Structural comparison |

### Reaction APIs

| API | Usage | Description |
|-----|-------|-------------|
| `autorun(effect)` | Function | Auto-run on any dependency change |
| `reaction(dataFn, effectFn)` | Function | Run effect when data changes |
| `when(predicate, effect?)` | Function | Run once when condition true |

### Utility APIs

| API | Description |
|-----|-------------|
| `toJS(value)` | Convert observable to plain JS |
| `isObservable(value)` | Check if value is observable |
| `isObservableObject/Array/Map/Set(value)` | Type-specific checks |
| `isAction(value)` | Check if value is action |
| `isComputed(value)` | Check if value is computed |
| `configure(options)` | Global configuration |
| `onBecomeObserved(observable, listener)` | Hook for observation start |
| `onBecomeUnobserved(observable, listener)` | Hook for observation end |

---

## Best Practices

### 1. State Organization

```javascript
// Good: Domain-specific stores
class TodoStore {
    todos = []
    filter = "all"

    constructor() {
        makeAutoObservable(this)
    }

    get filteredTodos() {
        switch (this.filter) {
            case "completed": return this.todos.filter(t => t.completed)
            case "active": return this.todos.filter(t => !t.completed)
            default: return this.todos
        }
    }

    addTodo(title) {
        this.todos.push({ id: Date.now(), title, completed: false })
    }
}
```

### 2. Derive, Don't Duplicate

```javascript
// BAD
class Store {
    todos = []
    completedCount = 0  // Duplicated state!

    addTodo(todo) {
        this.todos.push(todo)
        this.completedCount = this.todos.filter(t => t.completed).length
    }
}

// GOOD
class Store {
    todos = []

    get completedCount() {  // Derived!
        return this.todos.filter(t => t.completed).length
    }
}
```

### 3. Actions for State Modification

```javascript
// BAD: Direct mutation outside actions
store.todos.push(newTodo)

// GOOD: Action methods
class Store {
    addTodo(todo) {
        this.todos.push(todo)
    }
}
```

### 4. Use Computed for Derived Data

```javascript
// BAD
autorun(() => {
    this.displayText = `${this.firstName} ${this.lastName}`
})

// GOOD
get fullName() {
    return `${this.firstName} ${this.lastName}`
}
```

### 5. React Integration

```javascript
// Apply observer to all components reading observables
const TodoItem = observer(({ todo }) => (
    <li>{todo.title}</li>
))

const TodoList = observer(({ store }) => (
    <ul>
        {store.todos.map(todo => (
            <TodoItem key={todo.id} todo={todo} />
        ))}
    </ul>
))
```

---

## Common Patterns & Examples

### Todo Application

```javascript
import { makeAutoObservable, observable, action, computed } from "mobx"
import { observer } from "mobx-react-lite"

class Todo {
    id = Date.now()
    title = ""
    completed = false

    constructor(title) {
        makeAutoObservable(this)
        this.title = title
    }

    toggle() {
        this.completed = !this.completed
    }
}

class TodoStore {
    todos = []
    filter = "all"

    constructor() {
        makeAutoObservable(this)
    }

    get filteredTodos() {
        switch (this.filter) {
            case "completed": return this.todos.filter(t => t.completed)
            case "active": return this.todos.filter(t => !t.completed)
            default: return this.todos
        }
    }

    get activeCount() {
        return this.todos.filter(t => !t.completed).length
    }

    addTodo(title) {
        this.todos.push(new Todo(title))
    }

    removeTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id)
    }

    setFilter(filter) {
        this.filter = filter
    }

    clearCompleted() {
        this.todos = this.todos.filter(t => !t.completed)
    }
}

// React Components
const TodoItem = observer(({ todo }) => (
    <div>
        <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => todo.toggle()}
        />
        <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
            {todo.title}
        </span>
    </div>
))

const TodoList = observer(({ store }) => (
    <div>
        <input
            placeholder="Add todo"
            onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value) {
                    store.addTodo(e.target.value)
                    e.target.value = ''
                }
            }}
        />
        {store.filteredTodos.map(todo => (
            <TodoItem key={todo.id} todo={todo} />
        ))}
        <p>Active: {store.activeCount}</p>
    </div>
))
```

### Form State Management

```javascript
class FormStore {
    values = {}
    errors = {}
    touched = {}

    constructor(initialValues) {
        makeAutoObservable(this)
        this.values = initialValues
    }

    get isValid() {
        return Object.keys(this.errors).length === 0
    }

    get isDirty() {
        return Object.keys(this.touched).some(k => this.touched[k])
    }

    setValue(field, value) {
        this.values[field] = value
        this.validateField(field)
    }

    setTouched(field) {
        this.touched[field] = true
    }

    validateField(field) {
        // Validation logic
        if (!this.values[field]) {
            this.errors[field] = 'Required'
        } else {
            delete this.errors[field]
        }
    }

    reset() {
        this.values = {}
        this.errors = {}
        this.touched = {}
    }
}
```

---

## Advanced Features

### Custom Comparer for Computed

```javascript
import { comparer } from "mobx"

class Store {
    timestamp = Date.now()

    get formattedDate() {
        return new Date(this.timestamp).toLocaleDateString()
    }
    
    // Use custom comparer for moment objects
    get momentDate() {
        return moment(this.timestamp)
    }
}

// With custom equals
makeObservable(this, {
    momentDate: computed({
        equals: (a, b) => a.isSame(b)
    })
})
```

### Intercept & Observe

```javascript
import { intercept, observe } from "mobx"

const todos = observable.array()

// Intercept before change
intercept(todos, change => {
    if (change.type === 'push') {
        // Validate or modify before push
        change.object.forEach(item => {
            if (!item.id) item.id = Date.now()
        })
    }
    return change  // Must return change
})

// Observe after change
observe(todos, change => {
    console.log('Array changed:', change.type)
    saveToLocalStorage(todos)
})
```

### Extending Observables

```javascript
import { extendObservable } from "mobx"

function Person(firstName, lastName) {
    extendObservable(this, {
        firstName,
        lastName,
        get fullName() {
            return `${this.firstName} ${this.lastName}`
        }
    })
}
```

---

## Configuration Options

```javascript
import { configure } from "mobx"

configure({
    // Enforce actions
    enforceActions: "always",  // "never" | "observed" | "always"
    
    // Computed settings
    computedRequiresReaction: true,  // Warn if computed read outside reaction
    reactionRequiresObservable: true, // Warn if reaction uses no observables
    observableRequiresReaction: true, // Warn if observable read outside reaction
    
    // Safety
    safeDescriptors: true,  // Make annotated fields non-configurable
    
    // Proxy settings
    useProxies: "always",  // "never" | "ifavailable" | "always"
    
    // Isolation
    isolateGlobalState: true,  // Isolate MobX state between instances
})
```

---

## Troubleshooting & Common Mistakes

### Issue: Component Doesn't React

**Cause**: Dereferencing observables outside `observer`

```javascript
// WRONG
const TimerView = observer(({ seconds }) => <span>{seconds}</span>)
<TimerView seconds={timer.secondsPassed} />

// CORRECT
const TimerView = observer(({ timer }) => <span>{timer.secondsPassed}</span>)
<TimerView timer={timer} />
```

### Issue: Memory Leaks

**Cause**: Not disposing reactions

```javascript
// WRONG
autorun(() => console.log(store.value))

// CORRECT
const dispose = autorun(() => console.log(store.value))
// Later:
dispose()
```

### Issue: Computed Recomputes Unnecessarily

**Cause**: Creating new objects in computed

```javascript
// WRONG - new object each time
get items() {
    return this.list.map(x => ({ ...x }))
}

// CORRECT - use computed.struct
get items() {
    return this.list.map(x => ({ ...x }))
}
// Then use computed.struct annotation
```

### Issue: Actions Don't Trigger Reactions

**Cause**: Modifying state outside actions (when `enforceActions: "always"`)

```javascript
// WRONG
store.value = 5

// CORRECT
store.setValue(5)  // Inside action method
// Or
runInAction(() => store.value = 5)
```

### Issue: Async Updates Don't Work

**Cause**: Not wrapping async state updates

```javascript
// WRONG
async fetchData() {
    const data = await fetch('/api')
    this.data = data  // Outside action!
}

// CORRECT
async fetchData() {
    const data = await fetch('/api')
    runInAction(() => this.data = data)
}

// OR BETTER - use flow
*fetchData() {
    this.data = yield fetch('/api')
}
```

---

## Quick Reference Card

### Observable Creation
```javascript
makeAutoObservable(this)                    // Auto-annotate class
makeObservable(this, { prop: observable }) // Explicit annotations
observable({ a: 1 })                        // Observable object
observable([1, 2, 3])                       // Observable array
observable.map()                            // Observable Map
observable.set()                            // Observable Set
```

### Actions
```javascript
action(() => { /* modify state */ })  // Action wrapper
action.bound                          // Bound action
runInAction(() => {})                 // One-time action
flow(function* () { yield ... })      // Async flow
```

### Computeds
```javascript
get derived() { return this.a + this.b }  // In class
computed(fn)                               // Standalone
computed.struct                            // Structural equality
```

### Reactions
```javascript
autorun(() => { })                         // Auto-run effect
reaction(() => data, (val) => { })         // Data -> effect
when(() => condition, () => { })           // Condition -> effect
await when(() => condition)                // Promise-based
```

### React
```javascript
observer(Component)                        // Make reactive
useLocalObservable(() => ({ }))            // Local observable state
```

### Utilities
```javascript
toJS(observable)                           // Convert to plain JS
isObservable(value)                        // Check if observable
configure({ })                             // Global config
```

---

*This reference guide is based on MobX 6 documentation. For the latest updates, visit https://mobx.js.org*
