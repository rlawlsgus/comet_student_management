// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 1. 스레드(Threads) 대신 포크(Forks) 사용 (윈도우에서 더 안정적일 수 있음)
    pool: "forks",

    // 2. 동시 실행 개수를 1개로 제한
    execArgv: ["--expose-gc"],
    isolate: false,
    maxWorkers: 1,
    vmMemoryLimit: "300Mb",
  },
});
