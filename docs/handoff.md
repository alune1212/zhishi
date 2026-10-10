# 正式上线交接

**状态：正式部署已于 2026-10-10 完成恢复升级。** 服务于 2026-09-08 首次上线；本次恢复后六个服务均在运行，其中数据库、后端和 worker 状态为 healthy。下文分开记录本次升级证据与首次上线的历史验收，不把历史实机结果归属于新部署。

## 部署身份

| 项目 | 当前值 |
| --- | --- |
| 主机与运行环境 | 当前 Apple Silicon Mac，Docker Desktop + Docker Compose，`ENVIRONMENT=internal` |
| 考生入口 | `http://192.168.2.225:8080` |
| 管理入口 | 本机 `http://127.0.0.1:8081/admin/login` |
| 部署源码 | `86b40aa60c63f81144ea15800d8d0738eafdd4ca` |
| 镜像标签 | `minimal-security-86b40aa60c63` |
| 镜像仓库前缀 | `internal-exam-platform`（源码默认前缀为 `zhishi`） |
| 版本环境变量 | `APP_VERSION=1.0.0`；`GIT_COMMIT` 与 `APP_VERSION_TAG` 对应本次源码和镜像 |
| 数据库迁移 | `202608300001` |
| Compose 项目 | `internal-exam-minimal` |
| 保护目录 | `~/Library/Application Support/InternalExamMinimal` |

运行中的 `release/` 是固定源码导出，不随仓库提交自动升级；当前维护文档以本仓库为准。正式配置与日常操作统一见[正式运维手册](minimal-macos-deployment.md)。本次只更新了 `formal.env` 中的 `GIT_COMMIT`、`APP_VERSION_TAG`、`APP_VERSION` 三项；凭据保留，文件权限为 `0600`，三个数据卷、入口、端口和网络保持原配置。

## 源码发布 v1.0.0

