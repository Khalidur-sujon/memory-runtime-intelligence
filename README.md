# Memory Runtime Intelligence

### Find what your web app creates — and forgets to release.

Memory Runtime Intelligence helps you find **runtime resource retention** in web applications.

It watches resources such as event listeners, observers, timers, intervals, and WebSockets while your application is running.

The idea is simple:

> **Create a resource → use it → release it.**

When resources keep getting created without being released, MRI helps you find them and shows where they came from.

---

## Why Memory Runtime Intelligence?

Some runtime problems are easy to miss.

A React component mounts.

It creates an interval.

The component unmounts.

But the interval is still running.

Do that again and again, and resources can stay around longer than they should.

Instead of manually searching through your code, MRI gives you a runtime report showing:

- What resource is being retained
- Where it was created
- How many times it was created
- How many times it was released
- How confident the finding is
- What you can do about it

---

## ✨ What you get

- 🔍 Runtime resource tracking
- 🧠 Resource retention detection
- 📍 Source location information
- 📊 Created vs released counts
- 🎯 Confidence levels
- 💡 Actionable suggestions
- ⚛️ React-friendly workflow
- ⚡ Vite integration
- 🖥️ CLI reporting

---

# Quick Start

## 1. Install

Install Memory Runtime Intelligence as a development dependency:

```bash
npm install -D memory-runtime-intelligence
```

Or:

```bash
pnpm add -D memory-runtime-intelligence
```

```bash
yarn add -D memory-runtime-intelligence
```

---

## 2. Add it to your development setup

### Vite

Add the MRI Vite integration to your Vite configuration.

```ts
import { defineConfig } from 'vite';
import memoryRuntimeIntelligence from 'memory-runtime-intelligence/vite';

export default defineConfig({
  plugins: [memoryRuntimeIntelligence()],
});
```

> The integration API may evolve as the project grows.

---

# React

MRI is especially useful when working with React because many resource lifecycle problems happen around component mount and unmount.

For example, this component creates an interval but never cleans it up:

```tsx
import { useEffect } from 'react';

function Example() {
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('running...');
    }, 1000);

    // ❌ No cleanup
  }, []);

  return <div>Example</div>;
}
```

When the component goes away, the interval may still be running.

The correct approach is to clear it when the component unmounts:

```tsx
import { useEffect } from 'react';

function Example() {
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('running...');
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return <div>Example</div>;
}
```

The lifecycle should look like:

```text
Component mounts
      ↓
Resource created
      ↓
Component unmounts
      ↓
Resource released
```

MRI helps you spot cases where that lifecycle does not look right.

---

# What does MRI track?

MRI can track runtime resources such as:

### Event listeners

```js
window.addEventListener(...)
window.removeEventListener(...)
```

### Observers

- MutationObserver
- ResizeObserver
- IntersectionObserver

### Intervals

```js
setInterval(...)
clearInterval(...)
```

### WebSockets

```js
const socket = new WebSocket(...);

socket.close();
```

MRI can also report other resources supported by its runtime instrumentation.

---

# How it works

MRI watches resource creation and release while your application is running.

For a tracked resource, MRI looks at its lifecycle:

```text
Created
   ↓
Tracked
   ↓
Released
```

If a resource is created but is not released, MRI can report it as a potential retention issue.

For example:

```text
Created:   1
Released:  0
Unreleased: 1
```

This does **not** automatically mean that the resource is definitely a memory leak.

It means the resource is still unreleased and is worth investigating.

MRI gives you runtime evidence so you can find the actual lifecycle problem in your application.

---

# CLI

After setting up your application, run:

```bash
npx memory-runtime-intelligence
```

MRI analyzes the collected runtime information and gives you a report.

For example:

```text
⚠ Potential Memory Retention

1 issue detected
1 timer-interval

🟡 1 medium confidence

1 resources unreleased

────────────────────────────────────────
MEDIUM CONFIDENCE
────────────────────────────────────────

1. timer-interval
   📍 App.tsx:8:31

   📊 1 created · 0 released · 1 unreleased

   💡 Call clearInterval() when the interval is no longer needed.

────────────────────────────────────────

💡 Start with the HIGH confidence findings.
```

The report gives you three important pieces of information:

### 1. What was retained

```text
timer-interval
```

### 2. Where it came from

```text
📍 App.tsx:8:31
```

### 3. What you should investigate

```text
💡 Call clearInterval() when the interval is no longer needed.
```

