# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]: "[plugin:vite:esbuild]"
    - generic [ref=e6]: "Transform failed with 1 error: /Users/itays/dev/feedbackflow-app/frontend/src/hooks/useDocxExport.ts:96:13: ERROR: Expected \">\" but found \"className\""
  - generic [ref=e8] [cursor=pointer]: /Users/itays/dev/feedbackflow-app/frontend/src/hooks/useDocxExport.ts:96:13
  - generic [ref=e9]: Expected ">" but found "className" 94 | toast.dismiss(toastId); 95 | toast.success( 96 | <div className="flex flex-col gap-1"> | ^ 97 | <span className="font-medium">Saved to Google Drive!</span> 98 | <a
  - generic [ref=e10]:
    - text: at failureErrorWithLog (
    - generic [ref=e11] [cursor=pointer]: /Users/itays/dev/feedbackflow-app/node_modules/esbuild/lib/main.js:1472:15
    - text: ) at
    - generic [ref=e12] [cursor=pointer]: /Users/itays/dev/feedbackflow-app/node_modules/esbuild/lib/main.js:755:50
    - text: at responseCallbacks.<computed> (
    - generic [ref=e13] [cursor=pointer]: /Users/itays/dev/feedbackflow-app/node_modules/esbuild/lib/main.js:622:9
    - text: ) at handleIncomingPacket (
    - generic [ref=e14] [cursor=pointer]: /Users/itays/dev/feedbackflow-app/node_modules/esbuild/lib/main.js:677:12
    - text: ) at Socket.readFromStdout (
    - generic [ref=e15] [cursor=pointer]: /Users/itays/dev/feedbackflow-app/node_modules/esbuild/lib/main.js:600:7
    - text: ) at Socket.emit (node:events:518:28) at addChunk (node:internal
    - generic [ref=e16] [cursor=pointer]: /streams/readable:561:12
    - text: ) at readableAddChunkPushByteMode (node:internal
    - generic [ref=e17] [cursor=pointer]: /streams/readable:512:3
    - text: ) at Readable.push (node:internal
    - generic [ref=e18] [cursor=pointer]: /streams/readable:392:5
    - text: ) at Pipe.onStreamRead (node:internal
    - generic [ref=e19] [cursor=pointer]: /stream_base_commons:189:23
  - generic [ref=e20]:
    - text: Click outside, press
    - generic [ref=e21]: Esc
    - text: key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e22]: server.hmr.overlay
    - text: to
    - code [ref=e23]: "false"
    - text: in
    - code [ref=e24]: vite.config.ts
    - text: .
```