2026-09-09 已发布 [v1.0.0](https://github.com/alune1212/zhishi/releases/tag/v1.0.0)，标签绑定提交 `b00e8a49e7d78c10f1502de7fdde494b1c669bfd`。当时只交付源码和 Compose 构建路径，未升级正式主机；正式主机于 2026-10-10 完成恢复升级，见下文。

- 候选验证：启用 PostgreSQL 的后端全量测试 753 项、前端测试 555 项通过；格式、lint、类型、构建与离线资源检查通过。
- [候选 CI](https://github.com/alune1212/zhishi/actions/runs/34298203263) 五个任务全部通过，包含 7 个隔离浏览器场景和 100 客户端容量检查；容量报告校验和已核对，提交状态为 clean，100/100 完成交卷。这些结果不替代新版本的正式主机验收。
- Python 运行依赖审计无已知漏洞；npm 运行依赖无高危或严重漏洞，有 4 项低风险报告。未将 CI 合成策略夹具当作完整源码或镜像安全复扫。

## 2026-09-08 首次上线验收（历史证据）

以下结果来自首次上线时的 `47b4c17` 部署，仅作为该次验收记录；本次恢复升级未重测手机、真实邮件或整机重启。

| 检查 | 结果与证据边界 |
| --- | --- |
| 后端 | 格式、Ruff、ty 通过；启用 PostgreSQL 的全量测试 822 项通过 |
| 前端 | 格式、lint、构建及离线引用检查通过；551 项测试通过；外部运行时引用为 0 |
| 隔离浏览器 | 桌面与移动端共 7 场景通过；使用模拟 SMTP，本次省略测试库备份步骤 |
| 空库初始化 | 全新 PostgreSQL 沿完整迁移链到达 head；已有表时拒绝空库初始化入口 |
| 真实邮件 | 正式服务 SMTP 投递成功，用户确认已收到验收邮件 |
| 实体手机 | 用户确认 iPhone 16 Pro Max / Safari 登录、刷新保留答案、断网恢复同步、手动交卷和到时自动交卷均成功，无页面或按钮异常 |
| 整机重启 | 用户确认重启并登录 Mac 后 Docker 自动启动，无手动启动命令；平台约几分钟恢复，入口与原成绩正常。时间为用户报告，未精确计时 |
| 重启后服务 | 六个服务运行；数据库、后端、自动交卷 worker 健康，worker 心跳检查通过；考生 health 和管理端 readiness 均 HTTP 200 |
| 入口隔离与导出 | 考生端管理、运维、readiness、docs、OpenAPI 路径返回 404；未登录报表访问被拒绝，管理员导出四工作表成功 |
| 数据保留 | 重启后两场测试记录仍为 `submitted`，成绩分别为 40/100 和 20/100 |

到时交卷由用户实机确认；数据库的 `submitted` 状态本身不区分前端计时提交与后台 worker 提交。验收动作见[实机验收清单](official-exam-uat-checklist.md)。

详细主机证据位于保护目录的 `evidence/`：`internal-exam-minimal-live.json`、`smtp-probe-20260908T065907Z.json`、`phone-acceptance-exams.json` 及对应测试、部署日志。凭据和含身份信息的证据不提交到 Git。

本次恢复升级的正式证据保存在保护目录 `evidence/security-remediation-20261010.json`，权限为 `0600`；凭据和含身份信息的证据不提交到 Git。

## 2026-10-10 恢复升级结果

原 `internal-exam-minimal` 六服务已停止约四周。本次使用固定源码 `86b40aa60c63f81144ea15800d8d0738eafdd4ca` 和实际扫描过的 arm64 镜像恢复；迁移仍为 `202608300001`，没有新增迁移。六个服务均在运行，数据库、后端和 worker 为 healthy；考生 health 与管理 readiness 均 HTTP 200，worker heartbeat 通过。升级前后 18 张业务表的行数与内容摘要一致；记录仍为 `submitted=2`、`in_progress=0`。

升级前的 `release/`、配置和三个数据卷已归档到保护目录 `recovery/security-20261010T011500Z/`；原 release 位于其中的 `release-before-upgrade/`，旧镜像标签也保留。gzip 完整性和四个 SHA-256 校验通过。数据库物理归档已复制到隔离临时卷，在 `network=none` 条件下完成恢复启动验证，随后清理临时验证资源。这是本次升级的一次性回滚检查点，不表示已启用例行成对备份、独立第二副本或跨主机灾备。

- 本地验证：后端 753 项、前端 555 项及 3 个 braces 深度用例通过。
- [本次部署提交的远程 CI](https://github.com/alune1212/zhishi/actions/runs/38013845354) 五个任务全部成功。Node 20 与无效 `working-directory` 警告已消失；仍有并发缓存保存冲突提示（同一缓存 key 已由其他任务创建）和 `ubuntu-latest` 迁移 notice，二者未阻断构建。
- 正式只读冒烟：以现有凭据登录管理端，operations snapshot 显示 `APP_VERSION=1.0.0`、`GIT_COMMIT=86b40aa60c63f81144ea15800d8d0738eafdd4ca`、`worker heartbeat_fresh=true`。登录后的成绩报表导出 HTTP 200，返回 XLSX 8040 bytes、4 个工作表；未登录导出返回 401。考生端访问 readiness、operations snapshot、报表导出、docs 和 OpenAPI 均为 404；考生首页与管理登录页均为 200。导出未写入本地文件，验证过程中未打印个人内容或 token。
- [本次部署提交的安全维护工作流](https://github.com/alune1212/zhishi/actions/runs/38013845963) 已成功；四个 amd64 镜像扫描和本次实际 arm64 部署的四个镜像复扫均为 0，Python 与运行依赖 npm 审计均为 0。两次镜像构建输入一致。
- 完整 npm 审计仍显示上游 `braces` 级联的 6 项 HIGH。项目已用本地深度限制补丁修复，并完成独立复现和旁路审查；扫描器仍按公开上游版本报告。维护边界和验证方式见[依赖安全维护](dependency-security.md)。这不等于完整 npm 审计为 0，也不等于完成全源码安全扫描。

## 当前范围与限制

- 本次已完成固定版本恢复升级及一次性回滚归档和隔离恢复启动验证；例行成对备份、独立第二副本、恢复演练和跨主机灾备仍未启用。数据库和视频持久卷不构成独立备份保障。
- 当前为内网 HTTP；适用边界见[安全例外](security-http-exception.md)。尚未提供外部 HTTPS 部署或高可用承诺。
- 本次未重测 2026-09-08 的手机、真实邮件和整机重启验收；也未将完整源码安全扫描、pf/DHCP 管理证明或 Windows 迁移标为通过。
- 旧完整运维方案已退出当前操作入口；v1.0.0 清理其 Mac/Windows 外层入口，保留仍被业务、迁移保护、安全评估和隔离回归调用的共享数据保护及安全/E2E 工具。历史 OpenSpec 原事实及未完成任务的适用范围见[OpenSpec 导航](../openspec/README.md)。

## 文档分工

README 提供入口；正式运维手册维护主机和启停；本文维护部署身份和验收结论；考试日指南维护业务操作。需求、API、数据库、导入模板各自维护其独有契约，变更时在对应文档更新并检查引用。当前文档不再追加旧版本过程流水。
