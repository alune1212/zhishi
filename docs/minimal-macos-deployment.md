# Mac 正式运维手册

平台于 2026-09-08 在公司受控局域网首次上线，2026-10-10 已从停机状态恢复升级。本文件是当前生产操作的唯一手册；部署版本和验收结论以[上线交接](handoff.md)为准。本手册只描述现网单机 Mac 的 Compose 运行，不定义 Windows 或跨主机运维路径。

仓库源码的默认镜像前缀为 `zhishi`；正式 Compose 镜像前缀继续为 `internal-exam-platform`。恢复升级后的部署身份和验收结果见[上线交接](handoff.md)。使用下方 `--no-build` 命令前，须确保 Compose 配置与本机已有镜像名称匹配。

## 主机、入口与配置

| 项目 | 配置 |
| --- | --- |
| 主机 | 当前 Apple Silicon Mac，固定内网 IP `192.168.2.225` |
| 考生入口 | `http://192.168.2.225:8080` |
| 管理入口 | 本机 `http://127.0.0.1:8081/admin/login` |
| Compose 项目名 | `internal-exam-minimal`，保持固定以使用同一组数据卷 |
| 保护目录 | `~/Library/Application Support/InternalExamMinimal` |
| 源码与配置 | 保护目录下 `release/` 为固定源码导出，`formal.env` 权限为 `0600` |
| 操作员 | `operator`；口令读取 `formal.env` 中 `PRIMARY_OPERATOR_PASSWORD` |

`formal.env` 使用 `internal` 模式和真实 SMTP，CORS 与公开链接均匹配考生入口；正式数据库、操作员和 Token 使用独立随机凭据。2026-10-10 只更新了 `GIT_COMMIT`、`APP_VERSION_TAG`、`APP_VERSION=1.0.0`，凭据保留，文件权限仍为 `0600`。三个数据卷、入口、端口和网络均沿用原配置。Token 签名仍是登录保护的一部分，与未启用的发布包签名不同。数据库及前端直连仅绑定 loopback 的 `25432`、`25173`；backend 和 worker 不暴露宿主端口。

Docker Desktop 已设置登录自启动、关闭 Resource Saver；Mac 接交流电时不自动睡眠。考试期间保持主机开机、联网及 Docker 运行。整机重启后需要登录 macOS；当前方案不承诺登录前恢复或无人值守高可用。

## 日常检查与启停

```bash
cd "$HOME/Library/Application Support/InternalExamMinimal/release"
docker compose --env-file ../formal.env ps
curl -f http://192.168.2.225:8080/api/health
curl -f http://127.0.0.1:8081/api/ready
docker compose --env-file ../formal.env exec -T auto-submit-worker \
  uv run --no-sync python -m app.core.auto_submit_worker healthcheck
```

日常启动或异常恢复使用固定镜像：

```bash
docker compose --env-file ../formal.env up -d --no-build --wait
```

确认没有进行中的考试后，暂停使用 `docker compose --env-file ../formal.env stop`。查看错误使用 `docker compose --env-file ../formal.env logs --tail 100 backend auto-submit-worker`，分享日志前去除敏感信息。`down --volumes` 会删除数据，不能作为启停命令。

容器配置了自动重启。若 Mac 重启后服务未恢复，先确认已登录、Docker 已就绪以及 IP 未变化，再运行上述检查和启动命令。业务开考前按[考试日指南](exam-day-guide.md)检查名单、题目及开放时间。

## 首次安装与版本升级

当前生产已经初始化，以下空库步骤只用于首次安装，日常启停无需重复执行：

1. 将选定的明确 Git 提交导出至该 Mac 主机的受保护 `release/` 目录，准备该主机独立的 `formal.env`。
2. 设置匹配源码提交的 `GIT_COMMIT` 和唯一 `APP_VERSION_TAG`；从该目录构建 `db backend frontend nginx` 镜像。
3. 启动数据库后，只对全新空库执行显式初始化，再启动其他服务：

```bash
docker compose --env-file ../formal.env config --quiet
docker compose --env-file ../formal.env build db backend frontend nginx
docker compose --env-file ../formal.env up -d --wait db
docker compose --env-file ../formal.env run --rm --no-deps backend \
  uv run --no-sync alembic -x initialize_empty_database=true upgrade head
docker compose --env-file ../formal.env up -d --no-build --wait
```

空库入口会在迁移前检查非系统 schema 的表和视图；已有用户对象即拒绝。它不用于现有数据升级。后续版本更新需重新核对迁移影响、固定新的提交与镜像，并完成适用的复验；不要重建覆盖正在使用的版本标签，也不要覆盖现有 `formal.env`。本次的一次性回滚检查点不构成例行回退机制；对未经验证的破坏性数据升级或数据库回退不作承诺。

现有数据库升级使用固定源码导出和新的唯一镜像标签，并对已存在的数据库执行普通 `alembic upgrade head`；不要使用上面的空库初始化参数。保留 `formal.env` 凭据、Compose 项目、三个数据卷、入口、端口和网络。服务恢复后检查 Compose 健康、考生 health、管理 readiness、worker heartbeat，并比较升级前后的业务表数量与内容摘要。本次恢复升级没有新迁移；健康与数据核对的结果见[上线交接](handoff.md)。

## 范围与历史

当前不使用签名发布包、staging/promotion 或跨主机切换。2026-10-10 升级建立并验证了一次性回滚归档，位于保护目录 `recovery/security-20261010T011500Z/`；这不表示已启用例行成对备份、独立第二副本、恢复演练或跨主机灾备。v1.0.0 移除未采用的 Mac/Windows 外层运维入口，保留共享数据保护、安全和隔离回归工具；数据库和视频持久卷本身不等于独立备份。

旧 Windows、Mac 签名发布及跨主机迁移手册已移除，独有历史背景由[OpenSpec 历史记录](../openspec/README.md)与 Git 保留。部署目录的固定源码快照保留原貌；当前操作请使用本仓库的本手册，不以旧快照内的历史手册覆盖当前流程。
