# ComfyUI Luck Annotator (Luck 标注)

<p align="center">
  <img src="https://img.shields.io/badge/ComfyUI-Custom%20Node-green" alt="ComfyUI">
  <img src="https://img.shields.io/badge/Version-8.2-blue" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

专业的 ComfyUI 图像标注节点，支持 **点 (Point)**、**矩形 (Rectangle)** 和 **多边形 (Polygon)** 标注，提供实时渲染和所见即所得的编辑体验。

[English](README.md) | [中文文档](README.zh-CN.md)

---

## ✨ 功能特性

- 🎯 **3 种标注类型**：点 ⦿、矩形 ▢、多边形 ⬡
- 🖱️ **交互式画布**：支持缩放、平移，直接在图像上编辑
- 🎨 **自定义样式**：可调整描边颜色、线宽、填充透明度和点大小
- ↩️ **撤销/重做**：支持多达 50 步撤销历史
- 🛠️ **选择工具**：框选、Shift 范围多选、批量删除
- 📤 **双输出**：同时输出渲染后的图像 + JSON 标注数据

---

## 🚀 安装

1. 将本仓库克隆到您的 `ComfyUI/custom_nodes/` 目录：
   ```bash
   cd ComfyUI/custom_nodes
   git clone https://github.com/YOUR_USERNAME/comfyui-image-annotator.git
   ```
2. 重启 ComfyUI。

---

## 📖 操作指南

### 1. 工具栏与快捷键

| 图标 | 工具 | 快捷键 | 说明 |
|:---:|:---|:---:|:---|
| ↖️ | **选择 (Select)** | `V` | **默认工具**。选择、移动或编辑标注。**按 `V` 键可随时退出当前绘图状态**。 |
| ✋ | **抓手 (Hand)** | `H` | 平移画布。**提示**：长按 `空格键 (Space)` 可临时切换为抓手工具。 |
| ⦿ | **点 (Point)** | `P` | 单击添加点标注 (常用于 SAM 等模型提示点)。 |
| ▢ | **矩形 (Rect)** | `M` / `R` | 拖拽绘制矩形边框。 |
| ⬡ | **多边形 (Polygon)** | `L` | 单击添加顶点，双击或右键闭合形状。 |

### 2. 选择与交互

- **取消绘制 / 退出工具**：按 `V` 键切换回选择工具，并停止当前绘制。
- **缩放画布**：滚动 **鼠标滚轮** (以光标为中心缩放)。
- **平移画布**：按住 `空格键 (Space)` 并拖拽，或使用鼠标中键。

### 3. 列表管理

- **范围多选**：点击一个条目，按住 `Shift` 键，再点击另一个条目，即可选中中间所有项。
- **单项多选**：按住 `Ctrl` (Mac 上为 `Cmd`) 点击条目，可逐个选中或取消选中。
- **删除**：选中后按 `Delete` 或 `Backspace` 键删除。

### 4. 侧边栏面板

- **工具箱 (Tools)**：快速切换标注工具。
- **外观样式 (Appearance)**：调整描边/填充颜色、线宽和不透明度。
  - *提示*：设置会应用于**新创建**的标注以及**当前选中**的标注。
- **标注列表 (Annotations)**：所有标注的列表。点击 👁️ 切换可见性，或点击 🗑️ 删除。

### 5. 输出说明

- **`image_out`**：输入图像叠加可见标注后的渲染图 (IMAGE 类型)。
- **`mark_data`** (已隐藏)：包含所有标注数据的 JSON 字符串 (STRING 类型)。

---

## 🔧 输入与输出

### 输入节点
- **`image`** (必须)：需要标注的源图像。

### 输出节点
- **`image_out`**: 标注后的图像 (IMAGE)。
- **`mark_data`**: JSON 数据字符串 (STRING)。

---

## 📁 项目结构

```text
comfyui-image-annotator/
├── __init__.py          # 节点注册入口
├── nodes.py             # 后端逻辑实现
├── requirements.txt     # 项目依赖
├── web/
│   └── js/
│       └── image_annotator.js  # 前端 UI 交互
├── LICENSE              # MIT 开源协议
├── README.md            # 英文说明书
└── README.zh-CN.md      # 中文说明书
```

---

## 📜 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件。
