# 依赖安全维护

构建使用锁文件；后端基镜像及其支持的平台同时记录在
`ops/release/image-digests.json` 和 `platform-support.json`。
更新镜像后应扫描实际构建的最终镜像。GitHub 的 amd64 扫描不替代正式 Mac
所用 arm64 镜像的扫描。

后端保留 uv 作为安装与运维入口，移除未被业务和运维使用的系统 pip 及
ensurepip 内置安装包，避免把另一套安装器及其捆绑依赖留在运行镜像中。

## braces 临时修补

`braces@3.0.3` 的 [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
暂无官方修补版。它由 Tailwind 3 的构建依赖引入，最终前端镜像只包含静态产物。

`frontend/scripts/harden-braces.mjs` 在 `npm install` / `npm ci` 的 `postinstall`
阶段应用源文件哈希校验的本地补丁。解析器限制花括号和圆括号混合嵌套为 100 层，
compile、expand、stringify 同时检查直接 AST 输入与循环结构，超限抛出明确的
`SyntaxError`。未改变合法 glob、范围、转义及原有 stringify 的 parent 语义。

`npm test` 先执行补丁回归检查，再运行应用测试。浏览器测试镜像使用
`npm ci --ignore-scripts`，随后显式应用相同补丁。其他环境若跳过安装脚本，必须
先执行 `node scripts/harden-braces.mjs`，再运行构建或开发工具。

保留真实上游版本及锁文件完整性信息，不伪造版本，也不修改扫描策略。
因此完整 `npm audit` 仍可能报告 braces 及其依赖链的 6 条级联告警；它只识别
公开版本，无法识别此源码补丁。运行依赖审计和补丁触发测试须分别验证，
不能把 `npm audit --omit=dev` 的结果当作补丁证明。

出现官方修补版后，应移除此补丁和安装钩子，更新锁文件并重跑语法及应用回归。
更新到不同版本或未知源码会使补丁校验失败，不能静默跳过。

## 兼容性约束

`postcss-selector-parser@7.1.6` 修复当前告警，但越过了 Tailwind 3 和
postcss-nested 的 6.x 依赖约束，因此使用显式 override。更新时须检查 Tailwind
使用的私有 `dist/util/unesc` 入口、应用测试、lint、构建和生成 CSS 的变化。
本次更新后生成 CSS 的 SHA-256 与更新前一致。
