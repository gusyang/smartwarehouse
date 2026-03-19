# Smart Warehouse Allocation System (3PL Optimization)

A comprehensive Next.js web application designed to optimize inventory distribution, logistics planning, and shipping routes from warehouses to distribution centers (DCs). The system leverages a custom greedy allocation algorithm to minimize transportation costs by comparing traditional "nearest-neighbor" baseline plans against cost-optimized smart plans.

## Core Features

1. **Master Data Management**: Configure Warehouses (locations, capacities), Distribution Centers, SKUs (dimensions, weights), and Carriers (tiered distance rates, vehicle constraints).
2. **Inventory & Demand Planning**: Track on-hand inventory, future incoming/outgoing schedules, and forecast demand by channel/state.
3. **Baseline Generation (Customer Plan)**: Quickly generate a baseline allocation based on simple geographic proximity.
4. **Smart Optimization Engine**: A heuristic solver that assigns demand to the most cost-effective routes while respecting inventory and warehouse capacity constraints.
5. **Cost Analysis & Visualization**: Deep dive into savings with interactive charts, weekly breakdowns, and granular side-by-side cost comparisons.
6. **Data Persistence & Import/Export**: State is managed via Zustand and persisted to local storage. Configurations can be exported to JSON/CSV.

---

## Detailed System Logic

### 1. Distance & Capacity Calculation
* **Distance**: System calculates point-to-point distances between Warehouses and Distribution Centers using the **Haversine formula** based on predefined city coordinates.
* **Container Capacity Limit**: When an SKU and a Vehicle type are selected, the system calculates the maximum units per container. It computes both the **Volume Limit** (Vehicle Max Volume / SKU Volume) and the **Weight Limit** (Vehicle Max Weight / SKU Weight), and takes the **Minimum** of the two as the bottleneck constraint.

### 2. Carrier Rate Tiering
Carriers are configured with distance-based tiers (e.g., 0-500 miles, 500-1500 miles). The total cost for a shipment is calculated as:
`Total Cost = Fixed Cost + Max(Minimum Charge, Distance × Rate Per Mile)`
The system then derives the accurate **Cost Per Unit** by dividing the Total Cost by the calculated Container Capacity Limit.

### 3. Inventory Projection
The system projects available inventory for upcoming weeks (Week 3 & Week 4) by calculating:
`Projected Inventory = Current On-Hand + Incoming (Up to target week) - Outgoing (Past weeks)`
Only warehouses selected in the Planning Settings will be considered as having active inventory.

### 4. Baseline "Customer" Plan (Nearest Neighbor)
When generating the baseline plan, the algorithm groups demand forecasts and simply assigns the demand to the **geographically closest active warehouse**. It does not heavily optimize for carrier rate drops or capacity bottlenecks, serving as a realistic "traditional" business model.

### 5. Smart Optimization Algorithm (Greedy LP Heuristic)
The AI-driven optimization runs a heuristic greedy allocation:
1. **Cost Matrix Generation**: For every demand node, it calculates the *Cost Per Unit* from every active warehouse using the Carrier Rate Tiering logic.
2. **Sorting**: It sorts all possible allocation routes strictly by *Cost Per Unit* (Lowest to Highest).
3. **Allocation**: It iterates through the sorted routes, allocating as much demand as possible to the cheapest route.
4. **Constraint Enforcement**: During allocation, it constantly checks two constraints:
   * Does the warehouse have enough *Projected Available Inventory*?
   * Does the warehouse have enough overall *Capacity*?
5. If a warehouse is depleted, the algorithm moves to the next cheapest route to fulfill the remaining demand.

### 6. Technical Stack
* **Framework**: Next.js (App Router), React
* **State Management**: Zustand (with `persist` middleware for local storage)
* **Styling**: Tailwind CSS, shadcn/ui components
* **Visualization**: Recharts (Bar charts, Pie charts)

---
---

# 智能仓库库存分配与物流优化系统