So instead of:

> "Something might be wrong."

you get:

> "This resource was created here, it was never released, and this is the cleanup you should check."

---

# Confidence Levels

Not every retention pattern is equally suspicious.

MRI groups findings by confidence.

For example:

```text
🔴 High confidence
🟡 Medium confidence
```

### High confidence

These findings have stronger evidence that the resource is being retained unexpectedly.

### Medium confidence

These findings show a retention pattern that deserves investigation, but may have a valid reason to remain active.

The goal is to help you focus on the most important findings first.

---

# Source Locations

Knowing **where a resource came from** is one of the most useful parts of runtime debugging.

MRI can show the source location:

```text
📍 App.tsx:8:31
```

So instead of searching through a large application for:

```text
Where was this interval created?
```

you can go directly to the reported location.

---

# Actionable Suggestions

MRI can also provide a suggestion when it knows what cleanup should be checked.

For example:

```text
💡 Call clearInterval() when the interval is no longer needed.
```

For an event listener, the suggestion may point you toward:

```js
removeEventListener(...)
```

For an observer:

```js
disconnect();
```

The goal is not only to tell you that something is wrong, but also to give you a useful starting point for fixing it.

---

# A Simple React Example

Consider this component:

```tsx
useEffect(() => {
  const handleResize = () => {
    console.log('resize');
  };

  window.addEventListener('resize', handleResize);
}, []);
```

There is no cleanup.

If the component is mounted repeatedly, the runtime may end up with multiple listeners:

```text
Mount 1 → listener created
Mount 2 → listener created
Mount 3 → listener created
Mount 4 → listener created
...
```

MRI can detect the creation/release pattern and report the resource.

The fix is to return a cleanup function:

```tsx
useEffect(() => {
  const handleResize = () => {
    console.log('resize');
  };

  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

Now the resource has a clear lifecycle:

```text
Create
  ↓
Use
  ↓
Cleanup
  ↓
Released
```

---

# Development Workflow

A typical MRI workflow looks like this:

```text
       Your Application
              │
              ▼
      Runtime Instrumentation
              │
              ▼
       Resource Tracking
              │
              ▼
      Retention Detection
              │
              ▼
             MRI
              │
              ▼
          CLI Report
              │
              ▼
       Find → Fix → Verify
```

You continue developing your application normally.

MRI observes the runtime and reports resource patterns that may need attention.

---

# Supported Environment

MRI is built for modern web applications.

Current support includes:

- React applications
- Vite
- Browser runtime instrumentation
- CLI-based analysis

More integrations and runtime resources may be supported as the project evolves.

---

# Development Tool

Memory Runtime Intelligence is primarily intended for **development and debugging**.

It is not a replacement for:

- Production monitoring
- Browser memory profilers
- Application performance monitoring
- Manual code review

Think of MRI as another tool in your debugging workflow.

It helps answer:

> **What is still around that I expected to be gone?**

---

# Project Status

🚧 **Active development**

Memory Runtime Intelligence is still evolving.

The detection logic, APIs, integrations, and CLI output may change as the project grows.

If you are upgrading between versions, check the release notes for changes.

---

# Roadmap

Areas planned for improvement include:

- More runtime resource types
- Better source attribution
- More framework integrations
- Better retention analysis
- More actionable suggestions
- Improved CLI reports
- CI-friendly reporting
- Better developer experience

---

# Contributing

Found a bug?

Have an idea?

Want to improve the detection logic?

Contributions are welcome.

A simple way to get started:

1. Open an issue describing the problem or idea.
2. Include a small reproducible example when possible.
3. Explain the expected and actual behavior.
4. Submit a pull request.

---

# Development

Clone the repository:

```bash
git clone https://github.com/Khalidur-sujon/memory-runtime-intelligence.git
cd memory-runtime-intelligence
```

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

Run the CLI locally:

```bash
node dist/cli.js
```

Before creating a release:

```bash
npm run build
npm pack --dry-run
```

---

# Versioning

Memory Runtime Intelligence follows [Semantic Versioning](https://semver.org/).

```text
1.0.0 → 1.0.1   Bug fix
1.0.1 → 1.1.0   New backward-compatible feature
1.1.0 → 2.0.0   Breaking change
```

---

# License

MIT

---

## Built for developers who want to know what their application is really doing.

**Create it. Track it. Release it.**

If something stays behind, MRI helps you find it.
