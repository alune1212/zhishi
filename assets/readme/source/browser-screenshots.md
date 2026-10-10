# README 浏览器截图来源

- 截图日期：2026-10-10。
- 应用源码基线：`a85757258b47e3f81fc0893e910dcf1d01fd8023`；从本次文档维护工作树构建独立测试镜像。截图不表示本次维护代码已部署到正式环境。
- 环境：一次性的 Compose 项目 `internal-exam-e2e`，独立 PostgreSQL、应用与本地 SMTP 捕获服务。页面由本机 Chrome 真实渲染，使用 Playwright CLI 保存 1440 × 1000 PNG 视口截图；没有生成海报或后期替换界面内容。
- 数据：[E2E seed](../../../backend/app/ops/e2e_seed.py) 中的合成题目、考试与账号，仅使用 `example.com` 邮箱。截图没有读取原始转换题库或真实员工数据。
- 管理员认证：在测试管理员登录页输入合成账号与密码，正常进入考试工作台。
- 考生认证：截图前仅在测试环境清空固定测试 OTP，经 [fake SMTP](../../../backend/app/ops/fake_smtp.py) 接收随机验证码并在真实登录表单验证。恢复正式考试时使用应用的 `takeover=1` 页面入口，后端仍校验 fresh authentication；没有注入登录凭证或关闭身份验证。

| 图片 | 页面入口 | 画面内容 |
| --- | --- | --- |
| [管理员考试工作台](../admin-exam-workspace.png) | `http://127.0.0.1:18082/admin/exams/3` | 合成 E2E 考试的发布状态、冻结名单与邀请摘要 |
| [考生答题](../candidate-exam-taking.png) | `http://127.0.0.1:18080/exams/4/taking?attemptId=2` | 合成正式考试题目、已保存答案、倒计时与题号导航 |

这些入口仅说明本次截图使用的本地测试地址；环境清理后不再可访问。应用版本与正式部署状态以 [handoff](../../../docs/handoff.md) 为准。