这是一个基于 Next.js 开发的综合性 Web 应用程序，旨在优化库存分配、物流计划以及从仓库到配送中心（DC）的运输路线。系统利用自定义的贪心分配算法，通过将传统的“就近分配”基准计划与成本优化的“智能计划”进行对比，从而实现运输成本的最小化。

## 核心功能

1. **基础数据管理 (Master Data)**：配置仓库（位置、总容量）、配送中心、产品 SKU（尺寸、重量）以及承运商（基于距离的阶梯运费、车辆限制）。
2. **库存与需求计划 (Planning)**：追踪现有库存、未来的收发货计划，并按渠道/州预测未来几周的客户需求。
3. **基准方案生成 (Customer Plan)**：基于简单的地理距离（就近原则）快速生成基准分配计划。
4. **智能优化引擎 (Smart Optimization)**：一种启发式求解器，在严格遵守库存上限和仓库容量限制的前提下，将需求分配给最具成本效益的路线。
5. **成本分析与可视化 (Analysis)**：通过交互式图表、周度细分饼图和细粒度的并排成本对比表，深入分析节省的成本。
6. **数据持久化与导入/导出 (Data Management)**：通过 Zustand 管理状态并持久化至浏览器本地存储。配置数据可导出为 JSON/CSV 格式。

---

## 详细系统逻辑

### 1. 距离与装载量计算
* **距离计算**：系统基于预设的城市经纬度坐标，使用 **哈弗曼公式 (Haversine Formula)** 计算仓库与配送中心之间的点对点直线里程距离。
* **容器容量限制**：当选择了特定的 SKU 和车辆类型时，系统会自动计算单个集装箱/卡车的最大装载量。系统会分别计算 **体积限制** (车辆最大容积 / SKU体积) 和 **重量限制** (车辆最大载重 / SKU重量)，并取两者的 **最小值 (Minimum)** 作为最终的物理装载瓶颈。

### 2. 承运商阶梯计费逻辑
承运商可以配置基于距离的阶梯运费（例如：0-500英里一个费率，500-1500英里一个费率）。单次运输的总成本计算公式为：
`单车总成本 = 固定发车费 + Max(最低起运收费, 运输距离 × 每英里单价)`
随后，系统会将“单车总成本”除以“计算出的最大装载量”，推导出极其精准的 **单件运输成本 (Cost Per Unit)**。

### 3. 动态库存预测
系统会根据当前和未来的调度，动态预测目标周（第3周或第4周）的可用库存：
`预测可用库存 = 当前现有库存 + 计划入库数量 (截至目标周) - 计划出库数量 (历史周)`
在规划设置中，只有被用户勾选激活的仓库才会被视为具有有效库存。

### 4. 传统基准方案生成 (就近原则)
在生成基准计划（Customer Plan）时，算法会将需求按地点分组，并简单地将需求分配给 **地理位置上距离最近的激活仓库**。该逻辑不考虑承运商费率陡降或仓库容量瓶颈，旨在模拟企业最常见、最传统的粗放型物流分配业务模型。

### 5. 智能优化算法 (贪心线性启发式求解)
AI 驱动的优化过程运行了一套启发式贪心分配算法：
1. **成本矩阵生成**：遍历所有的需求节点，利用承运商阶梯计费逻辑，计算出从每一个激活仓库发货的 *单件运输成本*。
2. **全局排序**：将所有可能的“仓库-需求地”分配路线，严格按照 *单件运输成本* 从低到高进行全局排序。
3. **优先分配**：遍历排好序的路线，尽可能多地将需求分配给当前最便宜的路线。
4. **双重约束校验**：在分配时，系统会实时校验两个物理约束：
   * 该仓库是否有足够的 *预测可用库存*？
   * 该仓库是否还有剩余的 *整体仓储容量*？
5. 如果最便宜的仓库库存被耗尽，算法会自动退而求其次，寻找下一个最便宜的路线来满足剩余的未分配需求。

### 6. 技术栈
* **框架**: Next.js (App Router), React
* **状态管理**: Zustand (配合 `persist` 中间件实现本地持久化)
* **样式 UI**: Tailwind CSS, shadcn/ui 组件库
* **数据可视化**: Recharts (柱状图, 饼图)