# 贡献指南 | Contributing Guide

感谢你对 **鲲侯奇门排盘引擎** 的关注！我们欢迎所有形式的贡献。

## 🌟 如何贡献

### 报告 Bug
- 使用 [Bug Report](https://github.com/perfhelf/bigfishmarquis-qimen/issues/new?template=bug_report.md) 模板提交
- 请包含: 输入参数、预期输出、实际输出

### 提交功能建议
- 使用 [Feature Request](https://github.com/perfhelf/bigfishmarquis-qimen/issues/new?template=feature_request.md) 模板
- 说明使用场景和预期效果

### 提交代码

1. Fork 本仓库
2. 创建功能分支: `git checkout -b feat/your-feature`
3. 提交修改: `git commit -m "feat: 描述你的改动"`
4. 推送分支: `git push origin feat/your-feature`
5. 创建 Pull Request

### Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: 新增功能
fix: 修复 Bug
docs: 文档更新
refactor: 代码重构
test: 测试相关
chore: 构建/工具链
```

## 🔬 开发注意事项

### 排盘验证

奇门遁甲排盘是精确的数理系统，任何改动都需要验证:

- 拆补法: 检查 24 节气 × 三元 的局数输出
- 排盘: 检查九星、八门、八神的旋转方向和位置
- 天禽寄宫: 确保天禽始终寄于天芮宫

### 参考资料

- 《奇门遁甲统宗》— 排盘规则标准
- 500+ 样本验证集 — 确保与传统手排一致

## 📝 代码风格

- TypeScript strict 模式
- 函数参数使用中文命名以匹配术数术语
- 每个引擎模块保持独立，不互相依赖

---

感谢你的贡献！🙏
