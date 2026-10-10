# Import Templates

管理员登录后可下载模板并执行导入；本页描述仓库当前代码的题库与单场应考名单合同。实际部署版本和验收范围见 [`docs/handoff.md`](handoff.md)，本页更新不表示现网已升级。

## 题库 Excel

第一阶段只支持标准 Excel 导入，不支持 Word 直接解析。

导入预算：

- 默认单个上传文件不超过 5 MiB（`IMPORT_MAX_UPLOAD_BYTES=5242880`）。
- 默认单次导入不超过 5000 行数据（不含表头）。
- 默认只接受 1 个工作表；包含更多工作表会被拒绝。
- 这些限制同样适用于题库和单场应考名单导入。

模板下载：

- 题库导入模板：`GET /api/admin/imports/templates/questions`
- 单场应考名单模板：`GET /api/admin/exams/{exam_id}/candidates/template`
- 模板接口返回带表头和示例行的 Excel 文件，并使用 `filename*` 兼容中文文件名；不再提供独立的全局账号/人员模板或导入 API。

可直接导入的仓库样例：

- [自编合成题库样例](examples/synthetic-questions.xlsx)：只有 `questions` 工作表，包含单选、多选、判断各 1 题，每题 1 分。用于导入、练习和三题考试演示。
- [合成应考名单样例](examples/synthetic-exam-roster.xlsx)：只有 `exam_roster` 工作表，包含 2 个占位身份。用于草稿考试的名单导入。
- [样例来源与使用说明](examples/README.md)：这些样例为本仓库自编合成数据，不含下述转换题库内容或真实员工数据。名单邮箱为 `example.com` 占位地址，不能用于接收真实登录验证码或邀请邮件。

### 已跟踪的题库转换资产

根目录的 [`安全知识竞赛题库_标准化题库.xlsx`](../安全知识竞赛题库_标准化题库.xlsx) 是已跟踪的转换 fixture，保留 `questions`、`unsupported_raw`、`summary` 和 `字段说明` 4 个工作表，用于回溯标准化结果及检查转换统计。它不是单表导入模板，整本上传会因工作表数量超限被拒绝；这是当前导入合同的限制，不是导入功能故障。

主表实际有 612 道题（613 行含表头）：单选 415、多选 137、判断 60；`unsupported_raw` 保留 131 条暂不支持题型的原始条目。`summary` 按主表记录统计，当前 612 条为 `active / OK`、0 条标记需复核。转换标记只说明文件中的状态，不能代替题目正确性、业务适用性或来源授权复核。

工作簿自述来源为 `安全知识竞赛题库.docx`，该源文件未随仓库提供，来源与分发/使用授权尚未确认。仓库现有 MIT 许可不构成这份来源题库的授权证明。真实题目和原始文本保留作转换资产，未改写为“自编”内容；演示请使用上面的合成样例。若经授权后用于业务，应先人工复核，再把选定题目整理为下载模板所示的单个工作表，仅保留导入字段；`parse_status`、`raw_text` 和其他辅助工作表属于转换回溯信息。

建议字段：

```text
category_1
category_2
question_type
stem
option_a
option_b
option_c
option_d
option_e
option_f
correct_answer
analysis
difficulty
score
status
source
source_no
remark
```

校验规则：

- 题型不能为空。
- 题干不能为空。
- `question_type` 只能是 `single`、`multiple`、`judge`。
- 单选题只能有一个正确答案。
- 多选题至少两个正确答案。
- 判断题答案只能是 `true` 或 `false`。
- 正确答案必须存在于选项中。
- 分值必须是数字。
- `status` 只能是 `active` 或 `inactive`。

导入结果：

```json
{
  "batch_id": 12,
  "success_count": 10,
  "failed_count": 1,
  "failures": [
    {
      "row_number": 7,
      "reason": "正确答案必须存在于选项中"
    }
  ]
}
```

失败报告：

- 题库导入和单场应考名单导入都会写入 `import_batch`；独立全局账号导入已移除。
- 可通过管理端导入结果入口或 `GET /api/admin/imports/{batch_id}/failure-report` 下载 Excel。
- 工作簿包含 `导入批次` 和 `失败明细` 两个 sheet。
- `导入批次` 包含导入类型、文件名、总数、成功数、失败数、生成时间。
- `失败明细` 使用 `ROW · 行号` 和 `REASON · 原因` 作为导出表头；接口响应和 `import_batch.error_report` 内部仍使用 `row_number` 和 `reason`。

## 单场应考名单 Excel

每次导入都绑定一个 `exam_id`。建议字段：

```text
email
candidate_name
department
position
exam_group
remark
```

校验与匹配规则：

- `email` 和 `candidate_name` 必填；邮箱 trim + lowercase 后按规范化值校验格式。
- 可选字段只属于当前考试 scope；不得把账号显示名称或组织字段写回全局账号。
- 系统按规范化邮箱复用已有 active/pending 账号；不存在时创建不能登录的 `pending` 账号，再创建当前考试的 draft scope。
- 同一考试中重复邮箱、缺失/非法邮箱、inactive 账号、旧字段行或无法取得冻结身份的行按行失败，不自动按姓名合并，不部分授予考试权限。
- 账号显示名称只能由用户在注册完成/Profile 中编辑；`candidate_name` 写入 `roster_name`，发布时与 `roster_email`、组织字段一起冻结。
- 发布后 scope 不可编辑、删除或补录；发布不会自动发送邀请邮件。管理员显式执行 initial send，重发动作只接受 `invitation_status=failed` 的行。

参考状态计算：

```text
未开始人员 = 当前考试冻结 roster - 该考试已有有效 attempt 的人员
```
